from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework.validators import UniqueValidator
from django.contrib.auth.password_validation import validate_password
from .models import User, Waitlister, TutorialStatus, UserSettings, Invitation
from clients.models import Client
from user_addresses.models import Address
from payment_methods.models import PaymentMethod
from pets.models import Pet
from services.models import Service
from professionals.models import Professional
from django.utils import timezone as django_timezone
from datetime import date
import logging

User = get_user_model()

class RegisterSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(
        required=True,
        validators=[UniqueValidator(queryset=User.objects.all())]
    )
    password = serializers.CharField(
        write_only=True, 
        required=True, 
        validators=[validate_password]
    )
    password2 = serializers.CharField(write_only=True, required=True)
    timezone = serializers.CharField(required=False, default='UTC')
    use_military_time = serializers.BooleanField(required=False, default=False)
    invitation_token = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    how_did_you_hear = serializers.ChoiceField(
        choices=[
            ('instagram', 'Instagram'),
            ('google', 'Google'),
            ('reddit', 'Reddit'),
            ('nextdoor', 'Nextdoor'),
            ('other', 'Other')
        ],
        required=True,
        help_text="How the user heard about CrittrCove"
    )
    how_did_you_hear_other = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=255,
        help_text="Custom text when 'other' is selected"
    )

    class Meta:
        model = User
        fields = ('email', 'password', 'password2', 'name', 'phone_number', 'timezone', 'use_military_time', 'invitation_token', 'how_did_you_hear', 'how_did_you_hear_other')
        extra_kwargs = {
            'name': {'required': True},
            'phone_number': {'required': True}
        }

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError(
                {"password": "Password fields didn't match."}
            )
        
        # Validate how_did_you_hear_other when "other" is selected
        how_did_you_hear = attrs.get('how_did_you_hear')
        how_did_you_hear_other = attrs.get('how_did_you_hear_other')
        
        if how_did_you_hear == 'other':
            if not how_did_you_hear_other or not how_did_you_hear_other.strip():
                raise serializers.ValidationError({
                    "how_did_you_hear_other": "Please specify how you heard about us when selecting 'Other'."
                })
        
        # Handle invitation token validation, if provided
        invitation_token = attrs.get('invitation_token')
        if invitation_token and invitation_token.strip():  # Only validate if token is provided and not empty
            try:
                invitation = Invitation.objects.get(token=invitation_token)
                
                # Check if the invitation is valid
                if invitation.is_accepted:
                    raise serializers.ValidationError({
                        "invitation_token": "This invitation has already been used."
                    })
                
                if django_timezone.now() > invitation.expires_at:
                    raise serializers.ValidationError({
                        "invitation_token": "This invitation has expired."
                    })
                
                # For email invitations, verify the email matches
                if invitation.invitation_type == 'email' and invitation.email and invitation.email != attrs['email']:
                    raise serializers.ValidationError({
                        "email": "The email address does not match the invitation."
                    })
                
                # Store the invitation to use it during creation
                attrs['invitation'] = invitation
            except Invitation.DoesNotExist:
                raise serializers.ValidationError({
                    "invitation_token": "Invalid invitation token."
                })
            
        return attrs

    def create(self, validated_data):
        # Initialize logger for the entire method
        logger = logging.getLogger(__name__)
        
        # Extract time settings
        timezone = validated_data.pop('timezone', 'UTC')
        use_military_time = validated_data.pop('use_military_time', False)
        
        # Extract invitation data
        invitation = validated_data.pop('invitation', None) if 'invitation' in validated_data else None
        validated_data.pop('invitation_token', None)
        
        # Remove password2 from validated_data
        validated_data.pop('password2')
        
        # Handle how_did_you_hear fields - they're already in validated_data and will be saved to the model
        # No need to pop them as they should be saved directly to the User model
        
        # Create the user
        user = User.objects.create_user(**validated_data)
        
        # Create user settings with the provided timezone
        UserSettings.objects.create(
            user=user,
            timezone=timezone,
            use_military_time=use_military_time
        )
        
        # Handle the invitation acceptance, if there was one
        if invitation:
            invitation.is_accepted = True
            invitation.accepted_at = django_timezone.now()
            invitation.invitee = user
            invitation.save()
            
            # For professional invitations, also create the client-professional relationship
            if invitation.is_professional_invite:
                from clients.models import Client
                from professionals.models import Professional
                
                logger.info(f"MBAnb23ou4bf954: Processing invitation acceptance during registration for user {user.id}")
                
                # Create client profile if it doesn't exist
                client, created = Client.objects.get_or_create(user=user)
                
                # Set the invited_by field to link to the professional who sent the invitation
                try:
                    professional = Professional.objects.get(user=invitation.inviter)
                    client.invited_by = professional
                    client.save()
                    logger.info(f"MBAnb23ou4bf954: Set invited_by for client {client.id} to professional {professional.professional_id}")
                    
                    # Create a conversation between the professional and client
                    try:
                        # Import the function here to avoid circular imports
                        from conversations.v1.views import find_or_create_conversation
                        
                        # Use the find_or_create_conversation helper function
                        # The invitee is always the client, and the inviter is the professional
                        conversation, is_professional = find_or_create_conversation(
                            current_user=user,  # The newly registered user (client)
                            other_user=invitation.inviter,  # The professional who sent the invitation
                            current_user_role='client'  # The role of the newly registered user
                        )
                        
                        logger.info(f"MBAnb23ou4bf954: Created conversation {conversation.conversation_id} between professional {professional.professional_id} and client {client.id}")
                    except ImportError as import_error:
                        logger.error(f"MBAnb23ou4bf954: Error importing find_or_create_conversation: {str(import_error)}")
                    except Exception as conv_error:
                        logger.error(f"MBAnb23ou4bf954: Error creating conversation: {str(conv_error)}")
                    
                except Professional.DoesNotExist:
                    logger.warning(f"MBAnb23ou4bf954: Could not set invited_by: Professional profile not found for user {invitation.inviter.id}")
        
        # Log the created settings for debugging
        print(f"Created user settings for {user.email}: timezone={timezone}, use_military_time={use_military_time}")
        
        # Log for debugging - this helps track when welcome email signal should fire
        logger.info(f"MBA5934: User registration completed for {user.email} (ID: {user.user_id}). Welcome email signal should trigger.")
        
        return user

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'email', 'name', 'is_sitter', 'is_client',
            'approved_for_dogs', 'approved_for_cats', 'approved_for_exotics'
        ]

class TutorialStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = TutorialStatus
        fields = [
            'status_id',
            'done_client_tutorial',
            'done_pro_tutorial',
        ]
        read_only_fields = ['status_id']

class UserSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSettings
        fields = ['timezone', 'use_military_time']

class InvitationSerializer(serializers.ModelSerializer):
    inviter_name = serializers.SerializerMethodField()
    invitation_link = serializers.SerializerMethodField()
    is_valid = serializers.BooleanField(read_only=True)
    days_remaining = serializers.SerializerMethodField()
    invitee_name = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = Invitation
        fields = [
            'id', 'inviter_name', 'email', 'token', 'created_at', 
            'expires_at', 'is_accepted', 'accepted_at', 'invitation_type',
            'invitation_link', 'is_valid', 'days_remaining', 
            'is_professional_invite', 'referral_type', 'reward_status',
            'invitee', 'invitee_name'
        ]
        read_only_fields = ['id', 'token', 'created_at', 'expires_at', 
                           'is_accepted', 'accepted_at', 'invitation_link', 
                           'is_valid', 'days_remaining', 'inviter_name',
                           'invitee_name']
    
    def get_inviter_name(self, obj):
        return obj.inviter.name
    
    def get_invitee_name(self, obj):
        if obj.invitee:
            return obj.invitee.name
        return None
    
    def get_invitation_link(self, obj):
        """Generate the full invitation link for sharing"""
        from django.conf import settings
        if settings.FRONTEND_BASE_URL:
            return f"{settings.FRONTEND_BASE_URL}/invite/{obj.token}"
        return f"/invite/{obj.token}"
    
    def get_days_remaining(self, obj):
        """Calculate days remaining until expiration"""
        from django.utils import timezone
        from datetime import timedelta
        
        now = django_timezone.now()
        if now > obj.expires_at:
            return 0
        
        time_remaining = obj.expires_at - now
        return max(0, time_remaining.days)
    
    def create(self, validated_data):
        """Create a new invitation"""
        # Set the inviter to the current user
        validated_data['inviter'] = self.context['request'].user
        
        # If it's not specified, assume it's a professional invite in the current context
        if 'is_professional_invite' not in validated_data:
            validated_data['is_professional_invite'] = True
            
        return super().create(validated_data)

class UserProfileSerializer(serializers.Serializer):
    # User basic info
    name = serializers.CharField(source='user.name')
    email = serializers.EmailField(source='user.email')
    phone = serializers.CharField(source='user.phone_number')
    age = serializers.SerializerMethodField()
    profile_photo = serializers.SerializerMethodField()
    
    # Address info
    address = serializers.SerializerMethodField()
    city = serializers.SerializerMethodField()
    state = serializers.SerializerMethodField()
    zip = serializers.SerializerMethodField()
    country = serializers.SerializerMethodField()
    
    # Client info
    bio = serializers.CharField(source='about_me')
    emergency_contact = serializers.SerializerMethodField()
    authorized_household_members = serializers.SerializerMethodField()
    home_environment = serializers.SerializerMethodField()
    
    # Pets info
    pets = serializers.SerializerMethodField()
    
    # Services info
    services = serializers.SerializerMethodField()
    
    # Preferences
    preferences = serializers.SerializerMethodField()
    
    # Settings
    settings = serializers.SerializerMethodField()
    
    # Payment methods
    payment_methods = serializers.SerializerMethodField()
    
    def get_age(self, obj):
        user = obj.user
        if user.birthday:
            today = date.today()
            return today.year - user.birthday.year - ((today.month, today.day) < (user.birthday.month, user.birthday.day))
        return None
    
    def get_profile_photo(self, obj):
        user = obj.user
        if user.profile_picture:
            return user.profile_picture.url
        return None
    
    def get_address(self, obj):
        try:
            address = Address.objects.filter(
                user=obj.user,
                address_type='SERVICE'
            ).first()
            if address:
                return address.address_line_1
            return ''
        except Address.DoesNotExist:
            return ''
    
    def get_city(self, obj):
        try:
            address = Address.objects.filter(
                user=obj.user,
                address_type='SERVICE'
            ).first()
            if address:
                return address.city
            return ''
        except Address.DoesNotExist:
            return ''
    
    def get_state(self, obj):
        try:
            address = Address.objects.filter(
                user=obj.user,
                address_type='SERVICE'
            ).first()
            if address:
                return address.state
            return ''
        except Address.DoesNotExist:
            return ''
    
    def get_zip(self, obj):
        try:
            address = Address.objects.filter(
                user=obj.user,
                address_type='SERVICE'
            ).first()
            if address:
                return address.zip
            return ''
        except Address.DoesNotExist:
            return ''
    
    def get_country(self, obj):
        try:
            address = Address.objects.filter(
                user=obj.user,
                address_type='SERVICE'
            ).first()
            if address:
                return address.country
            return ''
        except Address.DoesNotExist:
            return ''
    
    def get_emergency_contact(self, obj):
        if obj.emergency_contact:
            return {
                'name': obj.emergency_contact.get('name', ''),
                'phone': obj.emergency_contact.get('phone', '')
            }
        return {'name': '', 'phone': ''}
    
    def get_authorized_household_members(self, obj):
        if obj.authorized_household_members:
            return [
                {
                    'name': member.get('name', ''),
                    'phone': member.get('phone', '')
                }
                for member in obj.authorized_household_members
            ]
        return []
    
    def get_home_environment(self, obj):
        if obj.home_environment:
            return obj.home_environment
        return []
    
    def get_pets(self, obj):
        try:
            pets = Pet.objects.filter(owner=obj.user)
            return [
                {
                    'id': pet.pet_id,
                    'name': pet.name,
                    'type': pet.species,
                    'breed': pet.breed,
                    'age': self._calculate_pet_age(pet)
                }
                for pet in pets
            ]
        except Pet.DoesNotExist:
            return []
    
    def _calculate_pet_age(self, pet):
        if pet.age_years is not None:
            if pet.age_months:
                return f"{pet.age_years} years, {pet.age_months} months"
            return f"{pet.age_years} years"
        elif pet.birthday:
            today = date.today()
            age_years = today.year - pet.birthday.year
            age_months = today.month - pet.birthday.month
            if age_months < 0:
                age_years -= 1
                age_months += 12
            if age_months:
                return f"{age_years} years, {age_months} months"
            return f"{age_years} years"
        return None
    
    def get_services(self, obj):
        try:
            professional = Professional.objects.get(user=obj.user)
            services = Service.objects.filter(professional=professional)
            return [
                {
                    'id': service.service_id,
                    'name': service.service_name,
                    'price': float(service.base_rate),
                    'unit': service.unit_of_time,
                    'isActive': service.is_active and service.moderation_status == 'APPROVED',
                    'isOvernight': service.is_overnight
                }
                for service in services
            ]
        except (Professional.DoesNotExist, Service.DoesNotExist):
            return []
    
    def get_preferences(self, obj):
        # Pet care preferences are derived from pet data
        try:
            pets = Pet.objects.filter(owner=obj.user)
            pet_care = []
            special_requirements = []
            
            for pet in pets:
                # Add pet care preferences based on pet data
                if pet.energy_level:
                    pet_care.append({
                        'id': f"energy_{pet.pet_id}",
                        'label': f"{pet.energy_level} Energy Level",
                        'icon': 'lightning-bolt',
                        'selected': True
                    })
                
                if pet.can_be_left_alone is not None:
                    pet_care.append({
                        'id': f"alone_{pet.pet_id}",
                        'label': "Can Be Left Alone" if pet.can_be_left_alone else "Cannot Be Left Alone",
                        'icon': 'home',
                        'selected': True
                    })
                
                # Add special requirements based on pet data
                if pet.medications and len(pet.medications) > 0:
                    special_requirements.append({
                        'id': f"meds_{pet.pet_id}",
                        'label': "Medication Administration",
                        'icon': 'pill',
                        'selected': True
                    })
                
                if pet.special_care_instructions:
                    special_requirements.append({
                        'id': f"special_{pet.pet_id}",
                        'label': "Special Care Instructions",
                        'icon': 'medical-bag',
                        'selected': True
                    })
            
            return {
                'homeEnvironment': obj.home_environment or [],
                'petCare': pet_care,
                'specialRequirements': special_requirements
            }
        except Pet.DoesNotExist:
            return {
                'homeEnvironment': obj.home_environment or [],
                'petCare': [],
                'specialRequirements': []
            }
    
    def get_settings(self, obj):
        try:
            user_settings = UserSettings.objects.get(user=obj.user)
            return [
                {
                    'id': 'notifications',
                    'title': 'Push Notifications',
                    'type': 'toggle',
                    'value': user_settings.push_notifications,
                    'icon': 'bell'
                },
                {
                    'id': 'email_updates',
                    'title': 'Email Updates',
                    'type': 'toggle',
                    'value': user_settings.email_updates,
                    'icon': 'email'
                },
                {
                    'id': 'privacy',
                    'title': 'Privacy Settings',
                    'type': 'link',
                    'icon': 'shield-account'
                }
            ]
        except UserSettings.DoesNotExist:
            return [
                {
                    'id': 'notifications',
                    'title': 'Push Notifications',
                    'type': 'toggle',
                    'value': True,
                    'icon': 'bell'
                },
                {
                    'id': 'email_updates',
                    'title': 'Email Updates',
                    'type': 'toggle',
                    'value': True,
                    'icon': 'email'
                },
                {
                    'id': 'privacy',
                    'title': 'Privacy Settings',
                    'type': 'link',
                    'icon': 'shield-account'
                }
            ]
    
    def get_payment_methods(self, obj):
        try:
            payment_methods = PaymentMethod.objects.filter(user=obj.user)
            return [
                {
                    'id': method.payment_method_id,
                    'type': 'card' if method.type in ['CREDIT_CARD', 'DEBIT_CARD'] else 'bank',
                    'last4': method.last4,
                    'expiry': method.expiration_date.strftime('%m/%y') if method.expiration_date else None,
                    'isDefault': method.is_primary,
                    'bankName': method.bank_name if method.type == 'BANK_ACCOUNT' else None
                }
                for method in payment_methods
            ]
        except PaymentMethod.DoesNotExist:
            return []

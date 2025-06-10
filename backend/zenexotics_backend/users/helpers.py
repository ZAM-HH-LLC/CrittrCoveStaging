import logging
from .models import User, UserSettings
from clients.models import Client
from professionals.models import Professional
from pets.models import Pet
from services.models import Service
from user_addresses.models import Address, AddressType
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

def get_user_profile_data(user):
    """
    Retrieves all profile data for a user.
    
    This function centralizes the logic for gathering all profile-related data,
    following DRY principles by providing a single point of access for this functionality.
    
    Args:
        user: The user object to retrieve profile data for.
        
    Returns:
        dict: A dictionary containing all profile data.
    """
    logger.debug(f"helpers.py: Getting profile data for user {user.id}")
    
    # Initialize response dictionary
    response_data = {}
    
    try:
        # Fetch the client profile
        client = Client.objects.get(user=user)
        logger.debug(f"helpers.py: Found client profile for user {user.id}")
        
        # Add client fields directly to response_data
        response_data.update({
            'id': getattr(client, 'id', None),
            'name': user.name,
            'email': user.email,
            'phone': getattr(user, 'phone_number', ""),
            'age': None,
            'profile_photo': user.profile_picture.url if user.profile_picture else None,
            'about_me': client.about_me,
            'emergency_contact': client.emergency_contact,
            'authorized_household_members': client.authorized_household_members,
            'home_environment': client.home_environment,
            'created_at': client.created_at,
            'updated_at': client.updated_at,
            'subscription_plan': user.subscription_plan,
            'is_profile_visible': user.is_active and user.is_profile_visible,
            'currentPlan': get_current_plan_details(user),
        })
        
        # Get address information from Address model
        try:
            address = Address.objects.get(user=user, address_type=AddressType.SERVICE)
            response_data.update({
                'address': address.address_line_1,
                'apartment': address.address_line_2,
                'city': address.city,
                'state': address.state,
                'zip': address.zip,
                'country': address.country,
                'coordinates': address.coordinates
            })
            
            # Add individual coordinate fields for backward compatibility
            if address.coordinates and isinstance(address.coordinates, dict):
                response_data.update({
                    'latitude': address.coordinates.get('latitude'),
                    'longitude': address.coordinates.get('longitude'),
                    'formatted_address': address.coordinates.get('formatted_address')
                })
            
            logger.debug(f"helpers.py: Found address for user {user.id}")
        except Address.DoesNotExist:
            # Default empty address if not found
            response_data.update({
                'address': '',
                'apartment': '',
                'city': '',
                'state': '',
                'zip': '',
                'country': 'USA',
                'coordinates': None,
                'latitude': None,
                'longitude': None,
                'formatted_address': None
            })
            logger.debug(f"helpers.py: No address found for user {user.id}")
        
        # Fetch professional data if it exists
        try:
            professional = Professional.objects.get(user=user)
            response_data['bio'] = professional.bio
        except Professional.DoesNotExist:
            response_data['bio'] = ""
        
        # Add pets
        response_data['pets'] = get_user_pets(user)
        
        # Add services if professional
        response_data['services'] = get_professional_services(user)
        
        # Add preferences structure
        response_data['preferences'] = get_user_preferences(client)
        
        # Add user settings values directly to response_data
        response_data.update(get_user_settings(user))
        
        # Add payment methods structure
        response_data['payment_methods'] = get_user_payment_methods(user)
        
        logger.debug(f"helpers.py: Successfully retrieved profile data for user {user.id}")
        return response_data
    
    except Client.DoesNotExist:
        logger.warning(f"helpers.py: Client profile not found for user {user.id}")
        return {'error': 'Client profile not found'}
    except Exception as e:
        logger.exception(f"helpers.py: Unexpected error: {str(e)}")
        return {'error': 'An unexpected error occurred'}

def get_user_pets(user):
    """Get all pets for a user."""
    try:
        pets = Pet.objects.filter(owner=user)
        
        def format_date_for_frontend(date_obj):
            """Convert date object to MM-DD-YYYY format for frontend"""
            if not date_obj:
                return None
            return date_obj.strftime('%m-%d-%Y')
        
        pet_data = []
        for pet in pets:
            pet_data.append({
                'id': pet.pet_id,
                'name': pet.name,
                'type': pet.species,
                'breed': pet.breed,
                'pet_type': pet.pet_type,
                'age': f"{pet.age_years or 0} years {pet.age_months or 0} months",
                'ageYears': pet.age_years,
                'ageMonths': pet.age_months,
                'weight': pet.weight,
                'birthday': format_date_for_frontend(pet.birthday),
                'sex': pet.sex,
                'profile_photo': pet.profile_photo.url if pet.profile_photo else None,
                'photo_gallery': pet.photo_gallery,
                'adoptionDate': format_date_for_frontend(pet.adoption_date),
                'description': pet.pet_description,
                'childrenFriendly': pet.friendly_with_children,
                'catFriendly': pet.friendly_with_cats,
                'dogFriendly': pet.friendly_with_dogs,
                'spayedNeutered': pet.spayed_neutered,
                'houseTrained': pet.house_trained,
                'microchipped': pet.microchipped,
                'feedingInstructions': pet.feeding_schedule,
                'pottyBreakSchedule': pet.potty_break_schedule,
                'energyLevel': pet.energy_level,
                'canBeLeftAlone': pet.can_be_left_alone,
                'medications': pet.medications,
                'medicalNotes': pet.medication_notes,
                'specialCareInstructions': pet.special_care_instructions,
                'vetName': pet.vet_name,
                'vetAddress': pet.vet_address,
                'vetPhone': pet.vet_phone,
                'insuranceProvider': pet.insurance_provider,
                'vetDocuments': pet.vet_documents,
                'created_at': pet.created_at.isoformat() if pet.created_at else None,
                'age_years': pet.age_years,
                'age_months': pet.age_months,
                'adoption_date': pet.adoption_date.isoformat() if pet.adoption_date else None,
                'friendly_with_children': pet.friendly_with_children,
                'friendly_with_cats': pet.friendly_with_cats,
                'friendly_with_dogs': pet.friendly_with_dogs,
                'spayed_neutered': pet.spayed_neutered,
                'house_trained': pet.house_trained,
                'feeding_schedule': pet.feeding_schedule,
                'potty_break_schedule': pet.potty_break_schedule,
                'energy_level': pet.energy_level,
                'can_be_left_alone': pet.can_be_left_alone,
                'medication_notes': pet.medication_notes,
                'special_care_instructions': pet.special_care_instructions,
                'vet_name': pet.vet_name,
                'vet_address': pet.vet_address,
                'vet_phone': pet.vet_phone,
                'insurance_provider': pet.insurance_provider,
                'vet_documents': pet.vet_documents,
            })
        return pet_data
    except Exception as e:
        logger.error(f"helpers.py: Error fetching pets: {str(e)}")
        return []

def get_professional_services(user):
    """Get all services for a professional user."""
    try:
        # Try to get the professional profile
        professional = Professional.objects.filter(user=user).first()
        
        if not professional:
            return []
            
        # Get services for this professional
        services = Service.objects.filter(professional=professional)
        
        service_data = []
        for service in services:
            service_data.append({
                'id': service.service_id,
                'name': service.service_name,
                'description': service.description,
                'price': float(service.base_rate),
                'unit': service.unit_of_time,
                'isActive': service.is_active,
                'isOvernight': service.is_overnight,
                'animal_type': service.animal_type
            })
        return service_data
    except Exception as e:
        logger.error(f"helpers.py: Error fetching services: {str(e)}")
        return []

def get_user_preferences(client):
    """Get user preferences data structure."""
    return {
        'homeEnvironment': client.home_environment if hasattr(client, 'home_environment') else [],
        'petCare': [
            {'id': 'energy_1', 'label': 'HIGH Energy Level', 'icon': 'lightning-bolt', 'selected': True},
            {'id': 'alone_1', 'label': 'Can Be Left Alone', 'icon': 'home', 'selected': True}
        ],
        'specialRequirements': [
            {'id': 'special_1', 'label': 'Special Care Instructions', 'icon': 'medical-bag', 'selected': True}
        ]
    }

def get_user_settings(user):
    """Get user settings from UserSettings model or return defaults if not found."""
    try:
        # Try to get the user's settings
        user_settings, created = UserSettings.objects.get_or_create(
            user=user,
            defaults={
                'timezone': 'UTC',
                'use_military_time': False,
                'push_notifications': True,
                'email_updates': True,
                'marketing_communications': True
            }
        )
        
        # Return simple boolean flags and settings
        return {
            'push_notifications': user_settings.push_notifications,
            'email_updates': user_settings.email_updates,
            'marketing_communications': user_settings.marketing_communications,
            'profile_visibility': user.is_active and user.is_profile_visible,
            'timezone': user_settings.timezone,
            'use_military_time': user_settings.use_military_time
            # TODO: Add location_privacy after MVP launch
        }
    except Exception as e:
        logger.error(f"helpers.py: Error fetching user settings: {str(e)}")
        return {
            'push_notifications': True,
            'email_updates': True,
            'marketing_communications': True,
            'profile_visibility': True,
            'timezone': 'UTC',
            'use_military_time': False
        }

def get_default_settings():
    """Get default settings structure. Used as fallback if actual settings can't be retrieved."""
    return [
        {'id': 'notifications', 'title': 'Push Notifications', 'type': 'toggle', 'value': True, 'icon': 'bell', 'category': 'notifications'},
        {'id': 'email_updates', 'title': 'Email Updates', 'type': 'toggle', 'value': True, 'icon': 'email', 'category': 'notifications'},
        {'id': 'privacy', 'title': 'Privacy Settings', 'type': 'link', 'icon': 'shield-account', 'category': 'privacy'}
    ]

def get_user_payment_methods(user):
    """Get user payment methods."""
    # This is a placeholder implementation using mock data
    # In a real implementation, you would fetch payment methods from a payment processor like Stripe
    # or from a database table that stores payment methods
    
    # For now, returning a sample payment method with the correct structure
    return [
        {
            'id': 3, 
            'type': 'bank', 
            'last4': '1234', 
            'expiry': None, 
            'isDefault': True, 
            'bankName': 'Ent Federal Credit Union'
        }
        # Additional payment methods would be added here when implemented
    ]



def update_user_profile(user, data):
    """
    Update user profile with the provided data.
    
    Args:
        user: The user object to update.
        data: Dictionary containing the fields to update.
        
    Returns:
        dict: Only the updated fields rather than the entire profile data.
    """
    logger.debug(f"helpers.py: Updating profile for user {user.id}")
    
    try:
        # Create response dictionary to store updated fields
        response_data = {}
        
        # Update User model fields
        if 'name' in data:
            user.name = data['name']
            response_data['name'] = data['name']
        if 'email' in data:
            user.email = data['email']
            response_data['email'] = data['email']
        if 'phone' in data:
            user.phone_number = data['phone']
            response_data['phone'] = data['phone']
        
        # Handle settings toggle fields from SettingsPaymentsTab
        if 'profile_visibility' in data:
            user.is_profile_visible = data['profile_visibility']
            response_data['profile_visibility'] = user.is_active and user.is_profile_visible
            logger.debug(f"helpers.py: Updated profile visibility for user {user.id} to {user.is_profile_visible}")
        
        # Handle user settings
        try:
            user_settings, created = UserSettings.objects.get_or_create(user=user)
            
            # Update user settings if provided
            settings_updated = False
            
            if 'push_notifications' in data:
                user_settings.push_notifications = data['push_notifications']
                response_data['push_notifications'] = data['push_notifications']
                settings_updated = True
                logger.debug(f"helpers.py: Updated push notifications for user {user.id} to {data['push_notifications']}")
            
            if 'email_updates' in data:
                user_settings.email_updates = data['email_updates']
                response_data['email_updates'] = data['email_updates']
                settings_updated = True
                logger.debug(f"helpers.py: Updated email updates for user {user.id} to {data['email_updates']}")
            
            if 'marketing_communications' in data:
                user_settings.marketing_communications = data['marketing_communications']
                response_data['marketing_communications'] = data['marketing_communications']
                settings_updated = True
                logger.debug(f"helpers.py: Updated marketing communications for user {user.id} to {data['marketing_communications']}")
            
            if 'timezone' in data:
                user_settings.timezone = data['timezone']
                response_data['timezone'] = data['timezone']
                settings_updated = True
                logger.debug(f"helpers.py: Updated timezone for user {user.id} to {data['timezone']}")
            
            if 'use_military_time' in data:
                user_settings.use_military_time = data['use_military_time']
                response_data['use_military_time'] = data['use_military_time']
                settings_updated = True
                logger.debug(f"helpers.py: Updated use_military_time for user {user.id} to {data['use_military_time']}")
            
            # Save user settings if any were updated
            if settings_updated:
                user_settings.save()
                logger.debug(f"helpers.py: Saved updated user settings for user {user.id}")
        except Exception as e:
            logger.error(f"helpers.py: Error updating user settings: {str(e)}")
        
        # Handle address fields - update or create Address record
        address_fields = ['address', 'apartment', 'city', 'state', 'zip', 'country']
        has_address_data = any(field in data for field in address_fields)
        
        if has_address_data:
            # Try to get existing service address
            try:
                address = Address.objects.get(user=user, address_type=AddressType.SERVICE)
            except Address.DoesNotExist:
                # Create new address if one doesn't exist
                address = Address(
                    user=user, 
                    address_type=AddressType.SERVICE,
                    address_line_1='',
                    address_line_2='',
                    city='',
                    state='',
                    zip='',
                    country='USA'
                )
            
            # Update address fields if provided
            address_updated = False
            
            if 'address' in data:
                address.address_line_1 = data['address']
                response_data['address'] = data['address']
                address_updated = True
            
            if 'apartment' in data:
                address.address_line_2 = data['apartment']
                response_data['apartment'] = data['apartment']
                address_updated = True
            
            if 'city' in data:
                address.city = data['city']
                response_data['city'] = data['city']
                address_updated = True
            
            if 'state' in data:
                address.state = data['state']
                response_data['state'] = data['state']
                address_updated = True
            
            if 'zip' in data:
                address.zip = data['zip']
                response_data['zip'] = data['zip']
                address_updated = True
            
            if 'country' in data:
                address.country = data['country']
                response_data['country'] = data['country']
                address_updated = True
            
            # Handle coordinates if provided from frontend geocoding
            if 'coordinates' in data and isinstance(data['coordinates'], dict):
                address.coordinates = data['coordinates']
                response_data['coordinates'] = data['coordinates']
                address_updated = True
                logger.debug(f"helpers.py: Updated coordinates for user {user.id}: {data['coordinates']}")
            
            # Save the address
            address.save()
            logger.debug(f"helpers.py: Updated address record for user {user.id}")
        
        # Handle profile photo upload if included - check for either key name
        if 'profile_picture' in data:
            user.profile_picture = data['profile_picture']
            response_data['profile_photo'] = user.profile_picture.url if user.profile_picture else None
        elif 'profilePhoto' in data:
            user.profile_picture = data['profilePhoto']
            response_data['profile_photo'] = user.profile_picture.url if user.profile_picture else None
        
        # Save user model changes
        user.save()
        
        # Update Client model if it exists
        try:
            client = Client.objects.get(user=user)
            
            if 'about_me' in data:
                client.about_me = data['about_me']
                response_data['about_me'] = data['about_me']
            if 'emergency_contact' in data:
                client.emergency_contact = data['emergency_contact']
                response_data['emergency_contact'] = data['emergency_contact']
            if 'authorized_household_members' in data:
                client.authorized_household_members = data['authorized_household_members']
                response_data['authorized_household_members'] = data['authorized_household_members']
            if 'home_environment' in data:
                client.home_environment = data['home_environment']
                response_data['home_environment'] = data['home_environment']
                
            client.save()
        except Client.DoesNotExist:
            logger.debug(f"helpers.py: No client profile found for user {user.id}")
            
        # Update Professional model if it exists
        try:
            professional = Professional.objects.get(user=user)
            
            if 'bio' in data:
                professional.bio = data['bio']
                response_data['bio'] = data['bio']
            if 'insurance' in data and isinstance(data['insurance'], dict):
                professional.insurance_info = data['insurance']
                response_data['insurance'] = data['insurance']
            
            # Handle portfolio photo uploads
            if 'portfolio_photo' in data:
                # In a real implementation, you would add this to a portfolio photos model
                # For now, we'll just acknowledge the upload
                logger.debug(f"helpers.py: Portfolio photo received")
                response_data['portfolio_photo_uploaded'] = True
                
            professional.save()
        except Professional.DoesNotExist:
            logger.debug(f"helpers.py: No professional profile found for user {user.id}")
        
        logger.debug(f"helpers.py: Successfully updated profile for user {user.id}. Returning only updated fields.")
        return response_data
        
    except Exception as e:
        logger.exception(f"helpers.py: Error updating profile: {str(e)}")
        raise 

def get_current_plan_details(user):
    """Get details about the user's current subscription plan."""
    # Map subscription_plan integers to plan IDs used in the frontend
    plan_id_map = {
        0: 'free',
        1: 'waitlist',
        2: 'commission',
        3: 'subscription',   # Pro subscription
        4: 'subscription',   # Client/Owner subscription
        5: 'dual_subscription'
    }
    
    # Get the plan ID for the frontend
    plan_id = plan_id_map.get(user.subscription_plan, 'waitlist')
    
    # Create the plan details object based on subscription_plan
    if user.subscription_plan == 1:  # Waitlist tier
        return {
            'id': 'waitlist',
            'title': 'Waitlist Tier',
            'nextBilling': 'N/A',
            'connections': {'used': 0, 'total': 'Unlimited'}
        }
    elif user.subscription_plan == 0:  # Free tier
        return {
            'id': 'free',
            'title': 'Free Tier',
            'nextBilling': 'N/A',
            'connections': {'used': 0, 'total': 5}
        }
    elif user.subscription_plan == 2:  # Commission tier
        return {
            'id': 'commission',
            'title': 'Commission Based',
            'nextBilling': 'Pay as you go',
            'connections': {'used': 0, 'total': 'Unlimited'}
        }
    elif user.subscription_plan == 3:  # Pro subscription
        return {
            'id': 'subscription',
            'title': 'Pro Subscription',
            'nextBilling': 'End of month',  # This would come from payment processor in reality
            'connections': {'used': 0, 'total': 'Unlimited'}
        }
    elif user.subscription_plan == 4:  # Client/Owner subscription
        return {
            'id': 'subscription',
            'title': 'Owner Subscription',
            'nextBilling': 'End of month',  # This would come from payment processor in reality
            'connections': {'used': 0, 'total': 'Unlimited'}
        }
    elif user.subscription_plan == 5:  # Dual subscription
        return {
            'id': 'dual_subscription',
            'title': 'Dual Role Subscription',
            'nextBilling': 'End of month',  # This would come from payment processor in reality
            'connections': {'used': 0, 'total': 'Unlimited'}
        }
    else:
        # Default fallback
        return {
            'id': 'waitlist',
            'title': 'Waitlist Signup',
            'nextBilling': 'N/A',
            'connections': {'used': 0, 'total': 'Unlimited'}
        } 
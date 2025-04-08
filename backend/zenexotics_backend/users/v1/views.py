from django.conf import settings
from django.shortcuts import render
from rest_framework import generics, permissions
from django.core.mail import send_mail
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from ..models import User, UserSettings
from ..serializers import RegisterSerializer
import logging
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.contrib.auth import authenticate
from professional_status.models import ProfessionalStatus
import pytz
from datetime import datetime
from clients.models import Client
from django.urls import clear_url_caches
from django.http import HttpResponse
from professionals.models import Professional

logger = logging.getLogger(__name__)

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        user = get_object_or_404(User, email=email)
        
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.user_id))
        logger.debug(f"Encoded UID: {uid}")
        
        reset_link = f"{settings.FRONTEND_BASE_URL}/reset-password/{uid}/{token}/"
        
        try:
            logger.info(f"Attempting to send password reset email to: {email}")
            send_mail(
                'Password Reset Request',
                f'Click the link to reset your password: {reset_link}',
                settings.DEFAULT_FROM_EMAIL,
                [email],
                fail_silently=False,
            )
            logger.info(f"Successfully sent password reset email to: {email}")
            return Response({'message': 'Password reset link sent'}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Failed to send email to {email}. Error: {str(e)}")
            logger.error(f"Reset link that failed: {reset_link}")
            return Response({'error': 'Failed to send email'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, uidb64, token):
        try:
            user_id = urlsafe_base64_decode(uidb64).decode()
            user = get_object_or_404(User, user_id=user_id)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({'error': 'Invalid user ID'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not default_token_generator.check_token(user, token):
            return Response({'error': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)
        
        new_password = request.data.get('new_password')
        user.set_password(new_password)
        user.save()
        
        return Response({'message': 'Password has been reset'}, status=status.HTTP_200_OK)

class SitterStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        is_approved_sitter = (
            user.is_sitter and 
            (user.approved_for_dogs or 
             user.approved_for_cats or 
             user.approved_for_exotics)
        )
        
        return Response({
            'is_sitter': user.is_sitter,
            'is_approved_sitter': is_approved_sitter,
            'approved_dog_sitting': user.approved_for_dogs,
            'approved_cat_sitting': user.approved_for_cats,
            'approved_exotics_sitting': user.approved_for_exotics,
            'wants_to_be_sitter': user.wants_to_be_sitter
        })

@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def get_user_name(request):
    user = request.user
    return Response({
        'name': user.name,
        'first_name': user.get_first_name()
    })

class ContactFormView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        name = request.data.get('name')
        email = request.data.get('email')
        message = request.data.get('message')

        if not all([name, email, message]):
            return Response({'error': 'All fields are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            send_mail(
                subject=f"New Contact Form Submission from {name}",
                message=f"Name: {name}\nEmail: {email}\n\nMessage:\n{message}",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[settings.CONTACT_EMAIL],
                fail_silently=False,
            )
            return Response({'message': 'Your message has been sent successfully!'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': 'Failed to send message. Please try again later.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')

        if not current_password or not new_password:
            logger.warning("Missing current or new password")
            return Response({'error': 'Both current and new password are required'}, status=status.HTTP_400_BAD_REQUEST)

        if not authenticate(email=user.email, password=current_password):
            logger.warning("Authentication failed: incorrect current password")
            return Response({'error': 'Current password is incorrect'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        logger.info(f"Password changed successfully for user: {user.email}")
        return Response({'message': 'Password changed successfully'}, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_sitter_status(request):
    try:
        prof_status = ProfessionalStatus.objects.filter(user=request.user).first()
        
        if prof_status:
            return Response({
                'is_sitter': True,
                'is_approved_sitter': prof_status.is_approved,
                'professional_status': {
                    'is_approved': prof_status.is_approved,
                    'approved_for_dogs': prof_status.approved_for_dogs,
                    'approved_for_cats': prof_status.approved_for_cats,
                    'approved_for_exotics': prof_status.approved_for_exotics,
                }
            })
        else:
            return Response({
                'is_sitter': False,
                'is_approved_sitter': False,
                'professional_status': None
            })
            
    except Exception as e:
        print(f"Error in get_sitter_status: {str(e)}")
        return Response({
            'is_sitter': False,
            'is_approved_sitter': False,
            'professional_status': None,
            'error': str(e)
        }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_info(request):
    try:
        user = request.user
        return Response({
            'first_name': user.name.split()[0] if len(user.name.split()) > 0 else '',
            'last_name': user.name.split()[1] if len(user.name.split()) > 1 else '',
            'email': user.email,
            'phone_number': user.phone_number if hasattr(user, 'phone_number') else '',
        })
    except Exception as e:
        print(f"Error in get_user_info: {str(e)}")
        return Response({
            'first_name': '',
            'last_name': '',
            'email': '',
            'phone_number': '',
            'error': str(e)
        }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_time_settings(request):
    """Get user's time settings"""
    try:
        user = request.user
        
        # Get or create user settings
        user_settings, created = UserSettings.objects.get_or_create(
            user=user,
            defaults={
                'timezone': 'UTC',
                'use_military_time': False
            }
        )
        
        return Response({
            'timezone': user_settings.timezone,
            'use_military_time': user_settings.use_military_time
        })
    except Exception as e:
        logger.error(f"Error getting time settings for user {user.id}: {str(e)}")
        return Response(
            {'error': 'Failed to get time settings'},
            status=status.HTTP_400_BAD_REQUEST
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_time_settings(request):
    """Update user's time settings"""
    try:
        user = request.user
        
        # Check if request.data is a string (which would cause the error)
        if isinstance(request.data, str):
            return Response(
                {'error': 'Invalid request format. Expected JSON object.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        timezone = request.data.get('timezone')
        use_military_time = request.data.get('use_military_time')
        
        # Get or create user settings
        user_settings, created = UserSettings.objects.get_or_create(
            user=user,
            defaults={
                'timezone': timezone or 'UTC',
                'use_military_time': use_military_time if use_military_time is not None else False
            }
        )
        
        # Update settings if they already exist
        if not created:
            if timezone is not None:
                user_settings.timezone = timezone
            if use_military_time is not None:
                user_settings.use_military_time = use_military_time
            user_settings.save()
        
        return Response({
            'timezone': user_settings.timezone,
            'use_military_time': user_settings.use_military_time
        })
    except Exception as e:
        logger.error(f"Error updating time settings for user {user.id}: {str(e)}")
        return Response(
            {'error': 'Failed to update time settings'},
            status=status.HTTP_400_BAD_REQUEST
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    user = request.user
    logger.debug(f"MBA1234sx2xfdg: Processing user_profile request for user {user.id}")
    
    # Initialize response dictionary
    response_data = {}
    
    try:
        # Fetch the client profile
        client = Client.objects.get(user=user)
        logger.debug(f"MBA1234sx2xfdg: Found client profile for user {user.id}")
        logger.debug(f"MBA1234sx2xfdg: Client about_me: '{client.about_me}'")
        
        # Add client fields directly to response_data
        response_data.update({
            'id': getattr(client, 'id', None),
            'name': user.name,
            'email': user.email,
            'phone': getattr(user, 'phone_number', ""),
            'address': getattr(user, 'address', ""),
            'city': getattr(user, 'city', ""),
            'state': getattr(user, 'state', ""),
            'zip': getattr(user, 'zip_code', ""),
            'country': 'USA',
            'age': None,
            'profile_photo': None,
            'about_me': client.about_me,  # THIS IS THE FIELD FROM CLIENT
            'emergency_contact': client.emergency_contact,
            'authorized_household_members': client.authorized_household_members,
            'home_environment': client.home_environment,
            'created_at': client.created_at,
            'updated_at': client.updated_at,
        })
        logger.debug(f"MBA1234sx2xfdg: Added client fields to response")
        
        # Fetch professional data if it exists
        professional = None
        try:
            professional = Professional.objects.get(user=user)
            logger.debug(f"MBA1234sx2xfdg: Found professional profile for user {user.id}")
            logger.debug(f"MBA1234sx2xfdg: Professional bio: '{professional.bio}'")
            
            # Add professional's bio to response_data
            response_data['bio'] = professional.bio  # THIS IS THE FIELD FROM PROFESSIONAL
            logger.debug(f"MBA1234sx2xfdg: Added professional bio to response")
        except Professional.DoesNotExist:
            logger.debug(f"MBA1234sx2xfdg: No professional profile found for user {user.id}")
            response_data['bio'] = ""  # Empty string if no professional profile
        
        # Fetch pets - Important: The Pet model links to User, not Client
        from pets.models import Pet
        try:
            # Query pets by user, not client
            pets = Pet.objects.filter(owner=user)
            logger.debug(f"MBA1234sx2xfdg: Found {len(pets)} pets for user {user.id}")
            
            pet_data = []
            for pet in pets:
                pet_data.append({
                    'id': pet.pet_id,
                    'name': pet.name,
                    'type': pet.species,
                    'breed': pet.breed,
                    'age': f"{pet.age_years or 0} years {pet.age_months or 0} months",
                    'weight': pet.weight,
                    'profile_photo': pet.profile_photo.url if pet.profile_photo else None,
                    'description': pet.pet_description
                })
            logger.debug(f"MBA1234sx2xfdg: Processed pet data: {pet_data}")
        except Exception as e:
            logger.error(f"MBA1234sx2xfdg: Error fetching pets: {str(e)}")
            pet_data = []
        response_data['pets'] = pet_data
        
        # Fetch services from the Service model if user is also a professional
        from services.models import Service
        try:
            if professional:
                # Get services for this professional
                services = Service.objects.filter(professional=professional)
                logger.debug(f"MBA1234sx2xfdg: Found {len(services)} services for professional {professional.professional_id}")
                
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
                logger.debug(f"MBA1234sx2xfdg: Processed service data: {service_data}")
            else:
                service_data = []
                logger.debug(f"MBA1234sx2xfdg: No professional profile, so no services")
        except Exception as e:
            logger.error(f"MBA1234sx2xfdg: Error fetching services: {str(e)}")
            service_data = []
        response_data['services'] = service_data
        
        # Add preferences structure (matching the logged response)
        response_data['preferences'] = {
            'homeEnvironment': client.home_environment if hasattr(client, 'home_environment') else [],
            'petCare': [
                {'id': 'energy_1', 'label': 'HIGH Energy Level', 'icon': 'lightning-bolt', 'selected': True},
                {'id': 'alone_1', 'label': 'Can Be Left Alone', 'icon': 'home', 'selected': True}
            ],
            'specialRequirements': [
                {'id': 'special_1', 'label': 'Special Care Instructions', 'icon': 'medical-bag', 'selected': True}
            ]
        }
        
        # Add settings structure (matching the logged response)
        response_data['settings'] = [
            {'id': 'notifications', 'title': 'Push Notifications', 'type': 'toggle', 'value': True, 'icon': 'bell'},
            {'id': 'email_updates', 'title': 'Email Updates', 'type': 'toggle', 'value': True, 'icon': 'email'},
            {'id': 'privacy', 'title': 'Privacy Settings', 'type': 'link', 'icon': 'shield-account'}
        ]
        
        # Add payment methods structure (matching the logged response)
        response_data['payment_methods'] = [
            {'id': 3, 'type': 'bank', 'last4': '1234', 'expiry': None, 'isDefault': True, 'bankName': 'Ent Federal Credit Union'}
        ]
        
        # Log the final response for debugging
        logger.debug(f"MBA1234sx2xfdg: Final response data: {response_data}")
        logger.debug(f"MBA1234sx2xfdg: Response contains bio: '{response_data.get('bio', 'MISSING')}'")
        logger.debug(f"MBA1234sx2xfdg: Response contains about_me: '{response_data.get('about_me', 'MISSING')}'")
        logger.debug(f"MBA1234sx2xfdg: Response contains {len(response_data.get('pets', []))} pets")
        logger.debug(f"MBA1234sx2xfdg: Response contains {len(response_data.get('services', []))} services")
        
        return Response(response_data)
        
    except Client.DoesNotExist:
        logger.warning(f"MBA1234sx2xfdg: Client profile not found for user {user.id}")
        return Response(
            {'error': 'Client profile not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.exception(f"MBA1234sx2xfdg: Unexpected error: {str(e)}")
        return Response(
            {'error': 'An unexpected error occurred'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def clear_url_cache(request):
    """Temporary view to clear Django's URL cache."""
    clear_url_caches()
    return HttpResponse("URL cache cleared") 
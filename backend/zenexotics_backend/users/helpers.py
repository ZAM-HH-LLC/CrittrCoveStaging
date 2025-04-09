import logging
from .models import User, UserSettings
from clients.models import Client
from professionals.models import Professional
from pets.models import Pet
from services.models import Service

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
            'address': getattr(user, 'address', ""),
            'city': getattr(user, 'city', ""),
            'state': getattr(user, 'state', ""),
            'zip': getattr(user, 'zip_code', ""),
            'country': 'USA',
            'age': None,
            'profile_photo': None,
            'about_me': client.about_me,
            'emergency_contact': client.emergency_contact,
            'authorized_household_members': client.authorized_household_members,
            'home_environment': client.home_environment,
            'created_at': client.created_at,
            'updated_at': client.updated_at,
        })
        
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
        
        # Add settings structure
        response_data['settings'] = get_default_settings()
        
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

def get_default_settings():
    """Get default settings structure."""
    return [
        {'id': 'notifications', 'title': 'Push Notifications', 'type': 'toggle', 'value': True, 'icon': 'bell'},
        {'id': 'email_updates', 'title': 'Email Updates', 'type': 'toggle', 'value': True, 'icon': 'email'},
        {'id': 'privacy', 'title': 'Privacy Settings', 'type': 'link', 'icon': 'shield-account'}
    ]

def get_user_payment_methods(user):
    """Get user payment methods."""
    # Example implementation - would be replaced with actual payment method retrieval
    return [
        {'id': 3, 'type': 'bank', 'last4': '1234', 'expiry': None, 'isDefault': True, 'bankName': 'Ent Federal Credit Union'}
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
        if 'address' in data:
            user.address = data['address']
            response_data['address'] = data['address']
        if 'city' in data:
            user.city = data['city']
            response_data['city'] = data['city']
        if 'state' in data:
            user.state = data['state']
            response_data['state'] = data['state']
        if 'zip' in data:
            user.zip_code = data['zip']
            response_data['zip'] = data['zip']
        if 'country' in data:
            response_data['country'] = data['country']
        
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
                
            professional.save()
        except Professional.DoesNotExist:
            logger.debug(f"helpers.py: No professional profile found for user {user.id}")
        
        # Handle profile photo upload if included
        if 'profilePhoto' in data and data['profilePhoto']:
            # The actual upload handling would depend on your media storage configuration
            logger.debug(f"helpers.py: Profile photo update requested but not implemented")
            response_data['profilePhoto'] = "Photo upload path would go here"
        
        logger.debug(f"helpers.py: Successfully updated profile for user {user.id}. Returning only updated fields.")
        return response_data
        
    except Exception as e:
        logger.exception(f"helpers.py: Error updating profile: {str(e)}")
        raise 
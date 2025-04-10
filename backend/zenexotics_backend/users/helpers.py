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
            'profile_photo': None,
            'about_me': client.about_me,
            'emergency_contact': client.emergency_contact,
            'authorized_household_members': client.authorized_household_members,
            'home_environment': client.home_environment,
            'created_at': client.created_at,
            'updated_at': client.updated_at,
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
                'coordinates': None
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

def geocode_address(address_str, city, state, zip_code, country="USA"):
    """
    Convert an address to latitude and longitude coordinates using a geocoding service.
    
    Args:
        address_str: Street address
        city: City name
        state: State name
        zip_code: ZIP/Postal code
        country: Country name (default: USA)
        
    Returns:
        dict: A dictionary with 'lat' and 'lng' keys, or None if geocoding failed
    """
    try:
        # Format the complete address
        full_address = f"{address_str}, {city}, {state} {zip_code}, {country}"
        logger.debug(f"helpers.py: Geocoding address: {full_address}")
        
        # Check if we're using Google Maps API for geocoding
        if hasattr(settings, 'GOOGLE_MAPS_API_KEY') and settings.GOOGLE_MAPS_API_KEY:
            url = "https://maps.googleapis.com/maps/api/geocode/json"
            params = {
                "address": full_address,
                "key": settings.GOOGLE_MAPS_API_KEY
            }
            
            response = requests.get(url, params=params)
            data = response.json()
            
            if data["status"] == "OK" and data["results"]:
                location = data["results"][0]["geometry"]["location"]
                return {
                    "lat": location["lat"],
                    "lng": location["lng"]
                }
        
        # Fallback to a simple mock geocoding for development 
        # (you'd want to replace this with a real geocoding service in production)
        logger.warning("helpers.py: Using mock geocoding - replace with actual geocoding service in production")
        import hashlib
        
        # Generate deterministic but fake coordinates based on the address
        # This is just for development - DO NOT use in production
        address_hash = hashlib.md5(full_address.encode()).hexdigest()
        fake_lat = 30 + (int(address_hash[:8], 16) % 10000) / 10000.0
        fake_lng = -90 + (int(address_hash[8:16], 16) % 20000) / 10000.0
        
        return {
            "lat": fake_lat,
            "lng": fake_lng
        }
        
    except Exception as e:
        logger.error(f"helpers.py: Geocoding error: {str(e)}")
        return None

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
            
            # If address components changed, update coordinates through geocoding
            if address_updated and address.address_line_1 and address.city and address.state:
                coordinates = geocode_address(
                    address.address_line_1,
                    address.city,
                    address.state,
                    address.zip,
                    address.country
                )
                
                if coordinates:
                    address.coordinates = coordinates
                    logger.debug(f"helpers.py: Updated coordinates for user {user.id}: {coordinates}")
            
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
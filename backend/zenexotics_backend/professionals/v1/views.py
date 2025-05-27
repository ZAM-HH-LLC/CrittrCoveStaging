from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status, serializers
from django.utils import timezone
from datetime import date
from ..models import Professional
from ..serializers import ProfessionalDashboardSerializer, BookingOccurrenceSerializer, ClientProfessionalProfileSerializer
from bookings.models import Booking
from booking_occurrences.models import BookingOccurrence
import logging
from pets.models import Pet
from bookings.constants import BookingStates
from services.models import Service
from django.shortcuts import get_object_or_404
from payment_methods.models import PaymentMethod
from django.db.models import Q
from user_addresses.models import Address, AddressType
from geopy.distance import geodesic
import requests
import random
from django.contrib.postgres.search import TrigramSimilarity
from django.db.models import Case, When, Value, IntegerField

# Configure logging to print to console
logger = logging.getLogger(__name__)
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.DEBUG)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
console_handler.setFormatter(formatter)
logger.addHandler(console_handler)
logger.setLevel(logging.DEBUG)

class SimplePetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pet
        fields = ['pet_id', 'name', 'species', 'breed']

def geocode_location(location_string):
    """
    Geocode a location string using Nominatim API
    Returns (latitude, longitude) tuple or None if failed
    """
    if not location_string or location_string.strip() == '':
        return None
        
    try:
        url = 'https://nominatim.openstreetmap.org/search'
        params = {
            'q': f"{location_string}, Colorado, USA",
            'format': 'json',
            'limit': '1',
            'countrycodes': 'us',
            'addressdetails': '1'
        }
        
        headers = {
            'User-Agent': 'CrittrCove/1.0 (contact@crittrcove.com)'
        }
        
        response = requests.get(url, params=params, headers=headers, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            if data and len(data) > 0:
                result = data[0]
                lat = float(result['lat'])
                lng = float(result['lon'])
                
                # Validate coordinates are within Colorado bounds
                if 37.0 <= lat <= 41.0 and -109.0 <= lng <= -102.0:
                    return (lat, lng)
                    
        return None
    except Exception as e:
        logger.error(f"Geocoding failed for '{location_string}': {str(e)}")
        return None

def calculate_distance(coord1, coord2):
    """
    Calculate distance between two coordinate pairs using geopy
    Returns distance in miles
    """
    try:
        return geodesic(coord1, coord2).miles
    except Exception:
        return float('inf')

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_professional_dashboard(request):
    try:
        # Get professional profile from logged-in user
        try:
            professional = request.user.professional_profile
        except Professional.DoesNotExist:
            return Response(
                {'error': 'User is not registered as a professional'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get current date
        today = date.today()

        # Get upcoming confirmed bookings with at least one upcoming occurrence
        confirmed_bookings = Booking.objects.filter(
            professional=professional,
            status__in=[BookingStates.CONFIRMED, BookingStates.CONFIRMED_PENDING_PROFESSIONAL_CHANGES],
            occurrences__start_date__gte=today
        ).select_related('client__user', 'service_id').distinct()

        # Serialize the bookings
        serialized_bookings = []
        for booking in confirmed_bookings:
            # Get the next occurrence for this booking
            next_occurrence = BookingOccurrence.objects.filter(
                booking=booking,
                start_date__gte=today
            ).order_by('start_date', 'start_time').first()
            
            if next_occurrence:
                booking_data = {
                    'booking_id': booking.booking_id,
                    'client_name': booking.client.user.name,
                    'start_date': next_occurrence.start_date,
                    'start_time': next_occurrence.start_time,
                    'service_type': booking.service_id.service_name,
                    'pets': SimplePetSerializer(Pet.objects.filter(bookingpets__booking=booking), many=True).data,
                    'status': booking.status
                }
                serialized_bookings.append(booking_data)

        # Check for bank account
        has_bank_account = PaymentMethod.objects.filter(
            user=request.user,
            bank_account_last4__isnull=False
        ).exclude(
            bank_account_last4=''
        ).exists()

        # Check for services
        has_services = Service.objects.filter(professional=professional).exists()

        # Calculate onboarding progress
        onboarding_progress = {
            'profile_complete': professional.calculate_profile_completion(),
            'has_bank_account': has_bank_account,
            'has_services': has_services,
            'subscription_plan': request.user.subscription_plan
        }

        # Prepare response data
        response_data = {
            'upcoming_bookings': serialized_bookings,
            'onboarding_progress': onboarding_progress
        }

        return Response(response_data)

    except Exception as e:
        logger.error(f"Error in get_professional_dashboard: {str(e)}")
        return Response(
            {'error': 'An error occurred while fetching dashboard data'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def search_professionals(request):
    """
    Search for professionals based on various criteria
    """
    try:
        # Get search parameters
        data = request.data
        animal_types = data.get('animal_types', [])
        location = data.get('location', '').strip()
        service_query = data.get('service_query', '').strip()
        overnight_service = data.get('overnight_service', False)
        price_min = data.get('price_min', 0)
        price_max = data.get('price_max', 999999)
        radius_miles = data.get('radius_miles', 30)
        page = data.get('page', 1)
        page_size = data.get('page_size', 20)
        
        logger.debug(f"Search parameters: {data}")
        logger.debug(f"Current user: {request.user.id} ({request.user.name})")
        
        # Start with all professionals who have approved services, excluding current user
        professionals_query = Professional.objects.filter(
            service__moderation_status='APPROVED',
            service__is_active=True,
            service__searchable=True
        ).exclude(
            user=request.user  # Exclude the current user from search results
        ).distinct()
        
        logger.debug(f"Found {professionals_query.count()} professionals after excluding current user")
        
        # Get user coordinates if location is provided
        user_coords = None
        if location:
            user_coords = geocode_location(location)
            if not user_coords:
                logger.warning(f"Could not geocode location: {location}")
        
        # If no location provided, default to Colorado Springs for radius search
        if not user_coords:
            user_coords = (38.8339, -104.8214)  # Colorado Springs coordinates
        
        # Filter professionals by location (must have coordinates)
        professionals_with_location = []
        for professional in professionals_query:
            try:
                address = Address.objects.get(
                    user=professional.user,
                    address_type=AddressType.SERVICE
                )
                
                if address.coordinates and isinstance(address.coordinates, dict):
                    prof_lat = address.coordinates.get('latitude')
                    prof_lng = address.coordinates.get('longitude')
                    
                    if prof_lat and prof_lng:
                        prof_coords = (float(prof_lat), float(prof_lng))
                        distance = calculate_distance(user_coords, prof_coords)
                        
                        if distance <= radius_miles:
                            professionals_with_location.append({
                                'professional': professional,
                                'address': address,
                                'distance': distance,
                                'coordinates': prof_coords
                            })
            except Address.DoesNotExist:
                continue
        
        logger.debug(f"Found {len(professionals_with_location)} professionals within {radius_miles} miles")
        
        # Now filter services for each professional
        results = []
        
        for prof_data in professionals_with_location:
            professional = prof_data['professional']
            address = prof_data['address']
            
            # Get all approved services for this professional
            services = Service.objects.filter(
                professional=professional,
                moderation_status='APPROVED',
                is_active=True,
                searchable=True
            )
            
            # Filter by animal types if specified
            if animal_types:
                animal_filtered_services = []
                for service in services:
                    if service.animal_types and isinstance(service.animal_types, dict):
                        # Check if any of the requested animal types are in the service's animal_types
                        service_animals = list(service.animal_types.keys())
                        if any(animal.lower() in [sa.lower() for sa in service_animals] for animal in animal_types):
                            animal_filtered_services.append(service)
                services = animal_filtered_services
            
            # Filter by price range
            price_filtered_services = [
                service for service in services
                if price_min <= float(service.base_rate) <= price_max
            ]
            services = price_filtered_services
            
            if not services:
                continue
            
            # Separate services by overnight requirement and service query relevance
            exact_matches = []
            fuzzy_matches = []
            
            for service in services:
                # Check overnight requirement
                if overnight_service and not service.is_overnight:
                    # If overnight is required but service doesn't offer it, it's a fuzzy match
                    is_exact_match = False
                else:
                    # If overnight not required, or service offers overnight, it could be exact
                    is_exact_match = True
                
                # Check service query relevance
                relevance_score = 0
                if service_query:
                    service_name_lower = service.service_name.lower()
                    service_desc_lower = service.description.lower()
                    query_lower = service_query.lower()
                    
                    # Exact match in name gets highest score
                    if query_lower in service_name_lower:
                        relevance_score = 3
                    # Exact match in description gets medium score
                    elif query_lower in service_desc_lower:
                        relevance_score = 2
                    # Partial word matches get lower score
                    elif any(word in service_name_lower or word in service_desc_lower 
                            for word in query_lower.split()):
                        relevance_score = 1
                    
                    # If no relevance and we have a service query, skip this service
                    if relevance_score == 0:
                        continue
                
                service_data = {
                    'service': service,
                    'relevance_score': relevance_score,
                    'is_overnight_match': service.is_overnight if overnight_service else True
                }
                
                # Categorize as exact or fuzzy match
                if is_exact_match and (not service_query or relevance_score >= 2):
                    exact_matches.append(service_data)
                else:
                    fuzzy_matches.append(service_data)

            # Select the best service for this professional
            best_service = None
            if exact_matches:
                # Sort exact matches by relevance score, then by price
                exact_matches.sort(key=lambda x: (-x['relevance_score'], x['service'].base_rate))
                best_service = exact_matches[0]['service']
                match_type = 'exact'
            elif fuzzy_matches:
                # Sort fuzzy matches by relevance score, then by price
                fuzzy_matches.sort(key=lambda x: (-x['relevance_score'], x['service'].base_rate))
                best_service = fuzzy_matches[0]['service']
                match_type = 'fuzzy'
            
            if best_service:
                # Format location string
                location_parts = []
                if address.city:
                    location_parts.append(address.city)
                if address.state:
                    location_parts.append(address.state)
                if address.zip:
                    location_parts.append(address.zip)
                location_str = ', '.join(location_parts)
                
                # Get profile picture URL
                profile_picture_url = None
                if professional.user.profile_picture:
                    profile_picture_url = professional.user.profile_picture.url
                
                # Ensure coordinates are valid before including in result
                coord_lat = address.coordinates.get('latitude')
                coord_lng = address.coordinates.get('longitude')
                
                if coord_lat is None or coord_lng is None:
                    continue  # Skip this professional if coordinates are invalid
                
                result = {
                    'professional_id': professional.professional_id,
                    'name': professional.user.name,
                    'profile_picture_url': profile_picture_url,
                    'location': location_str,
                    'coordinates': {
                        'latitude': float(coord_lat),
                        'longitude': float(coord_lng)
                    },
                    'primary_service': {
                        'service_id': best_service.service_id,
                        'service_name': best_service.service_name,
                        'price_per_visit': float(best_service.base_rate),
                        'unit_of_time': best_service.unit_of_time,
                        'is_overnight': best_service.is_overnight
                    },
                    'match_type': match_type,
                    'distance': prof_data['distance']
                }
                results.append(result)
        
        logger.debug(f"Found {len(results)} professionals with matching services")
        
        # Separate exact and fuzzy matches for randomization
        exact_results = [r for r in results if r['match_type'] == 'exact']
        fuzzy_results = [r for r in results if r['match_type'] == 'fuzzy']
        
        # Randomize each group separately
        random.shuffle(exact_results)
        random.shuffle(fuzzy_results)
        
        # Combine with exact matches first
        final_results = exact_results + fuzzy_results
        
        # Apply pagination
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        paginated_results = final_results[start_idx:end_idx]
        
        # Remove match_type from final response (internal use only)
        for result in paginated_results:
            del result['match_type']
            del result['distance']  # Remove distance for now as requested
        
        response_data = {
            'professionals': paginated_results,
            'total_count': len(final_results),
            'has_more': end_idx < len(final_results),
            'page': page,
            'page_size': page_size
        }
        
        return Response(response_data)

    except Exception as e:
        logger.error(f"Error in search_professionals: {str(e)}")
        logger.exception("Full traceback:")
        return Response(
            {'error': 'An error occurred while searching professionals'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_professional_services(request, professional_id):
    """
    Get detailed services for a specific professional (for client view).
    Only returns APPROVED and active services that are searchable.
    """
    try:
        professional = get_object_or_404(Professional, professional_id=professional_id)
        
        # Get all approved, active, and searchable services for the professional
        services = Service.objects.filter(
            professional=professional,
            moderation_status='APPROVED',
            is_active=True,
            searchable=True
        ).prefetch_related('additional_rates')

        # Prepare response data in the same format as get_professional_services_with_rates
        services_data = []
        for service in services:
            # Get additional rates for this service
            additional_rates = [
                {
                    'rate_id': rate.rate_id,
                    'title': rate.title,
                    'description': rate.description,
                    'rate': str(rate.rate)  # Convert Decimal to string for JSON serialization
                }
                for rate in service.additional_rates.all()
            ]

            # Format the holiday rate with appropriate symbol
            holiday_rate = str(service.holiday_rate)
            if service.holiday_rate_is_percent:
                formatted_holiday_rate = f"{holiday_rate}%"
            else:
                formatted_holiday_rate = f"${holiday_rate}"

            # Format same as the services app endpoint
            service_data = {
                'service_id': service.service_id,
                'service_name': service.service_name,
                'description': service.description,
                'animal_types': service.animal_types,
                'base_rate': str(service.base_rate),
                'additional_animal_rate': str(service.additional_animal_rate),
                'holiday_rate': formatted_holiday_rate,
                'holiday_rate_is_percent': service.holiday_rate_is_percent,
                'applies_after': service.applies_after,
                'unit_of_time': service.unit_of_time,
                'is_overnight': service.is_overnight,
                'is_active': service.is_active,
                'moderation_status': service.moderation_status,
                'additional_rates': additional_rates
            }
            services_data.append(service_data)

        return Response(services_data)
        
    except Exception as e:
        logger.error(f"Error in get_professional_services: {str(e)}")
        return Response(
            {'error': 'An error occurred while fetching professional services'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

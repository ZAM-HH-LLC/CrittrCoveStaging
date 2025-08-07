from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
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
from django.db.models import Q, Count
from user_addresses.models import Address, AddressType
from geopy.distance import geodesic
import requests
import random
from django.contrib.postgres.search import TrigramSimilarity
from django.db.models import Case, When, Value, IntegerField, Avg
from reviews.models import ClientReview

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

def select_best_service_for_display(services):
    """
    Select the best service to display for a professional.
    Prioritizes by base_rate (highest first), then alphabetically by service_name.
    """
    if not services:
        return None
    
    # Sort by base_rate descending, then by service_name ascending
    sorted_services = sorted(services, 
                           key=lambda s: (float(s.base_rate), s.service_name), 
                           reverse=True)
    return sorted_services[0]

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
                # Get client's profile picture URL
                client_profile_picture = None
                if booking.client.user.profile_picture:
                    client_profile_picture = booking.client.user.profile_picture.url
                
                booking_data = {
                    'booking_id': booking.booking_id,
                    'client_name': booking.client.user.name,
                    'client_profile_picture': client_profile_picture,
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
        profile_complete = professional.calculate_profile_completion()
        
        # Log the values for debugging
        logger.info(f"Professional {professional.user.email} - profile_complete: {profile_complete}")
        logger.info(f"Professional {professional.user.email} - has_services: {has_services}")
        
        # Calculate onboarding progress
        onboarding_progress = {
            'profile_complete': profile_complete,
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


# search_pros ordering:
# Current Search Result Ordering:

#   1. Exact Match + Has Badges (randomized within this group)
#   2. Exact Match + No Badges (randomized within this group)
#   3. Fuzzy Match + Has Badges (randomized within this group)
#   4. Fuzzy Match + No Badges (randomized within this group)
#   5. Fallback + Has Badges (randomized within this group)
#   6. Fallback + No Badges (randomized within this group)

#   Match Type Definitions:

#   - Exact Match: Service meets overnight requirements (if
#   requested) AND has high service query relevance (score >= 2) OR
#    is "All Services"
#   - Fuzzy Match: Service doesn't fully meet overnight
#   requirements OR has lower service query relevance (score = 1)
#   - Fallback: Only appears when no results found for original
#   search - shows all services in Colorado Springs

#   Badge Criteria:

#   A professional "Has Badges" if they have ANY of:
#   - is_background_checked = True
#   - is_insured = True
#   - is_elite_pro = True

#   Randomization:

#   Within each of the 6 groups above, results are completely
#   randomized to ensure fairness and prevent any particular
#   professional from always appearing first.
@api_view(['POST'])
@permission_classes([AllowAny])
def search_professionals(request):
    """
    Search for professionals based on various criteria
    
    Performance optimizations:
    - Uses select_related and prefetch_related to minimize database queries
    - Batch fetches services, addresses, and reviews to avoid N+1 queries
    - Pre-aggregates review data to avoid individual calculations
    
    Recommended database indexes for optimal performance:
    - (professional_id, moderation_status, is_active, searchable, is_archived) on services table
    - (user_id, address_type) on addresses table
    - (professional_id, status, review_visible, rating) on reviews table
    - Coordinates field should be indexed for geospatial queries
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
        # Badge filters
        filter_background_checked = data.get('filter_background_checked', False)
        filter_insured = data.get('filter_insured', False)
        filter_elite_pro = data.get('filter_elite_pro', False)
        
        logger.debug(f"Search parameters: {data}")
        logger.debug(f"Current user: {request.user if request.user.is_authenticated else 'Anonymous'}")
        
        # Check if service_query is "All Services" or similar
        is_all_services = service_query.lower() in ['all services', 'all', '']
        original_service_query = service_query  # Store original for fallback messaging
        
        # Start with all professionals who have approved services - optimized with select_related
        # Exclude deleted and inactive users
        professionals_query = Professional.objects.select_related('user').prefetch_related(
            'service_set'
        ).filter(
            service__moderation_status='APPROVED',
            service__is_active=True,
            service__searchable=True,
            service__is_archived=False,
            user__is_deleted=False,  # Exclude deleted users
            user__is_active=True,  # Exclude inactive users
            user__is_profile_visible=True  # Exclude users with profile visibility off
        ).distinct()
        
        # Apply badge filters
        if filter_background_checked:
            professionals_query = professionals_query.filter(is_background_checked=True)
        if filter_insured:
            professionals_query = professionals_query.filter(is_insured=True)
        if filter_elite_pro:
            professionals_query = professionals_query.filter(is_elite_pro=True)
        
        logger.debug(f"Found {professionals_query.count()} professionals with approved services")
        
        # Get user coordinates if location is provided and not empty
        user_coords = None
        used_location = None
        if location:
            user_coords = geocode_location(location)
            if user_coords:
                used_location = location
            else:
                logger.warning(f"Could not geocode location: {location}")
        
        # If no location provided or geocoding failed, default to Colorado Springs
        if not user_coords:
            user_coords = (38.8339, -104.8214)  # Colorado Springs coordinates
            used_location = "Colorado Springs, Colorado"
        
        # Filter professionals by location (must have coordinates) - optimized batch query
        professionals_with_location = []
        
        # Pre-fetch all addresses in a single query
        addresses_dict = {}
        addresses = Address.objects.filter(
            user__in=[p.user for p in professionals_query],
            address_type=AddressType.SERVICE
        ).select_related('user')
        
        for address in addresses:
            addresses_dict[address.user.id] = address
        
        for professional in professionals_query:
            address = addresses_dict.get(professional.user.id)
            if not address:
                continue
                
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
        
        logger.debug(f"Found {len(professionals_with_location)} professionals within {radius_miles} miles")
        
        # Pre-fetch all services and reviews in batch queries to avoid N+1 queries
        professional_ids = [prof_data['professional'].professional_id for prof_data in professionals_with_location]
        
        # Batch fetch all services
        all_services = Service.objects.filter(
            professional__professional_id__in=professional_ids,
            moderation_status='APPROVED',
            is_active=True,
            searchable=True,
            is_archived=False
        ).select_related('professional')
        
        # Group services by professional
        services_by_professional = {}
        for service in all_services:
            prof_id = service.professional.professional_id
            if prof_id not in services_by_professional:
                services_by_professional[prof_id] = []
            services_by_professional[prof_id].append(service)
        
        # Batch fetch all reviews with aggregation
        reviews_data = ClientReview.objects.filter(
            professional__professional_id__in=professional_ids,
            status='APPROVED',
            review_visible=True
        ).values('professional__professional_id').annotate(
            avg_rating=Avg('rating'),
            review_count=Count('review_id')
        )
        
        # Create reviews lookup dict
        reviews_by_professional = {}
        for review_data in reviews_data:
            reviews_by_professional[review_data['professional__professional_id']] = {
                'avg_rating': review_data['avg_rating'] or 0,
                'review_count': review_data['review_count']
            }
        
        # Batch fetch latest highest reviews
        latest_reviews = ClientReview.objects.filter(
            professional__professional_id__in=professional_ids,
            status='APPROVED',
            review_visible=True,
            rating=5
        ).select_related('client__user').order_by('professional__professional_id', '-created_at').distinct('professional__professional_id')
        
        latest_reviews_by_professional = {}
        for review in latest_reviews:
            prof_id = review.professional.professional_id
            latest_reviews_by_professional[prof_id] = {
                'text': review.review_text,
                'author_profile_pic': review.client.user.profile_picture.url if (
                    review.client and 
                    review.client.user and 
                    hasattr(review.client.user, 'profile_picture') and 
                    review.client.user.profile_picture
                ) else None
            }

        # Now filter services for each professional
        results = []
        
        for prof_data in professionals_with_location:
            professional = prof_data['professional']
            address = prof_data['address']
            
            # Get services from pre-fetched data
            services = services_by_professional.get(professional.professional_id, [])
            
            # Filter by animal types if specified
            if animal_types:
                # Expand animal types to include related species
                expanded_animal_types = []
                for animal in animal_types:
                    expanded_animal_types.append(animal)
                    # If searching for lizards (singular or plural), also include bearded dragons and leopard geckos
                    if animal.lower() in ['lizard', 'lizards']:
                        expanded_animal_types.extend(['bearded dragons', 'leopard geckos'])
                
                logger.debug(f"Original animal_types: {animal_types}")
                logger.debug(f"Expanded animal_types: {expanded_animal_types}")
                
                animal_filtered_services = []
                for service in services:
                    if service.animal_types and isinstance(service.animal_types, dict):
                        # Check if any of the requested animal types are in the service's animal_types
                        service_animals = list(service.animal_types.keys())
                        logger.debug(f"Service {service.service_id} animals: {service_animals}")
                        
                        # More flexible matching logic
                        service_matched = False
                        for requested_animal in expanded_animal_types:
                            for service_animal in service_animals:
                                # Check for partial matches (ignoring case and plural/singular differences)
                                requested_lower = requested_animal.lower().strip()
                                service_lower = service_animal.lower().strip()
                                
                                # Direct substring match (both ways)
                                if requested_lower in service_lower or service_lower in requested_lower:
                                    service_matched = True
                                    break
                                
                                # Handle plurals by removing 's' for comparison
                                requested_singular = requested_lower.rstrip('s')
                                service_singular = service_lower.rstrip('s')
                                if requested_singular in service_singular or service_singular in requested_singular:
                                    service_matched = True
                                    break
                            
                            if service_matched:
                                break
                        
                        if service_matched:
                            logger.debug(f"Service {service.service_id} matched!")
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
                if service_query and not is_all_services:
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
                    
                    # If no relevance and we have a specific service query, skip this service
                    if relevance_score == 0:
                        continue
                elif is_all_services:
                    # For "All Services", include all services with high relevance
                    relevance_score = 3
                
                service_data = {
                    'service': service,
                    'relevance_score': relevance_score,
                    'is_overnight_match': service.is_overnight if overnight_service else True
                }
                
                # Categorize as exact or fuzzy match
                if is_exact_match and (is_all_services or relevance_score >= 2):
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
                
                # Get review data from pre-fetched data
                review_data = reviews_by_professional.get(professional.professional_id, {'avg_rating': 0, 'review_count': 0})
                avg_rating = review_data['avg_rating']
                review_count = review_data['review_count']
                
                # Format the average rating (5.0 if >= 4.995, otherwise round to 2 decimal places)
                formatted_avg_rating = 5.0 if avg_rating >= 4.995 else round(avg_rating, 2)
                
                # Get the latest highest-rated review text from pre-fetched data
                latest_review_data = latest_reviews_by_professional.get(professional.professional_id, {'text': None, 'author_profile_pic': None})
                latest_review_text = latest_review_data['text']
                latest_review_author_profile_pic = latest_review_data['author_profile_pic']
                
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
                    'distance': prof_data['distance'],
                    'reviews': {
                        'average_rating': formatted_avg_rating,
                        'review_count': review_count,
                        'latest_highest_review_text': latest_review_text,
                        'latest_review_author_profile_pic': latest_review_author_profile_pic
                    },
                    'badges': {
                        'is_background_checked': professional.is_background_checked,
                        'is_insured': professional.is_insured,
                        'is_elite_pro': professional.is_elite_pro
                    }
                }
                results.append(result)
        
        logger.debug(f"Found {len(results)} professionals with matching services")
        
        # Check if we need to fallback due to no results
        fallback_message = None
        if len(results) == 0 and not is_all_services and original_service_query:
            # Log the failed search
            logger.warning(f"No professionals found for service query: '{original_service_query}' in location: '{used_location}'")
            
            # Perform fallback search with "All Services" in default location (Colorado Springs)
            fallback_message = f"No professionals found for '{original_service_query}'"
            logger.info(f"Performing fallback search for all services in Colorado Springs")
            
            # Reset search to Colorado Springs with all services
            user_coords = (38.8339, -104.8214)  # Colorado Springs coordinates
            used_location = "Colorado Springs, Colorado"
            
            # Re-run the location filtering for fallback
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
            
            # Re-run service filtering for fallback (all services)
            results = []
            for prof_data in professionals_with_location:
                professional = prof_data['professional']
                address = prof_data['address']
                
                # Get all approved services for this professional
                services = Service.objects.filter(
                    professional=professional,
                    moderation_status='APPROVED',
                    is_active=True,
                    searchable=True,
                    is_archived=False
                )
                
                # Filter by animal types if specified
                if animal_types:
                    # Expand animal types to include related species
                    expanded_animal_types = []
                    for animal in animal_types:
                        expanded_animal_types.append(animal)
                        # If searching for lizards (singular or plural), also include bearded dragons and leopard geckos
                        if animal.lower() in ['lizard', 'lizards']:
                            expanded_animal_types.extend(['bearded dragons', 'leopard geckos'])
                    
                    animal_filtered_services = []
                    for service in services:
                        if service.animal_types and isinstance(service.animal_types, dict):
                            service_animals = list(service.animal_types.keys())
                            
                            # More flexible matching logic
                            service_matched = False
                            for requested_animal in expanded_animal_types:
                                for service_animal in service_animals:
                                    # Check for partial matches (ignoring case and plural/singular differences)
                                    requested_lower = requested_animal.lower().strip()
                                    service_lower = service_animal.lower().strip()
                                    
                                    # Direct substring match (both ways)
                                    if requested_lower in service_lower or service_lower in requested_lower:
                                        service_matched = True
                                        break
                                    
                                    # Handle plurals by removing 's' for comparison
                                    requested_singular = requested_lower.rstrip('s')
                                    service_singular = service_lower.rstrip('s')
                                    if requested_singular in service_singular or service_singular in requested_singular:
                                        service_matched = True
                                        break
                                
                                if service_matched:
                                    break
                            
                            if service_matched:
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
                
                # For fallback, select the best service for display (highest price first)
                best_service = select_best_service_for_display(services)
                
                # Format location string
                location_parts = []
                if address.city:
                    location_parts.append(address.city)
                if address.state:
                    location_parts.append(address.state)
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
                
                # Get review data from pre-fetched data (fallback section)
                review_data = reviews_by_professional.get(professional.professional_id, {'avg_rating': 0, 'review_count': 0})
                avg_rating = review_data['avg_rating']
                review_count = review_data['review_count']
                
                # Format the average rating
                formatted_avg_rating = 5.0 if avg_rating >= 4.995 else round(avg_rating, 2)
                
                # Get the latest highest-rated review text from pre-fetched data
                latest_review_data = latest_reviews_by_professional.get(professional.professional_id, {'text': None, 'author_profile_pic': None})
                latest_review_text = latest_review_data['text']
                latest_review_author_profile_pic = latest_review_data['author_profile_pic']
                
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
                    'match_type': 'fallback',
                    'distance': prof_data['distance'],
                    'reviews': {
                        'average_rating': formatted_avg_rating,
                        'review_count': review_count,
                        'latest_highest_review_text': latest_review_text,
                        'latest_review_author_profile_pic': latest_review_author_profile_pic
                    },
                    'badges': {
                        'is_background_checked': professional.is_background_checked,
                        'is_insured': professional.is_insured,
                        'is_elite_pro': professional.is_elite_pro
                    }
                }
                results.append(result)
        
        # Separate exact and fuzzy matches for badge-aware sorting
        exact_results = [r for r in results if r['match_type'] == 'exact']
        fuzzy_results = [r for r in results if r['match_type'] == 'fuzzy']
        fallback_results = [r for r in results if r['match_type'] == 'fallback']
        
        # Helper function to check if professional has any badges
        def has_badges(result):
            badges = result['badges']
            return badges['is_background_checked'] or badges['is_insured'] or badges['is_elite_pro']
        
        # Sort each group by badges, then randomize within badge groups
        def sort_by_badges_and_randomize(results_list):
            with_badges = [r for r in results_list if has_badges(r)]
            without_badges = [r for r in results_list if not has_badges(r)]
            
            # Randomize within each badge group
            random.shuffle(with_badges)
            random.shuffle(without_badges)
            
            # Return with badges first, then without badges
            return with_badges + without_badges
        
        # Apply badge-aware sorting to each match type group
        sorted_exact_results = sort_by_badges_and_randomize(exact_results)
        sorted_fuzzy_results = sort_by_badges_and_randomize(fuzzy_results)
        sorted_fallback_results = sort_by_badges_and_randomize(fallback_results)
        
        # Combine with exact matches first, then fuzzy, then fallback
        final_results = sorted_exact_results + sorted_fuzzy_results + sorted_fallback_results
        
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
            'page_size': page_size,
            'fallback_message': fallback_message,
            'search_location': used_location
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
@permission_classes([AllowAny])
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

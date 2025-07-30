from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
import logging
from core.common_checks import is_professional
from reviews.models import ProfessionalReview, ClientReview
from django.db.models import Avg, Max
from conversations.utils import get_user_from_conversation
from booking_occurrences.models import BookingOccurrence
from django.contrib.auth import get_user_model
from professionals.models import Professional
import json
from datetime import datetime

User = get_user_model()
logger = logging.getLogger(__name__)

# Helper function to safely log objects that might contain datetime objects
def safe_log(message, obj):
    try:
        # Try to log the object directly
        logger.info(f"{message}: {obj}")
    except TypeError:
        # If that fails, try to convert datetime objects to strings
        try:
            if isinstance(obj, dict):
                safe_obj = {}
                for k, v in obj.items():
                    if isinstance(v, datetime):
                        safe_obj[k] = v.isoformat()
                    else:
                        safe_obj[k] = v
                logger.info(f"{message}: {safe_obj}")
            elif isinstance(obj, list):
                safe_obj = []
                for item in obj:
                    if isinstance(item, datetime):
                        safe_obj.append(item.isoformat())
                    else:
                        safe_obj.append(item)
                logger.info(f"{message}: {safe_obj}")
            else:
                logger.info(f"{message}: [Object not serializable]")
        except Exception as e:
            logger.error(f"Error in safe_log: {str(e)}")
            logger.info(f"{message}: [Object logging failed]")

# This is called from two places:
# 1. From the ClientPetsModal component 
#    - In this case, the conversation_id is provided, and the professional 
#    should be the one making the request, and the result should come from the professional
#    reviews table. is_professional_param should be true here.
# 2. From the ProfessionalServicesModal component 
#    - In this case, the professional_id is provided, and the client 
#    should be the one making the request, and the result should come from the client
#    reviews table. is_professional_param should be false here.
class GetUserReviewsView(APIView):
    """
    API endpoint to get reviews for a user based on conversation ID
    """
    permission_classes = [AllowAny]

    def get(self, request):
        conversation_id = request.query_params.get('conversation_id')
        is_professional_param = request.query_params.get('is_professional', '0')
        professional_id = request.query_params.get('professional_id')

        logger.info(f"MBA32i4ofn4: Request params - conversation_id: {conversation_id}, professional_id: {professional_id}, is_professional_param: {is_professional_param}")
        
        # Convert string parameter to boolean
        is_professional_flag = is_professional_param in ['1', 'true', 'True']

        logger.info(f"MBA32i4ofn4: is_professional_flag: {is_professional_flag}")
            
        try:
            # Get the target user from the conversation
            if not conversation_id:
                logger.info(f"MBA32i4ofn4: no conversation_id provided, using professional_id: {professional_id}")
                if not professional_id:
                    logger.warning("MBA32i4ofn4: Neither conversation_id nor professional_id provided")
                    return Response(
                        {"detail": "professional_id or conversation_id is required"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                try:
                    # Get the Professional object first
                    professional = Professional.objects.get(professional_id=professional_id)
                    # Then get the associated User
                    target_user = professional.user
                    logger.info(f"MBA32i4ofn4: Found professional {professional_id} with user {target_user.id}")
                except Professional.DoesNotExist:
                    logger.error(f"MBA32i4ofn4: Professional with ID {professional_id} not found")
                    return Response(
                        {
                            "detail": f"Professional with ID {professional_id} not found",
                            "reviews": [],
                            "average_rating": 0,
                            "review_count": 0
                        },
                        status=status.HTTP_200_OK  # Return 200 with empty data instead of 404
                    )
                except Exception as e:
                    logger.error(f"MBA32i4ofn4: Error getting professional with ID {professional_id}: {str(e)}")
                    return Response(
                        {
                            "detail": f"Error retrieving professional: {str(e)}",
                            "reviews": [],
                            "average_rating": 0,
                            "review_count": 0
                        },
                        status=status.HTTP_200_OK  # Return 200 with empty data instead of 500
                    )
            else:
                target_user = get_user_from_conversation(conversation_id, not is_professional_flag)
            
            if not target_user:
                logger.warning(f"MBA32i4ofn4: Could not find {'professional' if not is_professional_flag else 'client'} in conversation")
                return Response(
                    {
                        "detail": f"Could not find {'professional' if not is_professional_flag else 'client'} in conversation",
                        "reviews": [],
                        "average_rating": 0,
                        "review_count": 0
                    },
                    status=status.HTTP_200_OK  # Return 200 with empty data instead of 404
                )
            
            logger.info(f"MBA32i4ofn4: target_user: {target_user.id} ({target_user.email})")
            
            # Determine which review model to query based on the is_professional parameter
            if not is_professional_flag:
                # If viewing as professional, get client reviews about the professional
                # The target_user is the professional
                reviews = ClientReview.objects.filter(
                    professional__user=target_user,
                    status='APPROVED',
                    review_visible=True
                ).select_related('client', 'client__user', 'booking', 'booking__service_id')

                safe_log("MBA32i4ofn4: clientreviews", reviews)
                
                # Calculate average rating
                avg_rating = reviews.aggregate(avg_rating=Avg('rating'))['avg_rating'] or 0

                logger.info(f"MBA32i4ofn4: avg_rating: {avg_rating}")
                
                reviews_data = []
                for review in reviews:
                    # Get the last booking occurrence end date for this booking
                    last_occurrence = BookingOccurrence.objects.filter(
                        booking=review.booking
                    ).order_by('-end_date', '-end_time').first()
                    
                    last_occurrence_end_date = None
                    if last_occurrence:
                        last_occurrence_end_date = last_occurrence.end_date.isoformat()
                    
                    # Get service name
                    service_name = None
                    if review.booking.service_id:
                        service_name = review.booking.service_id.service_name
                    
                    # Get reviewer's profile picture (client in this case)
                    reviewer_profile_picture = None
                    if hasattr(review.client.user, 'profile_picture') and review.client.user.profile_picture:
                        reviewer_profile_picture = str(review.client.user.profile_picture.url) if hasattr(review.client.user.profile_picture, 'url') else None
                    
                    reviews_data.append({
                        'review_id': review.review_id,
                        'professional_name': f"{review.professional.user.name}",
                        'client_name': f"{review.client.user.name}",
                        'rating': review.rating,
                        'review_text': review.review_text,
                        'created_at': review.created_at.isoformat() if review.created_at else None,
                        'last_occurrence_end_date': last_occurrence_end_date,
                        'service_name': service_name,
                        'reviewer_profile_picture': reviewer_profile_picture
                    })

                safe_log("MBA32i4ofn4: reviews_data", reviews_data)
            else:
                # If viewing as professional, get client reviews from the professional reviews table about the client
                # The target_user is the client
                reviews = ProfessionalReview.objects.filter(
                    client__user=target_user,
                    status='APPROVED',
                    review_visible=True
                ).select_related('professional', 'professional__user', 'booking', 'booking__service_id')

                safe_log("MBA32i4ofn4: pro reviews", reviews)
                
                # Calculate average rating
                avg_rating = reviews.aggregate(avg_rating=Avg('rating'))['avg_rating'] or 0

                logger.info(f"MBA32i4ofn4: avg_rating: {avg_rating}")
                
                reviews_data = []
                for review in reviews:
                    # Get the last booking occurrence end date for this booking
                    last_occurrence = BookingOccurrence.objects.filter(
                        booking=review.booking
                    ).order_by('-end_date', '-end_time').first()
                    
                    last_occurrence_end_date = None
                    if last_occurrence:
                        last_occurrence_end_date = last_occurrence.end_date.isoformat()
                    
                    # Get service name
                    service_name = None
                    if review.booking.service_id:
                        service_name = review.booking.service_id.service_name
                    
                    # Get reviewer's profile picture (professional in this case)
                    reviewer_profile_picture = None
                    if hasattr(review.professional.user, 'profile_picture') and review.professional.user.profile_picture:
                        reviewer_profile_picture = str(review.professional.user.profile_picture.url) if hasattr(review.professional.user.profile_picture, 'url') else None
                    
                    reviews_data.append({
                        'review_id': review.review_id,
                        'professional_name': f"{review.professional.user.name}",
                        'client_name': f"{review.client.user.name}",
                        'rating': review.rating,
                        'review_text': review.review_text,
                        'created_at': review.created_at.isoformat() if review.created_at else None,
                        'last_occurrence_end_date': last_occurrence_end_date,
                        'service_name': service_name,
                        'reviewer_profile_picture': reviewer_profile_picture
                    })

                safe_log("MBA32i4ofn4: reviews_data", reviews_data)
            
            return Response({
                'reviews': reviews_data,
                'average_rating': 5.0 if avg_rating >= 4.995 else round(avg_rating, 2),
                'review_count': len(reviews_data)
            })
            
        except Exception as e:
            logger.error(f"MBA32i4ofn4: Error getting reviews: {str(e)}")
            return Response(
                {
                    "detail": "Error retrieving reviews",
                    "reviews": [],
                    "average_rating": 0,
                    "review_count": 0
                },
                status=status.HTTP_200_OK  # Return 200 with empty data instead of 500
            )

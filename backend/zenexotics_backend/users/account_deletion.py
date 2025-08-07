from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from django.template.loader import render_to_string
from django.http import HttpResponse
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import User
import secrets
import string
from datetime import timedelta
import logging
import json
import pytz

logger = logging.getLogger(__name__)

def validate_user_not_deleted(user):
    """
    Check if a user is deleted and return an appropriate error response.
    Returns None if user is valid, or a Response object if user is deleted.
    """
    from rest_framework.response import Response
    from rest_framework import status as drf_status
    
    if user.is_deleted:
        return Response({
            'error': 'Cannot send messages to a deleted user account.',
            'detail': 'This user has deleted their account and is no longer receiving messages.'
        }, status=drf_status.HTTP_400_BAD_REQUEST)
    
    return None

def check_active_bookings(user):
    """
    Check if user has any active bookings that would prevent account deletion.
    Active bookings are those that are currently in progress or confirmed.
    """
    from bookings.models import Booking
    from booking_occurrences.models import BookingOccurrence
    from datetime import datetime
    
    active_statuses = ['Confirmed', 'Pending Professional Changes', 'Pending Client Approval', 'Confirmed Pending Professional Changes']
    active_bookings = []
    
    # Check as client
    if hasattr(user, 'client_profile'):
        client_bookings = Booking.objects.filter(
            client=user.client_profile,
            status__in=active_statuses
        ).select_related('professional__user', 'service_id')
        
        for booking in client_bookings:
            # Check if any occurrence is currently active
            now = timezone.now()
            current_date = now.date()
            current_time = now.time()
            
            # Check for occurrences that are currently active
            # This includes multi-day bookings and same-day bookings where time overlaps
            current_occurrences = booking.occurrences.filter(
                start_date__lte=current_date,
                end_date__gte=current_date
            )
            
            # For same-day bookings, we need to also check time
            active_occurrences = []
            for occurrence in current_occurrences:
                # If it's a multi-day booking (different start/end dates)
                if occurrence.start_date < current_date < occurrence.end_date:
                    active_occurrences.append(occurrence)
                # If it's a same-day booking, check time overlap
                elif occurrence.start_date == current_date == occurrence.end_date:
                    if occurrence.start_time <= current_time <= occurrence.end_time:
                        active_occurrences.append(occurrence)
                # If booking started before today and ends today
                elif occurrence.start_date < current_date == occurrence.end_date:
                    if current_time <= occurrence.end_time:
                        active_occurrences.append(occurrence)
                # If booking starts today and ends later
                elif occurrence.start_date == current_date < occurrence.end_date:
                    if current_time >= occurrence.start_time:
                        active_occurrences.append(occurrence)
            
            if active_occurrences:
                active_bookings.append({
                    'booking_id': booking.booking_id,
                    'role': 'client',
                    'other_party': booking.professional.user.name,
                    'service': booking.service_id.service_name if booking.service_id else 'Unknown',
                    'status': booking.status,
                    'current_occurrence': True
                })
    
    # Check as professional
    if hasattr(user, 'professional_profile'):
        pro_bookings = Booking.objects.filter(
            professional=user.professional_profile,
            status__in=active_statuses
        ).select_related('client__user', 'service_id')
        
        for booking in pro_bookings:
            # Check if any occurrence is currently active
            now = timezone.now()
            current_date = now.date()
            current_time = now.time()
            
            # Check for occurrences that are currently active
            # This includes multi-day bookings and same-day bookings where time overlaps
            current_occurrences = booking.occurrences.filter(
                start_date__lte=current_date,
                end_date__gte=current_date
            )
            
            # For same-day bookings, we need to also check time
            active_occurrences = []
            for occurrence in current_occurrences:
                # If it's a multi-day booking (different start/end dates)
                if occurrence.start_date < current_date < occurrence.end_date:
                    active_occurrences.append(occurrence)
                # If it's a same-day booking, check time overlap
                elif occurrence.start_date == current_date == occurrence.end_date:
                    if occurrence.start_time <= current_time <= occurrence.end_time:
                        active_occurrences.append(occurrence)
                # If booking started before today and ends today
                elif occurrence.start_date < current_date == occurrence.end_date:
                    if current_time <= occurrence.end_time:
                        active_occurrences.append(occurrence)
                # If booking starts today and ends later
                elif occurrence.start_date == current_date < occurrence.end_date:
                    if current_time >= occurrence.start_time:
                        active_occurrences.append(occurrence)
            
            if active_occurrences:
                active_bookings.append({
                    'booking_id': booking.booking_id,
                    'role': 'professional',
                    'other_party': booking.client.user.name,
                    'service': booking.service_id.service_name if booking.service_id else 'Unknown',
                    'status': booking.status,
                    'current_occurrence': True
                })
    
    return {
        'has_active': len(active_bookings) > 0,
        'details': active_bookings
    }

def check_incomplete_bookings(user):
    """
    Check if user has any past bookings that haven't been marked as completed yet.
    These are bookings that have finished but still need to be reviewed/completed.
    """
    from bookings.models import Booking
    from user_messages.models import UserMessage
    from datetime import datetime
    
    incomplete_bookings = []
    
    # We need to check bookings that are confirmed and have past end dates
    # but haven't been marked as completed (no review request message)
    confirmed_statuses = ['Confirmed', 'Confirmed Pending Professional Changes']
    
    # Check as client
    if hasattr(user, 'client_profile'):
        client_bookings = Booking.objects.filter(
            client=user.client_profile,
            status__in=confirmed_statuses
        ).select_related('professional__user', 'service_id')
        
        for booking in client_bookings:
            # Check if this booking has any occurrences that have ended
            now = timezone.now()
            current_date = now.date()
            current_time = now.time()
            
            # Find the latest occurrence that has ended
            past_occurrences = booking.occurrences.filter(
                end_date__lt=current_date
            ).union(
                booking.occurrences.filter(
                    end_date=current_date,
                    end_time__lt=current_time
                )
            ).order_by('-end_date', '-end_time')
            
            if past_occurrences.exists():
                # Check if there's a review request message for this booking
                # by looking for booking_confirmed messages with is_review_request=True
                review_messages = UserMessage.objects.filter(
                    conversation__participant1=user,
                    conversation__participant2=booking.professional.user,
                    type_of_message='booking_confirmed',
                    metadata__booking_id=str(booking.booking_id),
                    metadata__is_review_request=True
                ).union(
                    UserMessage.objects.filter(
                        conversation__participant1=booking.professional.user,
                        conversation__participant2=user,
                        type_of_message='booking_confirmed',
                        metadata__booking_id=str(booking.booking_id),
                        metadata__is_review_request=True
                    )
                )
                
                if not review_messages.exists():
                    last_occurrence = past_occurrences.first()
                    incomplete_bookings.append({
                        'booking_id': booking.booking_id,
                        'role': 'client',
                        'other_party': booking.professional.user.name,
                        'service': booking.service_id.service_name if booking.service_id else 'Unknown',
                        'status': booking.status,
                        'last_occurrence_end': f"{last_occurrence.end_date} {last_occurrence.end_time}",
                        'needs_completion': True
                    })
    
    # Check as professional
    if hasattr(user, 'professional_profile'):
        pro_bookings = Booking.objects.filter(
            professional=user.professional_profile,
            status__in=confirmed_statuses
        ).select_related('client__user', 'service_id')
        
        for booking in pro_bookings:
            # Check if this booking has any occurrences that have ended
            now = timezone.now()
            current_date = now.date()
            current_time = now.time()
            
            # Find the latest occurrence that has ended
            past_occurrences = booking.occurrences.filter(
                end_date__lt=current_date
            ).union(
                booking.occurrences.filter(
                    end_date=current_date,
                    end_time__lt=current_time
                )
            ).order_by('-end_date', '-end_time')
            
            if past_occurrences.exists():
                # Check if there's a review request message for this booking
                review_messages = UserMessage.objects.filter(
                    conversation__participant1=user,
                    conversation__participant2=booking.client.user,
                    type_of_message='booking_confirmed',
                    metadata__booking_id=str(booking.booking_id),
                    metadata__is_review_request=True
                ).union(
                    UserMessage.objects.filter(
                        conversation__participant1=booking.client.user,
                        conversation__participant2=user,
                        type_of_message='booking_confirmed',
                        metadata__booking_id=str(booking.booking_id),
                        metadata__is_review_request=True
                    )
                )
                
                if not review_messages.exists():
                    last_occurrence = past_occurrences.first()
                    incomplete_bookings.append({
                        'booking_id': booking.booking_id,
                        'role': 'professional',
                        'other_party': booking.client.user.name,
                        'service': booking.service_id.service_name if booking.service_id else 'Unknown',
                        'status': booking.status,
                        'last_occurrence_end': f"{last_occurrence.end_date} {last_occurrence.end_time}",
                        'needs_completion': True
                    })
    
    return {
        'has_incomplete': len(incomplete_bookings) > 0,
        'details': incomplete_bookings
    }

def get_future_bookings(user):
    """
    Get all future bookings that will be cancelled when the user deletes their account.
    """
    from bookings.models import Booking
    
    future_bookings = []
    future_statuses = ['Confirmed', 'Pending Professional Changes', 'Pending Client Approval', 'Confirmed Pending Professional Changes']
    
    # Check as client
    if hasattr(user, 'client_profile'):
        client_bookings = Booking.objects.filter(
            client=user.client_profile,
            status__in=future_statuses
        ).select_related('professional__user', 'service_id')
        
        for booking in client_bookings:
            # Get future occurrences
            now = timezone.now()
            current_date = now.date()
            current_time = now.time()
            
            future_occurrences = booking.occurrences.filter(
                start_date__gt=current_date
            ).union(
                booking.occurrences.filter(
                    start_date=current_date,
                    start_time__gt=current_time
                )
            ).order_by('start_date', 'start_time')
            
            if future_occurrences.exists():
                first_occurrence = future_occurrences.first()
                future_bookings.append({
                    'booking_id': booking.booking_id,
                    'role': 'client',
                    'other_party': booking.professional.user.name,
                    'other_party_email': booking.professional.user.email,
                    'other_party_user': booking.professional.user,  # Include full user object
                    'recipient_role': 'professional',  # Who will receive the cancellation email
                    'service': booking.service_id.service_name if booking.service_id else 'Unknown',
                    'next_occurrence_date': first_occurrence.start_date,  # Raw date object
                    'next_occurrence_time': first_occurrence.start_time,  # Raw time object
                    'total_occurrences': future_occurrences.count()
                })
    
    # Check as professional
    if hasattr(user, 'professional_profile'):
        pro_bookings = Booking.objects.filter(
            professional=user.professional_profile,
            status__in=future_statuses
        ).select_related('client__user', 'service_id')
        
        for booking in pro_bookings:
            # Get future occurrences
            now = timezone.now()
            current_date = now.date()
            current_time = now.time()
            
            future_occurrences = booking.occurrences.filter(
                start_date__gt=current_date
            ).union(
                booking.occurrences.filter(
                    start_date=current_date,
                    start_time__gt=current_time
                )
            ).order_by('start_date', 'start_time')
            
            if future_occurrences.exists():
                first_occurrence = future_occurrences.first()
                future_bookings.append({
                    'booking_id': booking.booking_id,
                    'role': 'professional',
                    'other_party': booking.client.user.name,
                    'other_party_email': booking.client.user.email,
                    'other_party_user': booking.client.user,  # Include full user object
                    'recipient_role': 'client',  # Who will receive the cancellation email
                    'service': booking.service_id.service_name if booking.service_id else 'Unknown',
                    'next_occurrence_date': first_occurrence.start_date,  # Raw date object
                    'next_occurrence_time': first_occurrence.start_time,  # Raw time object
                    'total_occurrences': future_occurrences.count()
                })
    
    return future_bookings

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def request_account_deletion(request):
    """
    Request account deletion. Sends confirmation email to user.
    Required POST data:
    - reason: The reason for account deletion (required)
    """
    user = request.user
    
    # Require deletion reason
    deletion_reason = request.data.get('reason', '').strip()
    if not deletion_reason:
        return Response({
            'error': 'Deletion reason is required.',
            'detail': 'Please provide a reason for deleting your account.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Log user information before deletion for audit purposes
    logger.info(f'Account deletion requested by user: {user.email} (ID: {user.user_id}, Name: {user.name}). Reason: {deletion_reason}')
    
    # Log to error_logs table for production auditing
    try:
        from error_logs.models import ErrorLog
        ErrorLog.objects.create(
            user=user,
            endpoint='/api/users/v1/request-deletion/',
            error_message=f'AUDIT: User {user.email} (ID: {user.user_id}, Name: {user.name}) requested account deletion. Reason: {deletion_reason}',
            metadata={
                'event_type': 'account_deletion_request',
                'user_id': user.user_id,
                'user_email': user.email,
                'user_name': user.name,
                'deletion_reason': deletion_reason,
                'method': 'POST'
            }
        )
    except Exception as log_error:
        logger.error(f'Failed to log account deletion request to database: {log_error}')
    
    # Check if user already has a pending deletion request
    if user.is_deletion_requested:
        return Response({
            'error': 'Account deletion already requested. Check your email for confirmation link.',
            'requested_at': user.deletion_requested_at
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if account is already deleted
    if user.is_deleted:
        return Response({
            'error': 'Account is already deleted.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Check for active bookings that would prevent deletion
        active_bookings = check_active_bookings(user)
        if active_bookings['has_active']:
            return Response({
                'error': 'Cannot delete account with active bookings.',
                'active_bookings': active_bookings['details'],
                'message': 'Please wait for current bookings to complete or contact the other party to cancel them.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check for incomplete past bookings that would prevent deletion
        incomplete_bookings = check_incomplete_bookings(user)
        if incomplete_bookings['has_incomplete']:
            return Response({
                'error': f'Cannot delete account with incomplete bookings (IDs: {", ".join([str(booking["booking_id"]) for booking in incomplete_bookings["details"]])}). Please mark all bookings in the past as complete before attempting to delete account',
                'incomplete_bookings': incomplete_bookings['details'],
                'message': 'Please complete all past bookings (mark them as completed) before deleting your account.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get information about future bookings that will be cancelled
        future_bookings = get_future_bookings(user)
        
        # Generate confirmation token
        token = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(50))
        
        # Set deletion request fields
        user.is_deletion_requested = True
        user.deletion_requested_at = timezone.now()
        user.deletion_confirmation_token = token
        user.deletion_token_expires_at = timezone.now() + timedelta(days=7)  # 7 days to confirm
        user.save()
        
        # Send confirmation email
        send_deletion_confirmation_email(user, token, future_bookings, request)
        
        # Send admin notification email
        send_admin_deletion_notification(user, deletion_reason)
        
        logger.info(f'Account deletion requested for user {user.email}')
        
        return Response({
            'message': 'Account deletion request submitted. Please check your email to confirm.',
            'expires_at': user.deletion_token_expires_at,
            'future_bookings_to_cancel': len(future_bookings),
            'warning': f'This will cancel {len(future_bookings)} upcoming booking(s) and notify the other parties.' if future_bookings else None
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        # Log the detailed error for debugging
        logger.error(f'Error requesting account deletion for user {user.email}: {str(e)}')
        logger.exception("Full account deletion request error details:")
        
        # Log to error_logs table for production debugging
        try:
            from error_logs.models import ErrorLog
            ErrorLog.objects.create(
                user=user,
                endpoint='/api/users/v1/request-deletion/',
                error_message=f'ERROR: Account deletion request failed for user {user.email}: {str(e)}',
                metadata={
                    'event_type': 'account_deletion_request_error',
                    'user_id': user.user_id,
                    'user_email': user.email,
                    'error_type': type(e).__name__,
                    'method': 'POST'
                }
            )
        except Exception as log_error:
            logger.error(f'Failed to log error to database: {log_error}')
        
        # Include the actual error message in development/staging for debugging
        error_detail = str(e) if settings.DEBUG else 'Failed to process deletion request. Please try again or contact support.'
        
        return Response({
            'error': error_detail,
            'debug_info': f'Error type: {type(e).__name__}' if settings.DEBUG else None
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def confirm_account_deletion(request):
    """
    Confirm account deletion with token from email.
    """
    token = request.data.get('token')
    
    if not token:
        return Response({
            'error': 'Deletion confirmation token is required.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(
            deletion_confirmation_token=token,
            is_deletion_requested=True,
            is_deleted=False
        )
    except User.DoesNotExist:
        return Response({
            'error': 'Invalid or expired deletion confirmation token.'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Check if token has expired
    if timezone.now() > user.deletion_token_expires_at:
        return Response({
            'error': 'Deletion confirmation token has expired. Please request deletion again.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Perform account deletion
        perform_account_deletion(user)
        
        logger.info(f'Account deletion confirmed and processed for user {user.email}')
        
        return Response({
            'message': 'Account deletion completed successfully.'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        # Log the detailed error for debugging
        logger.error(f'Error confirming account deletion for user {user.email}: {str(e)}')
        logger.exception("Full account deletion confirmation error details:")
        
        # Log to error_logs table for production debugging
        try:
            from error_logs.models import ErrorLog
            ErrorLog.objects.create(
                user=user,
                endpoint='/api/users/v1/confirm-deletion/',
                error_message=f'ERROR: Account deletion confirmation failed for user {user.email}: {str(e)}',
                metadata={
                    'event_type': 'account_deletion_confirm_error',
                    'user_id': user.user_id,
                    'user_email': user.email,
                    'error_type': type(e).__name__,
                    'method': 'POST'
                }
            )
        except Exception as log_error:
            logger.error(f'Failed to log error to database: {log_error}')
        
        # Include the actual error message in development/staging for debugging
        error_detail = str(e) if settings.DEBUG else 'Failed to complete account deletion. Please contact support.'
        
        return Response({
            'error': error_detail,
            'debug_info': f'Error type: {type(e).__name__}' if settings.DEBUG else None
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_account_deletion(request):
    """
    Cancel a pending account deletion request.
    """
    user = request.user
    
    if not user.is_deletion_requested or user.is_deleted:
        return Response({
            'error': 'No pending deletion request found.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Clear deletion request fields
    user.is_deletion_requested = False
    user.deletion_requested_at = None
    user.deletion_confirmation_token = ''
    user.deletion_token_expires_at = None
    user.save()
    
    logger.info(f'Account deletion cancelled for user {user.email}')
    
    return Response({
        'message': 'Account deletion request cancelled successfully.'
    }, status=status.HTTP_200_OK)

def perform_account_deletion(user):
    """
    Perform the actual account deletion with data retention policies.
    """
    from bookings.models import Booking
    from payments.models import Payment
    from user_messages.models import UserMessage
    
    # Log the start of actual account deletion process
    logger.info(f'Starting account deletion process for user: {user.email} (ID: {user.user_id}, Name: {user.name})')
    
    # Log to error_logs table for production auditing
    try:
        from error_logs.models import ErrorLog
        ErrorLog.objects.create(
            user=user,
            endpoint='/api/users/v1/confirm-deletion/',
            error_message=f'AUDIT: User {user.email} (ID: {user.user_id}, Name: {user.name}) confirmed account deletion. Processing deletion now.',
            metadata={
                'event_type': 'account_deletion_confirmed',
                'user_id': user.user_id,
                'user_email': user.email,
                'user_name': user.name,
                'method': 'POST'
            }
        )
    except Exception as log_error:
        logger.error(f'Failed to log account deletion confirmation to database: {log_error}')
    
    # 1. Cancel all future bookings and notify other parties
    cancel_future_bookings(user)
    
    # 2. Handle message data - soft delete approach to preserve conversations
    handle_message_data_for_deletion(user)
    
    # 3. Anonymize personal data
    anonymize_personal_data(user)
    
    # 4. Anonymize pet data
    anonymize_pet_data(user)
    
    # 5. Handle bookings (retain for business purposes, anonymize user info)
    anonymize_booking_data(user)
    
    # 6. Retain financial records (required for 7 years)
    anonymize_payment_data(user)
    
    # 7. Mark account as deleted
    user.is_deleted = True
    user.deleted_at = timezone.now()
    user.is_active = False
    user.save()
    
    # Final log entry for completed account deletion
    logger.info(f'Account deletion completed for user: {user.email} (ID: {user.user_id})')
    
    # Log completion to error_logs table
    try:
        from error_logs.models import ErrorLog
        ErrorLog.objects.create(
            user=user,
            endpoint='/api/users/v1/confirm-deletion/',
            error_message=f'AUDIT: Account deletion completed for user {user.email} (ID: {user.user_id}). Account has been anonymized and marked as deleted.',
            metadata={
                'event_type': 'account_deletion_completed',
                'user_id': user.user_id,
                'user_email': user.email,
                'method': 'POST'
            }
        )
    except Exception as log_error:
        logger.error(f'Failed to log account deletion completion to database: {log_error}')

def cancel_future_bookings(user):
    """
    Cancel all future bookings and send notifications to other parties.
    """
    from bookings.models import Booking
    from core.email_utils import send_booking_cancellation_email
    
    future_bookings = get_future_bookings(user)
    
    for booking_info in future_bookings:
        try:
            booking = Booking.objects.get(booking_id=booking_info['booking_id'])
            
            # Update booking status to cancelled
            booking.status = 'Cancelled'
            booking.cancelled_by = user
            booking.save()
            
            # Send notification to the other party
            other_party_email = booking_info['other_party_email']
            other_party_name = booking_info['other_party']
            other_party_user = booking_info['other_party_user']
            recipient_role = booking_info['recipient_role']
            
            # Prepare email context with timezone and role information
            email_context = {
                'booking_id': booking.booking_id,
                'service_name': booking_info['service'],
                'cancelled_by_name': user.name,
                'other_party_name': other_party_name,
                'other_party_user': other_party_user,  # Full user object for timezone
                'recipient_role': recipient_role,  # 'client' or 'professional'
                'reason': f"{user.name} has deleted their CrittrCove account",
                'next_occurrence_date': booking_info['next_occurrence_date'],  # Raw date
                'next_occurrence_time': booking_info['next_occurrence_time'],  # Raw time
                'total_occurrences': booking_info['total_occurrences']
            }
            
            # Send cancellation email (implement this in core/email_utils.py)
            try:
                send_booking_cancellation_email(other_party_email, email_context)
                logger.info(f'Cancellation notification sent for booking {booking.booking_id} to {other_party_email}')
            except Exception as email_error:
                logger.error(f'Failed to send cancellation email for booking {booking.booking_id}: {str(email_error)}')
            
        except Exception as e:
            logger.error(f'Error cancelling booking {booking_info["booking_id"]}: {str(e)}')

def handle_message_data_for_deletion(user):
    """
    Handle message data when user is deleted. 
    We soft-delete messages but preserve conversation history for other users.
    """
    from user_messages.models import UserMessage
    
    # Instead of hard deleting messages, we'll anonymize the sender info
    # but keep the message content for the conversation history of other users
    user_messages = UserMessage.objects.filter(sender=user)
    
    for message in user_messages:
        # Store original sender info in an anonymized form
        message.sender_name_backup = f"Deleted User {user.user_id}"
        message.is_sender_deleted = True
        # The CASCADE will handle the foreign key, but we preserve the message content
        message.save()
    
    logger.info(f'Anonymized {user_messages.count()} messages for deleted user {user.email}')

def anonymize_personal_data(user):
    """
    Anonymize or delete personal data that doesn't need to be retained.
    """
    # Keep email in anonymized form for record keeping
    domain = user.email.split('@')[1] if '@' in user.email else 'unknown.com'
    user.email = f"deleted_user_{user.id}@{domain}"
    user.name = f"Deleted User {user.id}"
    user.phone_number = ""
    user.birthday = None
    user.profile_picture = None
    
    # Clear deletion tokens
    user.deletion_confirmation_token = ""
    user.deletion_token_expires_at = None

def anonymize_pet_data(user):
    """
    Anonymize pet information for the deleted user.
    """
    from pets.models import Pet
    
    # Anonymize all pets owned by this user
    user_pets = Pet.objects.filter(owner=user)
    anonymized_count = 0
    
    for pet in user_pets:
        # Anonymize pet personal information
        pet.name = f"Deleted Pet {pet.pet_id}"
        pet.pet_description = ""
        pet.feeding_schedule = ""
        pet.potty_break_schedule = ""
        pet.medications = ""
        pet.medication_notes = ""
        pet.special_care_instructions = ""
        
        # Anonymize veterinary information
        pet.vet_name = ""
        pet.vet_address = ""
        pet.vet_phone = ""
        pet.insurance_provider = ""
        pet.vet_documents = []
        
        # Clear photos (but keep the pet record for booking history)
        if pet.profile_photo:
            try:
                storage = pet.profile_photo.storage
                if storage.exists(pet.profile_photo.name):
                    storage.delete(pet.profile_photo.name)
            except Exception as e:
                logger.warning(f"Failed to delete profile photo for pet {pet.pet_id}: {str(e)}")
            pet.profile_photo = None
        
        # Clear gallery photos
        if pet.photo_gallery:
            storage = pet.profile_photo.storage if pet.profile_photo else None
            for path in pet.photo_gallery:
                try:
                    if storage and storage.exists(path):
                        storage.delete(path)
                except Exception as e:
                    logger.warning(f"Failed to delete gallery photo {path} for pet {pet.pet_id}: {str(e)}")
            pet.photo_gallery = []
        
        # Set owner to None (for CASCADE protection but keep pet record)
        pet.owner = None
        pet.save()
        anonymized_count += 1
    
    logger.info(f'Anonymized {anonymized_count} pets for deleted user {user.email}')

def anonymize_booking_data(user):
    """
    Anonymize booking data while retaining for business purposes.
    """
    from bookings.models import Booking
    
    # For bookings where user was client - keep booking records but anonymize references
    if hasattr(user, 'client_profile'):
        client = user.client_profile
        # The CASCADE will handle client profile deletion
        # Bookings will remain with SET_NULL for user references
    
    # For bookings where user was professional - similar handling
    if hasattr(user, 'professional_profile'):
        professional = user.professional_profile
        # The CASCADE will handle professional profile deletion
        # Bookings will remain with SET_NULL for user references

def anonymize_payment_data(user):
    """
    Retain payment data for legal compliance but anonymize where possible.
    """
    from payments.models import Payment
    
    # Payments have CASCADE to user, but we need to retain financial records
    # We'll handle this by updating the CASCADE to SET_NULL and keeping payment records
    # This would require a migration to change the foreign key relationship

def anonymize_message_data(user):
    """
    Handle message data - retain for legal protection but anonymize sender info.
    """
    from user_messages.models import UserMessage
    
    # Messages have CASCADE to sender, but we want to retain them
    # We'll need to change this to SET_NULL and keep anonymized records
    # This would require a migration to change the foreign key relationship

def send_deletion_confirmation_email(user, token, future_bookings=None, request=None):
    """
    Send account deletion confirmation email to user.
    """
    subject = 'CrittrCove - Confirm Account Deletion'
    
    # Create confirmation URL - point to frontend page that will handle the confirmation
    frontend_url = settings.FRONTEND_BASE_URL
    confirmation_url = f"{frontend_url}/confirm-account-deletion?token={token}"
    
    # Prepare future bookings text
    future_bookings_text = ""
    if future_bookings:
        future_bookings_text = f"""
    
    IMPORTANT: Deleting your account will cancel {len(future_bookings)} upcoming booking(s):
    """
        for booking in future_bookings[:3]:  # Show first 3 bookings
            # Format the occurrence time in the user's timezone
            from core.time_utils import get_user_time_settings, convert_from_utc
            from datetime import datetime, timezone as dt_timezone
            
            # Get user's timezone settings
            user_settings = get_user_time_settings(user.id)
            user_timezone = user_settings['timezone']
            use_military_time = user_settings['use_military_time']
            
            # Combine date and time into a UTC datetime
            occurrence_date = booking['next_occurrence_date']
            occurrence_time = booking['next_occurrence_time']
            utc_dt = datetime.combine(occurrence_date, occurrence_time, dt_timezone.utc)
            
            # Convert to user's timezone
            local_dt = convert_from_utc(utc_dt, user_timezone)
            
            # Format according to user's preferences
            time_format = '%H:%M' if use_military_time else '%I:%M %p'
            formatted_time = local_dt.strftime(time_format).lstrip('0')
            formatted_date = local_dt.strftime('%B %d, %Y')
            formatted_occurrence = f"{formatted_date} at {formatted_time}"
            
            future_bookings_text += f"""
    - {booking['service']} with {booking['other_party']} (next occurrence: {formatted_occurrence})"""
        
        if len(future_bookings) > 3:
            future_bookings_text += f"\n    ... and {len(future_bookings) - 3} more booking(s)"
        
        future_bookings_text += "\n\n    The other parties will be automatically notified of these cancellations."
        future_bookings_text += "\n\n    WE RECOMMEND YOU REACH OUT TO THE OTHER PARTY TO CANCEL TO ENSURE YOUR REPUTATION STAYS IN TACT."
    
    # Render email template
    html_message = render_to_string('emails/account_deletion_confirmation.html', {
        'user': user,
        'confirmation_url': confirmation_url,
        'expires_at': user.deletion_token_expires_at,
        'future_bookings': future_bookings,
        'future_bookings_text': future_bookings_text,
    })
    
    text_message = f"""
    Hi {user.name},
    
    You have requested to delete your CrittrCove account. This action is irreversible.{future_bookings_text}
    
    If you're sure you want to delete your account, click the link below to confirm:
    {confirmation_url}
    
    This confirmation link will expire on {user.deletion_token_expires_at.strftime('%B %d, %Y at %I:%M %p UTC')}.
    
    If you didn't request this deletion, please ignore this email or contact support.
    
    Important: Once confirmed, your account deletion will be processed within 60 days. Some data may be retained for legal compliance as outlined in our Terms of Service and Privacy Policy.
    
    What happens to your data:
    - Personal information will be anonymized
    - Conversation history will be preserved for other users but your name will show as "Deleted User"
    - Booking history will be retained for business records but anonymized
    - Financial records will be kept for 7 years for legal compliance
    
    Best regards,
    The CrittrCove Team
    """
    
    send_mail(
        subject=subject,
        message=text_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        html_message=html_message,
        fail_silently=False,
    )

def send_admin_deletion_notification(user, deletion_reason):
    """
    Send admin notification email about user account deletion request.
    """
    # Convert current time to Mountain Time
    mountain_tz = pytz.timezone('America/Denver')
    current_time_mt = timezone.now().astimezone(mountain_tz)
    formatted_time_mt = current_time_mt.strftime('%B %d, %Y at %I:%M %p MT')
    
    subject = f'CrittrCove - Account Deletion Request: {user.name}'
    
    message = f"""
Account Deletion Request Received

User Details:
- Name: {user.name}
- Email: {user.email}
- User ID: {user.user_id}
- Request Time: {formatted_time_mt}

Deletion Reason:
{deletion_reason}

This user has requested to delete their CrittrCove account. They will receive a confirmation email and must confirm the deletion within 7 days.

CrittrCove Admin System
"""
    
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[settings.DEFAULT_FROM_EMAIL],  # Send to backend email
            fail_silently=False,
        )
        logger.info(f'Admin notification sent for account deletion request by {user.email}')
    except Exception as e:
        logger.error(f'Failed to send admin notification for account deletion request by {user.email}: {str(e)}')

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_deletion_status(request):
    """
    Get the current deletion status for the authenticated user.
    """
    user = request.user
    
    return Response({
        'is_deletion_requested': user.is_deletion_requested,
        'deletion_requested_at': user.deletion_requested_at,
        'deletion_token_expires_at': user.deletion_token_expires_at,
        'is_deleted': user.is_deleted,
        'deleted_at': user.deleted_at,
    }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_user_data(request):
    """
    Export all user data for download before account deletion.
    """
    user = request.user
    
    try:
        # Collect all user data
        user_data = {
            'account_info': {
                'user_id': user.user_id,
                'email': user.email,
                'name': user.name,
                'phone_number': user.phone_number,
                'birthday': user.birthday.isoformat() if user.birthday else None,
                'created_at': user.created_at.isoformat(),
                'last_login': user.last_login.isoformat() if user.last_login else None,
                'how_did_you_hear': user.how_did_you_hear,
                'how_did_you_hear_other': user.how_did_you_hear_other,
                'terms_and_privacy_accepted_at': user.terms_and_privacy_accepted_at.isoformat() if user.terms_and_privacy_accepted_at else None,
                'terms_and_privacy_version': user.terms_and_privacy_version,
            },
            'profile_data': {},
            'booking_data': {},
            'message_data': {},
            'settings_data': {},
            'exported_at': timezone.now().isoformat(),
            'export_version': '1.0'
        }
        
        # Add client profile data if exists
        if hasattr(user, 'client_profile'):
            client = user.client_profile
            user_data['profile_data']['client_profile'] = {
                'about_me': client.about_me,
                'emergency_contact': client.emergency_contact,
                'authorized_household_members': client.authorized_household_members,
                'created_at': client.created_at.isoformat(),
                'updated_at': client.updated_at.isoformat(),
            }
            
            # Add pet data
            if hasattr(client, 'pets'):
                pets_data = []
                for pet in client.pets.all():
                    pets_data.append({
                        'name': pet.name,
                        'species': pet.species,
                        'breed': pet.breed,
                        'age': pet.age,
                        'weight': float(pet.weight) if pet.weight else None,
                        'special_instructions': pet.special_instructions,
                        'created_at': pet.created_at.isoformat(),
                        'updated_at': pet.updated_at.isoformat(),
                    })
                user_data['profile_data']['pets'] = pets_data
        
        # Add professional profile data if exists
        if hasattr(user, 'professional_profile'):
            professional = user.professional_profile
            user_data['profile_data']['professional_profile'] = {
                'bio': professional.bio,
                'is_insured': professional.is_insured,
                'is_background_checked': professional.is_background_checked,
                'is_elite_pro': professional.is_elite_pro,
                'created_at': professional.created_at.isoformat(),
                'updated_at': professional.updated_at.isoformat(),
            }
        
        # Add user settings
        if hasattr(user, 'settings'):
            settings_obj = user.settings
            user_data['settings_data'] = {
                'timezone': settings_obj.timezone,
                'use_military_time': settings_obj.use_military_time,
                'push_notifications': settings_obj.push_notifications,
                'email_updates': settings_obj.email_updates,
                'marketing_communications': settings_obj.marketing_communications,
                'privacy_settings': settings_obj.privacy_settings,
            }
        
        # Add addresses
        addresses_data = []
        for address in user.addresses.all():
            addresses_data.append({
                'address_line_1': address.address_line_1,
                'address_line_2': address.address_line_2,
                'city': address.city,
                'state': address.state,
                'zip_code': address.zip_code,
                'country': address.country,
                'is_primary': address.is_primary,
                'created_at': address.created_at.isoformat(),
                'updated_at': address.updated_at.isoformat(),
            })
        user_data['profile_data']['addresses'] = addresses_data
        
        # Add booking summary (anonymized for privacy)
        booking_count = 0
        if hasattr(user, 'client_profile'):
            booking_count += user.client_profile.bookings.count()
        if hasattr(user, 'professional_profile'):
            booking_count += user.professional_profile.bookings.count()
        
        user_data['booking_data']['total_bookings'] = booking_count
        
        # Add message summary (count only for privacy)
        message_count = user.sent_messages.count() if hasattr(user, 'sent_messages') else 0
        user_data['message_data']['total_messages_sent'] = message_count
        
        # Create JSON response for download
        response = HttpResponse(
            json.dumps(user_data, indent=2),
            content_type='application/json'
        )
        response['Content-Disposition'] = f'attachment; filename="crittrcove_data_export_{user.user_id}_{timezone.now().strftime("%Y%m%d")}.json"'
        
        logger.info(f'Data export generated for user {user.email}')
        
        return response
        
    except Exception as e:
        logger.error(f'Error exporting data for user {user.email}: {str(e)}')
        return Response({
            'error': 'Failed to export user data. Please try again or contact support.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
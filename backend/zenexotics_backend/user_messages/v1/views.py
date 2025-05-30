from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from ..models import UserMessage
from conversations.models import Conversation
from django.utils import timezone
from clients.models import Client
from professionals.models import Professional
from services.models import Service
from pets.models import Pet
import logging
from datetime import datetime
from bookings.models import Booking
from booking_summary.models import BookingSummary
from booking_drafts.models import BookingDraft
from django.db.models import Q, Sum
from core.time_utils import (
    convert_to_utc,
    convert_from_utc,
    format_booking_occurrence,
    get_user_time_settings
)
import pytz
from decimal import Decimal
import traceback

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_conversation_messages(request, conversation_id):
    """
    Get messages for a specific conversation.
    Messages are paginated with a fixed page size of 20, ordered by most recent first.
    Page number can be specified in the query params, defaults to 1.
    """
    try:
        # Get the conversation and verify the user is a participant
        conversation = get_object_or_404(Conversation, conversation_id=conversation_id)
        current_user = request.user

        if current_user not in [conversation.participant1, conversation.participant2]:
            return Response(
                {'error': 'You are not a participant in this conversation'}, 
                status=status.HTTP_403_FORBIDDEN
            )

        # Get page number from query params, default to 1
        page = int(request.GET.get('page', 1))
        page_size = 20
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size

        # Get messages for this conversation
        messages = UserMessage.objects.filter(
            conversation=conversation
        ).order_by('-timestamp')[start_idx:end_idx]

        messages_data = []
        
        for message in messages:
            # Initialize message data with common fields
            message_data = {
                'message_id': message.message_id,
                'sent_by_other_user': message.sender != current_user,
                'content': message.content,
                'timestamp': message.timestamp,
                'status': message.status,
                'type_of_message': message.type_of_message,
                'is_clickable': message.is_clickable,
                'metadata': message.metadata.copy() if message.metadata else {},
                'is_deleted': False,
                'booking_id': None
            }

            # Handle booking request messages
            if message.type_of_message == 'initial_booking_request' and message.metadata:
                booking_id = message.metadata.get('booking_id')
                
                if booking_id:
                    try:
                        booking = Booking.objects.get(booking_id=booking_id)
                        message_data['is_deleted'] = booking.status in ['CANCELLED', 'DECLINED']
                        message_data['booking_id'] = booking_id

                        # Get the booking occurrences from the database
                        if not message_data['is_deleted']:
                            formatted_occurrences = []
                            for occurrence in booking.occurrences.all():
                                try:
                                    # Create timezone-aware datetime objects
                                    start_dt = datetime.combine(occurrence.start_date, occurrence.start_time)
                                    end_dt = datetime.combine(occurrence.end_date, occurrence.end_time)
                                    
                                    # Make datetimes timezone-aware in UTC
                                    start_dt = pytz.UTC.localize(start_dt)
                                    end_dt = pytz.UTC.localize(end_dt)
                                    
                                    # Format the times according to user preferences
                                    formatted_times = format_booking_occurrence(
                                        start_dt,
                                        end_dt,
                                        current_user.id
                                    )
                                    formatted_occurrences.append(formatted_times)
                                except Exception as e:
                                    logger.error(f"Error formatting occurrence: {str(e)}")
                                    continue
                            
                            message_data['metadata']['occurrences'] = formatted_occurrences
                    except Booking.DoesNotExist:
                        message_data['is_deleted'] = True
                else:
                    message_data['is_deleted'] = True

            messages_data.append(message_data)

        # Mark unread messages as read
        UserMessage.objects.filter(
            conversation=conversation,
            sender=conversation.participant2 if conversation.participant1 == current_user else conversation.participant1,
            status='sent'
        ).update(status='read')

        # Check for existing draft
        has_draft = False
        draft_data = None
        try:
            # Get the other participant
            other_user = conversation.participant2 if conversation.participant1 == current_user else conversation.participant1
            
            # Determine if current user is professional
            is_professional = Professional.objects.filter(user=current_user).exists()
            
            if is_professional:
                # For professionals, check for drafts where they are the professional and other user is client
                draft = BookingDraft.objects.filter(
                    Q(booking=None) | Q(booking__client__user=other_user),
                    draft_data__has_key='client_id',
                    draft_data__client_id=Client.objects.get(user=other_user).id,
                    draft_data__professional_id=Professional.objects.get(user=current_user).professional_id,
                    status='IN_PROGRESS'
                ).first()
            else:
                # For clients, check for drafts where they are the client and other user is professional
                draft = BookingDraft.objects.filter(
                    Q(booking=None) | Q(booking__client__user=current_user),
                    draft_data__has_key='client_id',
                    draft_data__client_id=Client.objects.get(user=current_user).id,
                    draft_data__professional_id=Professional.objects.get(user=other_user).professional_id,
                    status='IN_PROGRESS'
                ).first()
            
            if draft:
                has_draft = True
                draft_data = {
                    'draft_id': draft.draft_id,
                    'booking_id': draft.booking.booking_id if draft.booking else None,
                    'status': draft.status,
                    'last_modified_by': draft.last_modified_by
                }
        except Exception as e:
            logger.error(f"Error checking for draft: {str(e)}")
            logger.error(f"Full traceback: {traceback.format_exc()}")

        return Response({
            'messages': messages_data,
            'has_more': len(messages) == page_size,
            'has_draft': has_draft,
            'draft_data': draft_data
        })

    except Exception as e:
        logger.error(f"Error in get_conversation_messages: {str(e)}")
        return Response(
            {'error': 'An error occurred while fetching messages'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_normal_message(request):
    """
    Send a normal message in a conversation.
    Required POST data:
    - conversation_id: ID of the conversation
    - content: Text content of the message
    """
    try:
        conversation_id = request.data.get('conversation_id')
        content = request.data.get('content')

        # Validate required fields
        if not conversation_id or not content:
            return Response(
                {'error': 'conversation_id and content are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get the conversation and verify the user is a participant
        conversation = get_object_or_404(Conversation, conversation_id=conversation_id)
        current_user = request.user

        if current_user not in [conversation.participant1, conversation.participant2]:
            return Response(
                {'error': 'You are not a participant in this conversation'}, 
                status=status.HTTP_403_FORBIDDEN
            )

        # Create the message
        message = UserMessage.objects.create(
            conversation=conversation,
            sender=current_user,
            content=content,
            type_of_message='normal_message',
            is_clickable=False,
            status='sent'
        )

        # Update conversation's last message and time
        conversation.last_message = content
        conversation.last_message_time = timezone.now()
        conversation.save()

        # Return only necessary data since we know it's from current user
        return Response({
            'message_id': message.message_id,
            'content': message.content,
            'timestamp': message.timestamp,
            'booking_id': None,
            'status': message.status,
            'type_of_message': message.type_of_message,
            'is_clickable': message.is_clickable
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_prerequest_booking_data(request, conversation_id):
    """
    Get pre-request booking data for a conversation.
    Returns:
    - Available services from the professional
    - Client's pets
    """
    try:
        logger.info(f"Fetching prerequest booking data for conversation {conversation_id}")
        logger.info(f"Request user: {request.user.email}")
        
        # Get the conversation and validate access
        conversation = get_object_or_404(Conversation, conversation_id=conversation_id)
        logger.info(f"Found conversation: {conversation.conversation_id}")
        
        # Verify the requesting user is part of this conversation
        if request.user.id not in [conversation.participant1_id, conversation.participant2_id]:
            logger.warning(f"User {request.user.id} not authorized for conversation {conversation_id}")
            return Response(
                {"error": "Not authorized to access this conversation"},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get the client (must be the requesting user)
        try:
            client = Client.objects.get(user=request.user)
            logger.info(f"Found client: {client.user.email}")
        except Client.DoesNotExist:
            logger.warning(f"User {request.user.id} is not a client")
            return Response(
                {"error": "Only clients can request booking data"},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get the professional (the other participant)
        other_user_id = conversation.participant1_id if conversation.participant1_id != request.user.id else conversation.participant2_id
        professional = get_object_or_404(Professional, user_id=other_user_id)
        logger.info(f"Found professional: {professional.user.email}")

        # Get approved services for the professional
        services = Service.objects.filter(
            professional=professional,
            moderation_status='APPROVED'
        ).values('service_id', 'service_name')
        logger.info(f"Found {services.count()} approved services")

        # Get client's pets
        pets = Pet.objects.filter(owner=client.user).values(
            'pet_id',
            'name',
            'pet_type',
            'breed'
        )
        logger.info(f"Found {pets.count()} pets")

        response_data = {
            'services': list(services),
            'pets': list(pets)
        }
        logger.info("Successfully prepared response data")
        return Response(response_data)

    except Exception as e:
        logger.error(f"Error in get_prerequest_booking_data: {str(e)}")
        logger.exception("Full traceback:")
        return Response(
            {'error': 'An error occurred while fetching pre-request booking data'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_request_booking(request):
    """
    Send a booking request message in a conversation.
    Required POST data:
    - conversation_id: ID of the conversation
    - service_type: ID of the selected service
    - pets: List of pet IDs
    - occurrences: List of occurrence objects with start_date, end_date, start_time, end_time
    """
    try:
        logger.info("Starting send_request_booking")
        logger.info(f"Request data: {request.data}")

        # Get the user's timezone settings
        user_settings = get_user_time_settings(request.user.id)
        user_tz = pytz.timezone(user_settings['timezone'])
        
        # Get service name
        service_id = request.data.get('service_type')
        logger.info(f"Looking for service with ID: {service_id}")
        try:
            service = Service.objects.get(service_id=service_id)
            service_name = service.service_name
            logger.info(f"Found service: {service_name}")
        except Service.DoesNotExist:
            logger.error(f"Service not found with ID: {service_id}")
            return Response({'error': 'Service not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Get pet details
        pet_ids = request.data.get('pets', [])
        logger.info(f"Looking for pets with IDs: {pet_ids}")
        pets = Pet.objects.filter(pet_id__in=pet_ids)
        pet_details = [f"{pet.name} ({pet.species})" for pet in pets]
        logger.info(f"Found pets: {pet_details}")
        
        # Process occurrences
        occurrences = request.data.get('occurrences', [])
        logger.info(f"Processing {len(occurrences)} occurrences")
        processed_occurrences = []
        
        for occ in occurrences:
            try:
                # Parse the date and time strings
                start_date = datetime.strptime(occ['start_date'], '%Y-%m-%d').date()
                end_date = datetime.strptime(occ['end_date'], '%Y-%m-%d').date()
                start_time = datetime.strptime(occ['start_time'], '%H:%M').time()
                end_time = datetime.strptime(occ['end_time'], '%H:%M').time()
                
                # Combine into datetime objects in user's timezone
                start_dt = datetime.combine(start_date, start_time)
                end_dt = datetime.combine(end_date, end_time)
                
                # Make the datetime objects timezone-aware in user's timezone
                start_dt = user_tz.localize(start_dt)
                end_dt = user_tz.localize(end_dt)
                
                # Convert to UTC
                start_dt_utc = start_dt.astimezone(pytz.UTC)
                end_dt_utc = end_dt.astimezone(pytz.UTC)
                
                # Format the times according to user preferences for display
                formatted_times = format_booking_occurrence(
                    start_dt_utc,
                    end_dt_utc,
                    request.user.id
                )
                
                processed_occ = {
                    'start_date': start_dt_utc.date().isoformat(),
                    'end_date': end_dt_utc.date().isoformat(),
                    'start_time': start_dt_utc.time().strftime('%H:%M'),
                    'end_time': end_dt_utc.time().strftime('%H:%M'),
                    **formatted_times  # Include all formatted strings
                }
                processed_occurrences.append(processed_occ)
            except (ValueError, KeyError) as e:
                logger.error(f"Error processing occurrence: {str(e)}")
                return Response(
                    {'error': f'Invalid date/time format in occurrence: {str(e)}'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Get conversation
        conversation_id = request.data.get('conversation_id')
        logger.info(f"Looking for conversation with ID: {conversation_id}")
        try:
            conversation = Conversation.objects.get(conversation_id=conversation_id)
            logger.info("Found conversation")
        except Conversation.DoesNotExist:
            logger.error(f"Conversation not found with ID: {conversation_id}")
            return Response({'error': 'Conversation not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Initialize cost data
        cost_data = {'total_client_cost': 0, 'total_sitter_payout': 0}
        booking_id = request.data.get('booking_id')
        logger.info(f"Booking ID from request: {booking_id}")

        if booking_id:
            logger.info(f"Looking for BookingSummary with booking_id: {booking_id}")
            try:
                booking_summary = BookingSummary.objects.get(booking_id=booking_id)
                cost_data = {
                    'total_client_cost': float(booking_summary.total_client_cost.quantize(Decimal('0.01'))),
                    'total_sitter_payout': float(booking_summary.total_sitter_payout.quantize(Decimal('0.01')))
                }
                logger.info(f"Found cost data: {cost_data}")
            except BookingSummary.DoesNotExist:
                logger.warning(f"No BookingSummary found for booking_id: {booking_id}")
        
        # Create message
        logger.info("Creating message")
        message = UserMessage.objects.create(
            conversation=conversation,
            sender=request.user,
            content='Booking Request',
            type_of_message='initial_booking_request',
            is_clickable=True,
            status='sent',
            metadata={
                'service_type': service_name,
                'pets': pet_details,
                'occurrences': processed_occurrences,
                'booking_id': booking_id,
                'cost_summary': cost_data
            }
        )
        logger.info("Message created successfully")
        
        # Update conversation
        conversation.last_message = "Booking Request"
        conversation.last_message_time = timezone.now()
        conversation.save()
        logger.info("Conversation updated")

        return Response({
            'message_id': message.message_id,
            'conversation_id': message.conversation.conversation_id,
            'content': message.content,
            'type_of_message': message.type_of_message,
            'metadata': message.metadata,
            'sent_by_other_user': False,
            'timestamp': message.timestamp
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"Unexpected error in send_request_booking: {str(e)}")
        logger.exception("Full traceback:")
        return Response(
            {'error': 'An error occurred while sending the booking request'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_unread_message_count(request):
    """
    Get count of unread messages for the current user across all conversations.
    Returns:
    - unread_count: Total number of unread messages
    - unread_conversations: Number of conversations with unread messages
    - conversation_counts: Object mapping conversation_id to unread message count
    """
    try:
        current_user = request.user
        logger.info(f"Fetching unread message count for user: {current_user.id}")
        
        # Get all conversations where the user is a participant
        conversations = Conversation.objects.filter(
            Q(participant1=current_user) | Q(participant2=current_user)
        )
        
        if not conversations.exists():
            logger.info(f"No conversations found for user {current_user.id}")
            return Response({
                'unread_count': 0,
                'unread_conversations': 0,
                'conversation_counts': {}
            })
        
        # Calculate total unread messages and conversations with unread messages
        total_unread = 0
        conversations_with_unread = 0
        conversation_counts = {}
        
        for conversation in conversations:
            # Only count messages where:
            # 1. Current user is not the sender (sent by other participant)
            # 2. Status is 'sent' (not 'read')
            other_participant = conversation.participant2 if conversation.participant1 == current_user else conversation.participant1
            unread_count = UserMessage.objects.filter(
                conversation=conversation,
                sender=other_participant,
                status='sent'
            ).count()
            
            if unread_count > 0:
                total_unread += unread_count
                conversations_with_unread += 1
                conversation_counts[str(conversation.conversation_id)] = unread_count
                
        logger.info(f"User {current_user.id} has {total_unread} unread messages in {conversations_with_unread} conversations")
        
        return Response({
            'unread_count': total_unread,
            'unread_conversations': conversations_with_unread,
            'conversation_counts': conversation_counts
        })
        
    except Exception as e:
        logger.error(f"Error getting unread message count: {str(e)}")
        logger.exception("Full traceback:")
        return Response(
            {'error': 'An error occurred while fetching unread message count'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

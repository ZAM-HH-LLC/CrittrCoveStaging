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
import json
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
from django.core.exceptions import ValidationError
from user_messages.helpers import validate_message_image, process_base64_image

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
            
            # Add image URL if the message has an image
            if message.image:
                message_data['image_url'] = message.image.url
                
            # Add image URLs from metadata if they exist (multiple images case)
            if message.metadata and 'image_urls' in message.metadata:
                message_data['image_urls'] = message.metadata['image_urls']

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
    
    Optional POST data:
    - image_message_ids: List of IDs of previously uploaded image messages to attach to this message
    - image_message_id: (Legacy) ID of a single previously uploaded image message (for backward compatibility)
    """
    try:
        conversation_id = request.data.get('conversation_id')
        content = request.data.get('content')
        
        # Handle both multiple image IDs (new) and single image ID (legacy)
        image_message_ids = request.data.get('image_message_ids', [])
        legacy_image_message_id = request.data.get('image_message_id')
        
        # If we get a legacy single ID but no list, add it to the list
        if legacy_image_message_id and not image_message_ids:
            image_message_ids = [legacy_image_message_id]
        
        # Convert to list if it's a string (for JSON parsing compatibility)
        if isinstance(image_message_ids, str):
            try:
                image_message_ids = json.loads(image_message_ids)
            except json.JSONDecodeError:
                image_message_ids = [image_message_ids]

        # Validate required fields
        if not conversation_id:
            return Response(
                {'error': 'conversation_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Either content or image(s) must be provided
        if not content and not image_message_ids:
            return Response(
                {'error': 'Either content or image_message_ids is required'}, 
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
        
        # Check if either user is deleted - prevent messaging to deleted users
        from users.account_deletion import validate_user_not_deleted
        
        recipient = conversation.participant1 if current_user == conversation.participant2 else conversation.participant2
        deleted_user_response = validate_user_not_deleted(recipient)
        if deleted_user_response:
            return deleted_user_response

        # Check if we have image IDs to process
        if image_message_ids:
            # For multiple images, we need to process them differently
            if len(image_message_ids) == 1:
                # Single image case - update the existing image message
                try:
                    # Find the temporary image message
                    image_message = UserMessage.objects.get(
                        message_id=image_message_ids[0],
                        conversation=conversation,
                        sender=current_user,
                        content=''  # Temporary image messages have empty content
                    )
                    
                    # Update the image message with the content
                    if content:
                        image_message.content = content
                    
                    # Ensure it's properly marked as an image message
                    image_message.type_of_message = 'image_message'
                    
                    # Make sure image_url is properly set for frontend access
                    if image_message.image:
                        image_message.image_url = image_message.image.url
                    
                    image_message.save()
                    message = image_message
                    
                    # If we don't have content, use a placeholder for the conversation
                    display_content = content if content else '[Image]'
                    
                except UserMessage.DoesNotExist:
                    # If the image message doesn't exist, create a new message without an image
                    message = UserMessage.objects.create(
                        conversation=conversation,
                        sender=current_user,
                        content=content,
                        type_of_message='normal_message',
                        is_clickable=False,
                        status='sent'
                    )
                    display_content = content
            else:
                # Multiple images case - create a new message and collect image URLs
                message = UserMessage.objects.create(
                    conversation=conversation,
                    sender=current_user,
                    content=content,
                    type_of_message='image_message',  # Use our new image_message type for multiple images
                    is_clickable=False,
                    status='sent',
                    metadata={'image_urls': []}  # Initialize the image_urls array in metadata
                )
                
                # Collect image URLs from temporary messages
                image_urls = []
                for img_id in image_message_ids:
                    try:
                        temp_message = UserMessage.objects.get(
                            message_id=img_id,
                            conversation=conversation,
                            sender=current_user,
                            content=''  # Temporary image messages have empty content
                        )
                        
                        if temp_message.image and temp_message.image.url:
                            image_urls.append(temp_message.image.url)
                            
                            # Keep the temp message to maintain the file but mark it as hidden
                            temp_message.metadata = temp_message.metadata or {}
                            temp_message.metadata['is_attachment'] = True
                            temp_message.save()
                    except UserMessage.DoesNotExist:
                        # Just skip any images that don't exist
                        continue
                
                # Store the image URLs in the message metadata
                message.metadata = message.metadata or {}
                message.metadata['image_urls'] = image_urls
                
                # Also store the image_urls directly on the message for easier frontend access
                message.image_urls = image_urls
                
                # Set the message type to image_message to ensure proper display
                message.type_of_message = 'image_message'
                
                message.save()
                
                # Set display content for conversation
                display_content = content if content else f'[{len(image_urls)} Images]'
        else:
            # Create a regular message without an image
            message = UserMessage.objects.create(
                conversation=conversation,
                sender=current_user,
                content=content,
                type_of_message='normal_message',
                is_clickable=False,
                status='sent'
            )
            display_content = content

        # Update conversation's last message and time
        conversation.last_message = display_content
        conversation.last_message_time = timezone.now()
        conversation.save()

        # Prepare the response data
        response_data = {
            'message_id': message.message_id,
            'content': message.content,
            'timestamp': message.timestamp,
            'booking_id': None,
            'status': message.status,
            'type_of_message': message.type_of_message,
            'is_clickable': message.is_clickable,
            'metadata': message.metadata
        }
        
        # Add image URL to the response if one exists directly on the message
        if message.image:
            response_data['image_url'] = message.image.url
            
        # Add image URLs from metadata if they exist (multiple images case)
        if message.metadata and 'image_urls' in message.metadata:
            response_data['image_urls'] = message.metadata['image_urls']
        
        return Response(response_data, status=status.HTTP_201_CREATED)

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
        
        # Verify user is a participant and check for deleted users
        current_user = request.user
        if current_user not in [conversation.participant1, conversation.participant2]:
            return Response(
                {'error': 'You are not a participant in this conversation'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if either user is deleted - prevent messaging to deleted users
        from users.account_deletion import validate_user_not_deleted
        
        recipient = conversation.participant1 if current_user == conversation.participant2 else conversation.participant2
        deleted_user_response = validate_user_not_deleted(recipient)
        if deleted_user_response:
            return deleted_user_response
        
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

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_message_image(request):
    """
    Upload an image to be attached to a message.
    
    This endpoint handles both direct file uploads and base64-encoded images.
    
    Required POST data:
    - conversation_id: ID of the conversation the image belongs to
    
    Optional POST data (at least one required):
    - image_file: The image file being uploaded (multipart/form-data)
    - image_data: Base64-encoded image data (with or without data URI prefix)
    
    Returns:
    - image_url: URL of the uploaded image
    - image_id: Unique identifier for the image
    """
    try:
        # Get conversation ID
        conversation_id = request.data.get('conversation_id')
        
        if not conversation_id:
            return Response(
                {'error': 'conversation_id is required'}, 
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
        
        # Check if either user is deleted - prevent messaging to deleted users
        from users.account_deletion import validate_user_not_deleted
        
        recipient = conversation.participant1 if current_user == conversation.participant2 else conversation.participant2
        deleted_user_response = validate_user_not_deleted(recipient)
        if deleted_user_response:
            return deleted_user_response
        
        # Initialize variables
        image_file = None
        image_filename = None
        
        # Check if we have a file upload
        if 'image_file' in request.FILES:
            image_file = request.FILES['image_file']
            image_filename = image_file.name
            
            # Validate the image file
            try:
                validate_message_image(image_file)
            except ValidationError as e:
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        # Check if we have base64 image data
        elif 'image_data' in request.data and request.data['image_data']:
            try:
                image_content, file_ext = process_base64_image(
                    request.data['image_data'],
                    conversation_id
                )
                image_filename = f"image.{file_ext}"
                image_file = image_content
            except ValidationError as e:
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            return Response(
                {'error': 'No image provided. Please upload an image file or provide base64 image data.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create a temporary message to store the image
        # This message will now be created with content if provided in the send_normal_message call
        temp_message = UserMessage.objects.create(
            conversation=conversation,
            sender=current_user,
            content='',  # Empty content until send_normal_message is called
            type_of_message='image_message',  # Use our new image_message type
            is_clickable=False,
            status='sent',
            metadata={'is_attachment': True}  # Mark this as an attachment message to handle display
        )
        
        # Attach the image to the message
        temp_message.image.save(image_filename, image_file)
        
        # Ensure image_url is properly populated for frontend
        if temp_message.image:
            temp_message.image_url = temp_message.image.url
        
        temp_message.save()
        
        # Get the URL of the uploaded image
        image_url = temp_message.image.url if temp_message.image else None
        
        # Return the image URL and message ID
        return Response({
            'image_url': image_url,
            'message_id': temp_message.message_id
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"Error in upload_message_image: {str(e)}")
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_and_send_message(request):
    """
    Upload multiple images and send them as a single message with an optional caption.
    
    This endpoint handles both direct file uploads and base64-encoded images.
    
    Required POST data:
    - conversation_id: ID of the conversation the images belong to
    
    Optional POST data:
    - content: Text caption to include with the images
    - image_file_X: Multiple image files where X is the index (multipart/form-data)
    - image_data_X: Multiple base64-encoded images where X is the index
    
    Returns:
    - message_id: ID of the created message
    - image_urls: List of URLs of all uploaded images
    """
    try:
        # Get conversation ID
        conversation_id = request.data.get('conversation_id')
        
        if not conversation_id:
            return Response(
                {'error': 'conversation_id is required'}, 
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
        
        # Check if either user is deleted - prevent messaging to deleted users
        from users.account_deletion import validate_user_not_deleted
        
        recipient = conversation.participant1 if current_user == conversation.participant2 else conversation.participant2
        deleted_user_response = validate_user_not_deleted(recipient)
        if deleted_user_response:
            return deleted_user_response
        
        # Get caption/message content if provided
        content = request.data.get('content', '')
        
        # Process all images in the request
        image_urls = []
        
        # First, look for files with names like image_file_0, image_file_1, etc.
        image_files = {}
        for key in request.FILES:
            if key.startswith('image_file_'):
                index = key.split('_')[-1]
                image_files[index] = request.FILES[key]
        
        # If no indexed files, check for a single image_file
        if not image_files and 'image_file' in request.FILES:
            image_files['0'] = request.FILES['image_file']
        
        # Process base64 image data
        image_data = {}
        for key in request.data:
            if key.startswith('image_data_') and request.data[key]:
                index = key.split('_')[-1]
                image_data[index] = request.data[key]
        
        # If no indexed data, check for a single image_data
        if not image_data and 'image_data' in request.data and request.data['image_data']:
            image_data['0'] = request.data['image_data']
            
        # If we have neither files nor data, check if this is a "images" field with JSON data
        if not image_files and not image_data and 'images' in request.data:
            try:
                # Try to parse as JSON
                if isinstance(request.data['images'], str):
                    images_list = json.loads(request.data['images'])
                else:
                    images_list = request.data['images']
                    
                # Process each image in the list
                for i, img_data in enumerate(images_list):
                    image_data[str(i)] = img_data
            except json.JSONDecodeError:
                # Not valid JSON, might be a single image
                image_data['0'] = request.data['images']
            except Exception as e:
                logger.error(f"Error processing images field: {str(e)}")
        
        # Check if we have any images to process
        if not image_files and not image_data:
            return Response(
                {'error': 'No images provided. Please upload at least one image.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Process file uploads first
        for index, image_file in image_files.items():
            try:
                # Validate the image file
                validate_message_image(image_file)
                
                # Create a temporary message to hold this image
                temp_message = UserMessage.objects.create(
                    conversation=conversation,
                    sender=current_user,
                    content='',  # Empty content for attachment messages
                    type_of_message='image_message',
                    is_clickable=False,
                    status='sent',
                    metadata={'is_attachment': True}  # Mark as attachment
                )
                
                # Attach the image
                temp_message.image.save(image_file.name, image_file)
                
                # Add to our list of image URLs
                if temp_message.image and temp_message.image.url:
                    image_urls.append(temp_message.image.url)
            except ValidationError as e:
                logger.error(f"Error validating image file {index}: {str(e)}")
                # Continue with other images
                continue
        
        # Process base64 image data
        for index, img_data in image_data.items():
            try:
                # Process the base64 data
                image_content, file_ext = process_base64_image(img_data, conversation_id)
                image_filename = f"image_{index}.{file_ext}"
                
                # Create a temporary message to hold this image
                temp_message = UserMessage.objects.create(
                    conversation=conversation,
                    sender=current_user,
                    content='',  # Empty content for attachment messages
                    type_of_message='image_message',
                    is_clickable=False,
                    status='sent',
                    metadata={'is_attachment': True}  # Mark as attachment
                )
                
                # Attach the image
                temp_message.image.save(image_filename, image_content)
                
                # Add to our list of image URLs
                if temp_message.image and temp_message.image.url:
                    image_urls.append(temp_message.image.url)
            except ValidationError as e:
                logger.error(f"Error processing base64 image {index}: {str(e)}")
                # Continue with other images
                continue
        
        # Check if we successfully processed any images
        if not image_urls:
            return Response(
                {'error': 'Failed to process any of the provided images.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create the main message that will be displayed to the user
        message = UserMessage.objects.create(
            conversation=conversation,
            sender=current_user,
            content=content,
            type_of_message='image_message',  # Always use image_message type for messages with images
            is_clickable=False,
            status='sent',
            metadata={
                'image_urls': image_urls  # Store all image URLs in metadata
            }
        )
        
        # Update conversation's last message and time
        display_content = content if content else f'[{len(image_urls)} Images]'
        conversation.last_message = display_content
        conversation.last_message_time = timezone.now()
        conversation.save()
        
        # Prepare the response data
        response_data = {
            'message_id': message.message_id,
            'content': message.content,
            'timestamp': message.timestamp,
            'type_of_message': message.type_of_message,
            'is_clickable': message.is_clickable,
            'status': message.status,
            'image_urls': image_urls,
            'metadata': message.metadata
        }
        
        return Response(response_data, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"Error in upload_and_send_message: {str(e)}")
        logger.exception("Full traceback:")
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_incomplete_bookings(request, conversation_id):
    """
    Get incomplete bookings for a specific conversation.
    Returns bookings that have been confirmed but not yet marked as completed (no review request message).
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

        logger.info(f"Checking for incomplete bookings in conversation {conversation_id}")
        
        # Debug: Log all messages in the conversation first
        all_messages = UserMessage.objects.filter(conversation=conversation)
        logger.info(f"Total messages in conversation: {all_messages.count()}")
        
        booking_related_messages = all_messages.filter(type_of_message='booking_confirmed')
        logger.info(f"Total booking_confirmed messages: {booking_related_messages.count()}")
        
        for msg in booking_related_messages:
            logger.info(f"Message {msg.message_id}: type={msg.type_of_message}, content='{msg.content}', metadata={msg.metadata}")
        
        # Get ALL booking confirmed messages in this conversation (no pagination limit)
        # Get all booking confirmed messages first, then filter in Python for more reliable results
        all_booking_messages = UserMessage.objects.filter(
            conversation=conversation,
            type_of_message='booking_confirmed',
            metadata__has_key='booking_id'
        )
        
        # Filter in Python to avoid Django JSONField query issues
        booking_confirmed_messages = []
        for msg in all_booking_messages:
            is_review_request = msg.metadata.get('is_review_request', False)
            if not is_review_request:
                booking_confirmed_messages.append(msg)
        
        logger.info(f"Found {len(booking_confirmed_messages)} booking confirmed messages")
        
        # Debug: Log details of booking confirmed messages
        for msg in booking_confirmed_messages:
            logger.info(f"Booking confirmed message {msg.message_id}: booking_id={msg.metadata.get('booking_id')}, is_review_request={msg.metadata.get('is_review_request')}")
        
        # Get ALL review request messages (booking confirmed with is_review_request=true)
        review_messages = UserMessage.objects.filter(
            conversation=conversation,
            type_of_message='booking_confirmed',
            metadata__is_review_request=True
        )
        
        logger.info(f"Found {review_messages.count()} review request messages")
        
        # Debug: Log details of review messages
        for msg in review_messages:
            logger.info(f"Review message {msg.message_id}: booking_id={msg.metadata.get('booking_id')}, is_review_request={msg.metadata.get('is_review_request')}")
        
        # Extract booking IDs that have been reviewed
        reviewed_booking_ids = set()
        for review_msg in review_messages:
            if review_msg.metadata and review_msg.metadata.get('booking_id'):
                reviewed_booking_ids.add(review_msg.metadata['booking_id'])
        
        logger.info(f"Reviewed booking IDs: {reviewed_booking_ids}")
        
        # Find incomplete bookings (confirmed but not reviewed)
        incomplete_bookings = []
        processed_booking_ids = set()  # To avoid duplicates
        
        for booking_msg in booking_confirmed_messages:
            if booking_msg.metadata and booking_msg.metadata.get('booking_id'):
                booking_id = booking_msg.metadata['booking_id']
                
                if booking_id not in reviewed_booking_ids and booking_id not in processed_booking_ids:
                    processed_booking_ids.add(booking_id)  # Mark as processed to avoid duplicates
                    incomplete_booking = {
                        'booking_id': booking_id,
                        'service_type': booking_msg.metadata.get('service_type', 'Unknown Service'),
                        'total_sitter_payout': '0.00',
                        'last_occurrence_end_date': None
                    }
                    
                    # Try to get cost summary from metadata
                    if booking_msg.metadata.get('cost_summary'):
                        cost_summary = booking_msg.metadata['cost_summary']
                        if isinstance(cost_summary, dict) and 'total_sitter_payout' in cost_summary:
                            incomplete_booking['total_sitter_payout'] = str(cost_summary['total_sitter_payout'])
                    
                    # Try to get the last occurrence end date from the booking
                    try:
                        from bookings.models import Booking
                        booking = Booking.objects.get(booking_id=booking_id)
                        
                        # Get the last occurrence (latest end date)
                        last_occurrence = booking.occurrences.order_by('-end_date', '-end_time').first()
                        if last_occurrence:
                            # Return raw UTC datetime components for frontend formatting
                            incomplete_booking['last_occurrence_end_date'] = last_occurrence.end_date.strftime('%Y-%m-%d')
                            incomplete_booking['last_occurrence_end_time'] = last_occurrence.end_time.strftime('%H:%M')
                            
                            logger.info(f"Found last occurrence end for booking {booking_id}: {incomplete_booking['last_occurrence_end_date']} {incomplete_booking['last_occurrence_end_time']}")
                    except Exception as e:
                        logger.warning(f"Could not get last occurrence end date for booking {booking_id}: {str(e)}")
                    
                    incomplete_bookings.append(incomplete_booking)
                    logger.info(f"Added incomplete booking: {incomplete_booking}")
        
        logger.info(f"Total incomplete bookings found: {len(incomplete_bookings)}")
        
        return Response({
            'incomplete_bookings': incomplete_bookings
        })

    except Exception as e:
        logger.error(f"Error in get_incomplete_bookings: {str(e)}")
        logger.error(f"Full traceback: {traceback.format_exc()}")
        return Response(
            {'error': 'An error occurred while fetching incomplete bookings'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

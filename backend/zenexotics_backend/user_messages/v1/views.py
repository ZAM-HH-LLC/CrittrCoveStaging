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
        current_user = request.user
        conversation = get_object_or_404(Conversation, conversation_id=conversation_id)
        
        # Verify user is participant
        if current_user not in [conversation.participant1, conversation.participant2]:
            return Response(
                {'error': 'You are not a participant in this conversation'}, 
                status=status.HTTP_403_FORBIDDEN
            )

        # Fixed page size and get page number from query params
        PAGE_SIZE = 20
        page = int(request.GET.get('page', 1))
        start_idx = (page - 1) * PAGE_SIZE
        end_idx = start_idx + PAGE_SIZE
        
        # Get messages for current page
        messages = UserMessage.objects.filter(conversation=conversation)\
            .order_by('-timestamp')[start_idx:end_idx + 1]  # Get one extra to check if there are more

        # Check if there are more messages
        has_more = len(messages) > PAGE_SIZE
        messages = messages[:PAGE_SIZE]  # Remove the extra message if it exists

        messages_data = []
        for message in messages:
            messages_data.append({
                'message_id': message.message_id,
                'sent_by_other_user': message.sender != current_user,
                'content': message.content,
                'timestamp': message.timestamp,
                'booking_id': message.booking.booking_id if message.booking else None,
                'status': message.status,
                'type_of_message': message.type_of_message,
                'is_clickable': message.is_clickable,
                'metadata': message.metadata
            })

        # Get the other participant (the one who isn't the current user)
        other_participant = conversation.participant2 if conversation.participant1 == current_user else conversation.participant1

        # Mark unread messages as read
        UserMessage.objects.filter(
            conversation=conversation,
            sender=other_participant,
            status='sent'
        ).update(status='read')

        return Response({
            'conversation_id': conversation_id,
            'messages': messages_data,
            'has_more': has_more
        })

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
        # Get the service type name
        service = Service.objects.get(service_id=request.data.get('service_type'))
        service_name = service.service_name

        # Get the pet names
        pet_ids = request.data.get('pets', [])
        pets = Pet.objects.filter(pet_id__in=pet_ids)
        pet_names = [pet.name for pet in pets]

        # Format occurrences with AM/PM
        occurrences = request.data.get('occurrences', [])
        formatted_occurrences = []
        for occ in occurrences:
            start_time = datetime.strptime(occ['start_time'], '%H:%M').strftime('%I:%M %p')
            end_time = datetime.strptime(occ['end_time'], '%H:%M').strftime('%I:%M %p')
            formatted_occurrences.append({
                'start_date': occ['start_date'],
                'end_date': occ['end_date'],  # Now using the actual end_date from the request
                'start_time': start_time,
                'end_time': end_time
            })

        # Create the message
        message = UserMessage.objects.create(
            conversation_id=request.data.get('conversation_id'),
            sender=request.user,  # Added sender
            content='Booking Request',
            type_of_message='initial_booking_request',
            is_clickable=True,  # Added is_clickable
            status='sent',  # Added status
            metadata={
                'service_type': service_name,
                'pets': pet_names,
                'occurrences': formatted_occurrences,
                'booking_id': request.data.get('booking_id')
            }
        )

        # Update conversation's last message and time
        conversation = message.conversation
        conversation.last_message = "Booking Request"
        conversation.last_message_time = timezone.now()
        conversation.save()

        return Response({
            'message_id': message.message_id,
            'content': message.content,
            'timestamp': message.timestamp,
            'sent_by_other_user': False,
            'booking_id': request.data.get('booking_id'),
            'status': message.status,
            'type_of_message': message.type_of_message,
            'is_clickable': message.is_clickable,
            'metadata': message.metadata
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        logger.error(f"Error in send_request_booking: {str(e)}")
        logger.exception("Full traceback:")
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

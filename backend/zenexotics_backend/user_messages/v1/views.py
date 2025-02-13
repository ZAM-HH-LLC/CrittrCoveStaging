from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from ..models import UserMessage
from conversations.models import Conversation
from django.utils import timezone

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
                'is_clickable': message.is_clickable
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

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from users.models import User
from ..models import Conversation
from django.utils import timezone
from django.db import models
from professionals.models import Professional

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_conversations(request):
    """
    Get all conversations for the current user
    """
    try:
        current_user = request.user
        conversations = Conversation.objects.filter(
            models.Q(participant1=current_user) | 
            models.Q(participant2=current_user)
        ).order_by('-last_message_time')

        conversations_data = []
        for conversation in conversations:
            # Determine the other user
            other_user = conversation.participant2 if conversation.participant1 == current_user else conversation.participant1
            
            # Determine if current user is the professional
            is_professional = conversation.role_map.get(str(current_user.user_id)) == 'professional'

            conversations_data.append({
                'conversation_id': conversation.conversation_id,
                'is_professional': is_professional,
                'last_message': conversation.last_message,
                'last_message_time': conversation.last_message_time,
                'other_user_name': other_user.name
            })

        return Response(conversations_data)

    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def open_conversation(request):
    """
    Open a conversation between a client and a professional.
    Required POST data:
    - professional_id: ID from the professionals table
    """
    try:
        professional_id = request.data.get('professional_id')
        if not professional_id:
            return Response(
                {'error': 'professional_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get the professional and their user
        professional = get_object_or_404(Professional, professional_id=professional_id)
        other_user = professional.user
        current_user = request.user

        # Check if a conversation already exists between these users
        existing_conversation = Conversation.objects.filter(
            models.Q(participant1=current_user, participant2=other_user) |
            models.Q(participant1=other_user, participant2=current_user)
        ).first()

        # Determine roles for the conversation using user_id instead of id
        role_map = {
            str(current_user.user_id): 'client',
            str(other_user.user_id): 'professional'
        }

        if existing_conversation:
            return Response({
                'conversation_id': existing_conversation.conversation_id,
                'is_professional': current_user.user_id == other_user.user_id,
                'status': 200
            })

        # Create new conversation
        conversation = Conversation.objects.create(
            participant1=current_user,
            participant2=other_user,
            role_map=role_map
        )

        return Response({
            'conversation_id': conversation.conversation_id,
            'is_professional': current_user.user_id == other_user.user_id,
            'status': 200
        })

    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        ) 
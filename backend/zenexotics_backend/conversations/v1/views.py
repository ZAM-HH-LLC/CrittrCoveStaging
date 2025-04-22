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
from clients.models import Client
from django.core.cache import cache
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

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

            # Check if the other participant is online using cache
            other_participant_online = cache.get(f"user_{other_user.id}_online", False)
            
            # Log for debugging
            logger.debug(f"User {other_user.id} online status: {other_participant_online}")

            conversations_data.append({
                'conversation_id': conversation.conversation_id,
                'is_professional': is_professional,
                'last_message': conversation.last_message,
                'last_message_time': conversation.last_message_time,
                'other_user_name': other_user.name,
                'other_participant_online': other_participant_online,
                'participant1_id': conversation.participant1.id,
                'participant2_id': conversation.participant2.id
            })

        return Response(conversations_data)

    except Exception as e:
        logger.error(f"Error in get_conversations: {str(e)}")
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

def find_or_create_conversation(current_user, other_user, current_user_role):
    """
    Helper function to find or create a conversation between two users.
    
    Args:
        current_user: The user making the request
        other_user: The other participant in the conversation
        current_user_role: Role of the current user ('professional' or 'client')
    
    Returns:
        tuple: (conversation object, boolean indicating if user is professional)
    """
    # Determine other user's role
    other_user_role = 'client' if current_user_role == 'professional' else 'professional'
    
    # Check if a conversation already exists between these users
    existing_conversation = Conversation.objects.filter(
        models.Q(participant1=current_user, participant2=other_user) |
        models.Q(participant1=other_user, participant2=current_user)
    ).first()
    
    # Determine if the current user is the professional
    is_professional = current_user_role == 'professional'
    
    if existing_conversation:
        # Check if the role mapping matches the requested role
        existing_role = existing_conversation.role_map.get(str(current_user.user_id))
        
        if existing_role == current_user_role:
            # Role already matches, return existing conversation
            return existing_conversation, is_professional
        else:
            # Roles don't match - create a new conversation with correct roles
            # This handles the case where a user wants to interact in a different role
            role_map = {
                str(current_user.user_id): current_user_role,
                str(other_user.user_id): other_user_role
            }
            
            conversation = Conversation.objects.create(
                participant1=current_user,
                participant2=other_user,
                role_map=role_map
            )
            return conversation, is_professional
    
    # No existing conversation, create a new one
    role_map = {
        str(current_user.user_id): current_user_role,
        str(other_user.user_id): other_user_role
    }
    
    conversation = Conversation.objects.create(
        participant1=current_user,
        participant2=other_user,
        role_map=role_map
    )
    
    return conversation, is_professional

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def open_conversation(request):
    """
    Open a conversation between a client and a professional.
    
    This endpoint can handle both cases:
    1. Client initiating conversation with professional (professional_id required)
    2. Professional initiating conversation with client (client_id and as_professional=True required)
    
    Required POST data:
    - professional_id: ID from the professionals table (for client-initiated)
    - OR -
    - client_id: ID of the client user (for professional-initiated)
    - as_professional: Boolean flag to indicate if the request is from a professional (True)
    """
    try:
        current_user = request.user
        as_professional = request.data.get('as_professional', False)
        logger.info(f"Opening conversation - as_professional: {as_professional}")
        
        if as_professional:
            # Professional initiating conversation with client
            client_id = request.data.get('client_id')
            if not client_id:
                return Response(
                    {'error': 'client_id is required when as_professional is True'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            logger.info(f"Professional initiating conversation with client: {client_id}")
            
            # Get the client and then the client's user
            try:
                client = get_object_or_404(Client, id=client_id)
                client_user = client.user
                logger.info(f"Found client user: {client_user.name}")
            except Exception as e:
                logger.error(f"Error finding client: {str(e)}")
                return Response(
                    {'error': f'Client not found: {str(e)}'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
                
            # Use the helper function with professional role for requester
            conversation, is_professional = find_or_create_conversation(
                current_user, 
                client_user, 
                'professional'  # Current user is explicitly a professional in this context
            )
            
            return Response({
                'conversation_id': conversation.conversation_id,
                'is_professional': is_professional,
                'other_user_name': client_user.name,
                'status': 200
            })
            
        else:
            # Client initiating conversation with professional (original implementation)
            professional_id = request.data.get('professional_id')
            if not professional_id:
                return Response(
                    {'error': 'professional_id is required when as_professional is False'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Get the professional and their user
            professional = get_object_or_404(Professional, professional_id=professional_id)
            other_user = professional.user

            # Use the helper function with client role for requester
            conversation, is_professional = find_or_create_conversation(
                current_user, 
                other_user, 
                'client'  # Current user is explicitly a client in this context
            )

            return Response({
                'conversation_id': conversation.conversation_id,
                'is_professional': is_professional,
                'status': 200
            })

    except Exception as e:
        logger.error(f"Error in open_conversation: {str(e)}")
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

from django.shortcuts import get_object_or_404
from conversations.models import Conversation
from users.models import User
import logging

logger = logging.getLogger(__name__)

def get_user_from_conversation(conversation_id, is_professional=False):
    """
    Get the appropriate user from a conversation based on the is_professional flag.
    
    Args:
        conversation_id (int): The ID of the conversation
        is_professional (bool): If True, return the professional user; if False, return the client user
    
    Returns:
        User: The user object of the requested role
    """
    try:
        logger.info(f"Getting {'professional' if is_professional else 'client'} user from conversation {conversation_id}")
        
        # Get the conversation
        conversation = get_object_or_404(Conversation, conversation_id=conversation_id)
        
        # Get the role map from the conversation JSON field
        role_map = conversation.role_map
        logger.info(f"Role map for conversation {conversation_id}: {role_map}")
        
        if not role_map:
            logger.error(f"Empty role map for conversation {conversation_id}")
            return None
        
        # Find the user with the requested role
        target_role = "professional" if is_professional else "client"
        
        # The role map can be in two formats:
        # 1. {"user_id": "role", ...} - where user_id can be numeric or a string with prefix
        # 2. {"role": "user_id", ...} - inverse mapping
        
        user_id = None
        
        # Try to find by role value
        for key, role in role_map.items():
            if role == target_role:
                user_id = key
                logger.info(f"Found {target_role} with ID {user_id} in conversation {conversation_id}")
                break
        
        # If not found, try the inverse mapping
        if user_id is None:
            user_id = role_map.get(target_role)
            if user_id:
                logger.info(f"Found {target_role} with ID {user_id} using inverse mapping in conversation {conversation_id}")
        
        if not user_id:
            logger.error(f"No {target_role} found in role map for conversation {conversation_id}")
            return None
        
        # Handle different user ID formats
        try:
            # Try numeric ID first
            if isinstance(user_id, int) or user_id.isdigit():
                user = User.objects.get(id=int(user_id))
            else:
                # Handle string IDs (like "user_voiu329n4")
                user = User.objects.get(username=user_id)
            
            logger.info(f"Successfully retrieved {target_role} user {user.id} for conversation {conversation_id}")
            return user
            
        except User.DoesNotExist:
            logger.error(f"User with ID {user_id} not found")
            return None
        except Exception as e:
            logger.error(f"Error retrieving user with ID {user_id}: {str(e)}")
            return None
        
    except Exception as e:
        logger.error(f"Error getting user from conversation {conversation_id}: {str(e)}")
        return None

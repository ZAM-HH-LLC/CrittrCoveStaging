from django.db.models.signals import post_save
from django.dispatch import receiver
from user_messages.models import UserMessage
from .models import Conversation
import logging

logger = logging.getLogger(__name__)

# Message types that are handled manually by the views for conversation.last_message
MANUALLY_HANDLED_MESSAGE_TYPES = [
    'booking_confirmed',
    'approval_request',
    'send_approved_message'
]

@receiver(post_save, sender=UserMessage)
def update_conversation_on_message(sender, instance, created, **kwargs):
    """
    Signal handler to update the conversation's last message and timestamp
    when a new message is created or updated.
    
    For certain booking-related message types, the conversation update is handled
    manually in the respective views, so we skip the automatic update here.
    """
    if instance.conversation:
        conversation = instance.conversation
        
        # Skip automatic update for special message types that need custom display text
        if instance.type_of_message in MANUALLY_HANDLED_MESSAGE_TYPES:
            logger.info(f"Skipping automatic conversation update for message type {instance.type_of_message} (ID: {instance.message_id})")
            
            # Only increment unread count if needed
            if created:
                conversation.unread_count += 1
                conversation.save()
            
            return
        
        # Regular messages - update conversation normally
        conversation.last_message = instance.content
        conversation.last_message_time = instance.timestamp
        
        # If this is a new message, increment the unread count
        if created:
            conversation.unread_count += 1
            
        conversation.save() 
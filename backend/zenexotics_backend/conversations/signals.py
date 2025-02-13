from django.db.models.signals import post_save
from django.dispatch import receiver
from user_messages.models import UserMessage
from .models import Conversation

@receiver(post_save, sender=UserMessage)
def update_conversation_on_message(sender, instance, created, **kwargs):
    """
    Signal handler to update the conversation's last message and timestamp
    when a new message is created or updated.
    """
    if instance.conversation:
        conversation = instance.conversation
        conversation.last_message = instance.content
        conversation.last_message_time = instance.timestamp
        
        # If this is a new message, increment the unread count
        if created:
            conversation.unread_count += 1
            
        conversation.save() 
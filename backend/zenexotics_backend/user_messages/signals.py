import logging
import json
import time
import threading
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.cache import cache
from django.core.mail import send_mail, EmailMultiAlternatives
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from users.models import User, UserSettings
from .models import UserMessage, MessageMetrics
from django.utils import timezone
from django.db.models import Q
from core.email_utils import (
    get_common_email_headers, 
    build_email_html, 
    send_email_with_retry,
    check_user_email_settings,
    format_date_for_email
)

logger = logging.getLogger(__name__)

def send_delayed_email(message_id):
    """
    Function to send an email notification after a delay,
    but only if the message is still unread.
    """
    try:
        # Get the message
        try:
            message = UserMessage.objects.get(message_id=message_id)
        except UserMessage.DoesNotExist:
            logger.error(f"Message with ID {message_id} not found for delayed email notification")
            return
        
        # If message has been read, don't send notification
        if message.status == 'read':
            logger.info(f"Message {message_id} already read, skipping email notification")
            return
        
        # Skip email notification for booking_confirmed messages
        if message.type_of_message.lower() == 'booking_confirmed':
            logger.info(f"Message {message_id} is booking_confirmed type, skipping email notification")
            return
            
        # Get the conversation and participants
        conversation = message.conversation
        sender_user = message.sender
        
        # Determine the recipient (the other participant)
        recipient_user = conversation.participant2 if conversation.participant1 == sender_user else conversation.participant1
        
        # Check if user has email notifications enabled
        if not check_user_email_settings(recipient_user):
            logger.info(f"User {recipient_user.id} has email notifications disabled")
            return
        
        logger.info(f"Sending delayed email notification to user {recipient_user.id} (message ID: {message_id})")
        
        email_start_time = time.time()
        
        # Get common headers using centralized function
        headers = get_common_email_headers(
            message.message_id,
            'user_message',
            conversation.conversation_id
        )
        headers['X-Message-Type'] = message.type_of_message
        
        # Keep subject line personal but clear
        subject = f"Message from {sender_user.name} on CrittrCove"
        
        # Create a message preview (first 100 chars)
        message_preview = message.content[:100] + ('...' if len(message.content) > 100 else '')
        
        # Format date for email
        email_date = format_date_for_email(timezone.now())
        
        # Create HTML email content
        content_html = f"""
        <h1 style="margin-top: 0; color: #333333; font-size: 24px;">Hi {recipient_user.name},</h1>
        <p>You've received a {message.type_of_message.lower()} from {sender_user.name} on {email_date}.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <p style="margin: 0; font-style: italic;">"{message_preview}"</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{settings.FRONTEND_BASE_URL}/messages?conversationId={conversation.conversation_id}" 
            style="display: inline-block; background-color: #008080; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 16px;">
            View Full Message
            </a>
        </div>
        
        <p>If you're having trouble with the button above, you can also copy and paste this link into your browser:</p>
        <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 14px;">
            {settings.FRONTEND_BASE_URL}/messages?conversationId={conversation.conversation_id}
        </p>
        
        <p>We hope you enjoy using CrittrCove for all your pet care needs!</p>
        
        <p>Best regards,<br>The CrittrCove Team</p>
        """
        
        # Build complete HTML using centralized function
        html_message = build_email_html(content_html, recipient_user.name)
    
        plain_message = f"""
Hi {recipient_user.name},

You've received a {message.type_of_message.lower()} from {sender_user.name} on {email_date}.

"{message_preview}"

To view the full message, please visit:
{settings.FRONTEND_BASE_URL}/messages?conversationId={conversation.conversation_id}

We hope you enjoy using CrittrCove for all your pet care needs!

Best regards,
The CrittrCove Team

---
You're receiving this email because you have an account on CrittrCove and have enabled message notifications.
Manage your notification preferences: {settings.FRONTEND_BASE_URL}/settings/notifications
CrittrCove, Inc. • 123 Pet Street • San Francisco, CA 94103
© 2025 CrittrCove. All rights reserved.
            """
        
        # Send email using centralized function
        success = send_email_with_retry(
            subject=subject,
            html_content=html_message,
            plain_content=plain_message,
            recipient_email=recipient_user.email,
            headers=headers
        )
        
        # Log email metric
        email_latency = (time.time() - email_start_time) * 1000  # in milliseconds
        delivery_status = 'email_sent' if success else 'failed'
        MessageMetrics.objects.create(
            message=message,
            recipient=recipient_user,
            delivery_status=delivery_status,
            delivery_latency=email_latency,
            is_recipient_online=False  # We don't check online status for delayed emails
        )
        
        if success:
            logger.info(f"Sent delayed email notification to {recipient_user.email} for message {message.message_id}")
        else:
            logger.error(f"Failed to send delayed email notification to {recipient_user.email} for message {message.message_id}")
    except Exception as e:
        logger.error(f"Error sending delayed email: {str(e)}")
        logger.exception("Full email sending error details:")

@receiver(post_save, sender=UserMessage)
def handle_new_message(sender, instance, created, **kwargs):
    """
    Signal handler for new messages to send real-time notifications and emails
    """
    if not created:
        return  # Only handle newly created messages
    
    try:
        # Log message creation
        logger.info(f"Handling new message in user_messages signal: ID={instance.message_id}, type={instance.type_of_message}, content='{instance.content}'")
        
        # Start timing for performance metrics
        start_time = time.time()
        
        # Get the conversation and participants
        conversation = instance.conversation
        sender_user = instance.sender
        
        # Determine the recipient (the other participant)
        recipient_user = conversation.participant2 if conversation.participant1 == sender_user else conversation.participant1
        
        # Check if recipient is online based on cache
        is_online = cache.get(f"user_{recipient_user.id}_online", False)
        
        # Get the role_map from conversation to determine if recipient is professional
        role_map = conversation.role_map or {}
        recipient_user_id_str = str(recipient_user.id)
        
        # Determine if the conversation is professional for the recipient
        # This means we need to check if the recipient's role is 'professional'
        is_professional = False
        if recipient_user_id_str in role_map:
            is_professional = role_map[recipient_user_id_str] == 'professional'
        
        logger.info(f"Determined is_professional={is_professional} for recipient {recipient_user.id} in conversation {conversation.conversation_id}")
        
        # Prepare message data for notification
        message_data = {
            'message_id': instance.message_id,
            'content': instance.content,
            'conversation_id': conversation.conversation_id,
            'sender_id': sender_user.id,
            'sender_name': sender_user.name,
            'timestamp': instance.timestamp.isoformat(),
            'status': instance.status,
            'type_of_message': instance.type_of_message,
            'is_clickable': instance.is_clickable,
            'metadata': instance.metadata,
            'sent_by_other_user': True,  # From recipient's perspective, this is sent by the other user
            'is_professional': is_professional  # Include is_professional flag for the recipient
        }
        
        # Send real-time notification via WebSocket
        try:
            channel_layer = get_channel_layer()
            recipient_group = f"user_{recipient_user.id}_notifications"
            
            logger.info(f"Sending WebSocket message to group {recipient_group}")
            
            async_to_sync(channel_layer.group_send)(
                recipient_group,
                {
                    "type": "message_notification",
                    "data": message_data
                }
            )
            
            # Also send updated unread counts to recipient
            # Get the recipient's unread message counts
            from conversations.models import Conversation
            from django.db.models import Count
            
            conversations = Conversation.objects.filter(
                Q(participant1=recipient_user) | Q(participant2=recipient_user)
            )
            
            total_unread = 0
            conversation_counts = {}
            
            for conv in conversations:
                # Get the other user in each conversation
                other_user = conv.participant2 if conv.participant1 == recipient_user else conv.participant1
                
                # Count unread messages
                unread_count = UserMessage.objects.filter(
                    conversation=conv,
                    sender=other_user,
                    status='sent'
                ).count()
                
                if unread_count > 0:
                    total_unread += unread_count
                    conversation_counts[str(conv.conversation_id)] = unread_count
            
            # Send unread update via WebSocket
            async_to_sync(channel_layer.group_send)(
                recipient_group,
                {
                    "type": "unread_update",
                    "data": {
                        "unread_count": total_unread,
                        "unread_conversations": len(conversation_counts),
                        "conversation_counts": conversation_counts
                    }
                }
            )
            
            # Log WebSocket metric
            websocket_latency = (time.time() - start_time) * 1000  # in milliseconds
            MessageMetrics.objects.create(
                message=instance,
                recipient=recipient_user,
                delivery_status='websocket_sent',
                delivery_latency=websocket_latency,
                is_recipient_online=is_online
            )
            
            logger.info(f"Sent WebSocket notification to user {recipient_user.id} for message {instance.message_id}")
        except Exception as e:
            # Log failure metric
            MessageMetrics.objects.create(
                message=instance,
                recipient=recipient_user,
                delivery_status='failed',
                is_recipient_online=is_online,
                client_info={'error': str(e), 'type': 'websocket'}
            )
            logger.error(f"Error sending WebSocket notification: {str(e)}")
        
        # Schedule the delayed email notification using centralized function
        from core.email_utils import schedule_delayed_email
        
        def delayed_email_function():
            send_delayed_email(instance.message_id)
        
        schedule_delayed_email(delayed_email_function, delay_seconds=20)
        
    except Exception as e:
        logger.error(f"Error in message notification signal: {str(e)}")
        logger.exception("Full exception details:")


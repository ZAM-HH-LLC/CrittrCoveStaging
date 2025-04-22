import logging
import json
import time
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

logger = logging.getLogger(__name__)

@receiver(post_save, sender=UserMessage)
def handle_new_message(sender, instance, created, **kwargs):
    """
    Signal handler for new messages to send real-time notifications and emails
    """
    if not created:
        return  # Only handle newly created messages
    
    try:
        # Get conversation and identify the recipient
        conversation = instance.conversation
        sender_user = instance.sender
        
        # Determine the recipient user
        recipient_user = conversation.participant1 if conversation.participant1 != sender_user else conversation.participant2
        
        # Start tracking message delivery time
        start_time = time.time()
        
        # Check if recipient is online - more reliable check
        is_online = cache.get(f"user_{recipient_user.id}_online", False)
        
        # Log this information to help debug
        logger.info(f"User {recipient_user.id} online status: {is_online}")
        
        # Prepare notification data
        message_data = {
            "message_id": instance.message_id,
            "conversation_id": conversation.conversation_id,
            "sender_id": sender_user.id,
            "sender_name": sender_user.name,
            "content": instance.content,
            "timestamp": instance.timestamp.isoformat(),
            "type_of_message": instance.type_of_message,
            "is_clickable": instance.is_clickable,
            "status": instance.status,
            "sent_by_other_user": True,  # From recipient's perspective
            "metadata": instance.metadata
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
        
        # Send email notification only if recipient is definitively offline and has email notifications enabled
        if not is_online:
            # Double-check connections to make sure the user is truly offline
            connections = cache.get(f"user_{recipient_user.id}_connections", set())
            if connections:
                logger.info(f"User {recipient_user.id} has active connections, skipping email")
                return
                
            try:
                # Check if user has email notifications enabled
                try:
                    user_settings = UserSettings.objects.get(user=recipient_user)
                    if not user_settings.email_updates:
                        logger.info(f"User {recipient_user.id} has email notifications disabled")
                        return
                except UserSettings.DoesNotExist:
                    # Default to sending if setting doesn't exist
                    pass
                
                logger.info(f"User {recipient_user.id} is offline with email_updates enabled, sending email notification")
                
                email_start_time = time.time()
                
                # Determine message type for email subject
                message_type_map = {
                    'normal_message': 'New message',
                    'initial_booking_request': 'New booking request',
                    'approval_request': 'Booking approval request',
                    'request_changes': 'Booking change request',
                    'send_approved_message': 'Booking approval request'
                }
                message_type_text = message_type_map.get(instance.type_of_message, 'New message')
                
                # Create email subject
                subject = f"{message_type_text} from {sender_user.name}"
                
                # Create context for email template
                context = {
                    'recipient_name': recipient_user.name,
                    'sender_name': sender_user.name,
                    'message_type': message_type_text,
                    'conversation_id': conversation.conversation_id,
                    'message_preview': instance.content[:100] + ('...' if len(instance.content) > 100 else ''),
                    'message_type_display': instance.type_of_message.replace('_', ' ').title(),
                    'frontend_url': f"{settings.FRONTEND_BASE_URL}/messages?conversationId={conversation.conversation_id}"
                }
                
                try:
                    # Create email body
                    html_message = render_to_string('user_messages/email/new_message.html', context)
                    plain_message = strip_tags(html_message)
                    
                    # Send email
                    email = EmailMultiAlternatives(
                        subject=subject,
                        body=plain_message,
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        to=[recipient_user.email]
                    )
                    email.attach_alternative(html_message, "text/html")
                    email.send(fail_silently=True)
                    
                    # Log email metric
                    email_latency = (time.time() - email_start_time) * 1000  # in milliseconds
                    MessageMetrics.objects.create(
                        message=instance,
                        recipient=recipient_user,
                        delivery_status='email_sent',
                        delivery_latency=email_latency,
                        is_recipient_online=is_online
                    )
                    
                    logger.info(f"Sent email notification to {recipient_user.email} for message {instance.message_id}")
                except Exception as e:
                    logger.error(f"Error sending email: {str(e)}")
            except Exception as e:
                # Log failure metric for the overall email notification process
                MessageMetrics.objects.create(
                    message=instance,
                    recipient=recipient_user,
                    delivery_status='failed',
                    is_recipient_online=is_online,
                    client_info={'error': str(e), 'type': 'email'}
                )
                logger.error(f"Error sending email notification: {str(e)}")
        else:
            logger.info(f"User {recipient_user.id} is online, skipping email notification")
    
    except Exception as e:
        logger.error(f"Error in message notification signal: {str(e)}")
        logger.exception("Full exception details:") 
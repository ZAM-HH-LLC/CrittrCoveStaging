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
from django.utils import timezone

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
        
        # Send email notification if user has email notifications enabled (regardless of online status)
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
            
            logger.info(f"Sending email notification to user {recipient_user.id} (online: {is_online})")
            
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
            
            # Create personalized email subject with recipient name to reduce spam score
            subject = f"{recipient_user.name}, you have a {message_type_text.lower()} from {sender_user.name}"
            
            # Log email settings like in the working example
            logger.info(f"Attempting to send message notification email to {recipient_user.email}")
            logger.info(f"Email settings: BACKEND={settings.EMAIL_BACKEND}, HOST={settings.EMAIL_HOST}, PORT={settings.EMAIL_PORT}, TLS={settings.EMAIL_USE_TLS}, USER={settings.EMAIL_HOST_USER}")
            logger.info(f"From email: {settings.DEFAULT_FROM_EMAIL}")
            
            # Create a message preview (first 100 chars)
            message_preview = instance.content[:100] + ('...' if len(instance.content) > 100 else '')
            
            # Format date for email
            email_date = timezone.now().strftime("%B %d, %Y at %I:%M %p")
            
            # Create a similar HTML email message as the invitation system
            # Anti-spam measures: balanced text-to-HTML ratio, proper alt texts, and avoided spam trigger words
            html_message = f"""
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>CrittrCove Message from {sender_user.name}</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; padding: 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                    <tr>
                        <td style="padding: 20px; text-align: center; background-color: #e7f2f2;">
                            <h1 style="color: #008080; margin-top: 0;">CrittrCove</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px 20px;">
                            <h1 style="margin-top: 0; color: #333333; font-size: 24px;">Hi {recipient_user.name},</h1>
                            <p>You've received a {message_type_text.lower()} from {sender_user.name} on {email_date}.</p>
                            
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
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 20px; text-align: center; background-color: #f5f5f5; font-size: 12px;">
                            <p>You're receiving this email because you have an account on CrittrCove and have enabled message notifications.</p>
                            <p><a href="{settings.FRONTEND_BASE_URL}/settings/notifications" style="color: #008080; text-decoration: underline;">Manage your notification preferences</a> | <a href="{settings.FRONTEND_BASE_URL}" style="color: #008080; text-decoration: underline;">Visit CrittrCove</a></p>
                            <p>CrittrCove, Inc. • 123 Pet Street • San Francisco, CA 94103</p>
                            <p>&copy; 2025 CrittrCove. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
            """
            
            plain_message = f"""
Hi {recipient_user.name},

You've received a {message_type_text.lower()} from {sender_user.name} on {email_date}.

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
            
            # Create custom headers to improve deliverability
            headers = {
                'X-Priority': '1',                       # Mark as important
                'X-MSMail-Priority': 'High',             # For Outlook
                'Importance': 'High',                    # General importance flag
                'X-Auto-Response-Suppress': 'OOF, DR',   # Prevent auto-responders
                'List-Unsubscribe': f'<{settings.FRONTEND_BASE_URL}/settings/notifications>', # Unsubscribe header
                'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
                'Precedence': 'bulk',                    # Indicate bulk mail but legitimate
                'Message-ID': f'<message-{instance.message_id}.{int(time.time())}@crittrcove.com>',  # Custom Message-ID with timestamp
                'References': f'<conv-{conversation.conversation_id}@crittrcove.com>',  # Add References header for threading
                'X-Entity-Ref-ID': f'{instance.message_id}',  # Reference ID to prevent duplicates
                # Gmail-specific engagement markers
                'X-Google-Appengine-App-Id': '1',
                'X-Gmail-Labels': 'IMPORTANT,CATEGORY_PERSONAL',
            }
            
            # Handle reply-to properly
            reply_email = settings.DEFAULT_FROM_EMAIL
            if hasattr(settings, 'NOTIFICATIONS_REPLY_TO'):
                reply_email = settings.NOTIFICATIONS_REPLY_TO
            
            # Use EmailMessage for more control over headers
            email_message = EmailMultiAlternatives(
                subject=subject,
                body=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,  # Use default email directly without formatting
                to=[recipient_user.email],
                reply_to=[reply_email],  # Add proper reply-to
                headers=headers
            )
            email_message.attach_alternative(html_message, "text/html")
            email_message.send(fail_silently=False)
            
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
            logger.exception("Full email sending error details:")  # Log full traceback
    
    except Exception as e:
        logger.error(f"Error in message notification signal: {str(e)}")
        logger.exception("Full exception details:")


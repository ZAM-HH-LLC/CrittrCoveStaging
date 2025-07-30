"""
Email helpers for the users app.

This module contains functions for sending various email notifications related to user accounts.
It works in conjunction with signals.py, which listens for user-related events and triggers
these email notifications as needed.

The main design pattern is:
1. Define email functions in this module
2. Register signal handlers in signals.py that call these functions
3. Use transaction.on_commit() in the signals to send emails asynchronously

This approach ensures:
- Emails are sent only after the database transaction is committed
- Email sending doesn't block the request-response cycle
- Email failures don't cause user-visible errors
"""

import logging
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)

def send_new_user_notification(user):
    """
    Send a notification email to the admin when a new user signs up.
    
    Args:
        user: The User object of the newly registered user
    
    Returns:
        bool: True if email was sent successfully, False otherwise
    """
    try:
        subject = f"New User Signup: {user.email}"
        
        # Context for the email template
        context = {
            'user_email': user.email,
            'user_name': user.name,
            'signup_date': user.created_at.strftime('%Y-%m-%d %H:%M:%S UTC'),
            'user_id': user.user_id,
            'location': getattr(user, 'location', 'Not specified')
        }
        
        # Create HTML message
        html_message = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 0; padding: 0; color: #333; }}
                .container {{ padding: 20px; }}
                .header {{ background-color: #008080; color: white; padding: 10px 20px; }}
                table {{ border-collapse: collapse; width: 100%; margin-top: 20px; }}
                th, td {{ padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }}
                th {{ background-color: #f2f2f2; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h2>New User Registration</h2>
            </div>
            <div class="container">
                <p>A new user has registered on CrittrCove:</p>
                
                <table>
                    <tr>
                        <th>Field</th>
                        <th>Value</th>
                    </tr>
                    <tr>
                        <td>Name</td>
                        <td>{context['user_name']}</td>
                    </tr>
                    <tr>
                        <td>Email</td>
                        <td>{context['user_email']}</td>
                    </tr>
                    <tr>
                        <td>User ID</td>
                        <td>{context['user_id']}</td>
                    </tr>
                    <tr>
                        <td>Signup Date</td>
                        <td>{context['signup_date']}</td>
                    </tr>
                    <tr>
                        <td>Location</td>
                        <td>{context['location']}</td>
                    </tr>
                </table>
                
                <p>You can view their profile in the admin panel.</p>
            </div>
        </body>
        </html>
        """
        
        # Create plain text message
        plain_message = strip_tags(html_message)
        
        # The email will be sent from the default FROM email to the EMAIL_HOST_USER
        from_email = settings.DEFAULT_FROM_EMAIL
        recipient_list = [settings.EMAIL_HOST_USER]
        
        logger.info(f"Sending new user notification email to {recipient_list}")
        
        # Send email
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=from_email,
            recipient_list=recipient_list,
            html_message=html_message,
            fail_silently=False,
        )
        
        logger.info(f"Successfully sent new user notification email for {user.email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send new user notification email: {str(e)}")
        return False


def send_welcome_email(user, invitation=None):
    """
    Send a welcome email to a newly registered user.
    
    Args:
        user: The User object of the newly registered user
        invitation: Optional Invitation object if user was invited
    
    Returns:
        bool: True if email was sent successfully, False otherwise
    """
    try:
        
        subject = "Welcome to CrittrCove!"
        
        # Format date for email
        from django.utils import timezone
        signup_date = timezone.now().strftime("%B %d, %Y")
        
        # Check if user was invited and by whom
        invitation_info = ""
        conversation_info = ""
        if invitation and invitation.inviter:
            invitation_info = f"<p>Since you were invited by <strong>{invitation.inviter.name}</strong>, we've already set up a conversation between you two so you can start chatting right away. You can find it in your Messages section!</p>"
            conversation_info = f"Since you were invited by {invitation.inviter.name}, we've set up a conversation between you two so you can start chatting right away."
        
        # Enhanced headers for better deliverability
        import time
        message_id_str = f"welcome.{user.user_id}.{int(time.time())}@crittrcove.com"
        headers = {
            'Message-ID': f'<{message_id_str}>',
            'X-Mail-Type': 'welcome',
            'X-Campaign-Type': 'transactional',
            'Feedback-ID': f'{user.user_id}:welcome:crittrcove',
            'X-Auto-Response-Suppress': 'All',
            'Auto-Submitted': 'auto-generated',
            'X-Message-Type': 'welcome_email',
            'X-Message-Info': 'user_welcome',
            'X-Message-ID': message_id_str,
            'Precedence': 'transactional'
        }
        
        # Create HTML email message
        html_message = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to CrittrCove!</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; padding: 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                <tr>
                    <td style="padding: 20px; text-align: center; background-color: #e7f2f2;">
                        <h1 style="color: #008080; margin-top: 0;">Welcome to CrittrCove!</h1>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 30px 20px;">
                        <h1 style="margin-top: 0; color: #333333; font-size: 24px;">Hi {user.name},</h1>
                        <p>Thank you for joining CrittrCove on {signup_date}! We're thrilled to have you as part of our pet-loving community.</p>
                        
                        {invitation_info}
                        
                        <div style="background-color: #f8fffe; border-left: 4px solid #008080; padding: 20px; margin: 25px 0;">
                            <h3 style="margin-top: 0; color: #008080;">Getting Started with CrittrCove</h3>
                            <ul style="margin-bottom: 0;">
                                <li><strong>Add Pets to your account:</strong> Go to profile -> my pets -> add a pet. This will allow pro's to create a booking for you and your pet.</li>
                                <li><strong>Find Pet Care:</strong> Browse trusted professionals in your area for any pet service</li>
                                <li><strong>Book Services:</strong> Contact professionals to have them schedule and manage bookings for you directly through the app</li>
                                <li><strong>Stay Connected:</strong> Message professionals and keep track of your pet's care throughout bookings</li>
                            </ul>
                        </div>
                        
                        <div style="background-color: #fff8e7; border-left: 4px solid #ffa500; padding: 20px; margin: 25px 0;">
                            <h3 style="margin-top: 0; color: #e67e00;">Want to Become a Pet Care Professional?</h3>
                            <p style="margin-bottom: 10px;">If you're interested in offering pet care services, you can apply to become a professional via the become a professional link in the navigation in app. Professional accounts can:</p>
                            <ul style="margin-bottom: 10px;">
                                <li>Create and manage service listings</li>
                                <li>Set your own custom rates</li>
                                <li>Invite pet owners, or be found by pet owners in app</li>
                                <li>Build your reputation through reviews and badges</li>
                            </ul>
                            <div style="text-align: center; margin: 20px 0;">
                                <a href="{settings.FRONTEND_BASE_URL}/become-professional" 
                                style="display: inline-block; background-color: #ffa500; color: #e67e00; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 16px;">
                                Learn About Becoming a Professional
                                </a>
                            </div>
                        </div>
                        
                        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 4px; margin: 25px 0;">
                            <h3 style="margin-top: 0; color: #333;">Need Help Getting Started?</h3>
                            <p>Our support team is here to help! If you have any questions about using CrittrCove, finding the right pet care services, or anything else, don't hesitate to reach out.</p>
                            <p><strong>Contact us:</strong> <a href="mailto:support@crittrcove.com" style="color: #008080;">support@crittrcove.com</a></p>
                        </div>
                        
                        <p>We're excited to help you discover amazing pet care services and connect with fellow pet enthusiasts!</p>
                        
                        <p>Welcome aboard!<br>The CrittrCove Team</p>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 20px; text-align: center; background-color: #f5f5f5; font-size: 12px;">
                        <p>You're receiving this email because you just created an account on CrittrCove.</p>
                        <p><a href="{settings.FRONTEND_BASE_URL}/settings/notifications" style="color: #008080; text-decoration: underline;">Manage your notification preferences</a> | <a href="{settings.FRONTEND_BASE_URL}" style="color: #008080; text-decoration: underline;">Visit CrittrCove</a></p>
                        <p>CrittrCove LLC. • Colorado Springs, CO</p>
                        <p>&copy; 2025 CrittrCove. All rights reserved.</p>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """
    
        plain_message = f"""
Hi {user.name},

Thank you for joining CrittrCove on {signup_date}! We're thrilled to have you as part of our pet-loving community.

{conversation_info}

GETTING STARTED WITH CRITTRCOVE:
• Find Pet Care: Browse trusted professionals in your area for pet sitting, dog walking, grooming, and more
• Book Services: Schedule and manage appointments directly through the app  
• Stay Connected: Message professionals and keep track of your pet's care
• Join Our Community: Connect with other pet owners and share experiences

WANT TO BECOME A PET CARE PROFESSIONAL?
If you're interested in offering pet care services, you can apply to become a professional right from your profile! Professional accounts can:
• Create and manage service listings
• Set your own rates and availability  
• Connect with pet owners in your area
• Build your reputation through reviews

Learn more: {settings.FRONTEND_BASE_URL}/become-professional

Start exploring CrittrCove: {settings.FRONTEND_BASE_URL}

NEED HELP GETTING STARTED?
Our support team is here to help! If you have any questions about using CrittrCove, finding the right pet care services, or anything else, don't hesitate to reach out.

Contact us: support@crittrcove.com

We're excited to help you discover amazing pet care services and connect with fellow pet enthusiasts!

Welcome aboard!
The CrittrCove Team

---
You're receiving this email because you just created an account on CrittrCove.
Manage your notification preferences: {settings.FRONTEND_BASE_URL}/settings/notifications
CrittrCove, Inc. • 123 Pet Street • San Francisco, CA 94103
© 2025 CrittrCove. All rights reserved.
        """
    
        # Use EmailMultiAlternatives for better email handling
        from django.core.mail import EmailMultiAlternatives
        
        email_message = EmailMultiAlternatives(
            subject=subject,
            body=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[user.email],
            headers=headers
        )
        email_message.attach_alternative(html_message, "text/html")
        
        email_message.send(fail_silently=False)
        
        logger.info(f"Successfully sent welcome email to {user.email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send welcome email to {user.email}: {str(e)}")
        logger.exception("Full welcome email error details:")
        return False 
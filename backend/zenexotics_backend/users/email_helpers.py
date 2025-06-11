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
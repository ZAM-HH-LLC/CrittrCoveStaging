"""
Centralized email utilities for CrittrCove
"""
import time
import logging
import threading
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.utils import timezone
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)

# Email Constants
EMAIL_HEADER_HTML = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CrittrCove</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; padding: 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
        <tr>
            <td style="padding: 20px; text-align: center; background-color: #e7f2f2;">
                <h1 style="color: #008080; margin-top: 0;">CrittrCove</h1>
            </td>
        </tr>
"""

EMAIL_FOOTER_HTML = """
        <tr>
            <td style="padding: 20px; text-align: center; background-color: #f5f5f5; font-size: 12px;">
                <p>You're receiving this email because you have an account on CrittrCove and have enabled email notifications.</p>
                <p><a href="{settings_url}" style="color: #008080; text-decoration: underline;">Manage your notification preferences</a> | <a href="{home_url}" style="color: #008080; text-decoration: underline;">Visit CrittrCove</a></p>
                <p>CrittrCove, Inc. • 123 Pet Street • San Francisco, CA 94103</p>
                <p>&copy; 2025 CrittrCove. All rights reserved.</p>
            </td>
        </tr>
    </table>
</body>
</html>
"""

DEFAULT_EMAIL_HEADERS = {
    'List-Unsubscribe': f'<{settings.FRONTEND_BASE_URL}/settings/notifications>',
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    'X-Mail-Type': 'notification',
    'X-Campaign-Type': 'transactional',
    'X-Auto-Response-Suppress': 'All',
    'Auto-Submitted': 'auto-generated',
    'Precedence': 'transactional'
}

def get_common_email_headers(entity_id, entity_type, conversation_id=None):
    """
    Generate common email headers for better deliverability
    """
    timestamp = int(time.time())
    message_id = f"{entity_id}.{timestamp}@crittrcove.com"
    
    headers = DEFAULT_EMAIL_HEADERS.copy()
    headers.update({
        'Message-ID': f'<{message_id}>',
        'X-Entity-Ref-ID': str(entity_id),
        'X-Message-ID': message_id,
        'Feedback-ID': f'{entity_id}:{entity_type}:crittrcove',
        'X-Message-Info': f'{entity_type}_notification'
    })
    
    if conversation_id:
        headers.update({
            'References': f'<conv-{conversation_id}@crittrcove.com>',
            'In-Reply-To': f'<conv-{conversation_id}@crittrcove.com>'
        })
    
    return headers

def build_email_html(content_html, recipient_name=None):
    """
    Build complete HTML email with header and footer
    """
    content_section = f"""
        <tr>
            <td style="padding: 30px 20px;">
                {content_html}
            </td>
        </tr>
    """
    
    footer = EMAIL_FOOTER_HTML.format(
        settings_url=f"{settings.FRONTEND_BASE_URL}/settings/notifications",
        home_url=settings.FRONTEND_BASE_URL
    )
    
    return EMAIL_HEADER_HTML + content_section + footer

def send_email_with_retry(subject, html_content, plain_content, recipient_email, headers, reply_to=None):
    """
    Send email with proper error handling and retry logic
    """
    try:
        if not reply_to:
            reply_to = getattr(settings, 'NOTIFICATIONS_REPLY_TO', settings.DEFAULT_FROM_EMAIL)
        
        email_message = EmailMultiAlternatives(
            subject=subject,
            body=plain_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[recipient_email],
            reply_to=[reply_to],
            headers=headers
        )
        
        email_message.attach_alternative(html_content, "text/html")
        email_message.mixed_subtype = 'related'
        
        email_message.send(fail_silently=False)
        logger.info(f"Email sent successfully to {recipient_email} with subject: {subject}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send email to {recipient_email}: {str(e)}")
        return False

def check_user_email_settings(user):
    """
    Check if user has email notifications enabled
    """
    try:
        from users.models import UserSettings
        user_settings = UserSettings.objects.get(user=user)
        return user_settings.email_updates
    except:
        return True  # Default to enabled if setting doesn't exist

def format_currency(amount):
    """
    Format currency amount for display
    """
    try:
        return f"${float(amount):.2f}"
    except (ValueError, TypeError):
        return f"${amount}"

def format_date_for_email(date_obj):
    """
    Format date for email display
    """
    if date_obj:
        return date_obj.strftime("%B %d, %Y at %I:%M %p")
    return "Not specified"

def schedule_delayed_email(email_function, delay_seconds=60):
    """
    Schedule an email to be sent after a delay in a separate thread
    """
    def delayed_send():
        try:
            time.sleep(delay_seconds)
            email_function()
        except Exception as e:
            logger.error(f"Error in delayed email thread: {str(e)}")
            logger.exception("Full error details:")
    
    thread = threading.Thread(target=delayed_send)
    thread.daemon = True
    thread.start()
    return thread

def send_booking_confirmation_email(booking_id):
    """
    Send a booking confirmation email with detailed booking information
    """
    
    try:
        # Import models here to avoid circular imports
        from bookings.models import Booking
        from booking_occurrences.models import BookingOccurrence
        from booking_occurrence_rates.models import BookingOccurrenceRate
        from booking_details.models import BookingDetails
        from booking_summary.models import BookingSummary
        from booking_pets.models import BookingPets
        from conversations.models import Conversation
        from users.models import UserSettings
        from django.db.models import Q
        
        # Get booking and related data
        try:
            booking = Booking.objects.get(booking_id=booking_id)
        except Booking.DoesNotExist:
            logger.error(f"Booking {booking_id} not found for confirmation email")
            return
        
        # Get professional and client
        professional = booking.professional
        client = booking.client
        professional_user = professional.user
        client_user = client.user
        
        # Check if users have email notifications enabled
        send_to_professional = check_user_email_settings(professional_user)
        send_to_client = check_user_email_settings(client_user)
        
        if not send_to_professional and not send_to_client:
            logger.info(f"Both professional {professional_user.id} and client {client_user.id} have email notifications disabled")
            return
        
        # Get booking occurrences ordered by date
        occurrences = BookingOccurrence.objects.filter(booking=booking).order_by('start_date', 'start_time')
        
        # Get booking summary for costs
        booking_summary = None
        try:
            booking_summary = BookingSummary.objects.get(booking=booking)
        except BookingSummary.DoesNotExist:
            logger.warning(f"No booking summary found for booking {booking_id}")
        
        # Get booking details
        booking_details = []
        try:
            booking_details = BookingDetails.objects.filter(booking=booking)
        except:
            logger.warning(f"No booking details found for booking {booking_id}")
        
        # Get conversation for link
        conversation = None
        try:
            conversation = Conversation.objects.filter(
                (Q(participant1=professional_user) & Q(participant2=client_user)) |
                (Q(participant1=client_user) & Q(participant2=professional_user))
            ).first()
        except:
            logger.warning(f"No conversation found for booking {booking_id}")
        
        # Helper function to build occurrence HTML for a specific user
        def build_occurrence_html(user_id):
            occurrence_html = ""
            if occurrences:
                occurrence_html = "<h3>Booking Schedule:</h3><ul>"
                for occurrence in occurrences:
                    # Use the occurrence's get_formatted_times method to get properly formatted times
                    formatted_times = occurrence.get_formatted_times(user_id)
                    timezone_info = formatted_times.get('timezone', 'UTC')
                    occurrence_html += f"<li>{formatted_times['formatted_start']} - {formatted_times['formatted_end']} <em>({timezone_info})</em></li>"
                occurrence_html += "</ul>"
            return occurrence_html
        
        # Build booking details HTML
        details_html = ""
        if booking_details:
            details_html = "<h3>Service Details:</h3><ul>"
            for detail in booking_details:
                details_html += f"<li>{detail.service_name}: {detail.quantity} {detail.unit_of_time}</li>"
            details_html += "</ul>"
        
        # Helper function to build detailed cost breakdown
        def build_cost_breakdown_html(is_professional=True):
            cost_html = ""
            if booking_summary:
                cost_html = "<h3 style='color: #333333; margin-bottom: 20px;'>Payment Details:</h3>"
                
                # Add individual occurrence costs
                if occurrences:
                    cost_html += "<h4 style='color: #008080; margin-bottom: 15px;'>Service Breakdown by Date:</h4>"
                    for occurrence in occurrences:
                        # Format the date range for the occurrence
                        if occurrence.start_date == occurrence.end_date:
                            date_range = occurrence.start_date.strftime('%b %d, %Y')
                        else:
                            date_range = f"{occurrence.start_date.strftime('%b %d, %Y')} - {occurrence.end_date.strftime('%b %d, %Y')}"
                        
                        # Use table structure for better email client compatibility
                        cost_html += f"""
                        <table style='width: 100%; margin-bottom: 20px; border-collapse: collapse; background-color: #f9f9f9; border-left: 4px solid #008080;'>
                            <tr>
                                <td style='padding: 15px;'>
                                    <div style='background-color: #008080; color: #FFFFFF; padding: 10px; margin-bottom: 15px; text-align: center;'>
                                        <strong style='font-size: 16px;'>{date_range}</strong>
                                    </div>
                        """
                        
                        # Get occurrence details
                        booking_detail = occurrence.booking_details.first()
                        if booking_detail:
                            cost_html += f"<p style='margin: 8px 0; padding: 8px; background-color: #FFFFFF; color: #333333; border: 1px solid #e0e0e0; border-radius: 3px;'><strong>Base Rate: {format_currency(booking_detail.base_rate)}</strong></p>"
                            if booking_detail.additional_pet_rate > 0 and booking_detail.num_pets > booking_detail.applies_after:
                                additional_pets = booking_detail.num_pets - booking_detail.applies_after
                                additional_cost = booking_detail.additional_pet_rate * additional_pets
                                cost_html += f"<p style='margin: 8px 0; padding: 8px; background-color: #FFFFFF; color: #333333; border: 1px solid #e0e0e0; border-radius: 3px;'><strong>Additional Pet Rate ({additional_pets} pets): {format_currency(additional_cost)}</strong></p>"
                            if booking_detail.holiday_rate > 0 and booking_detail.is_holiday(occurrence.start_date):
                                cost_html += f"<p style='margin: 8px 0; padding: 8px; background-color: #FFFFFF; color: #333333; border: 1px solid #e0e0e0; border-radius: 3px;'><strong>Holiday Rate: {format_currency(booking_detail.holiday_rate)}</strong></p>"
                        
                        # Get additional rates
                        if hasattr(occurrence, 'rates') and occurrence.rates.rates:
                            for rate in occurrence.rates.rates:
                                cost_html += f"<p style='margin: 8px 0; padding: 8px; background-color: #FFFFFF; color: #333333; border: 1px solid #e0e0e0; border-radius: 3px;'><strong>{rate['title']}: {rate['amount']}</strong></p>"
                        
                        cost_html += f"""
                                    <div style='margin-top: 15px; padding-top: 15px; border-top: 2px solid #e0e0e0; text-align: center;'>
                                        <strong style='font-size: 16px; color: #008080;'>Date Total: {format_currency(occurrence.calculated_cost)}</strong>
                                    </div>
                                </td>
                            </tr>
                        </table>
                        """
                
                # Add summary totals using table structure
                cost_html += f"""
                <table style='width: 100%; margin-top: 25px; border-collapse: collapse; background-color: #e7f2f2; border: 2px solid #008080;'>
                    <tr>
                        <td style='padding: 20px;'>
                            <h4 style='margin: 0 0 20px 0; color: #FFFFFF; font-size: 18px; background-color: #008080; padding: 12px; text-align: center;'>Payment Summary</h4>
                            
                            <p style='margin: 15px 0; padding: 12px; border-top: 2px solid #e0e0e0; text-align: center;'>
                                <strong style='font-size: 16px; color: #008080;'>Service Subtotal: {format_currency(booking_summary.subtotal)}</strong>
                            </p>
                            <p style='margin: 15px 0; padding: 12px; border-top: 2px solid #e0e0e0; text-align: center;'>
                                <strong style='font-size: 16px; color: #008080;'>Client Platform Fee ({booking_summary.client_platform_fee_percentage}%): {format_currency(booking_summary.client_platform_fee)}</strong>
                            </p>
                            <p style='margin: 15px 0; padding: 12px; border-top: 2px solid #e0e0e0; text-align: center;'>
                                <strong style='font-size: 16px; color: #008080;'>Taxes: {format_currency(booking_summary.taxes)}</strong>
                            </p>
                            <div style='margin-top: 20px; padding: 15px; background-color: #008080; text-align: center;'>
                                <strong style='font-size: 18px; color: #FFFFFF;'>Total Client Cost: {format_currency(booking_summary.total_client_cost)}</strong>
                            </div>
                """
                
                if is_professional:
                    cost_html += f"""
                            <div style='margin-top: 20px; padding-top: 20px; border-top: 2px solid #cccccc;'>
                                <p style='margin: 15px 0; padding: 12px; border-top: 2px solid #e0e0e0; text-align: center;'>
                                    <strong style='font-size: 16px; color: #008080;'>Professional Platform Fee ({booking_summary.pro_platform_fee_percentage}%): {format_currency(booking_summary.pro_platform_fee)}</strong>
                                </p>
                                <div style='margin-top: 15px; padding: 15px; background-color: #008080; text-align: center;'>
                                    <strong style='font-size: 18px; color: #FFFFFF;'>Your Payout: {format_currency(booking_summary.total_sitter_payout)}</strong>
                                </div>
                            </div>
                    """
                
                cost_html += """
                        </td>
                    </tr>
                </table>
                """
            
            return cost_html
        
        # Build pets HTML
        pets_html = ""
        if booking.booking_pets.exists():
            pets_html = "<h3>Pets:</h3><ul>"
            for booking_pet in booking.booking_pets.all():
                pet = booking_pet.pet
                pets_html += f"<li>{pet.name} ({pet.species})</li>"
            pets_html += "</ul>"
        
        # Helper function to format date for user
        def format_date_for_user(dt, user_id):
            try:
                # Get user settings
                user_settings = UserSettings.objects.get(user_id=user_id)
                user_timezone = user_settings.timezone
                use_military_time = user_settings.use_military_time
            except UserSettings.DoesNotExist:
                user_timezone = 'UTC'
                use_military_time = False
            
            # Convert to user's timezone
            import pytz
            if dt.tzinfo is None:
                dt = pytz.UTC.localize(dt)
            
            user_tz = pytz.timezone(user_timezone)
            local_dt = dt.astimezone(user_tz)
            
            # Format according to preferences
            time_format = '%H:%M' if use_military_time else '%I:%M %p'
            formatted_time = local_dt.strftime(time_format).lstrip('0')
            formatted_date = local_dt.strftime('%b %d, %Y')
            
            return f"{formatted_date} ({formatted_time})"
        
        # Helper function to build email content for a specific user
        def build_email_content(recipient_user, other_user, is_professional=True):
            email_date = format_date_for_user(timezone.now(), recipient_user.id)
            
            user_occurrence_html = build_occurrence_html(recipient_user.id)
            
            role_text = "professional" if is_professional else "client"
            other_role_text = "client" if is_professional else "professional"
            
            content_html = f"""
            <h1 style="margin-top: 0; color: #333333; font-size: 24px;">Hi {recipient_user.name},</h1>
            <p>Great news! Your booking with {other_user.name} has been confirmed on {email_date}.</p>
            
            <div style="background-color: #e7f2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="color: #008080; margin-top: 0;">Booking Confirmation</h2>
                <p><strong>Booking ID:</strong> {booking.booking_id}</p>
                <p><strong>Service:</strong> {booking.service_id.service_name if booking.service_id else 'N/A'}</p>
                <p><strong>{"Client" if is_professional else "Professional"}:</strong> {other_user.name}</p>
                <p><strong>Status:</strong> Confirmed</p>
            </div>
            
            {user_occurrence_html}
            {details_html}
            {pets_html}
            {build_cost_breakdown_html(is_professional)}
            
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 4px; margin: 20px 0;">
                <h3>Next Steps:</h3>
                <ul>
                    <li>Review the booking details above</li>
                    {"<li>Prepare for your scheduled service</li>" if is_professional else "<li>Prepare for your pet's service</li>"}
                    <li>Contact the {other_role_text} if you have any questions</li>
                </ul>
            </div>
            """
            
            # Add conversation link if available
            if conversation:
                content_html += f"""
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{settings.FRONTEND_BASE_URL}/messages?conversationId={conversation.conversation_id}" 
                    style="display: inline-block; background-color: #008080; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 16px;">
                    Message {other_user.name}
                    </a>
                </div>
                """
            
            content_html += f"""
            <p>Thank you for being part of the CrittrCove community!</p>
            <p>Best regards,<br>The CrittrCove Team</p>
            """
            
            return content_html
        
        # Helper function to build plain text content
        def build_plain_content(recipient_user, other_user, is_professional=True):
            email_date = format_date_for_user(timezone.now(), recipient_user.id)
            
            other_role_text = "client" if is_professional else "professional"
            
            plain_content = f"""
Hi {recipient_user.name},

Great news! Your booking with {other_user.name} has been confirmed on {email_date}.

BOOKING CONFIRMATION
Booking ID: {booking.booking_id}
Service: {booking.service_id.service_name if booking.service_id else 'N/A'}
{"Client" if is_professional else "Professional"}: {other_user.name}
Status: Confirmed

"""
            
            # Add occurrences to plain text
            if occurrences:
                plain_content += "\nBOOKING SCHEDULE:\n"
                for occurrence in occurrences:
                    formatted_times = occurrence.get_formatted_times(recipient_user.id)
                    timezone_info = formatted_times.get('timezone', 'UTC')
                    plain_content += f"• {formatted_times['formatted_start']} - {formatted_times['formatted_end']} ({timezone_info})\n"
            
            # Add detailed payment breakdown to plain text
            if booking_summary:
                plain_content += f"\nPAYMENT DETAILS:\n"
                
                # Add individual occurrence costs
                if occurrences:
                    plain_content += f"\nService Breakdown by Date:\n"
                    for occurrence in occurrences:
                        # Format the date range for the occurrence
                        if occurrence.start_date == occurrence.end_date:
                            date_range = occurrence.start_date.strftime('%b %d, %Y')
                        else:
                            date_range = f"{occurrence.start_date.strftime('%b %d, %Y')} - {occurrence.end_date.strftime('%b %d, %Y')}"
                        
                        plain_content += f"\n{date_range}:\n"
                        
                        # Get occurrence details
                        booking_detail = occurrence.booking_details.first()
                        if booking_detail:
                            plain_content += f"  Base Rate: {format_currency(booking_detail.base_rate)}\n"
                            if booking_detail.additional_pet_rate > 0 and booking_detail.num_pets > booking_detail.applies_after:
                                additional_pets = booking_detail.num_pets - booking_detail.applies_after
                                additional_cost = booking_detail.additional_pet_rate * additional_pets
                                plain_content += f"  Additional Pet Rate ({additional_pets} pets): {format_currency(additional_cost)}\n"
                            if booking_detail.holiday_rate > 0 and booking_detail.is_holiday(occurrence.start_date):
                                plain_content += f"  Holiday Rate: {format_currency(booking_detail.holiday_rate)}\n"
                        
                        # Get additional rates
                        if hasattr(occurrence, 'rates') and occurrence.rates.rates:
                            for rate in occurrence.rates.rates:
                                plain_content += f"  {rate['title']}: {rate['amount']}\n"
                        
                        plain_content += f"  Date Total: {format_currency(occurrence.calculated_cost)}\n"
                
                # Add summary totals
                plain_content += f"\n" + "="*50 + "\n"
                plain_content += f"PAYMENT SUMMARY\n"
                plain_content += f"="*50 + "\n"
                plain_content += f"Service Subtotal: {format_currency(booking_summary.subtotal)}\n"
                plain_content += f"Client Platform Fee ({booking_summary.client_platform_fee_percentage}%): {format_currency(booking_summary.client_platform_fee)}\n"
                plain_content += f"Taxes: {format_currency(booking_summary.taxes)}\n"
                plain_content += f"-"*50 + "\n"
                plain_content += f"*** TOTAL CLIENT COST: {format_currency(booking_summary.total_client_cost)} ***\n"
                plain_content += f"-"*50 + "\n"
                
                if is_professional:
                    plain_content += f"\nPROFESSIONAL BREAKDOWN:\n"
                    plain_content += f"Professional Platform Fee ({booking_summary.pro_platform_fee_percentage}%): {format_currency(booking_summary.pro_platform_fee)}\n"
                    plain_content += f"-"*30 + "\n"
                    plain_content += f"*** YOUR PAYOUT: {format_currency(booking_summary.total_sitter_payout)} ***\n"
                    plain_content += f"-"*30 + "\n"
            
            # Add conversation link to plain text
            if conversation:
                plain_content += f"\nTo message {other_user.name}, visit:\n"
                plain_content += f"{settings.FRONTEND_BASE_URL}/messages?conversationId={conversation.conversation_id}\n"
            
            plain_content += f"""
Thank you for being part of the CrittrCove community!

Best regards,
The CrittrCove Team

---
You're receiving this email because you have an account on CrittrCove and have enabled email notifications.
Manage your notification preferences: {settings.FRONTEND_BASE_URL}/settings/notifications
CrittrCove, Inc. • 123 Pet Street • San Francisco, CA 94103
© 2025 CrittrCove. All rights reserved.
"""
            return plain_content
        
        # Send email to professional if enabled
        if send_to_professional:
            try:
                # Create email headers
                headers = get_common_email_headers(
                    booking.booking_id, 
                    'booking_confirmation',
                    conversation.conversation_id if conversation else None
                )
                
                # Build content for professional
                content_html = build_email_content(professional_user, client_user, is_professional=True)
                plain_content = build_plain_content(professional_user, client_user, is_professional=True)
                html_content = build_email_html(content_html, professional_user.name)
                
                # Send email
                subject = f"Booking Confirmed - {client_user.name} on CrittrCove"
                
                success = send_email_with_retry(
                    subject=subject,
                    html_content=html_content,
                    plain_content=plain_content,
                    recipient_email=professional_user.email,
                    headers=headers
                )
                
                if success:
                    logger.info(f"Booking confirmation email sent to professional {professional_user.email} for booking {booking_id}")
                else:
                    logger.error(f"Failed to send booking confirmation email to professional {professional_user.email} for booking {booking_id}")
                    
            except Exception as e:
                logger.error(f"Error sending booking confirmation email to professional: {str(e)}")
        
        # Send email to client if enabled
        if send_to_client:
            try:
                # Create email headers
                headers = get_common_email_headers(
                    booking.booking_id, 
                    'booking_confirmation',
                    conversation.conversation_id if conversation else None
                )
                
                # Build content for client
                content_html = build_email_content(client_user, professional_user, is_professional=False)
                plain_content = build_plain_content(client_user, professional_user, is_professional=False)
                html_content = build_email_html(content_html, client_user.name)
                
                # Send email
                subject = f"Booking Confirmed - {professional_user.name} on CrittrCove"
                
                success = send_email_with_retry(
                    subject=subject,
                    html_content=html_content,
                    plain_content=plain_content,
                    recipient_email=client_user.email,
                    headers=headers
                )
                
                if success:
                    logger.info(f"Booking confirmation email sent to client {client_user.email} for booking {booking_id}")
                else:
                    logger.error(f"Failed to send booking confirmation email to client {client_user.email} for booking {booking_id}")
                    
            except Exception as e:
                logger.error(f"Error sending booking confirmation email to client: {str(e)}")
            
    except Exception as e:
        logger.error(f"Error sending booking confirmation email: {str(e)}")
        logger.exception("Full booking confirmation email error details:")

def send_booking_reminder_email(occurrence_id):
    """
    Send a booking reminder email 2 hours before the occurrence starts
    Only sends if the occurrence is within the next 3 hours (safety window)
    """
    
    try:
        # Import models here to avoid circular imports
        from booking_occurrences.models import BookingOccurrence
        from users.models import UserSettings
        from conversations.models import Conversation
        from django.db.models import Q
        from datetime import datetime, timedelta
        
        # Get occurrence and related data
        try:
            occurrence = BookingOccurrence.objects.get(occurrence_id=occurrence_id)
        except BookingOccurrence.DoesNotExist:
            logger.error(f"Occurrence {occurrence_id} not found for reminder email")
            return
        
        # SAFETY CHECK: Only send reminders for occurrences starting within 3 hours
        occurrence_start = timezone.make_aware(
            datetime.combine(occurrence.start_date, occurrence.start_time)
        )
        time_until_start = occurrence_start - timezone.now()
        hours_until_start = time_until_start.total_seconds() / 3600
        
        if hours_until_start > 3 or hours_until_start < 0:
            logger.warning(f"Skipping reminder for occurrence {occurrence_id} - starts in {hours_until_start:.1f} hours")
            return
        
        logger.info(f"Sending reminder for occurrence {occurrence_id} starting in {hours_until_start:.1f} hours")
        
        booking = occurrence.booking
        professional = booking.professional
        client = booking.client
        professional_user = professional.user
        client_user = client.user
        
        # Check if users have email notifications enabled
        send_to_professional = check_user_email_settings(professional_user)
        send_to_client = check_user_email_settings(client_user)
        
        if not send_to_professional and not send_to_client:
            logger.info(f"Both professional {professional_user.id} and client {client_user.id} have email notifications disabled")
            return
        
        # Get conversation for link
        conversation = None
        try:
            conversation = Conversation.objects.filter(
                (Q(participant1=professional_user) & Q(participant2=client_user)) |
                (Q(participant1=client_user) & Q(participant2=professional_user))
            ).first()
        except:
            logger.warning(f"No conversation found for booking {booking.booking_id}")
        
        # Helper function to build email content for reminder
        def build_reminder_content(recipient_user, other_user, is_professional=True):
            # Get formatted times for the recipient
            formatted_times = occurrence.get_formatted_times(recipient_user.id)
            timezone_info = formatted_times.get('timezone', 'UTC')
            
            role_text = "professional" if is_professional else "client"
            other_role_text = "client" if is_professional else "professional"
            service_action = "provide service for" if is_professional else "receive service from"
            
            content_html = f"""
            <h1 style="margin-top: 0; color: #333333; font-size: 24px;">Hi {recipient_user.name},</h1>
            <p><strong>Reminder:</strong> You have a booking scheduled to start in approximately 2 hours.</p>
            
            <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                <h2 style="color: #856404; margin-top: 0;">Upcoming Service</h2>
                <p><strong>Service:</strong> {booking.service_id.service_name if booking.service_id else 'N/A'}</p>
                <p><strong>Time:</strong> {formatted_times['formatted_start']} - {formatted_times['formatted_end']} <em>({timezone_info})</em></p>
                <p><strong>{other_role_text.title()}:</strong> {other_user.name}</p>
                <p><strong>Booking ID:</strong> {booking.booking_id}</p>
            </div>
            
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 4px; margin: 20px 0;">
                <h3>Reminder:</h3>
                <ul>
                    <li>Please arrive on time for your scheduled service</li>
                    <li>{"Prepare your materials and review the service details" if is_professional else "Ensure your pet is ready for the service"}</li>
                    <li>Contact the {other_role_text} if you need to make any changes</li>
                </ul>
            </div>
            """
            
            # Add conversation link if available
            if conversation:
                content_html += f"""
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{settings.FRONTEND_BASE_URL}/messages?conversationId={conversation.conversation_id}" 
                    style="display: inline-block; background-color: #008080; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 16px;">
                    Message {other_user.name}
                    </a>
                </div>
                """
            
            content_html += f"""
            <p>Thank you for being part of the CrittrCove community!</p>
            <p>Best regards,<br>The CrittrCove Team</p>
            """
            
            return content_html
        
        # Helper function to build plain text content for reminder
        def build_reminder_plain_content(recipient_user, other_user, is_professional=True):
            formatted_times = occurrence.get_formatted_times(recipient_user.id)
            timezone_info = formatted_times.get('timezone', 'UTC')
            
            other_role_text = "client" if is_professional else "professional"
            
            plain_content = f"""
Hi {recipient_user.name},

REMINDER: You have a booking scheduled to start in approximately 2 hours.

UPCOMING SERVICE
Service: {booking.service_id.service_name if booking.service_id else 'N/A'}
Time: {formatted_times['formatted_start']} - {formatted_times['formatted_end']} ({timezone_info})
{other_role_text.title()}: {other_user.name}
Booking ID: {booking.booking_id}

REMINDER:
• Please arrive on time for your scheduled service
• {"Prepare your materials and review the service details" if is_professional else "Ensure your pet is ready for the service"}
• Contact the {other_role_text} if you need to make any changes
"""
            
            # Add conversation link to plain text
            if conversation:
                plain_content += f"""
To message {other_user.name}, visit:
{settings.FRONTEND_BASE_URL}/messages?conversationId={conversation.conversation_id}
"""
            
            plain_content += f"""
Thank you for being part of the CrittrCove community!

Best regards,
The CrittrCove Team

---
You're receiving this email because you have an account on CrittrCove and have enabled email notifications.
Manage your notification preferences: {settings.FRONTEND_BASE_URL}/settings/notifications
CrittrCove, Inc. • 123 Pet Street • San Francisco, CA 94103
© 2025 CrittrCove. All rights reserved.
"""
            return plain_content
        
        # Send email to professional if enabled
        if send_to_professional:
            try:
                headers = get_common_email_headers(
                    occurrence.occurrence_id, 
                    'booking_reminder',
                    conversation.conversation_id if conversation else None
                )
                
                content_html = build_reminder_content(professional_user, client_user, is_professional=True)
                plain_content = build_reminder_plain_content(professional_user, client_user, is_professional=True)
                html_content = build_email_html(content_html, professional_user.name)
                
                subject = f"Booking Reminder - Service with {client_user.name} starts in 2 hours"
                
                success = send_email_with_retry(
                    subject=subject,
                    html_content=html_content,
                    plain_content=plain_content,
                    recipient_email=professional_user.email,
                    headers=headers
                )
                
                if success:
                    logger.info(f"Booking reminder email sent to professional {professional_user.email} for occurrence {occurrence_id}")
                else:
                    logger.error(f"Failed to send booking reminder email to professional {professional_user.email} for occurrence {occurrence_id}")
                    
            except Exception as e:
                logger.error(f"Error sending booking reminder email to professional: {str(e)}")
        
        # Send email to client if enabled
        if send_to_client:
            try:
                headers = get_common_email_headers(
                    occurrence.occurrence_id, 
                    'booking_reminder',
                    conversation.conversation_id if conversation else None
                )
                
                content_html = build_reminder_content(client_user, professional_user, is_professional=False)
                plain_content = build_reminder_plain_content(client_user, professional_user, is_professional=False)
                html_content = build_email_html(content_html, client_user.name)
                
                subject = f"Booking Reminder - Service with {professional_user.name} starts in 2 hours"
                
                success = send_email_with_retry(
                    subject=subject,
                    html_content=html_content,
                    plain_content=plain_content,
                    recipient_email=client_user.email,
                    headers=headers
                )
                
                if success:
                    logger.info(f"Booking reminder email sent to client {client_user.email} for occurrence {occurrence_id}")
                else:
                    logger.error(f"Failed to send booking reminder email to client {client_user.email} for occurrence {occurrence_id}")
                    
            except Exception as e:
                logger.error(f"Error sending booking reminder email to client: {str(e)}")
            
    except Exception as e:
        logger.error(f"Error sending booking reminder email: {str(e)}")
        logger.exception("Full booking reminder email error details:")
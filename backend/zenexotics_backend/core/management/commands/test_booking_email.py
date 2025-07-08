from django.core.management.base import BaseCommand
from core.email_utils import send_booking_confirmation_email
from bookings.models import Booking
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Test sending booking confirmation email'

    def add_arguments(self, parser):
        parser.add_argument(
            'booking_id',
            type=str,
            help='The booking ID to send confirmation email for'
        )

    def handle(self, *args, **options):
        booking_id = options['booking_id']
        
        self.stdout.write(f"Testing booking confirmation email for booking ID: {booking_id}")
        
        try:
            # Check if booking exists
            try:
                booking = Booking.objects.get(booking_id=booking_id)
                self.stdout.write(f"Found booking: {booking}")
            except Booking.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"Booking {booking_id} not found"))
                return
            
            # Send the email
            send_booking_confirmation_email(booking_id)
            self.stdout.write(self.style.SUCCESS(f"Booking confirmation email sent successfully for booking {booking_id}"))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error sending booking confirmation email: {str(e)}"))
            logger.exception("Full error details:")
from django.core.management.base import BaseCommand
from bookings.models import Booking
from booking_occurrences.models import BookingOccurrence
from booking_summary.models import BookingSummary

class Command(BaseCommand):
    help = 'List available bookings for testing'

    def handle(self, *args, **options):
        self.stdout.write("Available bookings for testing:")
        self.stdout.write("=" * 50)
        
        bookings = Booking.objects.all().order_by('-created_at')[:10]
        
        if not bookings.exists():
            self.stdout.write(self.style.WARNING("No bookings found in the database"))
            return
            
        for booking in bookings:
            # Get booking info
            professional_name = booking.professional.user.name if booking.professional else "N/A"
            client_name = booking.client.user.name if booking.client else "N/A"
            
            # Get occurrence count
            occurrence_count = BookingOccurrence.objects.filter(booking=booking).count()
            
            # Check if has summary
            has_summary = BookingSummary.objects.filter(booking=booking).exists()
            
            self.stdout.write(f"Booking ID: {booking.booking_id}")
            self.stdout.write(f"  Professional: {professional_name}")
            self.stdout.write(f"  Client: {client_name}")
            self.stdout.write(f"  Status: {booking.status}")
            self.stdout.write(f"  Occurrences: {occurrence_count}")
            self.stdout.write(f"  Has Summary: {has_summary}")
            self.stdout.write(f"  Created: {booking.created_at}")
            self.stdout.write("-" * 30)
            
        self.stdout.write(f"\nTo test email, run:")
        self.stdout.write(f"python3 manage.py test_booking_email <booking_id>")
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from core.email_utils import send_booking_reminder_email
from booking_occurrences.models import BookingOccurrence
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Send booking reminder emails for occurrences starting in 2 hours'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be sent without actually sending emails'
        )
        parser.add_argument(
            '--reminder-hours',
            type=int,
            default=2,
            help='Hours before occurrence to send reminder (default: 2)'
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        reminder_hours = options['reminder_hours']
        
        # Calculate the time window for reminders
        now = timezone.now()
        reminder_time_start = now + timedelta(hours=reminder_hours - 0.1)  # 2 hours - 6 minutes
        reminder_time_end = now + timedelta(hours=reminder_hours + 0.1)    # 2 hours + 6 minutes
        
        self.stdout.write(f"Looking for occurrences starting between {reminder_time_start} and {reminder_time_end}")
        
        # Find occurrences that need reminders and haven't been sent yet
        from core.models import BookingReminderLog
        
        # Get occurrences that need reminders
        occurrences = BookingOccurrence.objects.filter(
            start_date__gt=now.date(),  # Future occurrences only
            booking__status='approved'  # Only approved bookings
        ).exclude(
            occurrence_id__in=BookingReminderLog.objects.values_list('occurrence_id', flat=True)
        )
        
        # Filter by datetime combination
        reminder_occurrences = []
        for occurrence in occurrences:
            # Combine date and time to create datetime
            occurrence_datetime = timezone.make_aware(
                timezone.datetime.combine(occurrence.start_date, occurrence.start_time)
            )
            
            if reminder_time_start <= occurrence_datetime <= reminder_time_end:
                reminder_occurrences.append(occurrence)
        
        if not reminder_occurrences:
            self.stdout.write(self.style.SUCCESS(f"No occurrences found that need reminders in the next {reminder_hours} hours"))
            return
        
        self.stdout.write(f"Found {len(reminder_occurrences)} occurrences that need reminders:")
        
        for occurrence in reminder_occurrences:
            occurrence_datetime = timezone.make_aware(
                timezone.datetime.combine(occurrence.start_date, occurrence.start_time)
            )
            
            professional_name = occurrence.booking.professional.user.name
            client_name = occurrence.booking.client.user.name
            
            self.stdout.write(f"  - Occurrence {occurrence.occurrence_id}: {professional_name} → {client_name}")
            self.stdout.write(f"    Service: {occurrence.booking.service_id.service_name if occurrence.booking.service_id else 'N/A'}")
            self.stdout.write(f"    Time: {occurrence_datetime}")
            
            if not dry_run:
                try:
                    send_booking_reminder_email(occurrence.occurrence_id)
                    
                    # Log that reminder was sent to prevent duplicates
                    from core.models import BookingReminderLog
                    BookingReminderLog.objects.create(occurrence=occurrence)
                    
                    self.stdout.write(self.style.SUCCESS(f"    ✓ Reminder sent for occurrence {occurrence.occurrence_id}"))
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"    ✗ Failed to send reminder for occurrence {occurrence.occurrence_id}: {str(e)}"))
            else:
                self.stdout.write(self.style.WARNING(f"    [DRY RUN] Would send reminder for occurrence {occurrence.occurrence_id}"))
        
        if dry_run:
            self.stdout.write(self.style.WARNING("This was a dry run. No emails were sent."))
        else:
            self.stdout.write(self.style.SUCCESS(f"Completed sending {len(reminder_occurrences)} reminder emails"))
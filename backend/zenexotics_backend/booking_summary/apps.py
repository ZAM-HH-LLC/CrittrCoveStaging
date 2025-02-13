from django.apps import AppConfig


class BookingSummaryConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "booking_summary"
    
    def ready(self):
        import booking_summary.signals  # Import the signals

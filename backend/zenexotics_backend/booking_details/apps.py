from django.apps import AppConfig


class BookingDetailsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "booking_details"

    def ready(self):
        import booking_details.signals  # noqa

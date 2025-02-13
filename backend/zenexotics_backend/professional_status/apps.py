from django.apps import AppConfig

class ProfessionalStatusConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'professional_status'

    def ready(self):
        import professional_status.signals 
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import ProfessionalStatus
from professionals.models import Professional

@receiver(post_save, sender=ProfessionalStatus)
def create_professional_on_approval(sender, instance, created, **kwargs):
    # Only proceed if is_approved is True and there isn't already a Professional
    if instance.is_approved and not hasattr(instance.user, 'professional_profile'):
        Professional.objects.create(user=instance.user) 
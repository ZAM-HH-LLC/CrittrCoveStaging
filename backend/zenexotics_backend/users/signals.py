import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from clients.models import Client
from professional_status.models import ProfessionalStatus
from user_addresses.models import Address, AddressType

logger = logging.getLogger(__name__)

@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_user_related_entries(sender, instance, created, **kwargs):
    if created:
        try:
            logger.info(f"Creating related entries for new user: {instance.email}")
            
            # Create Client profile
            Client.objects.create(
                user=instance,
                about_me='',
                emergency_contact={},
                authorized_household_members=[]
            )
            logger.info(f"Created client profile for user: {instance.email}")

            # Create Professional Status
            ProfessionalStatus.objects.create(
                user=instance,
                is_approved=False,
                approved_for_dogs=False,
                approved_for_cats=False,
                approved_for_exotics=False
            )
            logger.info(f"Created professional status for user: {instance.email}")

            # Create default service Address
            Address.objects.create(
                user=instance,
                address_type=AddressType.SERVICE,
                address_line_1='',
                city='',
                state='',
                zip='',
                country='USA'
            )
            logger.info(f"Created default address for user: {instance.email}")

        except Exception as e:
            logger.error(f"Error creating related entries for user {instance.email}: {str(e)}")
            instance.delete()
            raise 
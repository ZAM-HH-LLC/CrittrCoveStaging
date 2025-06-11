import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from django.db import transaction
from clients.models import Client
from professional_status.models import ProfessionalStatus
from user_addresses.models import Address, AddressType
from .email_helpers import send_new_user_notification

logger = logging.getLogger(__name__)

@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_user_related_entries(sender, instance, created, **kwargs):
    if created:
        try:
            logger.info(f"Creating related entries for new user: {instance.email}")
            
            # Check if this user was created from an invitation
            from users.models import Invitation
            invitation = Invitation.objects.filter(email=instance.email, is_accepted=False).first()
            
            # Create Client profile
            client = Client.objects.create(
                user=instance,
                about_me='',
                emergency_contact={},
                authorized_household_members=[]
            )
            logger.info(f"Created client profile for user: {instance.email}")

            # If this user was created from an invitation, set the invited_by field
            if invitation and invitation.is_professional_invite:
                from professionals.models import Professional
                try:
                    professional = Professional.objects.get(user=invitation.inviter)
                    client.invited_by = professional
                    client.save()
                    logger.info(f"Set invited_by for client {client.id} to professional user {professional.user.id}")
                except Professional.DoesNotExist:
                    logger.warning(f"Could not set invited_by: Professional profile not found for user {invitation.inviter.id}")

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

@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def send_admin_notification_on_signup(sender, instance, created, **kwargs):
    """
    Signal handler to send an email notification to admin when a new user signs up.
    This runs in a separate transaction to avoid blocking the registration process.
    """
    if created:
        # Send email asynchronously to avoid delaying the registration response
        transaction.on_commit(lambda: send_new_user_notification(instance))
        
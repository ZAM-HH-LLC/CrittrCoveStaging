from django.db import models
from django.conf import settings
import logging

class Professional(models.Model):
    professional_id = models.AutoField(primary_key=True)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='professional_profile'
    )
    bio = models.TextField(blank=True)
    is_insured = models.BooleanField(default=False)
    is_background_checked = models.BooleanField(default=False)
    is_elite_pro = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def calculate_profile_completion(self):
        logger = logging.getLogger(__name__)
        
        try:
            # Check if user has address with non-empty address_line_1
            # We're being extra careful here to check for valid addresses
            addresses = self.user.addresses.all()
            valid_addresses = [addr for addr in addresses if addr.address_line_1 and addr.address_line_1.strip()]
            
            # Log the information
            logger.info(f"Professional {self.user.email} has {len(addresses)} addresses, {len(valid_addresses)} valid")
            for i, addr in enumerate(addresses):
                logger.info(f"Address {i+1}: address_line_1='{addr.address_line_1}'")
            
            # For professionals, profile is complete (100%) when they have a valid address
            # Otherwise, it's 0%
            if valid_addresses:
                return 1.0
            else:
                return 0.0
            
        except Exception as e:
            logger.error(f"Error checking professional profile completion: {e}")
            return 0.0

    class Meta:
        db_table = 'professionals'
        verbose_name = 'Professional'
        verbose_name_plural = 'Professionals'

    def __str__(self):
        return f"Professional: {self.user.name}" 
from django.db import models
from django.utils import timezone
import hashlib


class BlogVisitor(models.Model):
    """
    Model to track anonymous blog visitors for marketing analytics.
    
    This table stores visitor location data and analytics to help understand
    where blog readers are coming from geographically.
    """
    
    # Location data
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    
    # Page and referrer info
    page = models.CharField(max_length=500, help_text="Blog page visited (includes query params)")
    referrer = models.URLField(blank=True, null=True, help_text="External referrer URL")
    
    # Technical details
    user_agent = models.TextField(blank=True, help_text="Browser user agent")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    ip_hash = models.CharField(max_length=64, blank=True, help_text="Hashed IP for privacy")
    
    # Session tracking (anonymous)
    session_hash = models.CharField(max_length=64, blank=True, help_text="Hashed session identifier")
    
    # Timestamps
    visited_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Geographic data (derived from coordinates)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True)
    is_colorado_springs = models.BooleanField(default=False)
    
    # Additional metadata
    metadata = models.JSONField(default=dict, blank=True, help_text="Additional tracking data")
    
    class Meta:
        db_table = 'blog_visitors'
        indexes = [
            models.Index(fields=['visited_at']),
            models.Index(fields=['page']),
            models.Index(fields=['is_colorado_springs']),
            models.Index(fields=['ip_hash']),
            models.Index(fields=['session_hash']),
        ]
        verbose_name = 'Blog Visitor'
        verbose_name_plural = 'Blog Visitors'
    
    def save(self, *args, **kwargs):
        # Hash IP address for privacy
        if self.ip_address and not self.ip_hash:
            self.ip_hash = hashlib.sha256(
                f"{self.ip_address}_salt_crittr".encode('utf-8')
            ).hexdigest()
        
        # Determine if this is Colorado Springs area
        if self.latitude and self.longitude:
            # Colorado Springs approximate bounds
            cs_lat_min, cs_lat_max = 38.7, 39.0
            cs_lng_min, cs_lng_max = -104.9, -104.6
            
            if (cs_lat_min <= float(self.latitude) <= cs_lat_max and 
                cs_lng_min <= float(self.longitude) <= cs_lng_max):
                self.is_colorado_springs = True
                if not self.city:
                    self.city = "Colorado Springs"
                if not self.state:
                    self.state = "Colorado"
                if not self.country:
                    self.country = "United States"
        
        super().save(*args, **kwargs)
    
    def __str__(self):
        location_str = ""
        if self.city and self.state:
            location_str = f" from {self.city}, {self.state}"
        elif self.latitude and self.longitude:
            location_str = f" at {self.latitude}, {self.longitude}"
        
        return f"Blog visitor{location_str} on {self.visited_at.strftime('%Y-%m-%d %H:%M')}"

from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
import json

User = get_user_model()

class SearchLog(models.Model):
    """
    Enhanced search log model for professional search queries to understand user search patterns
    and help with business intelligence for recruiting professionals.
    """
    search_id = models.AutoField(primary_key=True)
    
    # User information (nullable for anonymous users)
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='search_logs'
    )
    user_type = models.CharField(max_length=20, choices=[
        ('authenticated', 'Authenticated'),
        ('anonymous', 'Anonymous')
    ], default='anonymous')
    
    # Enhanced search parameters (nullable for compatibility with existing data)
    animal_types = models.JSONField(default=list, blank=True)  # Already exists in old table
    location = models.JSONField(default=dict, blank=True)  # Already exists in old table
    service_query = models.CharField(max_length=255, blank=True, null=True)
    overnight_service = models.BooleanField(default=False, null=True, blank=True)
    price_range = models.JSONField(default=dict, blank=True)  # Already exists as JSONField in old table
    radius_miles = models.IntegerField(default=30, null=True, blank=True)
    
    # Filter options (new fields, nullable)
    filter_background_checked = models.BooleanField(default=False, null=True, blank=True)
    filter_insured = models.BooleanField(default=False, null=True, blank=True)
    filter_elite_pro = models.BooleanField(default=False, null=True, blank=True)
    
    # Search results data (new fields, nullable)
    results_found = models.IntegerField(default=0, null=True, blank=True)
    has_fallback = models.BooleanField(default=False, null=True, blank=True)
    search_successful = models.BooleanField(default=False, null=True, blank=True)
    original_query_successful = models.BooleanField(default=False, null=True, blank=True)
    search_query_summary = models.TextField(blank=True, null=True)
    
    # Legacy fields for compatibility (keeping existing fields)
    service_category = models.CharField(max_length=100, blank=True)
    service_name = models.CharField(max_length=100, blank=True)
    duration = models.CharField(max_length=50, blank=True)
    sort_method = models.CharField(max_length=50, blank=True)
    result_count = models.IntegerField(null=True, blank=True)  # Made nullable for new entries
    results_clicked = models.JSONField(default=list, blank=True)
    
    # Technical metadata (new fields, nullable)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, null=True)
    
    # Search frequency tracking
    search_count = models.IntegerField(default=1, help_text="Number of times this exact search has been performed")
    first_searched = models.DateTimeField(default=timezone.now, help_text="When this search combination was first performed")
    last_searched = models.DateTimeField(default=timezone.now, help_text="When this search combination was most recently performed")
    
    # Timestamps
    timestamp = models.DateTimeField(auto_now_add=True)  # Keep for compatibility
    created_at = models.DateTimeField(default=timezone.now, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)
    
    class Meta:
        db_table = 'search_logs_searchlog'  # Use existing table
        ordering = ['-timestamp', '-created_at']
        indexes = [
            models.Index(fields=['timestamp']),
            models.Index(fields=['created_at']),
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['ip_address', 'created_at']),
            models.Index(fields=['service_query']),
            models.Index(fields=['location']),
            models.Index(fields=['search_successful']),
            models.Index(fields=['search_count']),
            models.Index(fields=['first_searched']),
            models.Index(fields=['last_searched']),
            models.Index(fields=['ip_address', 'service_query', 'location']),  # Composite index for duplicate detection
        ]
    
    def __str__(self):
        user_display = self.user.email if self.user else f"Anonymous ({self.ip_address})"
        return f"Search {self.search_id} by {user_display} - {self.search_query_summary[:50]}..."
    
    @classmethod
    def create_from_search_params(cls, request, search_params, results_data):
        """
        Create a search log entry from request and search parameters.
        Handles deduplication based on IP address and search parameters.
        """
        user_id = request.user.id if request.user.is_authenticated else None
        user_type = 'authenticated' if request.user.is_authenticated else 'anonymous'
        ip_address = request.META.get('REMOTE_ADDR')
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        # Create search query summary
        animal_types = search_params.get('animal_types', [])
        service_query = search_params.get('service_query', '')
        location = search_params.get('location', '')
        
        search_query_summary = f"{service_query or 'All Services'} for {', '.join(animal_types) if animal_types else 'any pets'} in {location or 'Colorado Springs'}"
        
        # Format location for duplicate check
        location_for_check = search_params.get('location', '')
        if isinstance(location_for_check, str):
            location_for_check = {'address': location_for_check} if location_for_check else {}
        
        # Check for identical search combinations (regardless of time)
        # This creates a unique signature based on IP + search parameters
        duplicate_check_fields = {
            'ip_address': ip_address,
            'service_query': search_params.get('service_query', ''),
            'location': location_for_check,
            'animal_types': search_params.get('animal_types', []),
            'overnight_service': search_params.get('overnight_service', False),
            'filter_background_checked': search_params.get('filter_background_checked', False),
            'filter_insured': search_params.get('filter_insured', False),
            'filter_elite_pro': search_params.get('filter_elite_pro', False),
        }
        
        # If user is authenticated, also check by user to separate anonymous from authenticated searches
        if user_id:
            duplicate_check_fields['user_id'] = user_id
        
        # Check if identical search combination exists
        existing_entry = cls.objects.filter(**duplicate_check_fields).first()
        
        if existing_entry:
            # Increment counter and update timestamps + latest results
            existing_entry.search_count += 1
            existing_entry.last_searched = timezone.now()
            existing_entry.results_found = results_data.get('results_found', 0)
            existing_entry.has_fallback = results_data.get('has_fallback', False)
            existing_entry.search_successful = results_data.get('search_successful', False)
            existing_entry.original_query_successful = results_data.get('original_query_successful', False)
            existing_entry.updated_at = timezone.now()
            existing_entry.save()
            return existing_entry
        
        # Create new entry
        # Format location as dict for compatibility with existing JSONField
        location_data = search_params.get('location', '')
        if isinstance(location_data, str):
            location_data = {'address': location_data} if location_data else {}
        
        current_time = timezone.now()
        
        search_log = cls.objects.create(
            user_id=user_id,
            user_type=user_type,
            animal_types=search_params.get('animal_types', []),
            location=location_data,
            service_query=search_params.get('service_query', ''),
            overnight_service=search_params.get('overnight_service', False),
            price_range={
                'min': search_params.get('price_min', 0),
                'max': search_params.get('price_max', 999999)
            },
            radius_miles=search_params.get('radius_miles', 30),
            filter_background_checked=search_params.get('filter_background_checked', False),
            filter_insured=search_params.get('filter_insured', False),
            filter_elite_pro=search_params.get('filter_elite_pro', False),
            results_found=results_data.get('results_found', 0),
            has_fallback=results_data.get('has_fallback', False),
            search_successful=results_data.get('search_successful', False),
            original_query_successful=results_data.get('original_query_successful', False),
            search_query_summary=search_query_summary,
            ip_address=ip_address,
            user_agent=user_agent,
            # Counter fields for new entries
            search_count=1,
            first_searched=current_time,
            last_searched=current_time,
            # Also populate legacy fields for compatibility
            service_name=search_params.get('service_query', ''),
            result_count=results_data.get('results_found', 0)
        )
        
        return search_log


class GetMatchedLog(models.Model):
    """
    Log entries for "get matched" requests when users can't find professionals
    for their search criteria. This helps identify demand for services not currently available.
    """
    # User information (nullable for anonymous users)
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='get_matched_logs'
    )
    user_type = models.CharField(max_length=20, choices=[
        ('authenticated', 'Authenticated'),
        ('anonymous', 'Anonymous')
    ], default='anonymous')
    
    # Contact and request information
    email = models.EmailField()
    search_query = models.TextField()
    
    # Status tracking
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('contacted', 'Contacted'),
        ('matched', 'Matched'),
        ('closed', 'Closed')
    ], default='pending')
    
    # Technical metadata
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    # Business tracking
    notes = models.TextField(blank=True, help_text="Internal notes for tracking follow-up")
    contacted_at = models.DateTimeField(null=True, blank=True)
    matched_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'get_matched_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['created_at']),
            models.Index(fields=['status']),
            models.Index(fields=['email']),
            models.Index(fields=['ip_address', 'created_at']),
        ]
    
    def __str__(self):
        return f"Get Matched Request - {self.email} - {self.search_query[:50]}..."
    
    @classmethod
    def create_from_request(cls, request, email, search_query):
        """
        Create a get matched log entry from request data.
        Handles deduplication based on email and search query.
        """
        user_id = request.user.id if request.user.is_authenticated else None
        user_type = 'authenticated' if request.user.is_authenticated else 'anonymous'
        ip_address = request.META.get('REMOTE_ADDR')
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        # Check for recent duplicate entries (within last 24 hours)
        recent_cutoff = timezone.now() - timezone.timedelta(hours=24)
        
        duplicate_check_fields = {
            'email': email,
            'search_query': search_query,
            'created_at__gte': recent_cutoff
        }
        
        # Check if similar entry exists recently
        existing_entry = cls.objects.filter(**duplicate_check_fields).first()
        
        if existing_entry:
            # Update the existing entry timestamp instead of creating a duplicate
            existing_entry.updated_at = timezone.now()
            existing_entry.save()
            return existing_entry
        
        # Create new entry
        get_matched_log = cls.objects.create(
            user_id=user_id,
            user_type=user_type,
            email=email,
            search_query=search_query,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        return get_matched_log

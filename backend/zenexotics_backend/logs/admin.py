from django.contrib import admin
from .models import SearchLog, GetMatchedLog

@admin.register(SearchLog)
class SearchLogAdmin(admin.ModelAdmin):
    list_display = ('search_id', 'search_count', 'first_searched', 'last_searched', 'user', 'user_type', 'service_query', 'animal_types_display', 'location_display', 'results_found', 'search_successful', 'ip_address')
    list_filter = (
        'search_successful', 'has_fallback', 'user_type', 'overnight_service', 
        'filter_background_checked', 'filter_insured', 'filter_elite_pro',
        'search_count',
        ('first_searched', admin.DateFieldListFilter),
        ('last_searched', admin.DateFieldListFilter),
        ('timestamp', admin.DateFieldListFilter)
    )
    search_fields = ('service_query', 'search_query_summary', 'user__email', 'ip_address')
    readonly_fields = ('search_id', 'timestamp', 'created_at', 'updated_at', 'first_searched', 'last_searched', 'search_count')
    ordering = ('-search_count', '-last_searched', '-timestamp')
    
    fieldsets = (
        ('Search Information', {
            'fields': ('search_id', 'search_query_summary', 'service_query', 'animal_types', 'location')
        }),
        ('Search Frequency', {
            'fields': ('search_count', 'first_searched', 'last_searched'),
            'classes': ('wide',)
        }),
        ('User Information', {
            'fields': ('user', 'user_type', 'ip_address', 'user_agent')
        }),
        ('Search Parameters', {
            'fields': ('overnight_service', 'price_range', 'radius_miles', 'filter_background_checked', 'filter_insured', 'filter_elite_pro'),
            'classes': ('collapse',)
        }),
        ('Results', {
            'fields': ('results_found', 'search_successful', 'has_fallback', 'original_query_successful'),
            'classes': ('wide',)
        }),
        ('Timestamps', {
            'fields': ('timestamp', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def animal_types_display(self, obj):
        if obj.animal_types:
            return ', '.join(obj.animal_types)
        return '-'
    animal_types_display.short_description = 'Animal Types'
    
    def location_display(self, obj):
        if obj.location and isinstance(obj.location, dict):
            return obj.location.get('address', '-')
        elif obj.location:
            return str(obj.location)
        return '-'
    location_display.short_description = 'Location'

@admin.register(GetMatchedLog)
class GetMatchedLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'created_at', 'email', 'user', 'user_type', 'search_query_short', 'status', 'ip_address')
    list_filter = ('created_at', 'user_type', 'status')
    search_fields = ('email', 'search_query', 'user__email', 'ip_address', 'notes')
    readonly_fields = ('id', 'created_at', 'updated_at')
    ordering = ('-created_at',)
    
    def search_query_short(self, obj):
        return obj.search_query[:50] + ('...' if len(obj.search_query) > 50 else '')
    search_query_short.short_description = 'Search Query'

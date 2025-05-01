from django.contrib import admin
from .models import Location


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    """Admin configuration for the Location model"""
    list_display = ('name', 'supported', 'display_order', 'updated_at')
    list_filter = ('supported',)
    search_fields = ('name',)
    ordering = ('display_order', 'name')
    list_editable = ('supported', 'display_order')
    
    # Add actions to quickly enable/disable multiple locations
    actions = ['make_supported', 'make_unsupported']
    
    def make_supported(self, request, queryset):
        """Mark selected locations as supported"""
        queryset.update(supported=True)
    make_supported.short_description = "Mark selected locations as supported"
    
    def make_unsupported(self, request, queryset):
        """Mark selected locations as unsupported (coming soon)"""
        queryset.update(supported=False)
    make_unsupported.short_description = "Mark selected locations as unsupported"

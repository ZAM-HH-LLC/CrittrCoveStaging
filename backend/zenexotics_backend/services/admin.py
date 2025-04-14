from django.contrib import admin
from .models import Service

@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ('service_id', 'professional', 'service_name', 'get_primary_animal_type', 'base_rate', 'formatted_holiday_rate', 'moderation_status', 'searchable', 'is_overnight')
    list_filter = ('moderation_status', 'searchable', 'created_at', 'is_overnight', 'holiday_rate_is_percent')
    search_fields = ('service_name', 'description', 'professional__user__email')
    readonly_fields = ('created_at', 'updated_at', 'formatted_holiday_rate')
    fieldsets = (
        ('Basic Information', {
            'fields': ('professional', 'service_name', 'description', 'animal_types', 'is_overnight')
        }),
        ('Pricing', {
            'fields': ('base_rate', 'additional_animal_rate', 'applies_after', 'holiday_rate', 'holiday_rate_is_percent', 'formatted_holiday_rate', 'unit_of_time')
        }),
        ('Moderation', {
            'fields': ('moderation_status', 'moderation_notes', 'searchable')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def formatted_holiday_rate(self, obj):
        """Display holiday rate with appropriate symbol (% or $)"""
        if obj.holiday_rate_is_percent:
            return f"{obj.holiday_rate}%"
        else:
            return f"${obj.holiday_rate}"
    formatted_holiday_rate.short_description = 'Holiday Rate (Formatted)'
    
    def get_primary_animal_type(self, obj):
        """Get the first animal type from the animal_types dict"""
        if obj.animal_types and len(obj.animal_types) > 0:
            # Return the first key (animal type) from the dict
            return list(obj.animal_types.keys())[0]
        return "Unknown"
    get_primary_animal_type.short_description = 'Primary Animal Type'

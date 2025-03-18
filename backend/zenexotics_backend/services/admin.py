from django.contrib import admin
from .models import Service

@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ('service_id', 'professional', 'service_name', 'animal_type', 'base_rate', 'moderation_status', 'searchable', 'is_overnight')
    list_filter = ('animal_type', 'moderation_status', 'searchable', 'created_at', 'is_overnight')
    search_fields = ('service_name', 'description', 'professional__user__email')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Basic Information', {
            'fields': ('professional', 'service_name', 'description', 'animal_type', 'categories', 'is_overnight')
        }),
        ('Pricing', {
            'fields': ('base_rate', 'additional_animal_rate', 'applies_after', 'holiday_rate', 'unit_of_time')
        }),
        ('Moderation', {
            'fields': ('moderation_status', 'moderation_notes', 'searchable')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

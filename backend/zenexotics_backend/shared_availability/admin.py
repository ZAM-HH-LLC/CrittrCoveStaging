from django.contrib import admin
from .models import SharedAvailability

@admin.register(SharedAvailability)
class SharedAvailabilityAdmin(admin.ModelAdmin):
    list_display = ('shared_availability_id', 'availability', 'service')
    list_filter = ('service',)
    search_fields = ('service__service_name', 'availability__professional__user__email')
    fieldsets = (
        ('Basic Information', {
            'fields': ('availability', 'service')
        }),
    )

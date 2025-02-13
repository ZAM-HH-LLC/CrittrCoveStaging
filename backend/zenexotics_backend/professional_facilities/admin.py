from django.contrib import admin
from .models import ProfessionalFacility

@admin.register(ProfessionalFacility)
class ProfessionalFacilityAdmin(admin.ModelAdmin):
    list_display = ('facility_name', 'professional', 'available_for', 'capacity', 'created_at')
    list_filter = ('available_for', 'created_at')
    search_fields = ('facility_name', 'professional__user__name', 'description')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Basic Information', {
            'fields': ('professional', 'facility_name', 'description')
        }),
        ('Capacity & Availability', {
            'fields': ('capacity', 'available_for')
        }),
        ('Media', {
            'fields': ('photos',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('professional__user')

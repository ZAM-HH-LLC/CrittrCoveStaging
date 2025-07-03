from django.contrib import admin
from .models import Booking

@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ('booking_id', 'client', 'professional', 'get_service_name', 'status', 'pro_agreed_tos', 'client_agreed_tos', 'has_notes', 'created_at')
    list_filter = ('status', 'service_id', 'pro_agreed_tos', 'client_agreed_tos', 'created_at')
    search_fields = ('client__user__email', 'professional__user__email', 'service_id__service_name', 'notes_from_pro')
    readonly_fields = ('created_at', 'updated_at')
    
    def get_service_name(self, obj):
        return obj.service_id.service_name if obj.service_id else None
    get_service_name.short_description = 'Service'
    get_service_name.admin_order_field = 'service_id__service_name'
    
    def has_notes(self, obj):
        return bool(obj.notes_from_pro)
    has_notes.short_description = 'Has Notes'
    has_notes.boolean = True

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "service_id" and request.resolver_match.kwargs.get('object_id'):
            # For existing bookings, only show services from the selected professional
            booking = self.get_object(request, request.resolver_match.kwargs['object_id'])
            if booking:
                kwargs["queryset"] = db_field.related_model.objects.filter(
                    professional=booking.professional,
                    moderation_status='APPROVED'
                )
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    class Media:
        js = ('admin/js/booking_service_filter.js',)

    fieldsets = (
        ('Basic Information', {
            'fields': ('client', 'professional', 'service_id', 'status')
        }),
        ('Terms of Service', {
            'fields': ('pro_agreed_tos', 'client_agreed_tos')
        }),
        ('Professional Notes', {
            'fields': ('notes_from_pro',),
            'description': 'Notes from the professional to the client for this booking'
        }),
        ('User Actions', {
            'fields': ('initiated_by', 'cancelled_by', 'last_modified_by', 'denied_by')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

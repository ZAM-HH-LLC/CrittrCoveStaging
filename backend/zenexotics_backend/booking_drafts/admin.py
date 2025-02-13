from django.contrib import admin
from .models import BookingDraft

@admin.register(BookingDraft)
class BookingDraftAdmin(admin.ModelAdmin):
    list_display = ('draft_id', 'booking', 'last_modified_by', 'status', 'created_at', 'updated_at')
    list_filter = ('status', 'last_modified_by', 'created_at')
    search_fields = ('booking__client__user__email', 'booking__professional__user__email')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Basic Information', {
            'fields': ('booking', 'draft_data', 'last_modified_by', 'status')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

from django.contrib import admin
from .models import ReviewModeration

@admin.register(ReviewModeration)
class ReviewModerationAdmin(admin.ModelAdmin):
    list_display = ('moderation_id', 'review_id', 'status', 'moderated_by', 'flagged_by', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('reason', 'decision_notes', 'moderated_by__email', 'flagged_by__email')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Review Information', {
            'fields': ('review_id', 'status')
        }),
        ('Moderation Details', {
            'fields': ('moderated_by', 'flagged_by', 'reason', 'decision_notes')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

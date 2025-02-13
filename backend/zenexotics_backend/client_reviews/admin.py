from django.contrib import admin
from .models import ClientReview

@admin.register(ClientReview)
class ClientReviewAdmin(admin.ModelAdmin):
    list_display = ('review_id', 'booking', 'client', 'professional', 'rating', 'status', 'review_visible', 'review_posted')
    list_filter = ('status', 'review_visible', 'review_posted', 'created_at')
    search_fields = ('review_text', 'client__user__email', 'professional__user__email')
    readonly_fields = ('created_at',)
    fieldsets = (
        ('Review Information', {
            'fields': ('booking', 'client', 'professional', 'rating', 'review_text')
        }),
        ('Status', {
            'fields': ('status', 'review_visible', 'review_posted', 'post_deadline')
        }),
        ('Moderation', {
            'fields': ('moderated_by', 'moderation_reason')
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )

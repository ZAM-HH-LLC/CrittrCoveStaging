from django.contrib import admin
from .models import ClientReview, ProfessionalReview, ReviewRequest


@admin.register(ClientReview)
class ClientReviewAdmin(admin.ModelAdmin):
    list_display = ('review_id', 'client', 'professional', 'rating', 'status', 'created_at', 'review_visible')
    list_filter = ('status', 'review_visible', 'created_at')
    search_fields = ('client__user__first_name', 'client__user__last_name', 
                     'professional__user__first_name', 'professional__user__last_name',
                     'review_text')
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
            'fields': ('created_at',)
        }),
    )


@admin.register(ProfessionalReview)
class ProfessionalReviewAdmin(admin.ModelAdmin):
    list_display = ('review_id', 'professional', 'client', 'rating', 'status', 'created_at', 'review_visible')
    list_filter = ('status', 'review_visible', 'created_at')
    search_fields = ('professional__user__first_name', 'professional__user__last_name', 
                     'client__user__first_name', 'client__user__last_name',
                     'review_text')
    readonly_fields = ('created_at',)
    fieldsets = (
        ('Review Information', {
            'fields': ('booking', 'professional', 'client', 'rating', 'review_text')
        }),
        ('Status', {
            'fields': ('status', 'review_visible', 'review_posted', 'post_deadline')
        }),
        ('Moderation', {
            'fields': ('moderated_by', 'moderation_reason')
        }),
        ('Timestamps', {
            'fields': ('created_at',)
        }),
    )


@admin.register(ReviewRequest)
class ReviewRequestAdmin(admin.ModelAdmin):
    list_display = ('request_id', 'booking', 'user', 'review_type', 'status', 'created_at', 'expires_at')
    list_filter = ('status', 'review_type', 'created_at')
    search_fields = ('user__first_name', 'user__last_name', 'booking__booking_id')
    readonly_fields = ('created_at', 'completed_at')
    fieldsets = (
        ('Request Information', {
            'fields': ('booking', 'user', 'review_type')
        }),
        ('Status', {
            'fields': ('status', 'reminder_sent')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'expires_at', 'completed_at')
        }),
    )

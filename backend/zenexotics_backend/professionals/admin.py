from django.contrib import admin
from .models import Professional

@admin.register(Professional)
class ProfessionalAdmin(admin.ModelAdmin):
    list_display = ('professional_id', 'get_name', 'get_email', 'average_rating', 'total_num_of_reviews', 'subscribed', 'created_at')
    list_filter = ('subscribed', 'is_insured', 'average_rating')
    search_fields = ('user__email', 'user__name', 'bio', 'experience')
    readonly_fields = ('professional_id', 'created_at')
    
    def get_name(self, obj):
        return obj.user.name
    get_name.short_description = 'Name'

    def get_email(self, obj):
        return obj.user.email
    get_email.short_description = 'Email'

    fieldsets = (
        ('User Information', {
            'fields': ('professional_id', 'user')
        }),
        ('Profile Information', {
            'fields': ('bio', 'experience')
        }),
        ('Ratings & Reviews', {
            'fields': ('average_rating', 'total_num_of_reviews')
        }),
        ('Status', {
            'fields': ('is_insured', 'subscribed')
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    ) 
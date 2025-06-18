from django.contrib import admin
from .models import Professional

@admin.register(Professional)
class ProfessionalAdmin(admin.ModelAdmin):
    list_display = [
        'professional_id',
        'user',
        'is_insured',
        'is_background_checked',
        'is_elite_pro',
        'created_at',
        'updated_at'
    ]
    list_filter = [
        'is_insured',
        'is_background_checked',
        'is_elite_pro',
        'created_at',
        'updated_at'
    ]
    search_fields = [
        'user__name',
        'user__email',
        'bio'
    ]
    readonly_fields = [
        'professional_id',
        'created_at',
        'updated_at'
    ]

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
            'fields': ('bio', 'is_insured', 'is_background_checked', 'is_elite_pro')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    ) 
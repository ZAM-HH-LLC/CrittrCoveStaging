from django.contrib import admin
from .models import BlogVisitor


@admin.register(BlogVisitor)
class BlogVisitorAdmin(admin.ModelAdmin):
    list_display = [
        'visited_at',
        'page',
        'city',
        'state',
        'is_colorado_springs',
        'ip_hash',
    ]
    list_filter = [
        'is_colorado_springs',
        'state',
        'city',
        'visited_at',
    ]
    search_fields = [
        'page',
        'city',
        'state',
        'ip_hash',
    ]
    readonly_fields = [
        'ip_hash',
        'session_hash',
        'created_at',
        'visited_at',
    ]
    ordering = ['-visited_at']
    date_hierarchy = 'visited_at'
    
    fieldsets = (
        ('Page Information', {
            'fields': ('page', 'referrer', 'visited_at')
        }),
        ('Location Data', {
            'fields': ('latitude', 'longitude', 'city', 'state', 'country', 'is_colorado_springs')
        }),
        ('Technical Details', {
            'fields': ('user_agent', 'ip_address', 'ip_hash', 'session_hash'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('metadata', 'created_at'),
            'classes': ('collapse',)
        }),
    )

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = (
        'user_id',
        'email', 
        'name', 
        'is_active',
        'is_staff',
        'identity_verified',
        'email_is_verified',
    )
    
    list_filter = (
        'is_active',
        'is_staff',
        'identity_verified',
        'email_is_verified',
    )
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('email', 'name', 'password', 'profile_picture', 'phone_number', 'birthday')
        }),
        ('Permissions', {
            'fields': (
                'is_active', 'is_staff', 'is_superuser',
                'identity_verified', 'email_is_verified',
                'groups', 'user_permissions'
            )
        }),
        ('Payment Information', {
            'fields': ('stripe_customer_id',)
        }),
        ('Important dates', {
            'fields': ('created_at', 'last_login')
        }),
    )
    
    readonly_fields = ('created_at', 'last_login', 'user_id')
    search_fields = ('email', 'name', 'phone_number')
    ordering = ('email',)
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'name', 'password1', 'password2'),
        }),
    )

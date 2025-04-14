from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, UserSettings, TutorialStatus

class CustomUserAdmin(UserAdmin):
    model = User
    list_display = ('user_id', 'email', 'name', 'is_staff', 'is_active', 'email_is_verified', 'subscription_plan', 'is_waitlister', 'signed_up_on_beta')
    list_filter = ('is_staff', 'is_active', 'email_is_verified', 'subscription_plan', 'is_waitlister', 'signed_up_on_beta')
    fieldsets = (
        (None, {'fields': ('user_id', 'email', 'password')}),
        ('Personal info', {'fields': ('name', 'profile_picture', 'phone_number', 'birthday')}),
        ('Status', {'fields': ('is_active', 'is_staff', 'is_superuser', 'email_is_verified', 'identity_verified')}),
        ('Subscription', {'fields': ('subscription_plan', 'is_waitlister', 'signed_up_on_beta')}),
        ('Important dates', {'fields': ('last_login', 'created_at')}),
        ('Groups and Permissions', {'fields': ('groups', 'user_permissions')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'name', 'password1', 'password2', 'is_staff', 'is_active')}
        ),
    )
    search_fields = ('email', 'name', 'user_id')
    ordering = ('email',)
    readonly_fields = ('created_at', 'user_id')

@admin.register(UserSettings)
class UserSettingsAdmin(admin.ModelAdmin):
    list_display = ('user_id_display', 'user', 'timezone', 'use_military_time', 'created_at', 'updated_at')
    list_filter = ('timezone', 'use_military_time')
    search_fields = ('user__email', 'user__name', 'timezone', 'user__user_id')
    readonly_fields = ('created_at', 'updated_at', 'user_id_display')
    fieldsets = (
        ('User Information', {
            'fields': ('user_id_display', 'user',)
        }),
        ('Time Settings', {
            'fields': ('timezone', 'use_military_time')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')
        
    def user_id_display(self, obj):
        return obj.user.user_id if obj.user else None
    user_id_display.short_description = 'User ID'

@admin.register(TutorialStatus)
class TutorialStatusAdmin(admin.ModelAdmin):
    list_display = ('user_id_display', 'user', 'done_client_tutorial', 'done_pro_tutorial', 'created_at', 'updated_at')
    list_filter = ('done_client_tutorial', 'done_pro_tutorial')
    search_fields = ('user__email', 'user__name', 'user__user_id')
    readonly_fields = ('created_at', 'updated_at', 'user_id_display')
    fieldsets = (
        ('User Information', {
            'fields': ('user_id_display', 'user',)
        }),
        ('Tutorial Status', {
            'fields': ('done_client_tutorial', 'done_pro_tutorial')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')
        
    def user_id_display(self, obj):
        return obj.user.user_id if obj.user else None
    user_id_display.short_description = 'User ID'

admin.site.register(User, CustomUserAdmin)

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, UserSettings, TutorialStatus, Invitation
from django.utils import timezone

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

@admin.register(Invitation)
class InvitationAdmin(admin.ModelAdmin):
    list_display = ('token', 'inviter', 'email', 'invitation_type', 'is_professional_invite', 'is_accepted', 'is_expired_status', 'created_at')
    list_filter = ('invitation_type', 'is_professional_invite', 'is_accepted', 'referral_type', 'reward_status')
    search_fields = ('token', 'inviter__email', 'inviter__name', 'email', 'invitee__email', 'invitee__name')
    readonly_fields = ('token', 'created_at', 'is_expired_status', 'is_valid_status')
    fieldsets = (
        ('Invitation Details', {
            'fields': ('token', 'inviter', 'invitee', 'email')
        }),
        ('Invitation Type', {
            'fields': ('invitation_type', 'is_professional_invite', 'referral_type')
        }),
        ('Status', {
            'fields': ('is_accepted', 'accepted_at', 'expires_at', 'is_expired_status', 'is_valid_status')
        }),
        ('Referral Rewards', {
            'fields': ('reward_status',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('inviter', 'invitee')
    
    def is_expired_status(self, obj):
        return obj.is_expired
    is_expired_status.short_description = 'Is Expired'
    is_expired_status.boolean = True
    
    def is_valid_status(self, obj):
        return obj.is_valid
    is_valid_status.short_description = 'Is Valid'
    is_valid_status.boolean = True
    
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "inviter" or db_field.name == "invitee":
            kwargs["queryset"] = User.objects.order_by('email')
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

admin.site.register(User, CustomUserAdmin)

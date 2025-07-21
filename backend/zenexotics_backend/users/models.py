from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils import timezone
from django.conf import settings
from django.core.exceptions import ValidationError
import secrets
import string
import os
from django.utils.translation import gettext_lazy as _
import pytz
import uuid
from datetime import timedelta

def validate_image_file(value):
    if value.size > settings.MAX_UPLOAD_SIZE:
        raise ValidationError(f'File size must be no more than {settings.MAX_UPLOAD_SIZE/1024/1024}MB')
    if value.content_type not in settings.ALLOWED_IMAGE_TYPES:
        raise ValidationError('File type not supported. Please upload a valid image file.')

def user_profile_photo_path(instance, filename):
    # Get the file extension
    ext = filename.split('.')[-1]
    # Generate a unique filename
    filename = f"{instance.user_id}_{secrets.token_hex(8)}.{ext}"
    # Return the complete path using forward slashes for S3 compatibility
    return f"{settings.USER_PROFILE_PHOTOS_DIR}/{filename}"

# Create your models here.

class UserManager(BaseUserManager):
    def create_user(self, email, name, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, name=name, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, name, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('email_is_verified', True)
        return self.create_user(email, name, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):
    # Basic Information
    user_id = models.CharField(max_length=50, unique=True, blank=True)
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=255)
    profile_picture = models.ImageField(
        upload_to=user_profile_photo_path,
        validators=[validate_image_file],
        null=True,
        blank=True,
        help_text="Profile picture for the user. Maximum size: 5MB. Allowed formats: JPEG, PNG, GIF, WebP"
    )
    phone_number = models.CharField(max_length=20, blank=True)
    birthday = models.DateTimeField(null=True, blank=True)
    
    # Status fields
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_profile_visible = models.BooleanField(default=True)
    identity_verified = models.BooleanField(default=False)
    email_is_verified = models.BooleanField(default=False)
    
    # Subscription and Beta related
    subscription_plan = models.IntegerField(
        default=1,
        help_text="0: Free tier, 1: Waitlist tier, 2: Commission tier, 3: Pro subscription, 4: Client subscription, 5: Dual subscription"
    )
    is_waitlister = models.BooleanField(default=False)
    signed_up_on_beta = models.BooleanField(default=False)
    
    # Payment related
    stripe_customer_id = models.CharField(max_length=100, blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    last_login = models.DateTimeField(null=True, blank=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name']
    
    objects = UserManager()
    
    def __str__(self):
        return self.email
    
    def save(self, *args, **kwargs):
        if not self.user_id:
            self.user_id = 'user_' + ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(9))
        super().save(*args, **kwargs)

    def get_first_name(self):
        return self.name.split()[0]

    def has_perm(self, perm, obj=None):
        return True

    def has_module_perms(self, app_label):
        return True

class UserSettings(models.Model):
    TIMEZONE_CHOICES = [(tz, tz) for tz in pytz.common_timezones]
    
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='settings'
    )
    timezone = models.CharField(
        max_length=50,
        choices=TIMEZONE_CHOICES,
        default='UTC',
        help_text=_('User\'s preferred timezone')
    )
    use_military_time = models.BooleanField(
        default=False,
        help_text=_('Whether to use 24-hour time format')
    )
    push_notifications = models.BooleanField(default=True)
    email_updates = models.BooleanField(default=True)
    marketing_communications = models.BooleanField(default=True)
    privacy_settings = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_settings'
        verbose_name = 'User Settings'
        verbose_name_plural = 'User Settings'

    def __str__(self):
        return f"Settings for {self.user.name}"

class Waitlister(models.Model):
    email = models.EmailField(unique=True)
    signup_date = models.DateTimeField(auto_now_add=True)
    preferences = models.JSONField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'waitlisters'
        verbose_name = 'Waitlister'
        verbose_name_plural = 'Waitlisters'
    
    def __str__(self):
        return f"Waitlister: {self.email}"

class TutorialStatus(models.Model):
    status_id = models.AutoField(primary_key=True)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='tutorial_status')
    done_client_tutorial = models.BooleanField(default=False)
    done_pro_tutorial = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tutorial_status'
        verbose_name_plural = 'tutorial statuses'

    def __str__(self):
        return f"Tutorial Status for {self.user.email}"

class Invitation(models.Model):
    """
    Model to track client invitations sent by professionals and referrals sent by any user.
    Supports both email invitations and shareable link invitations.
    """
    # Who sent the invitation
    inviter = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_invitations')
    # Email of invitee (optional for link invitations)
    email = models.EmailField(blank=True, null=True)
    # Unique token for the invitation
    token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    # When invitation was created
    created_at = models.DateTimeField(auto_now_add=True)
    # When invitation expires (default 14 days)
    expires_at = models.DateTimeField()
    # Has this invitation been used?
    is_accepted = models.BooleanField(default=False)
    # When was it accepted (if it was)
    accepted_at = models.DateTimeField(null=True, blank=True)
    # Type of invitation
    invitation_type = models.CharField(
        max_length=10,
        choices=[('email', 'Email'), ('link', 'Link')],
        default='email'
    )
    # Is this a professional invitation or a general referral?
    is_professional_invite = models.BooleanField(default=True)
    # For referrals: what type of referral is this?
    referral_type = models.CharField(
        max_length=30,
        choices=[
            ('client_to_client', 'Client to Client'),
            ('client_to_professional', 'Client to Professional'),
            ('professional_to_professional', 'Professional to Professional')
        ],
        null=True, blank=True
    )
    # For referrals: status of any rewards associated with this referral
    reward_status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('awarded', 'Awarded'),
            ('ineligible', 'Ineligible')
        ],
        default='pending',
        null=True, blank=True
    )
    # User that accepted the invitation (filled after acceptance)
    invitee = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='received_invitations'
    )
    
    class Meta:
        db_table = 'client_invitations'
        verbose_name = 'Invitation & Referral'
        verbose_name_plural = 'Invitations & Referrals'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['inviter']),
            models.Index(fields=['invitee']),
            models.Index(fields=['email']),
            models.Index(fields=['is_professional_invite']),
            models.Index(fields=['is_accepted']),
            models.Index(fields=['created_at']),
        ]
        
    def __str__(self):
        if self.email:
            return f"Invitation for {self.email} from {self.inviter.email}"
        return f"Link invitation from {self.inviter.email}"
    
    def save(self, *args, **kwargs):
        # Set expiration date if not set
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(days=14)
        super().save(*args, **kwargs)
    
    @property
    def is_expired(self):
        """Check if the invitation has expired"""
        return timezone.now() > self.expires_at
    
    @property
    def is_valid(self):
        """Check if the invitation is still valid"""
        return not self.is_accepted and not self.is_expired

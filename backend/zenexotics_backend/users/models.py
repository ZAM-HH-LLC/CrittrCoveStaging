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
    # Return the complete path
    return os.path.join(settings.USER_PROFILE_PHOTOS_DIR, filename)

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

from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils import timezone
from django.conf import settings
from django.core.exceptions import ValidationError
import secrets
import string
import os

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
    identity_verified = models.BooleanField(default=False)
    email_is_verified = models.BooleanField(default=False)
    
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

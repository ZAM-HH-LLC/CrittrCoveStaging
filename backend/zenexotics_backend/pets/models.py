from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
import os
import json
import imghdr
import secrets

def validate_image_file(value):
    if value:
        # Check file size
        if value.size > settings.MAX_UPLOAD_SIZE:
            raise ValidationError(f'File size must be no more than {settings.MAX_UPLOAD_SIZE/1024/1024}MB')
        
        # Check file type using imghdr
        valid_image_extensions = ['jpeg', 'jpg', 'png', 'gif', 'webp']
        file_extension = value.name.split('.')[-1].lower()
        
        # First check the file extension
        if file_extension not in valid_image_extensions:
            raise ValidationError('Invalid image file extension. Allowed formats: JPEG, PNG, GIF, WebP')
        
        # If it's a newly uploaded file, check its content
        if hasattr(value, 'temporary_file_path'):
            image_type = imghdr.what(value.temporary_file_path())
            if image_type not in valid_image_extensions:
                raise ValidationError('Invalid image content. File must be a valid image.')

def validate_gallery_paths(value):
    if not isinstance(value, list):
        raise ValidationError('Gallery must be a list of image paths')
    for path in value:
        if not isinstance(path, str):
            raise ValidationError('Each gallery item must be a string path')
        if not path.startswith(settings.PET_GALLERY_PHOTOS_DIR):
            raise ValidationError('Invalid gallery photo path')

def pet_profile_photo_path(instance, filename):
    # Get the file extension
    ext = filename.split('.')[-1]
    # Generate a unique filename
    filename = f"{instance.pet_id}_{secrets.token_hex(8)}.{ext}"
    # Return the complete path
    return os.path.join(settings.PET_PROFILE_PHOTOS_DIR, filename)

def pet_gallery_photo_path(instance, filename):
    # Get the file extension
    ext = filename.split('.')[-1]
    # Generate a unique filename
    filename = f"{instance.pet_id}_{secrets.token_hex(8)}.{ext}"
    # Return the complete path
    return os.path.join(settings.PET_GALLERY_PHOTOS_DIR, filename)

class Pet(models.Model):
    SPECIES_CHOICES = [
        ('DOG', 'Dog'),
        ('CAT', 'Cat'),
        ('BIRD', 'Bird'),
        ('FISH', 'Fish'),
        ('REPTILE', 'Reptile'),
        ('OTHER', 'Other'),
    ]
    
    SEX_CHOICES = [
        ('M', 'Male'),
        ('F', 'Female'),
    ]
    
    ENERGY_LEVEL_CHOICES = [
        ('LOW', 'Low'),
        ('MODERATE', 'Moderate'),
        ('HIGH', 'High'),
    ]

    # Basic Information
    pet_id = models.AutoField(primary_key=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='owned_pets',
        null=True,
        blank=True
    )
    name = models.CharField(max_length=100)
    species = models.CharField(max_length=20, choices=SPECIES_CHOICES)
    breed = models.CharField(max_length=100, blank=True)
    pet_type = models.CharField(max_length=100, blank=True, help_text="Specific type for exotic pets")
    
    # Age and Physical Details
    age_years = models.IntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        null=True,
        blank=True
    )
    age_months = models.IntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(11)],
        default=0,
        null=True,
        blank=True
    )
    weight = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    birthday = models.DateField(null=True, blank=True)
    sex = models.CharField(max_length=1, choices=SEX_CHOICES, null=True, blank=True)
    
    # Photos
    profile_photo = models.ImageField(
        upload_to=pet_profile_photo_path,
        validators=[validate_image_file],
        null=True,
        blank=True,
        help_text="Profile photo for the pet. Maximum size: 5MB. Allowed formats: JPEG, PNG, GIF, WebP"
    )
    photo_gallery = models.JSONField(
        default=list,
        blank=True,
        validators=[validate_gallery_paths],
        help_text="List of paths to gallery photos"
    )
    
    # Dates
    adoption_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Description
    pet_description = models.TextField(blank=True)
    
    # Dog and Cat Specific
    friendly_with_children = models.BooleanField(null=True, blank=True)
    friendly_with_cats = models.BooleanField(null=True, blank=True)
    friendly_with_dogs = models.BooleanField(null=True, blank=True)
    spayed_neutered = models.BooleanField(null=True, blank=True)
    house_trained = models.BooleanField(null=True, blank=True)
    microchipped = models.BooleanField(null=True, blank=True)
    
    # Care Information
    feeding_schedule = models.TextField(blank=True)
    potty_break_schedule = models.TextField(blank=True)
    energy_level = models.CharField(max_length=20, choices=ENERGY_LEVEL_CHOICES, blank=True)
    can_be_left_alone = models.BooleanField(null=True, blank=True)
    medications = models.JSONField(default=dict, blank=True)
    medication_notes = models.TextField(blank=True)
    special_care_instructions = models.TextField(blank=True)
    
    # Veterinary Information
    vet_name = models.CharField(max_length=100, blank=True)
    vet_address = models.TextField(blank=True)
    vet_phone = models.CharField(max_length=20, blank=True)
    insurance_provider = models.CharField(max_length=100, blank=True)
    vet_documents = models.JSONField(default=list, blank=True)

    def __str__(self):
        return f"{self.name} - {self.species} ({self.owner.email}'s pet)"

    class Meta:
        ordering = ['name']

    def save(self, *args, **kwargs):
        # Ensure photo_gallery is always a list
        if self.photo_gallery is None:
            self.photo_gallery = []
        super().save(*args, **kwargs)

    def add_gallery_photo(self, photo):
        """
        Add a photo to the gallery
        :param photo: UploadedFile object
        :return: path of the saved photo
        """
        validate_image_file(photo)
        filename = pet_gallery_photo_path(self, photo.name)
        
        # Save the file using Django's storage
        storage = self.profile_photo.storage
        filename = storage.save(filename, photo)
        
        # Get the URL/path
        path = filename
        
        # Update the gallery
        gallery = self.photo_gallery or []
        gallery.append(path)
        self.photo_gallery = gallery
        self.save()
        
        return path

    def remove_gallery_photo(self, path):
        """
        Remove a photo from the gallery
        :param path: path of the photo to remove
        """
        if path in self.photo_gallery:
            # Remove from storage
            storage = self.profile_photo.storage
            if storage.exists(path):
                storage.delete(path)
            
            # Remove from gallery
            gallery = self.photo_gallery
            gallery.remove(path)
            self.photo_gallery = gallery
            self.save()

    def clean_gallery(self):
        """
        Clean up any gallery photos that no longer exist in storage
        """
        if not self.photo_gallery:
            return
        
        storage = self.profile_photo.storage
        valid_paths = []
        
        for path in self.photo_gallery:
            if storage.exists(path):
                valid_paths.append(path)
        
        self.photo_gallery = valid_paths
        self.save()

    def delete(self, *args, **kwargs):
        # Clean up all photos when deleting the pet
        storage = self.profile_photo.storage
        
        # Delete profile photo
        if self.profile_photo:
            storage.delete(self.profile_photo.path)
        
        # Delete gallery photos
        if self.photo_gallery:
            for path in self.photo_gallery:
                if storage.exists(path):
                    storage.delete(path)
        
        super().delete(*args, **kwargs)
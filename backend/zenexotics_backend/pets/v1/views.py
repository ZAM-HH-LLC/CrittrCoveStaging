from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import models
from ..models import Pet
from ..serializers import PetSerializer, UserPetListSerializer
import base64
from django.core.files.base import ContentFile
import os
from django.conf import settings
import json
import uuid
from PIL import Image, ImageDraw
import io
import logging
from django.db import transaction

logger = logging.getLogger(__name__)

class AddPetSerializer(PetSerializer):
    """
    Special serializer for adding pets that ensures boolean fields are null when not provided
    """
    def to_representation(self, instance):
        """
        Override to_representation to ensure boolean fields are always null when not in request
        """
        data = super().to_representation(instance)
        
        # List of boolean fields that should be null when not explicitly set
        boolean_fields = [
            'friendly_with_children', 'friendly_with_cats', 'friendly_with_dogs',
            'spayed_neutered', 'house_trained', 'microchipped', 'can_be_left_alone'
        ]
        
        # For each boolean field, check if it was in the initial data
        for field in boolean_fields:
            # If the field wasn't in the initial data, set it to null in the response
            if field not in getattr(self, 'initial_data', {}):
                data[field] = None
        
        return data

class PetViewSet(viewsets.ModelViewSet):
    queryset = Pet.objects.all()
    serializer_class = PetSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Filter pets to return only those belonging to the current user
        """
        user = self.request.user
        
        # Special case for add-pet to ensure we don't filter out pets with no owner
        if self.action == 'add_pet':
            return Pet.objects.all()
            
        return Pet.objects.filter(owner=user)

    def list(self, request, *args, **kwargs):
        """
        Return all pets owned by the current user in the specified format
        """
        try:
            pets = self.get_queryset()
            serializer = UserPetListSerializer(pets, many=True)
            return Response({'pets': serializer.data})
        except Exception as e:
            return Response(
                {'error': 'An error occurred while fetching pets'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    def update(self, request, *args, **kwargs):
        """
        Override the update method to handle pet photo uploads
        """
        try:
            pet = self.get_object()
            data = request.data.copy()
            
            # Handle profile photo (either base64 or file upload)
            pet_photo_base64 = data.get('pet_photo_base64')
            pet_photo = request.FILES.get('pet_photo')
            
            # Check for old profile photo to delete
            old_profile_photo_url = data.get('old_profile_photo_url')
            old_photo_path = None
            
            # Only set old_photo_path if it exists and is different from the current one
            if old_profile_photo_url and pet.profile_photo:
                # Extract the relative path from the URL
                if '/media/' in old_profile_photo_url:
                    media_path = old_profile_photo_url.split('/media/', 1)[1]
                    old_photo_path = media_path  # Use relative path for S3
                    logger.debug(f"Will delete old photo at: {old_photo_path}")
            
            # Keep track of old profile photo path for deletion
            if pet.profile_photo and (pet_photo_base64 or pet_photo):
                # If we're uploading a new photo, delete the old one after saving
                if hasattr(pet.profile_photo, 'name'):
                    old_photo_path = pet.profile_photo.name  # Use name instead of path for S3
                    logger.debug(f"Will delete current photo at: {old_photo_path}")
            
            if pet_photo_base64:
                # Handle base64 encoded image
                format, imgstr = pet_photo_base64.split(';base64,') if ';base64,' in pet_photo_base64 else ('data:image/jpeg;base64', pet_photo_base64)
                ext = format.split('/')[-1] if '/' in format else 'jpeg'
                photo_data = ContentFile(base64.b64decode(imgstr), name=f'{pet.pet_id}_{uuid.uuid4().hex}.{ext}')
                pet.profile_photo = photo_data
            elif pet_photo:
                # Handle file upload
                pet.profile_photo = pet_photo
            
            # Remove these fields from data as they're handled separately
            if 'pet_photo_base64' in data:
                del data['pet_photo_base64']
            if 'pet_photo' in data:
                del data['pet_photo']
            if 'old_profile_photo_url' in data:
                del data['old_profile_photo_url']
            
            # Apply crop parameters if provided
            crop_params = data.get('crop_params')
            if crop_params and isinstance(crop_params, str):
                try:
                    # If crop_params is a JSON string, convert to dict
                    crop_params = json.loads(crop_params)
                    
                    # Process the image with the crop params
                    if pet.profile_photo:
                        # Save changes before processing
                        pet.save()
                        # Reload the image for processing
                        pet.profile_photo.open()
                        image = Image.open(pet.profile_photo)
                        cropped_image = process_image_crop(image, crop_params)
                        
                        # Save the cropped image back to the pet
                        img_byte_arr = io.BytesIO()
                        cropped_image.save(img_byte_arr, format='JPEG', quality=90)
                        img_byte_arr.seek(0)
                        
                        # Create a new file with the cropped image
                        cropped_file = ContentFile(
                            img_byte_arr.getvalue(), 
                            name=f'{pet.pet_id}_{uuid.uuid4().hex}.jpeg'
                        )
                        pet.profile_photo = cropped_file
                        
                        logger.debug(f"Successfully cropped image for pet {pet.pet_id}")
                except json.JSONDecodeError:
                    logger.warning(f"Invalid crop_params JSON: {crop_params}")
                except Exception as e:
                    logger.error(f"Error processing crop: {str(e)}")
            
            # Remove crop_params from data
            if 'crop_params' in data:
                del data['crop_params']
            
            # Update the pet with the remaining data
            serializer = self.get_serializer(pet, data=data, partial=True)
            if serializer.is_valid():
                serializer.save()
                
                # Now that the new photo is saved, we can delete the old one
                if old_photo_path and old_photo_path.startswith('media/'): # Check if it's a media path
                    try:
                        from django.core.files.storage import default_storage
                        default_storage.delete(old_photo_path)
                        logger.debug(f"Deleted old pet photo at {old_photo_path}")
                    except Exception as e:
                        logger.warning(f"Failed to delete old pet photo: {str(e)}")
                
                # Return a success response with the updated pet data
                return Response(
                    {'message': 'Pet updated successfully', 'pet': serializer.data},
                    status=status.HTTP_200_OK
                )
            
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.exception(f"Error updating pet: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    @action(detail=False, methods=['post'], url_path='add-pet')
    def add_pet(self, request):
        """
        Add a new pet with photo upload support
        """
        try:
            data = request.data.copy()
            
            # Extract photo data
            pet_photo_base64 = data.get('pet_photo_base64')
            pet_photo = request.FILES.get('pet_photo')
            crop_params = data.get('crop_params')
            
            # Remove photo fields from the data
            if 'pet_photo_base64' in data:
                del data['pet_photo_base64']
            if 'pet_photo' in data:
                del data['pet_photo']
            if 'crop_params' in data:
                del data['crop_params']
            
            # Set the owner to the current user
            data['owner'] = request.user.pk
            
            # Explicitly set boolean fields to null if not provided
            boolean_fields = [
                'friendly_with_children', 'friendly_with_cats', 'friendly_with_dogs',
                'spayed_neutered', 'house_trained', 'microchipped', 'can_be_left_alone'
            ]
            
            for field in boolean_fields:
                if field not in data:
                    data[field] = None
            
            # Use our special serializer for adding pets
            serializer = AddPetSerializer(data=data)
            
            if serializer.is_valid():
                # Save the pet
                pet = serializer.save()
                
                # Now that we have a pet object with an ID, we can handle the photo
                if pet_photo_base64:
                    # Handle base64 encoded image
                    format, imgstr = pet_photo_base64.split(';base64,') if ';base64,' in pet_photo_base64 else ('data:image/jpeg;base64', pet_photo_base64)
                    ext = format.split('/')[-1] if '/' in format else 'jpeg'
                    photo_data = ContentFile(base64.b64decode(imgstr), name=f'{pet.pet_id}_{uuid.uuid4().hex}.{ext}')
                    pet.profile_photo = photo_data
                    pet.save()
                elif pet_photo:
                    # Handle file upload
                    pet.profile_photo = pet_photo
                    pet.save()
                
                # Apply crop parameters if provided
                if crop_params and isinstance(crop_params, str) and pet.profile_photo:
                    try:
                        # If crop_params is a JSON string, convert to dict
                        import json
                        crop_params = json.loads(crop_params)
                        
                        # Process the image with crop parameters
                        pet.profile_photo.open()
                        image = Image.open(pet.profile_photo)
                        cropped_image = process_image_crop(image, crop_params)
                        
                        # Save the cropped image back to the pet
                        img_byte_arr = io.BytesIO()
                        cropped_image.save(img_byte_arr, format='JPEG', quality=90)
                        img_byte_arr.seek(0)
                        
                        # Create a new file with the cropped image
                        cropped_file = ContentFile(
                            img_byte_arr.getvalue(), 
                            name=f'{pet.pet_id}_{uuid.uuid4().hex}.jpeg'
                        )
                        pet.profile_photo = cropped_file
                        pet.save()
                        
                        logger.debug(f"Successfully cropped image for new pet {pet.pet_id}")
                    except json.JSONDecodeError:
                        logger.warning(f"Invalid crop_params JSON: {crop_params}")
                    except Exception as e:
                        logger.error(f"Error processing crop for new pet: {str(e)}")
                
                # Double-check that boolean fields are null in the database
                # This is a safety measure in case the serializer didn't handle it correctly
                pet_updated = False
                for field in boolean_fields:
                    if field not in request.data and getattr(pet, field) is False:
                        setattr(pet, field, None)
                        pet_updated = True
                
                if pet_updated:
                    pet.save()
                
                # Get updated serializer with photo
                serializer = AddPetSerializer(pet, context={'request': request})
                
                # Add pet_id to the response data explicitly 
                response_data = serializer.data
                response_data['pet_id'] = pet.pet_id
                
                # Manually set boolean fields to null in the response if they weren't in the request
                for field in boolean_fields:
                    if field not in request.data:
                        response_data[field] = None
                
                # Return the created pet data with explicit pet_id
                return Response(
                    {'message': 'Pet added successfully', 'pet': response_data},
                    status=status.HTTP_201_CREATED
                )
            
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.exception(f"Error adding pet: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='fix-owner')
    def fix_owner(self, request, pk=None):
        """
        Fix a pet with a missing owner by assigning the current user
        """
        try:
            # Get the pet
            pet = self.get_object()
            
            # Check if owner is already set
            if pet.owner:
                return Response(
                    {'message': 'This pet already has an owner.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Set the owner to the current user
            pet.owner = request.user
            pet.save()
            
            # Return success
            serializer = self.get_serializer(pet)
            return Response(
                {'message': 'Pet owner fixed successfully', 'pet': serializer.data},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'error': f'An error occurred while fixing the pet owner: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            ) 

# Image processing functions
def process_image_crop(image, crop_params):
    """
    Process image cropping based on crop parameters.
    
    Args:
        image (PIL.Image): The image to crop
        crop_params (dict): Crop parameters containing:
            - scale: Image scale factor
            - x, y: Image translation
            - imageWidth, imageHeight: Original image dimensions
            - cropWidth, cropHeight: Dimensions of the crop area
            
    Returns:
        PIL.Image: The cropped image
    """
    # Get parameters from crop_params
    scale = crop_params.get('scale', 1)
    x_offset = crop_params.get('x', 0)
    y_offset = crop_params.get('y', 0)
    crop_width = crop_params.get('cropWidth', 200)
    crop_height = crop_params.get('cropHeight', 200)
    image_width = crop_params.get('imageWidth', image.width)
    image_height = crop_params.get('imageHeight', image.height)
    
    logger.debug(f"process_image_crop: Processing with params: scale={scale}, x={x_offset}, y={y_offset}, "
                 f"cropWidth={crop_width}, cropHeight={crop_height}, "
                 f"imageWidth={image_width}, imageHeight={image_height}")
    
    # Calculate the size of the circle area
    crop_size = min(crop_width, crop_height)
    
    # Calculate the center of the crop area
    crop_center_x = crop_size / 2
    crop_center_y = crop_size / 2
    
    # Calculate the image center in the crop window
    # The image position is relative to the crop window center
    image_center_x = crop_center_x - x_offset
    image_center_y = crop_center_y - y_offset
    
    # Calculate the scaled image dimensions
    scaled_width = image_width * scale
    scaled_height = image_height * scale
    
    # Calculate the top-left corner of the image in the crop window
    image_left = image_center_x - (scaled_width / 2)
    image_top = image_center_y - (scaled_height / 2)
    
    # Calculate the corresponding crop box on the original image
    # This is where we need to map from crop window coordinates to image coordinates
    
    # Normalize the crop center position relative to the image
    rel_crop_x = (crop_center_x - image_left) / scaled_width
    rel_crop_y = (crop_center_y - image_top) / scaled_height
    
    # Calculate crop area on the original image
    crop_radius = crop_size / 2 / scale
    
    # Calculate crop coordinates on the original image
    left = max(0, image_width * rel_crop_x - crop_radius)
    top = max(0, image_height * rel_crop_y - crop_radius)
    right = min(image_width, image_width * rel_crop_x + crop_radius)
    bottom = min(image_height, image_height * rel_crop_y + crop_radius)
    
    logger.debug(f"process_image_crop: Calculated crop box: left={left}, top={top}, right={right}, bottom={bottom}")
    
    # Make sure we're cropping a square
    crop_size_orig = min(right - left, bottom - top)
    
    # Recalculate to ensure square crop
    center_x_orig = (left + right) / 2
    center_y_orig = (top + bottom) / 2
    
    left = center_x_orig - crop_size_orig / 2
    top = center_y_orig - crop_size_orig / 2
    right = center_x_orig + crop_size_orig / 2
    bottom = center_y_orig + crop_size_orig / 2
    
    # Ensure crop box stays within image bounds
    if left < 0:
        right -= left
        left = 0
    if top < 0:
        bottom -= top
        top = 0
    if right > image_width:
        left -= (right - image_width)
        right = image_width
    if bottom > image_height:
        top -= (bottom - image_height)
        bottom = image_height
    
    # Crop the image
    try:
        cropped_img = image.crop((left, top, right, bottom))
        
        # Resize to the target size (make it square)
        target_size = (crop_size, crop_size)
        final_img = cropped_img.resize(target_size, Image.LANCZOS)
        
        logger.debug(f"process_image_crop: Successfully cropped and resized image to {target_size}")
        
        # Create a circular mask for the image
        mask = Image.new('L', target_size, 0)
        mask_draw = ImageDraw.Draw(mask)
        mask_draw.ellipse((0, 0, crop_size, crop_size), fill=255)
        
        # Create a new transparent image for the result
        result = Image.new('RGBA', target_size, (0, 0, 0, 0))
        
        # Convert the cropped image to RGBA
        if final_img.mode != 'RGBA':
            final_img = final_img.convert('RGBA')
        
        # Paste the cropped image using the circular mask
        result.paste(final_img, (0, 0), mask)
        
        # Convert back to RGB for JPEG compatibility
        result = result.convert('RGB')
        
        return result
    except Exception as e:
        logger.exception(f"process_image_crop: Error cropping image: {str(e)}")
        # Return the original image if cropping fails
        return image 
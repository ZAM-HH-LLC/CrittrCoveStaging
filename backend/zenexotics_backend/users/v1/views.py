from django.conf import settings
from django.shortcuts import render
from rest_framework import generics, permissions
from django.core.mail import send_mail
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from ..models import User, UserSettings
from ..serializers import RegisterSerializer
import logging
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.contrib.auth import authenticate
from professional_status.models import ProfessionalStatus
import pytz
from datetime import datetime
from clients.models import Client
from django.urls import clear_url_caches
from django.http import HttpResponse
from professionals.models import Professional
import base64
import io
import uuid
from PIL import Image, ImageDraw
from django.core.files.base import ContentFile
import json
from django.core.files.uploadedfile import InMemoryUploadedFile
import os

logger = logging.getLogger(__name__)

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        user = get_object_or_404(User, email=email)
        
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.user_id))
        logger.debug(f"Encoded UID: {uid}")
        
        reset_link = f"{settings.FRONTEND_BASE_URL}/reset-password/{uid}/{token}/"
        
        try:
            logger.info(f"Attempting to send password reset email to: {email}")
            send_mail(
                'Password Reset Request',
                f'Click the link to reset your password: {reset_link}',
                settings.DEFAULT_FROM_EMAIL,
                [email],
                fail_silently=False,
            )
            logger.info(f"Successfully sent password reset email to: {email}")
            return Response({'message': 'Password reset link sent'}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Failed to send email to {email}. Error: {str(e)}")
            logger.error(f"Reset link that failed: {reset_link}")
            return Response({'error': 'Failed to send email'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, uidb64, token):
        try:
            user_id = urlsafe_base64_decode(uidb64).decode()
            user = get_object_or_404(User, user_id=user_id)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({'error': 'Invalid user ID'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not default_token_generator.check_token(user, token):
            return Response({'error': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)
        
        new_password = request.data.get('new_password')
        user.set_password(new_password)
        user.save()
        
        return Response({'message': 'Password has been reset'}, status=status.HTTP_200_OK)

class SitterStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        is_approved_sitter = (
            user.is_sitter and 
            (user.approved_for_dogs or 
             user.approved_for_cats or 
             user.approved_for_exotics)
        )
        
        return Response({
            'is_sitter': user.is_sitter,
            'is_approved_sitter': is_approved_sitter,
            'approved_dog_sitting': user.approved_for_dogs,
            'approved_cat_sitting': user.approved_for_cats,
            'approved_exotics_sitting': user.approved_for_exotics,
            'wants_to_be_sitter': user.wants_to_be_sitter
        })

@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def get_user_name(request):
    user = request.user
    return Response({
        'name': user.name,
        'first_name': user.get_first_name()
    })

class ContactFormView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        name = request.data.get('name')
        email = request.data.get('email')
        message = request.data.get('message')

        if not all([name, email, message]):
            return Response({'error': 'All fields are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            send_mail(
                subject=f"New Contact Form Submission from {name}",
                message=f"Name: {name}\nEmail: {email}\n\nMessage:\n{message}",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[settings.CONTACT_EMAIL],
                fail_silently=False,
            )
            return Response({'message': 'Your message has been sent successfully!'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': 'Failed to send message. Please try again later.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')

        if not current_password or not new_password:
            logger.warning("Missing current or new password")
            return Response({'error': 'Both current and new password are required'}, status=status.HTTP_400_BAD_REQUEST)

        if not authenticate(email=user.email, password=current_password):
            logger.warning("Authentication failed: incorrect current password")
            return Response({'error': 'Current password is incorrect'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        logger.info(f"Password changed successfully for user: {user.email}")
        return Response({'message': 'Password changed successfully'}, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_sitter_status(request):
    try:
        prof_status = ProfessionalStatus.objects.filter(user=request.user).first()
        
        if prof_status:
            return Response({
                'is_sitter': True,
                'is_approved_sitter': prof_status.is_approved,
                'professional_status': {
                    'is_approved': prof_status.is_approved,
                    'approved_for_dogs': prof_status.approved_for_dogs,
                    'approved_for_cats': prof_status.approved_for_cats,
                    'approved_for_exotics': prof_status.approved_for_exotics,
                }
            })
        else:
            return Response({
                'is_sitter': False,
                'is_approved_sitter': False,
                'professional_status': None
            })
            
    except Exception as e:
        print(f"Error in get_sitter_status: {str(e)}")
        return Response({
            'is_sitter': False,
            'is_approved_sitter': False,
            'professional_status': None,
            'error': str(e)
        }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_info(request):
    try:
        user = request.user
        return Response({
            'first_name': user.name.split()[0] if len(user.name.split()) > 0 else '',
            'last_name': user.name.split()[1] if len(user.name.split()) > 1 else '',
            'email': user.email,
            'phone_number': user.phone_number if hasattr(user, 'phone_number') else '',
        })
    except Exception as e:
        print(f"Error in get_user_info: {str(e)}")
        return Response({
            'first_name': '',
            'last_name': '',
            'email': '',
            'phone_number': '',
            'error': str(e)
        }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_time_settings(request):
    """Get user's time settings"""
    try:
        user = request.user
        
        # Get or create user settings
        user_settings, created = UserSettings.objects.get_or_create(
            user=user,
            defaults={
                'timezone': 'UTC',
                'use_military_time': False
            }
        )
        
        return Response({
            'timezone': user_settings.timezone,
            'use_military_time': user_settings.use_military_time
        })
    except Exception as e:
        logger.error(f"Error getting time settings for user {user.id}: {str(e)}")
        return Response(
            {'error': 'Failed to get time settings'},
            status=status.HTTP_400_BAD_REQUEST
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_time_settings(request):
    """Update user's time settings"""
    try:
        user = request.user
        
        # Check if request.data is a string (which would cause the error)
        if isinstance(request.data, str):
            return Response(
                {'error': 'Invalid request format. Expected JSON object.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        timezone = request.data.get('timezone')
        use_military_time = request.data.get('use_military_time')
        
        # Get or create user settings
        user_settings, created = UserSettings.objects.get_or_create(
            user=user,
            defaults={
                'timezone': timezone or 'UTC',
                'use_military_time': use_military_time if use_military_time is not None else False
            }
        )
        
        # Update settings if they already exist
        if not created:
            if timezone is not None:
                user_settings.timezone = timezone
            if use_military_time is not None:
                user_settings.use_military_time = use_military_time
            user_settings.save()
        
        return Response({
            'timezone': user_settings.timezone,
            'use_military_time': user_settings.use_military_time
        })
    except Exception as e:
        logger.error(f"Error updating time settings for user {user.id}: {str(e)}")
        return Response(
            {'error': 'Failed to update time settings'},
            status=status.HTTP_400_BAD_REQUEST
        )

@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    """
    Get or update the complete user profile data.
    
    This endpoint returns all profile-related information for the currently 
    authenticated user, including personal details, pets, services, etc.
    
    For PATCH requests, it updates the specified fields and returns the
    complete updated profile data.
    """
    user = request.user
    logger.debug(f"user_profile: Processing request for user {user.id}")
    
    try:
        # Use the helper function to get profile data
        from ..helpers import get_user_profile_data, update_user_profile
        
        if request.method == 'GET':
            response_data = get_user_profile_data(user)
        elif request.method == 'PATCH':
            # Update the specified fields
            update_user_profile(user, request.data)
            # Then return the complete updated profile
            response_data = get_user_profile_data(user)
        
        # If the helper function returned an error, return it with the appropriate status
        if 'error' in response_data:
            return Response(
                response_data,
                status=status.HTTP_404_NOT_FOUND if response_data['error'] == 'Client profile not found' 
                else status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        return Response(response_data)
        
    except Exception as e:
        logger.exception(f"user_profile: Unexpected error: {str(e)}")
        return Response(
            {'error': 'An unexpected error occurred'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def clear_url_cache(request):
    """Temporary view to clear Django's URL cache."""
    clear_url_caches()
    return HttpResponse("URL cache cleared")

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_profile_info(request):
    """
    Update user profile information including both user and client/professional data.
    
    This endpoint handles updating various user profile fields and returns
    only the fields that were updated, not the entire profile.
    """
    user = request.user
    logger.debug(f"update_profile_info: Processing request for user {user.id}")
    
    try:
        # Get data from request
        data = request.data
        logger.debug(f"update_profile_info: Data received: {data}")
        
        # Use the helper function to update profile data
        from ..helpers import update_user_profile
        updated_fields = update_user_profile(user, data)
        
        # Return only the updated fields
        return Response(updated_fields)
        
    except Exception as e:
        logger.exception(f"update_profile_info: Error updating profile: {str(e)}")
        return Response(
            {'error': f'Failed to update profile: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        ) 

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_profile_picture(request):
    """
    Upload a profile picture for the authenticated user.
    
    This endpoint handles both FormData file uploads and JSON base64 image uploads.
    It also supports cropping parameters for precise image cropping and can delete
    the old profile picture when a new one is uploaded.
    
    Accepts:
    - FormData with 'profile_picture' file, optional 'crop_params' JSON string, and optional 'old_profile_photo_url'
    - OR JSON with 'image_data' base64 string, optional 'crop_params' object, and optional 'old_profile_photo_url'
    
    Returns:
    - profile_photo: URL of the uploaded profile picture
    """
    user = request.user
    logger.debug(f"upload_profile_picture: Processing request for user {user.id}")
    
    try:
        # Enhanced debugging
        logger.debug(f"upload_profile_picture: Content-Type: {request.content_type}")
        logger.debug(f"upload_profile_picture: FILES keys: {list(request.FILES.keys())}")
        logger.debug(f"upload_profile_picture: DATA keys: {list(request.data.keys())}")
        
        # Get old profile photo URL if provided for deletion
        old_photo_url = None
        if 'old_profile_photo_url' in request.data:
            old_photo_url = request.data.get('old_profile_photo_url')
            logger.debug(f"upload_profile_picture: Old profile photo URL for deletion: {old_photo_url}")
        
        # Get crop parameters if provided
        crop_params = None
        if 'crop_params' in request.data:
            try:
                # If it's a string (from FormData), parse it
                if isinstance(request.data['crop_params'], str):
                    crop_params = json.loads(request.data['crop_params'])
                else:
                    # If it's already a dict/object (from JSON), use directly
                    crop_params = request.data['crop_params']
                logger.debug(f"upload_profile_picture: Crop parameters received: {crop_params}")
            except Exception as e:
                logger.warning(f"upload_profile_picture: Failed to parse crop parameters: {str(e)}")
        
        # Check for base64 image data (usually from web)
        if 'image_data' in request.data and request.data['image_data']:
            logger.debug(f"upload_profile_picture: Processing base64 image data")
            
            try:
                # Get the base64 data
                image_data = request.data['image_data']
                
                # Check if it starts with the data URI prefix
                if image_data.startswith('data:'):
                    # Parse the data URI to get content type and data
                    header, encoded = image_data.split(',', 1)
                    content_type = header.split(':')[1].split(';')[0]
                    
                    # Validate image type
                    if not content_type.startswith('image/'):
                        logger.warning(f"upload_profile_picture: Invalid content type for base64 image: {content_type}")
                        return Response({
                            "error": "Invalid image type. Please upload a valid image."
                        }, status=400)
                    
                    # Decode the base64 data
                    image_data = base64.b64decode(encoded)
                    
                    # Validate the image
                    try:
                        image = Image.open(io.BytesIO(image_data))
                        image.verify()  # Verify it's a valid image
                    except Exception as e:
                        logger.warning(f"upload_profile_picture: Invalid image data: {str(e)}")
                        return Response({
                            "error": "Invalid image data. Please upload a valid image."
                        }, status=400)
                    
                    # Process the image if crop params provided
                    if crop_params:
                        try:
                            # We need to reload the image since verify() closes it
                            image = Image.open(io.BytesIO(image_data))
                            image = process_image_crop(image, crop_params)
                            
                            # Convert back to bytes
                            img_byte_arr = io.BytesIO()
                            image.save(img_byte_arr, format='JPEG', quality=90)
                            image_data = img_byte_arr.getvalue()
                            
                            logger.debug(f"upload_profile_picture: Image cropped successfully")
                        except Exception as e:
                            logger.warning(f"upload_profile_picture: Failed to crop image: {str(e)}")
                    
                    # Save the old profile picture path for deletion
                    old_picture_path = None
                    if user.profile_picture:
                        # For S3 storage, we need to use the storage backend's delete method
                        # instead of os.path operations
                        old_picture_path = user.profile_picture.name if hasattr(user.profile_picture, 'name') else None

                    # Create a ContentFile from the image data
                    file_ext = content_type.split('/')[1]
                    image_file = ContentFile(
                        image_data, 
                        name=f"profile_{user.id}_{uuid.uuid4().hex}.{file_ext}"
                    )

                    # Save to user profile
                    try:
                        user.profile_picture = image_file
                        user.save()
                        logger.debug(f"upload_profile_picture: Base64 image saved successfully for user {user.id}")
                    except Exception as e:
                        logger.error(f"upload_profile_picture: Failed to save base64 image: {str(e)}")
                        return Response({
                            "error": "Failed to save image. Please try again."
                        }, status=500)

                    # Delete the old profile picture file if it exists
                    if old_picture_path:
                        try:
                            # Check if file exists before attempting to delete
                            if user.profile_picture.storage.exists(old_picture_path):
                                user.profile_picture.storage.delete(old_picture_path)
                                logger.debug(f"upload_profile_picture: Deleted old profile picture file: {old_picture_path}")
                            else:
                                logger.debug(f"upload_profile_picture: Old profile picture file not found: {old_picture_path}")
                        except Exception as e:
                            logger.warning(f"upload_profile_picture: Failed to delete old profile picture: {str(e)}")
                    
                    # Return success
                    profile_photo_url = user.profile_picture.url if user.profile_picture else None
                    logger.debug(f"upload_profile_picture: Base64 image saved successfully, URL: {profile_photo_url}")
                    
                    return Response({"profile_photo": profile_photo_url}, status=200)
                else:
                    logger.warning("upload_profile_picture: Received image_data that doesn't start with 'data:'")
                    return Response({
                        "error": "Invalid base64 image format. Must be a data URI."
                    }, status=400)
                    
            except Exception as e:
                logger.exception(f"upload_profile_picture: Error processing base64 image: {str(e)}")
                return Response({
                    "error": f"Error processing base64 image: {str(e)}"
                }, status=400)
        
        # Handle normal file upload case
        if 'profile_picture' in request.FILES:
            # Get the uploaded file
            profile_picture = request.FILES['profile_picture']
            logger.debug(f"upload_profile_picture: Received file: {profile_picture.name}, size: {profile_picture.size}, content_type: {profile_picture.content_type}")
            
            # Validate file type
            if not profile_picture.content_type.startswith('image/'):
                logger.warning(f"upload_profile_picture: Invalid file type: {profile_picture.content_type}")
                return Response({
                    "error": "Invalid file type. Please upload an image file."
                }, status=400)
            
            # Process the image if crop params provided
            if crop_params:
                try:
                    # Load the image from the uploaded file
                    image = Image.open(profile_picture)
                    
                    # Apply cropping
                    image = process_image_crop(image, crop_params)
                    
                    # Save the cropped image to a temporary file
                    img_byte_arr = io.BytesIO()
                    image.save(img_byte_arr, format='JPEG', quality=90)
                    img_byte_arr.seek(0)
                    
                    # Create a new InMemoryUploadedFile from the processed image
                    profile_picture = InMemoryUploadedFile(
                        img_byte_arr,
                        'profile_picture',
                        f"profile_{user.id}_{uuid.uuid4().hex}.jpg",
                        'image/jpeg',
                        img_byte_arr.getbuffer().nbytes,
                        None
                    )
                    
                    logger.debug(f"upload_profile_picture: Image cropped successfully")
                except Exception as e:
                    logger.warning(f"upload_profile_picture: Failed to crop image: {str(e)}")
            
            # Save the old profile picture path for deletion
            old_picture_path = None
            if user.profile_picture:
                # For S3 storage, we need to use the storage backend's delete method
                # instead of os.path operations
                old_picture_path = user.profile_picture.name if hasattr(user.profile_picture, 'name') else None

            # Save the file to the user's profile
            try:
                user.profile_picture = profile_picture
                user.save()
                logger.debug(f"upload_profile_picture: File saved successfully for user {user.id}")
            except Exception as e:
                logger.error(f"upload_profile_picture: Failed to save file: {str(e)}")
                return Response({
                    "error": "Failed to save image. Please try again."
                }, status=500)

            # Delete the old profile picture file if it exists
            if old_picture_path:
                try:
                    # Check if file exists before attempting to delete
                    if user.profile_picture.storage.exists(old_picture_path):
                        user.profile_picture.storage.delete(old_picture_path)
                        logger.debug(f"upload_profile_picture: Deleted old profile picture file: {old_picture_path}")
                    else:
                        logger.debug(f"upload_profile_picture: Old profile picture file not found: {old_picture_path}")
                except Exception as e:
                    logger.warning(f"upload_profile_picture: Failed to delete old profile picture: {str(e)}")
            
            # Return the URL of the uploaded image
            profile_photo_url = user.profile_picture.url if user.profile_picture else None
            logger.debug(f"upload_profile_picture: Returning profile photo URL: {profile_photo_url}")
            
            return Response({"profile_photo": profile_photo_url}, status=200)
        
        # No valid data found
        logger.warning(f"upload_profile_picture: No profile_picture in request.FILES and no image_data in request.data")
        return Response({
            "error": "No profile picture provided. Please upload an image file or provide base64 image data."
        }, status=400)
        
    except Exception as e:
        logger.exception(f"upload_profile_picture: Error processing request: {str(e)}")
        return Response({"error": f"An error occurred: {str(e)}"}, status=500)

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
import os
import base64
import uuid
import logging
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.exceptions import ValidationError

logger = logging.getLogger(__name__)

def validate_message_image(image_file):
    """
    Validates an uploaded image file for message attachments
    """
    # Check file size
    if image_file.size > settings.MAX_UPLOAD_SIZE:
        raise ValidationError(f'Image size must be no more than {settings.MAX_UPLOAD_SIZE/1024/1024}MB')
    
    # Check file type
    if image_file.content_type not in settings.ALLOWED_IMAGE_TYPES:
        raise ValidationError(f'Invalid image type. Allowed types: {", ".join(settings.ALLOWED_IMAGE_TYPES)}')

def message_image_path(instance, filename):
    """
    Generates a path for storing message images
    Format: message_images/conversation_id/uuid_filename.extension
    """
    # Get the file extension
    ext = filename.split('.')[-1].lower()
    
    # Generate a unique filename with UUID
    unique_filename = f"{uuid.uuid4().hex}.{ext}"
    
    # Get conversation ID for folder structure
    conversation_id = instance.conversation.conversation_id
    
    # Return the complete path
    return os.path.join('message_images', str(conversation_id), unique_filename)

def process_base64_image(base64_data, conversation_id=None):
    """
    Process base64 encoded image data and return a ContentFile
    
    Args:
        base64_data: Base64 encoded string (may include data URI prefix)
        conversation_id: Optional conversation ID for logging
    
    Returns:
        tuple: (ContentFile object, file extension)
    """
    try:
        # Handle data URI format (e.g., "data:image/jpeg;base64,/9j/4AAQ...")
        if ';base64,' in base64_data:
            header, base64_data = base64_data.split(';base64,')
            content_type = header.split(':')[1]
            file_ext = content_type.split('/')[1]
        else:
            # Default to jpeg if content type can't be determined
            file_ext = 'jpg'
        
        # Decode base64 data
        image_data = base64.b64decode(base64_data)
        
        # Create a ContentFile with the decoded data
        return ContentFile(image_data), file_ext
    
    except Exception as e:
        logger.error(f"Error processing base64 image for conversation {conversation_id}: {str(e)}")
        raise ValidationError("Invalid image data. Please upload a valid image.") 
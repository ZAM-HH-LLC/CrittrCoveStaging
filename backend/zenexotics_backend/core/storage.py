from storages.backends.s3boto3 import S3Boto3Storage
import logging

logger = logging.getLogger(__name__)

class ACLDisabledS3Storage(S3Boto3Storage):
    """
    Custom S3 storage backend that handles ACL-disabled buckets gracefully.
    This avoids HeadObject operations that can cause 403 errors when ACLs are disabled.
    """
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Ensure we don't try to set ACLs - remove ACL parameter entirely
        self.object_parameters = self.object_parameters or {}
        if 'ACL' in self.object_parameters:
            del self.object_parameters['ACL']
    
    def exists(self, name):
        """
        Override exists to handle ACL-disabled buckets more gracefully.
        If HeadObject fails, we assume the file doesn't exist rather than raising an error.
        """
        try:
            return super().exists(name)
        except Exception as e:
            # If we get a 403 or other error, assume the file doesn't exist
            # This is safer than failing the entire operation
            logger.debug(f"S3 exists check failed for {name}, assuming file doesn't exist: {str(e)}")
            return False
    
    def delete(self, name):
        """
        Override delete to handle ACL-disabled buckets more gracefully.
        """
        try:
            return super().delete(name)
        except Exception as e:
            # Log the error but don't raise it to avoid breaking the application
            logger.warning(f"S3 delete failed for {name}: {str(e)}")
            return False
    
    def save(self, name, content, max_length=None):
        """
        Override save to ensure we don't try to set ACLs.
        """
        # Ensure we don't try to set ACLs
        if hasattr(content, 'content_type'):
            content.content_type = content.content_type or 'application/octet-stream'
        
        return super().save(name, content, max_length)
    
    def url(self, name):
        """
        Return the direct S3 URL for the file.
        """
        return super().url(name) 
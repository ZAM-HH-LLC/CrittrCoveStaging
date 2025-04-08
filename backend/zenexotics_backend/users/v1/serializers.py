from rest_framework import serializers

# Note: The user_profile view now directly constructs the response dictionary
# rather than using a serializer. This file is kept for reference only.

class MinimalUserProfileSerializer(serializers.Serializer):
    """A minimal reference serializer - not currently in use.
    The user_profile endpoint now builds its response directly in the view."""
    id = serializers.IntegerField(read_only=True)
    email = serializers.EmailField(read_only=True)
    # Add other fields as needed if this serializer is used in the future 
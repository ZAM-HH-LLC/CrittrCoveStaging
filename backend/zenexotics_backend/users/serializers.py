from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework.validators import UniqueValidator
from django.contrib.auth.password_validation import validate_password
from .models import User, Waitlister, TutorialStatus, UserSettings

User = get_user_model()

class RegisterSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(
        required=True,
        validators=[UniqueValidator(queryset=User.objects.all())]
    )
    password = serializers.CharField(
        write_only=True, 
        required=True, 
        validators=[validate_password]
    )
    password2 = serializers.CharField(write_only=True, required=True)
    timezone = serializers.CharField(required=False, default='UTC')
    use_military_time = serializers.BooleanField(required=False, default=False)

    class Meta:
        model = User
        fields = ('email', 'password', 'password2', 'name', 'phone_number', 'timezone', 'use_military_time')
        extra_kwargs = {
            'name': {'required': True},
            'phone_number': {'required': True}
        }

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError(
                {"password": "Password fields didn't match."}
            )
        return attrs

    def create(self, validated_data):
        # Extract time settings
        timezone = validated_data.pop('timezone', 'UTC')
        use_military_time = validated_data.pop('use_military_time', False)
        
        # Remove password2 from validated_data
        validated_data.pop('password2')
        
        # Create the user
        user = User.objects.create_user(**validated_data)
        
        # Create user settings with the provided timezone
        UserSettings.objects.create(
            user=user,
            timezone=timezone,
            use_military_time=use_military_time
        )
        
        # Log the created settings for debugging
        print(f"Created user settings for {user.email}: timezone={timezone}, use_military_time={use_military_time}")
        
        return user

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'email', 'name', 'is_sitter', 'is_client',
            'approved_for_dogs', 'approved_for_cats', 'approved_for_exotics'
        ]

class TutorialStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = TutorialStatus
        fields = [
            'status_id',
            'done_client_tutorial',
            'done_pro_tutorial',
        ]
        read_only_fields = ['status_id']

class UserSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSettings
        fields = ['timezone', 'use_military_time']

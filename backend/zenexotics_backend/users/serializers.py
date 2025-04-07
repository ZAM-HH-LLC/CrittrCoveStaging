from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework.validators import UniqueValidator
from django.contrib.auth.password_validation import validate_password
from .models import User, Waitlister, TutorialStatus

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

    class Meta:
        model = User
        fields = ('email', 'password', 'password2', 'name', 'phone_number')
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
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
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
            'first_time_logging_in',
            'first_time_logging_in_after_signup',
            'done_pro_profile_tutorial',
            'done_client_profile_tutorial',
            'done_client_dashboard_tutorial',
            'done_pets_preferences_tutorial',
            'done_settings_payments_tutorial',
            'done_search_pros_tutorial',
            'done_become_pro_tutorial',
        ]
        read_only_fields = ['status_id']

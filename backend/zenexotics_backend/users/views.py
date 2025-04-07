from django.conf import settings  # Import settings
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
from .models import User
from .serializers import RegisterSerializer
import logging
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.contrib.auth import authenticate
from professional_status.models import ProfessionalStatus
from rest_framework import viewsets
from rest_framework.decorators import action
from .models import TutorialStatus
from .serializers import TutorialStatusSerializer


logger = logging.getLogger(__name__)

# Create your views here.

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        user = get_object_or_404(User, email=email)
        
        # Log the user ID
        logger.debug(f"Retrieved user: {user.email}, user_id: {user.user_id}")
        
        # Generate token
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.user_id))
        logger.debug(f"Encoded UID: {uid}")
        
        # Use the base URL from settings
        reset_link = f"{settings.FRONTEND_BASE_URL}/reset-password/{uid}/{token}/"
        
        # send email
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
        # Decode the user ID and get the user
        try:
            user_id = urlsafe_base64_decode(uidb64).decode()  # Decode to string
            user = get_object_or_404(User, user_id=user_id)  # Use user_id
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

        logger.debug(f"Change password request for user: {user.email}")
        logger.debug(f"Current password provided: {bool(current_password)}")
        logger.debug(f"New password provided: {bool(new_password)}")

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
        # Try to get professional status
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
            # If no professional status exists, return default values
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
        }, status=status.HTTP_200_OK)  # Return 200 even with error to prevent logout

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
        }, status=status.HTTP_200_OK)  # Return 200 even with error to prevent logout

class TutorialStatusViewSet(viewsets.ModelViewSet):
    serializer_class = TutorialStatusSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return TutorialStatus.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['GET'])
    def current(self, request):
        """Get current user's tutorial status"""
        tutorial_status, created = TutorialStatus.objects.get_or_create(
            user=request.user,
            defaults={
                'done_client_tutorial': False,
                'done_pro_tutorial': False,
            }
        )
        serializer = self.get_serializer(tutorial_status)
        return Response(serializer.data)

    @action(detail=False, methods=['PATCH'])
    def update_status(self, request):
        """Update specific tutorial status fields"""
        tutorial_status = TutorialStatus.objects.get(user=request.user)
        serializer = self.get_serializer(tutorial_status, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

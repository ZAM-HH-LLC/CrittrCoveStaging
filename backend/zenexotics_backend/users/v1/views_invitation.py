from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from ..models import Invitation, User
from ..serializers import InvitationSerializer
from core.common_checks import is_professional
from rest_framework.decorators import action
from rest_framework import generics

import logging
logger = logging.getLogger(__name__)

class InvitationListCreateView(APIView):
    """
    API endpoint for listing and creating invitations.
    For professional invites, only professionals can create invitations.
    For referrals, any authenticated user can create referrals.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """List all invitations created by the current user"""
        invitation_type = request.query_params.get('type', 'all')
        
        # Build the filter
        filters = {'inviter': request.user}
        
        # Filter by professional or referral
        if invitation_type == 'professional':
            filters['is_professional_invite'] = True
        elif invitation_type == 'referral':
            filters['is_professional_invite'] = False
            
        # Check if user is a professional when requesting professional invites
        if invitation_type == 'professional' and not is_professional(request.user):
            return Response(
                {"error": "Only professionals can view professional invitations"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get all invitations created by the current user
        invitations = Invitation.objects.filter(**filters).order_by('-created_at')
        serializer = InvitationSerializer(invitations, many=True, context={'request': request})
        
        return Response(serializer.data)
    
    def post(self, request):
        """Create a new invitation or referral"""
        # Determine if this is a professional invitation or referral
        is_professional_invite = request.data.get('is_professional_invite', True)
        
        # For professional invites, check if user is a professional
        if is_professional_invite and not is_professional(request.user):
            return Response(
                {"error": "Only professionals can create professional invitations"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get invitation details
        invitation_type = request.data.get('type', 'email')  # email or link
        referral_type = None
        
        # For referrals, get the referral type
        if not is_professional_invite:
            referral_type = request.data.get('referral_type')
            if not referral_type:
                return Response(
                    {"error": "Referral type is required for referrals"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Create invitation data
        invitation_data = {
            'invitation_type': invitation_type,
            'email': request.data.get('email', None) if invitation_type == 'email' else None,
            'is_professional_invite': is_professional_invite,
            'referral_type': referral_type
        }
        
        # Validate email if it's an email invitation
        if invitation_type == 'email' and not invitation_data['email']:
            return Response(
                {"error": "Email is required for email invitations"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create serializer
        serializer = InvitationSerializer(
            data=invitation_data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            try:
                invitation = serializer.save()
                
                # Send email for email invitations
                if invitation_type == 'email':
                    email_sent = False
                    email_error = None
                    
                    try:
                        if is_professional_invite:
                            self._send_professional_invitation_email(invitation)
                        else:
                            self._send_referral_email(invitation)
                        email_sent = True
                    except Exception as e:
                        logger.error(f"Failed to send invitation email: {e}")
                        email_error = str(e)
                        
                        # We'll handle this instead of deleting the invitation
                        # The frontend can retry sending the email later
                    
                    # Return appropriate response
                    if email_sent:
                        return Response(
                            {**serializer.data, "email_sent": True},
                            status=status.HTTP_201_CREATED
                        )
                    else:
                        # Return success for invitation creation but with email error
                        return Response(
                            {
                                **serializer.data, 
                                "email_sent": False,
                                "email_error": email_error,
                                "message": "Invitation created but email could not be sent. You can resend the email later."
                            },
                            status=status.HTTP_201_CREATED
                        )
                else:
                    # For link invitations, just return the data
                    return Response(
                        serializer.data,
                        status=status.HTTP_201_CREATED
                    )
            except Exception as e:
                logger.error(f"Error creating invitation: {e}")
                return Response(
                    {"error": f"Failed to create invitation: {str(e)}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )
    
    def _send_professional_invitation_email(self, invitation):
        """Send professional invitation email to the invitee"""
        try:
            invitation_link = f"{settings.FRONTEND_BASE_URL}/invite/{invitation.token}"
            
            context = {
                'inviter_name': invitation.inviter.name,
                'invitation_link': invitation_link,
                'days_valid': (invitation.expires_at - timezone.now()).days,
                'recipient_email': invitation.email
            }
            
            # Amazon-style email template with black text
            html_message = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>CrittrCove Invitation</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.5; color: #000000; max-width: 600px; margin: 0 auto; padding: 20px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                    <tr>
                        <td style="padding: 20px; text-align: center; background-color: #e7f2f2;">
                            <h1 style="color: #008080; margin: 0;">CrittrCove</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px 20px; color: #000000;">
                            <p style="color: #000000;">Hello,</p>
                            <p style="color: #000000;">{invitation.inviter.name} has invited you to join CrittrCove, a community that connects pet owners with trusted pet care professionals.</p>
                            <p style="margin-bottom: 25px; color: #000000;">Your invitation will expire in {context['days_valid']} days.</p>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="{invitation_link}" style="display: inline-block; background-color: #008080; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 16px;">Accept Invitation</a>
                            </div>
                            
                            <p style="color: #000000;">If the button above doesn't work, copy and paste this link into your browser:</p>
                            <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 12px; color: #000000;">{invitation_link}</p>
                            
                            <p style="color: #000000;">If you have any questions, please contact support@crittrcove.com.</p>
                            <p style="color: #000000;">Thank you,<br>The CrittrCove Team</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 20px; text-align: center; background-color: #f5f5f5; font-size: 12px; color: #666;">
                            <p style="color: #666;">This invitation was sent to {context['recipient_email']} at the request of {invitation.inviter.name}.</p>
                            <p style="color: #666;">If you received this email by mistake, you can safely ignore it.</p>
                            <p style="color: #666;">&copy; 2025 CrittrCove. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
            """
            
            plain_message = strip_tags(html_message)
            
            logger.info(f"Attempting to send invitation email to {invitation.email}")
            logger.info(f"Email settings: BACKEND={settings.EMAIL_BACKEND}, HOST={settings.EMAIL_HOST}, PORT={settings.EMAIL_PORT}, TLS={settings.EMAIL_USE_TLS}, USER={settings.EMAIL_HOST_USER}")
            logger.info(f"From email: {settings.DEFAULT_FROM_EMAIL}")
            
            send_mail(
                subject=f"Invitation from {invitation.inviter.name} to join CrittrCove",
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[invitation.email],
                html_message=html_message,
                fail_silently=False
            )
            
            logger.info(f"Professional invitation email sent to {invitation.email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send professional invitation email: {str(e)}")
            logger.exception(e)
            raise e
    
    def _send_referral_email(self, invitation):
        """Send referral email"""
        try:
            invitation_link = f"{settings.FRONTEND_BASE_URL}/invite/{invitation.token}"
            
            context = {
                'inviter_name': invitation.inviter.name,
                'invitation_link': invitation_link,
                'recipient_email': invitation.email,
                'days_valid': (invitation.expires_at - timezone.now()).days
            }
            
            # Amazon-style email template with black text
            html_message = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>CrittrCove Referral</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.5; color: #000000; max-width: 600px; margin: 0 auto; padding: 20px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                    <tr>
                        <td style="padding: 20px; text-align: center; background-color: #e7f2f2;">
                            <h1 style="color: #008080; margin: 0;">CrittrCove</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px 20px; color: #000000;">
                            <p style="color: #000000;">Hello,</p>
                            <p style="color: #000000;">{invitation.inviter.name} thinks you'll love CrittrCove and has sent you a referral.</p>
                            <p style="margin-bottom: 25px; color: #000000;">CrittrCove helps pet owners connect with trusted pet care professionals. Your referral will expire in {context['days_valid']} days.</p>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="{invitation_link}" style="display: inline-block; background-color: #008080; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 16px;">Join CrittrCove</a>
                            </div>
                            
                            <p style="color: #000000;">If the button above doesn't work, copy and paste this link into your browser:</p>
                            <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 12px; color: #000000;">{invitation_link}</p>
                            
                            <p style="color: #000000;">If you have any questions, please contact support@crittrcove.com.</p>
                            <p style="color: #000000;">Thank you,<br>The CrittrCove Team</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 20px; text-align: center; background-color: #f5f5f5; font-size: 12px; color: #666;">
                            <p style="color: #666;">This referral was sent to {invitation.email} at the request of {invitation.inviter.name}.</p>
                            <p style="color: #666;">If you received this email by mistake, you can safely ignore it.</p>
                            <p style="color: #666;">&copy; 2025 CrittrCove. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
            """
            
            plain_message = strip_tags(html_message)
            
            logger.info(f"Attempting to send referral email to {invitation.email}")
            logger.info(f"Email settings: BACKEND={settings.EMAIL_BACKEND}, HOST={settings.EMAIL_HOST}, PORT={settings.EMAIL_PORT}, TLS={settings.EMAIL_USE_TLS}, USER={settings.EMAIL_HOST_USER}")
            logger.info(f"From email: {settings.DEFAULT_FROM_EMAIL}")
            
            send_mail(
                subject=f"{invitation.inviter.name} has referred you to CrittrCove",
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[invitation.email],
                html_message=html_message,
                fail_silently=False
            )
            
            logger.info(f"Referral email sent to {invitation.email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send referral email: {str(e)}")
            logger.exception(e)
            raise e

class InvitationDetailView(APIView):
    """
    API endpoint for retrieving, updating, or deleting a specific invitation.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, token):
        """Get details of a specific invitation"""
        invitation = get_object_or_404(Invitation, token=token)
        
        # Only the inviter or the invitee (via email) can view the invitation
        if (invitation.inviter != request.user and 
            (invitation.email and invitation.email != request.user.email)):
            return Response(
                {"error": "You do not have permission to view this invitation"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = InvitationSerializer(invitation, context={'request': request})
        return Response(serializer.data)
    
    def delete(self, request, token):
        """Cancel an invitation"""
        invitation = get_object_or_404(Invitation, token=token)
        
        # Only the inviter can delete the invitation
        if invitation.inviter != request.user:
            return Response(
                {"error": "You do not have permission to cancel this invitation"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        invitation.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def verify_invitation(request, token):
    """
    API endpoint to verify if an invitation is valid.
    Does not require authentication.
    """
    try:
        invitation = Invitation.objects.get(token=token)
    except Invitation.DoesNotExist:
        return Response(
            {"valid": False, "error": "Invitation not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Check if the invitation is valid
    if invitation.is_accepted:
        return Response(
            {"valid": False, "error": "Invitation has already been used"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if timezone.now() > invitation.expires_at:
        return Response(
            {"valid": False, "error": "Invitation has expired"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Return the invitation details
    return Response({
        "valid": True,
        "inviter_name": invitation.inviter.name,
        "invitation_type": invitation.invitation_type,
        "email": invitation.email,
        "days_remaining": (invitation.expires_at - timezone.now()).days
    })

@api_view(['POST'])
def accept_invitation(request, token):
    """
    API endpoint to accept an invitation or referral.
    Requires the user to be authenticated.
    """
    # Check if user is authenticated
    if not request.user.is_authenticated:
        return Response(
            {"error": "You must be logged in to accept an invitation"},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    try:
        invitation = Invitation.objects.get(token=token)
    except Invitation.DoesNotExist:
        return Response(
            {"error": "Invitation not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Check if the invitation is valid
    if invitation.is_accepted:
        return Response(
            {"error": "Invitation has already been used"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if timezone.now() > invitation.expires_at:
        return Response(
            {"error": "Invitation has expired"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Email invitations should only be accepted by the invited email
    if invitation.invitation_type == 'email' and invitation.email != request.user.email:
        return Response(
            {"error": "This invitation was sent to a different email address"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Mark the invitation as accepted
    invitation.is_accepted = True
    invitation.accepted_at = timezone.now()
    invitation.invitee = request.user
    invitation.save()
    
    # Process the invitation based on type
    if invitation.is_professional_invite:
        return _handle_professional_invitation(invitation, request.user)
    else:
        return _handle_referral(invitation, request.user)

def _handle_professional_invitation(invitation, user):
    """Process a professional invitation acceptance"""
    from clients.models import Client
    from professionals.models import Professional
    
    try:
        # Get or create client profile
        client, created = Client.objects.get_or_create(user=user)
        
        # Set the invited_by field to link to the professional who sent the invitation
        try:
            professional = Professional.objects.get(user=invitation.inviter)
            client.invited_by = professional
            client.save()
            logger.info(f"Set invited_by for client {client.id} to professional {professional.id}")
        except Professional.DoesNotExist:
            logger.warning(f"Could not set invited_by: Professional profile not found for user {invitation.inviter.id}")
        
        # TODO: Create connection between client and professional
        # This depends on how connections are implemented in your app
        
        return Response({
            "success": True,
            "message": f"You are now connected with {invitation.inviter.name}"
        })
    except Exception as e:
        logger.error(f"Error creating client-professional connection: {e}")
        return Response(
            {"error": "An error occurred while accepting the invitation"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

def _handle_referral(invitation, user):
    """Process a referral acceptance"""
    try:
        # Update the reward status if needed
        invitation.reward_status = 'awarded'
        invitation.save()
        
        # TODO: Add any referral reward logic here
        # This might involve creating rewards for the referrer
        
        return Response({
            "success": True,
            "message": f"Thank you for accepting {invitation.inviter.name}'s referral!"
        })
    except Exception as e:
        logger.error(f"Error processing referral: {e}")
        return Response(
            {"error": "An error occurred while processing the referral"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def resend_invitation_email(request, token):
    """
    API endpoint to resend an invitation email.
    """
    invitation = get_object_or_404(Invitation, token=token)
    
    # Only the inviter can resend the invitation
    if invitation.inviter != request.user:
        return Response(
            {"error": "You do not have permission to resend this invitation"},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Check if it's an email invitation
    if invitation.invitation_type != 'email' or not invitation.email:
        return Response(
            {"error": "This is not an email invitation"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Check if the invitation is still valid
    if invitation.is_accepted:
        return Response(
            {"error": "This invitation has already been accepted"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if timezone.now() > invitation.expires_at:
        return Response(
            {"error": "This invitation has expired"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Resend the invitation email
    try:
        invitation_link = f"{settings.FRONTEND_BASE_URL}/invite/{invitation.token}"
        
        context = {
            'inviter_name': invitation.inviter.name,
            'invitation_link': invitation_link,
            'days_valid': (invitation.expires_at - timezone.now()).days,
            'recipient_email': invitation.email
        }
        
        # Amazon-style email template with black text
        html_message = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>CrittrCove Invitation</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.5; color: #000000; max-width: 600px; margin: 0 auto; padding: 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                <tr>
                    <td style="padding: 20px; text-align: center; background-color: #e7f2f2;">
                        <h1 style="color: #008080; margin: 0;">CrittrCove</h1>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 30px 20px; color: #000000;">
                        <p style="color: #000000;">Hello,</p>
                        <p style="color: #000000;">{invitation.inviter.name} has invited you to join CrittrCove, a community that connects pet owners with trusted pet care professionals.</p>
                        <p style="margin-bottom: 25px; color: #000000;">Your invitation will expire in {context['days_valid']} days.</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="{invitation_link}" style="display: inline-block; background-color: #008080; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 16px;">Accept Invitation</a>
                        </div>
                        
                        <p style="color: #000000;">If the button above doesn't work, copy and paste this link into your browser:</p>
                        <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 12px; color: #000000;">{invitation_link}</p>
                        
                        <p style="color: #000000;">If you have any questions, please contact support@crittrcove.com.</p>
                        <p style="color: #000000;">Thank you,<br>The CrittrCove Team</p>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 20px; text-align: center; background-color: #f5f5f5; font-size: 12px; color: #666;">
                        <p style="color: #666;">This invitation was sent to {context['recipient_email']} at the request of {invitation.inviter.name}.</p>
                        <p style="color: #666;">If you received this email by mistake, you can safely ignore it.</p>
                        <p style="color: #666;">&copy; 2025 CrittrCove. All rights reserved.</p>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """
        
        plain_message = strip_tags(html_message)
        
        logger.info(f"Attempting to resend invitation email to {invitation.email}")
        
        send_mail(
            subject=f"Invitation from {invitation.inviter.name} to join CrittrCove",
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[invitation.email],
            html_message=html_message,
            fail_silently=False
        )
        
        logger.info(f"Invitation email resent to {invitation.email}")
        
        return Response({
            "success": True,
            "message": f"Invitation email resent to {invitation.email}"
        })
    except Exception as e:
        logger.error(f"Failed to resend invitation email: {e}")
        return Response(
            {"error": "Failed to resend invitation email"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

class InvitationRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    """Handle retrieve, update, destroy operations for invitations"""
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=True, methods=['post'])
    def resend_email(self, request, pk=None):
        """Resend the invitation email for an existing invitation"""
        try:
            invitation = self.get_object()
            
            # Check if this is an email invitation
            if invitation.invitation_type != 'email':
                return Response(
                    {"error": "Can only resend email for email invitations"},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            email_sent = False
            email_error = None
            
            try:
                logger.info(f"Attempting to resend invitation email to {invitation.email}")
                
                if invitation.is_professional_invite:
                    self._send_professional_invitation_email(invitation)
                else:
                    self._send_referral_email(invitation)
                    
                email_sent = True
                logger.info(f"Successfully resent invitation email to {invitation.email}")
            except Exception as e:
                logger.error(f"Failed to resend invitation email to {invitation.email}: {e}")
                email_error = str(e)
            
            if email_sent:
                return Response(
                    {"message": "Invitation email successfully resent", "email_sent": True},
                    status=status.HTTP_200_OK
                )
            else:
                return Response(
                    {
                        "email_sent": False,
                        "email_error": email_error,
                        "message": "Failed to resend invitation email"
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        except Exception as e:
            logger.error(f"Error in resend_email: {e}")
            return Response(
                {"error": f"Failed to process resend request: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    def _send_professional_invitation_email(self, invitation):
        """Send professional invitation email"""
        try:
            invitation_link = f"{settings.FRONTEND_BASE_URL}/invite/{invitation.token}"
            
            context = {
                'inviter_name': invitation.inviter.name,
                'invitation_link': invitation_link,
                'days_valid': (invitation.expires_at - timezone.now()).days
            }
            
            # Amazon-style email template with black text
            html_message = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>CrittrCove Invitation</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.5; color: #000000; max-width: 600px; margin: 0 auto; padding: 20px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                    <tr>
                        <td style="padding: 20px; text-align: center; background-color: #e7f2f2;">
                            <h1 style="color: #008080; margin: 0;">CrittrCove</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px 20px; color: #000000;">
                            <p style="color: #000000;">Hello,</p>
                            <p style="color: #000000;">{invitation.inviter.name} has invited you to join CrittrCove, a community that connects pet owners with trusted pet care professionals.</p>
                            <p style="margin-bottom: 25px; color: #000000;">Your invitation will expire in {context['days_valid']} days.</p>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="{invitation_link}" style="display: inline-block; background-color: #008080; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 16px;">Accept Invitation</a>
                            </div>
                            
                            <p style="color: #000000;">If the button above doesn't work, copy and paste this link into your browser:</p>
                            <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 12px; color: #000000;">{invitation_link}</p>
                            
                            <p style="color: #000000;">If you have any questions, please contact support@crittrcove.com.</p>
                            <p style="color: #000000;">Thank you,<br>The CrittrCove Team</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 20px; text-align: center; background-color: #f5f5f5; font-size: 12px; color: #666;">
                            <p style="color: #666;">This invitation was sent to {invitation.email} at the request of {invitation.inviter.name}.</p>
                            <p style="color: #666;">If you received this email by mistake, you can safely ignore it.</p>
                            <p style="color: #666;">&copy; 2025 CrittrCove. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
            """
            
            plain_message = strip_tags(html_message)
            
            logger.info(f"Attempting to send invitation email to {invitation.email}")
            logger.info(f"Email settings: BACKEND={settings.EMAIL_BACKEND}, HOST={settings.EMAIL_HOST}, PORT={settings.EMAIL_PORT}, TLS={settings.EMAIL_USE_TLS}, USER={settings.EMAIL_HOST_USER}")
            logger.info(f"From email: {settings.DEFAULT_FROM_EMAIL}")
            
            send_mail(
                subject=f"{invitation.inviter.name} has invited you to CrittrCove",
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[invitation.email],
                html_message=html_message,
                fail_silently=False
            )
            
            logger.info(f"Professional invitation email sent to {invitation.email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send professional invitation email: {str(e)}")
            logger.exception(e)
            raise e
    
    def _send_referral_email(self, invitation):
        """Send referral email"""
        try:
            invitation_link = f"{settings.FRONTEND_BASE_URL}/invite/{invitation.token}"
            
            context = {
                'inviter_name': invitation.inviter.name,
                'invitation_link': invitation_link,
                'recipient_email': invitation.email,
                'days_valid': (invitation.expires_at - timezone.now()).days
            }
            
            # Amazon-style email template with black text
            html_message = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>CrittrCove Referral</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.5; color: #000000; max-width: 600px; margin: 0 auto; padding: 20px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                    <tr>
                        <td style="padding: 20px; text-align: center; background-color: #e7f2f2;">
                            <h1 style="color: #008080; margin: 0;">CrittrCove</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px 20px; color: #000000;">
                            <p style="color: #000000;">Hello,</p>
                            <p style="color: #000000;">{invitation.inviter.name} thinks you'll love CrittrCove and has sent you a referral.</p>
                            <p style="margin-bottom: 25px; color: #000000;">CrittrCove helps pet owners connect with trusted pet care professionals. Your referral will expire in {context['days_valid']} days.</p>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="{invitation_link}" style="display: inline-block; background-color: #008080; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 16px;">Join CrittrCove</a>
                            </div>
                            
                            <p style="color: #000000;">If the button above doesn't work, copy and paste this link into your browser:</p>
                            <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 12px; color: #000000;">{invitation_link}</p>
                            
                            <p style="color: #000000;">If you have any questions, please contact support@crittrcove.com.</p>
                            <p style="color: #000000;">Thank you,<br>The CrittrCove Team</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 20px; text-align: center; background-color: #f5f5f5; font-size: 12px; color: #666;">
                            <p style="color: #666;">This referral was sent to {invitation.email} at the request of {invitation.inviter.name}.</p>
                            <p style="color: #666;">If you received this email by mistake, you can safely ignore it.</p>
                            <p style="color: #666;">&copy; 2025 CrittrCove. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
            """
            
            plain_message = strip_tags(html_message)
            
            logger.info(f"Attempting to send referral email to {invitation.email}")
            logger.info(f"Email settings: BACKEND={settings.EMAIL_BACKEND}, HOST={settings.EMAIL_HOST}, PORT={settings.EMAIL_PORT}, TLS={settings.EMAIL_USE_TLS}, USER={settings.EMAIL_HOST_USER}")
            logger.info(f"From email: {settings.DEFAULT_FROM_EMAIL}")
            
            send_mail(
                subject=f"{invitation.inviter.name} has referred you to CrittrCove",
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[invitation.email],
                html_message=html_message,
                fail_silently=False
            )
            
            logger.info(f"Referral email sent to {invitation.email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send referral email: {str(e)}")
            logger.exception(e)
            raise e 
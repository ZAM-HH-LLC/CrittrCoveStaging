from django.shortcuts import render
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db import transaction
from django.shortcuts import get_object_or_404

from .models import ClientReview, ProfessionalReview, ReviewRequest
from .serializers import ClientReviewSerializer, ProfessionalReviewSerializer, ReviewRequestSerializer
from core.common_checks import is_professional, owns_service
from users.models import User
from bookings.models import Booking


class ReviewRequestViewSet(viewsets.ModelViewSet):
    """
    API endpoint for review requests
    """
    queryset = ReviewRequest.objects.all()
    serializer_class = ReviewRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter review requests to only show those for the current user"""
        user = self.request.user
        return ReviewRequest.objects.filter(user=user)
    
    @action(detail=True, methods=['post'])
    def mark_completed(self, request, pk=None):
        """Mark a review request as completed"""
        review_request = self.get_object()
        
        # Check if this user owns this review request
        if review_request.user != request.user:
            return Response(
                {"detail": "You do not have permission to mark this review request as completed."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        review_request.mark_completed()
        return Response({"status": "review request marked as completed"})


class ClientReviewViewSet(viewsets.ModelViewSet):
    """
    API endpoint for client reviews (reviews about professionals)
    """
    queryset = ClientReview.objects.all()
    serializer_class = ClientReviewSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        Filter reviews based on user role:
        - Clients see their own reviews they've written
        - Professionals see reviews about them
        - Staff see all reviews
        """
        user = self.request.user
        
        if user.is_staff:
            return ClientReview.objects.all()
        
        if is_professional(user):
            # Professionals see reviews about them
            return ClientReview.objects.filter(professional__user=user)
        else:
            # Clients see reviews they've written
            return ClientReview.objects.filter(client__user=user)
    
    def create(self, request, *args, **kwargs):
        """Create a new client review"""
        # Get the review request if provided
        request_id = request.data.get('request_id')
        
        with transaction.atomic():
            # Create the review
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            # Check if the user is the client in the booking
            booking_id = serializer.validated_data.get('booking').booking_id
            booking = get_object_or_404(Booking, booking_id=booking_id)
            
            if booking.client.user != request.user:
                return Response(
                    {"detail": "You can only review bookings you participated in as a client."},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Create the review
            review = serializer.save()
            
            # If there was a review request, mark it as completed
            if request_id:
                try:
                    review_request = ReviewRequest.objects.get(
                        request_id=request_id,
                        user=request.user,
                        review_type='CLIENT'
                    )
                    review_request.mark_completed()
                except ReviewRequest.DoesNotExist:
                    pass
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def moderate(self, request, pk=None):
        """
        Moderate a review (approve or reject)
        Only staff members can moderate reviews
        """
        review = self.get_object()
        action = request.data.get('action', '').upper()
        reason = request.data.get('reason', '')
        
        if action not in ['APPROVE', 'REJECT']:
            return Response(
                {"detail": "Invalid action. Must be 'APPROVE' or 'REJECT'."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            if action == 'APPROVE':
                review.status = 'APPROVED'
                review.review_visible = True
                review.moderation_reason = None
            else:  # REJECT
                review.status = 'REJECTED'
                review.review_visible = False
                review.moderation_reason = reason
            
            review.moderated_by = request.user
            review.save()
            
            return Response({
                "status": f"Review {review.review_id} has been {action.lower()}ed",
                "review_id": review.review_id
            })


class ProfessionalReviewViewSet(viewsets.ModelViewSet):
    """
    API endpoint for professional reviews (reviews about clients)
    """
    queryset = ProfessionalReview.objects.all()
    serializer_class = ProfessionalReviewSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        Filter reviews based on user role:
        - Professionals see their own reviews they've written
        - Clients see reviews about them
        - Staff see all reviews
        """
        user = self.request.user
        
        if user.is_staff:
            return ProfessionalReview.objects.all()
        
        if is_professional(user):
            # Professionals see reviews they've written
            return ProfessionalReview.objects.filter(professional__user=user)
        else:
            # Clients see reviews about them
            return ProfessionalReview.objects.filter(client__user=user)
    
    def create(self, request, *args, **kwargs):
        """Create a new professional review"""
        # Get the review request if provided
        request_id = request.data.get('request_id')
        
        with transaction.atomic():
            # Create the review
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            # Check if the user is the professional in the booking
            booking_id = serializer.validated_data.get('booking').booking_id
            booking = get_object_or_404(Booking, booking_id=booking_id)
            
            if booking.professional.user != request.user:
                return Response(
                    {"detail": "You can only review bookings you participated in as a professional."},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Create the review
            review = serializer.save()
            
            # If there was a review request, mark it as completed
            if request_id:
                try:
                    review_request = ReviewRequest.objects.get(
                        request_id=request_id,
                        user=request.user,
                        review_type='PROFESSIONAL'
                    )
                    review_request.mark_completed()
                except ReviewRequest.DoesNotExist:
                    pass
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def moderate(self, request, pk=None):
        """
        Moderate a review (approve or reject)
        Only staff members can moderate reviews
        """
        review = self.get_object()
        action = request.data.get('action', '').upper()
        reason = request.data.get('reason', '')
        
        if action not in ['APPROVE', 'REJECT']:
            return Response(
                {"detail": "Invalid action. Must be 'APPROVE' or 'REJECT'."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            if action == 'APPROVE':
                review.status = 'APPROVED'
                review.review_visible = True
                review.moderation_reason = None
            else:  # REJECT
                review.status = 'REJECTED'
                review.review_visible = False
                review.moderation_reason = reason
            
            review.moderated_by = request.user
            review.save()
            
            return Response({
                "status": f"Review {review.review_id} has been {action.lower()}ed",
                "review_id": review.review_id
            })

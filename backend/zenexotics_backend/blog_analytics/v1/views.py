from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.utils import timezone
from django.db import transaction
from decimal import Decimal
import hashlib
import json
import logging

from ..models import BlogVisitor

logger = logging.getLogger(__name__)


def get_client_ip(request):
    """Extract client IP address from request."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def create_session_hash(request, user_agent=''):
    """Create an anonymous session hash for tracking."""
    ip = get_client_ip(request)
    session_key = request.session.session_key or 'anonymous'
    
    # Create a hash from IP + session + user agent (for anonymous tracking)
    session_data = f"{ip}_{session_key}_{user_agent}_crittr_blog"
    return hashlib.sha256(session_data.encode('utf-8')).hexdigest()


@api_view(['POST'])
@permission_classes([AllowAny])  # Allow anonymous tracking
def track_blog_visitor(request):
    """
    Track anonymous blog visitors for marketing analytics.
    
    Expected payload:
    {
        "latitude": 39.7392,
        "longitude": -104.9903,
        "page": "/blog/post-1",
        "referrer": "https://google.com",
        "user_agent": "Mozilla/5.0..."
    }
    """
    try:
        data = request.data
        
        # Extract location data
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        
        # Validate coordinates if provided
        if latitude is not None:
            try:
                latitude = Decimal(str(latitude))
                if not (-90 <= latitude <= 90):
                    latitude = None
            except (ValueError, TypeError):
                latitude = None
                
        if longitude is not None:
            try:
                longitude = Decimal(str(longitude))
                if not (-180 <= longitude <= 180):
                    longitude = None
            except (ValueError, TypeError):
                longitude = None
        
        # Extract other data
        page = data.get('page', '')[:500]  # Increased limit for query params
        referrer = data.get('referrer', '') or ''  # Handle None/empty referrer
        user_agent = data.get('user_agent', '') or ''
        
        # Get IP address
        ip_address = get_client_ip(request)
        
        # Create session hash for anonymous tracking
        session_hash = create_session_hash(request, user_agent)
        
        # Check for duplicate tracking (same session, same page within 5 minutes)
        recent_visit = BlogVisitor.objects.filter(
            session_hash=session_hash,
            page=page,
            visited_at__gte=timezone.now() - timezone.timedelta(minutes=5)
        ).first()
        
        if recent_visit:
            logger.info(f"Duplicate blog visit detected for session {session_hash[:8]}... on page {page}")
            return Response({
                'status': 'duplicate',
                'message': 'Visit already tracked recently'
            }, status=status.HTTP_200_OK)
        
        # Create visitor record
        with transaction.atomic():
            visitor = BlogVisitor.objects.create(
                latitude=latitude,
                longitude=longitude,
                page=page,
                referrer=referrer[:500] if referrer else '',  # Limit referrer length
                user_agent=user_agent[:1000] if user_agent else '',  # Limit user agent length
                ip_address=ip_address,
                session_hash=session_hash,
                visited_at=timezone.now(),
                metadata={
                    'tracking_source': 'blog_cta',
                    'timestamp': timezone.now().isoformat(),
                }
            )
        
        logger.info(f"Blog visitor tracked: {visitor.id} from {visitor.city or 'unknown'}, {visitor.state or 'unknown'}")
        
        return Response({
            'status': 'success',
            'message': 'Visitor tracked successfully',
            'visitor_id': visitor.id,
            'is_colorado_springs': visitor.is_colorado_springs
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"Error tracking blog visitor: {str(e)}")
        return Response({
            'status': 'error',
            'message': 'Failed to track visitor'
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([AllowAny])
def blog_analytics_summary(request):
    """
    Get basic blog analytics summary (public endpoint for marketing insights).
    
    Returns aggregated data without personal information.
    """
    try:
        from django.db.models import Count, Q
        from datetime import datetime, timedelta
        
        # Get date range (last 30 days by default)
        days = int(request.GET.get('days', 30))
        if days > 365:  # Limit to 1 year max
            days = 365
            
        since_date = timezone.now() - timedelta(days=days)
        
        # Get aggregated stats
        total_visitors = BlogVisitor.objects.filter(
            visited_at__gte=since_date
        ).count()
        
        colorado_springs_visitors = BlogVisitor.objects.filter(
            visited_at__gte=since_date,
            is_colorado_springs=True
        ).count()
        
        colorado_visitors = BlogVisitor.objects.filter(
            visited_at__gte=since_date,
            state__icontains='colorado'
        ).count()
        
        unique_sessions = BlogVisitor.objects.filter(
            visited_at__gte=since_date
        ).values('session_hash').distinct().count()
        
        # Top pages
        top_pages = BlogVisitor.objects.filter(
            visited_at__gte=since_date
        ).values('page').annotate(
            count=Count('id')
        ).order_by('-count')[:10]
        
        # States breakdown
        states = BlogVisitor.objects.filter(
            visited_at__gte=since_date,
            state__isnull=False
        ).exclude(state='').values('state').annotate(
            count=Count('id')
        ).order_by('-count')[:10]
        
        return Response({
            'period_days': days,
            'total_visitors': total_visitors,
            'colorado_springs_visitors': colorado_springs_visitors,
            'colorado_visitors': colorado_visitors,
            'unique_sessions': unique_sessions,
            'colorado_springs_percentage': round(
                (colorado_springs_visitors / total_visitors * 100) if total_visitors > 0 else 0, 1
            ),
            'top_pages': list(top_pages),
            'top_states': list(states),
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error getting blog analytics summary: {str(e)}")
        return Response({
            'error': 'Failed to get analytics summary'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
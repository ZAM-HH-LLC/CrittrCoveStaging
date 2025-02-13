from rest_framework import serializers
from .models import Booking
from pets.models import Pet
from decimal import Decimal
from .constants import BookingStates
from booking_details.models import BookingDetails
from .utils import is_holiday, count_holidays
import logging

logger = logging.getLogger(__name__)

class BookingListSerializer(serializers.ModelSerializer):
    client_name = serializers.SerializerMethodField()
    professional_name = serializers.SerializerMethodField()
    service_name = serializers.SerializerMethodField()
    start_date = serializers.SerializerMethodField()
    start_time = serializers.SerializerMethodField()
    total_client_cost = serializers.SerializerMethodField()
    total_sitter_payout = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            'booking_id',
            'client_name',
            'professional_name',
            'service_name',
            'start_date',
            'start_time',
            'total_client_cost',
            'total_sitter_payout',
            'status'
        ]

    def get_client_name(self, obj):
        return obj.client.user.name if obj.client else None

    def get_professional_name(self, obj):
        return obj.professional.user.name if obj.professional else None
    
    def get_service_name(self, obj):
        return obj.service_id.service_name if obj.service_id else None
    
    def get_start_date(self, obj):
        # Get the first occurrence for this booking
        first_occurrence = obj.occurrences.order_by('start_date', 'start_time').first()
        return first_occurrence.start_date if first_occurrence else None
    
    def get_start_time(self, obj):
        # Get the first occurrence for this booking
        first_occurrence = obj.occurrences.order_by('start_date', 'start_time').first()
        return first_occurrence.start_time if first_occurrence else None

    def get_total_client_cost(self, obj):
        try:
            if hasattr(obj, 'bookingsummary'):
                return float(obj.bookingsummary.total_client_cost)
        except:
            pass
        return 0.00

    def get_total_sitter_payout(self, obj):
        try:
            if hasattr(obj, 'bookingsummary'):
                return float(obj.bookingsummary.total_sitter_payout)
        except:
            pass
        return 0.00

class PetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pet
        fields = ['pet_id', 'name', 'species', 'breed']

class BookingDetailSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.user.name')
    professional_name = serializers.CharField(source='professional.user.name')
    service_details = serializers.SerializerMethodField()
    pets = serializers.SerializerMethodField()
    occurrences = serializers.SerializerMethodField()
    cost_summary = serializers.SerializerMethodField()
    original_status = serializers.CharField(required=False, read_only=True)
    can_edit = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            'booking_id',
            'status',
            'client_name',
            'professional_name',
            'service_details',
            'pets',
            'occurrences',
            'cost_summary',
            'original_status',
            'can_edit'
        ]

    def get_can_edit(self, obj):
        context = self.context
        is_professional = context.get('is_professional', False)
        professional = context.get('professional', None)
        
        # If not a professional view, can't edit
        if not is_professional:
            return False
            
        # Check if the current professional is the booking's professional
        if not professional or professional != obj.professional:
            return False
            
        # Check if status allows professional edits
        return BookingStates.can_professional_edit(obj.status)

    def to_representation(self, instance):
        """Override to conditionally include original_status"""
        data = super().to_representation(instance)
        if hasattr(instance, 'original_status'):
            data['original_status'] = instance.original_status
        return data

    def get_service_details(self, obj):
        return {
            'service_type': obj.service_id.service_name if obj.service_id else None
        }

    def get_pets(self, obj):
        return [
            {
                'pet_id': bp.pet.pet_id,
                'name': bp.pet.name,
                'species': bp.pet.species,
                'breed': bp.pet.breed
            }
            for bp in obj.booking_pets.select_related('pet').all()
        ]

    def get_occurrences(self, obj):
        is_prorated = self.context.get('is_prorated', True)
        occurrences = []
        logger.info(f"\nProcessing occurrences for booking {obj.booking_id}:")

        for occ in obj.occurrences.prefetch_related('booking_details', 'rates').all():
            booking_details = occ.booking_details.first()
            if not booking_details:
                logger.warning(f"  No booking details found for occurrence {occ.occurrence_id}")
                continue

            logger.info(f"\n  Processing occurrence {occ.occurrence_id}:")
            # Get base_total from booking details calculated cost
            base_total = booking_details.calculate_occurrence_cost(is_prorated)
            logger.info(f"  Base total from booking details: ${base_total}")

            # Get additional rates and their sum
            additional_rates = []
            additional_rates_total = Decimal('0')
            if hasattr(occ, 'rates') and occ.rates.rates:
                logger.info("  Processing additional rates:")
                for rate in occ.rates.rates:
                    if rate['title'] != 'Base Rate':  # Only exclude base rate
                        rate_amount = Decimal(rate['amount'].replace('$', '').strip())
                        logger.info(f"    Rate: {rate['title']}, Amount: ${rate_amount}")
                        additional_rates.append({
                            'title': rate['title'],
                            'description': rate.get('description', ''),
                            'amount': f"${rate_amount}"
                        })
                        additional_rates_total += rate_amount

            # Total cost is base_total plus sum of all additional rates
            total_cost = base_total + additional_rates_total
            logger.info(f"  Additional rates total: ${additional_rates_total}")
            logger.info(f"  Final total cost: ${total_cost}")

            occurrences.append({
                'occurrence_id': occ.occurrence_id,
                'start_date': occ.start_date,
                'end_date': occ.end_date,
                'start_time': occ.start_time.strftime('%H:%M') if occ.start_time else None,
                'end_time': occ.end_time.strftime('%H:%M') if occ.end_time else None,
                'calculated_cost': f"{total_cost:.2f}",
                'base_total': f"${base_total:.2f}",
                'rates': self.get_occurrence_rates(occ, booking_details, additional_rates)
            })

        return occurrences

    def get_occurrence_rates(self, occurrence, booking_details, additional_rates):
        if not booking_details:
            return {}

        # Count number of pets for this booking
        num_pets = occurrence.booking.booking_pets.count()
        
        # Check if additional animal rate applies
        additional_animal_rate_applies = num_pets > booking_details.applies_after if booking_details.applies_after else False
        
        # Count holiday days in the occurrence range
        holiday_days = count_holidays(occurrence.start_date, occurrence.end_date)
        
        return {
            'base_rate': str(booking_details.base_rate),
            'additional_animal_rate': str(booking_details.additional_pet_rate),
            'additional_animal_rate_applies': additional_animal_rate_applies,
            'applies_after': booking_details.applies_after,
            'unit_of_time': occurrence.booking.service_id.unit_of_time,
            'holiday_rate': str(booking_details.holiday_rate),
            'holiday_days': holiday_days,
            'additional_rates': additional_rates
        }

    def get_cost_summary(self, obj):
        is_prorated = self.context.get('is_prorated', True)
        logger.info(f"\nCalculating cost summary for booking {obj.booking_id}:")
        
        if not hasattr(obj, 'bookingsummary'):
            logger.warning("  No booking summary found")
            return None

        # Calculate subtotal from all occurrences
        subtotal = Decimal('0')
        for occ in obj.occurrences.prefetch_related('booking_details', 'rates').all():
            booking_details = occ.booking_details.first()
            if not booking_details:
                logger.warning(f"  No booking details found for occurrence {occ.occurrence_id}")
                continue

            # Get base_total from booking details
            base_total = booking_details.calculate_occurrence_cost(is_prorated)
            logger.info(f"  Occurrence {occ.occurrence_id} base total: ${base_total}")
            subtotal += base_total

            # Add additional rates
            if hasattr(occ, 'rates') and occ.rates.rates:
                logger.info(f"  Processing additional rates for occurrence {occ.occurrence_id}:")
                for rate in occ.rates.rates:
                    if rate['title'] != 'Base Rate':  # Only exclude base rate
                        rate_amount = Decimal(rate['amount'].replace('$', '').strip())
                        logger.info(f"    Adding rate: {rate['title']}, Amount: ${rate_amount}")
                        subtotal += rate_amount

        # Calculate other costs
        platform_fee = (subtotal * Decimal('0.10')).quantize(Decimal('0.01'))
        taxes = ((subtotal + platform_fee) * Decimal('0.08')).quantize(Decimal('0.01'))
        total_client_cost = subtotal + platform_fee + taxes
        total_sitter_payout = subtotal - platform_fee

        logger.info(f"  Final calculations:")
        logger.info(f"    Subtotal: ${subtotal}")
        logger.info(f"    Platform fee: ${platform_fee}")
        logger.info(f"    Taxes: ${taxes}")
        logger.info(f"    Total client cost: ${total_client_cost}")
        logger.info(f"    Total sitter payout: ${total_sitter_payout}")

        return {
            'subtotal': float(subtotal.quantize(Decimal('0.01'))),
            'platform_fee': float(platform_fee),
            'taxes': float(taxes),
            'total_client_cost': float(total_client_cost.quantize(Decimal('0.01'))),
            'total_sitter_payout': float(total_sitter_payout.quantize(Decimal('0.01'))),
            'is_prorated': is_prorated
        } 
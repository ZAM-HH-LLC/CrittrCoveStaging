from datetime import datetime
from rest_framework import serializers

class OvernightBookingCalculationSerializer(serializers.Serializer):
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    start_time = serializers.TimeField()
    end_time = serializers.TimeField()
    night_count_adjustment = serializers.IntegerField(required=False, default=0)
    
    def validate(self, data):
        """
        Check that end date and time are after start date and time.
        """
        start_date = data['start_date']
        end_date = data['end_date']
        start_time = data['start_time']
        end_time = data['end_time']

        # Convert times to datetime for comparison
        start_dt = datetime.combine(start_date, start_time)
        end_dt = datetime.combine(end_date, end_time)

        if end_dt <= start_dt:
            raise serializers.ValidationError("End date and time must be after start date and time")
        return data

class AdditionalRateSerializer(serializers.Serializer):
    title = serializers.CharField(required=True)
    amount = serializers.DecimalField(required=True, max_digits=10, decimal_places=2)
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True)

class RatesSerializer(serializers.Serializer):
    base_rate = serializers.DecimalField(max_digits=10, decimal_places=2)
    additional_animal_rate = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    applies_after = serializers.IntegerField(required=False, default=1)
    holiday_rate = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    additional_rates = AdditionalRateSerializer(many=True, required=False)

class OccurrenceSerializer(serializers.Serializer):
    occurrence_id = serializers.CharField(required=True)
    rates = RatesSerializer(required=True)

class UpdateRatesSerializer(serializers.Serializer):
    occurrences = OccurrenceSerializer(many=True, required=True) 
from datetime import datetime
from rest_framework import serializers

class OvernightBookingCalculationSerializer(serializers.Serializer):
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    start_time = serializers.TimeField()
    end_time = serializers.TimeField()
    
    def validate(self, data):
        """
        Check that end date and time are after start date and time.
        """
        start_date = data['start_date']
        end_date = data['end_date']
        start_time = data['start_time']
        end_time = data['end_time']

        # Combine date and time for comparison
        start_dt = datetime.combine(start_date, start_time)
        end_dt = datetime.combine(end_date, end_time)

        if end_dt <= start_dt:
            raise serializers.ValidationError("End date and time must be after start date and time")
        return data 
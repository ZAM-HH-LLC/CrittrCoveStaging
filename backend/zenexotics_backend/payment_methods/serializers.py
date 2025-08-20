from rest_framework import serializers
from .models import PaymentMethod

class PaymentMethodSerializer(serializers.ModelSerializer):
    display_name = serializers.ReadOnlyField()
    
    class Meta:
        model = PaymentMethod
        fields = [
            'payment_method_id',
            'type',
            'last4',
            'brand',
            'exp_month',
            'exp_year',
            'bank_account_last4',
            'bank_name',
            'billing_postal_code',
            'is_verified',
            'is_primary_payment',
            'is_primary_payout',
            'display_name',
            'created_at',
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Remove unnecessary fields based on payment method type
        if instance.type in ['CREDIT_CARD', 'DEBIT_CARD']:
            data.pop('bank_account_last4', None)
            data.pop('bank_name', None)
        elif instance.type == 'BANK_ACCOUNT':
            data.pop('brand', None)
            data.pop('exp_month', None)
            data.pop('exp_year', None)
            # Rename bank_account_last4 to last4 for consistency
            if instance.bank_account_last4:
                data['last4'] = instance.bank_account_last4
        return data


class PaymentMethodCreateSerializer(serializers.Serializer):
    stripe_payment_method_id = serializers.CharField(max_length=255)
    is_approved_professional = serializers.BooleanField(default=False)
    
    def validate_stripe_payment_method_id(self, value):
        if not value.startswith('pm_'):
            raise serializers.ValidationError('Invalid Stripe payment method ID format')
        return value 
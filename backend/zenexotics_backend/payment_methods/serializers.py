from rest_framework import serializers
from .models import PaymentMethod

class PaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethod
        fields = [
            'payment_method_id',
            'type',
            'last4',
            'brand',
            'bank_account_last4',
            'bank_name',
            'is_verified',
            'is_primary',
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Remove unnecessary fields based on payment method type
        if instance.type in ['CREDIT_CARD', 'DEBIT_CARD']:
            data.pop('bank_account_last4', None)
            data.pop('bank_name', None)
        elif instance.type == 'BANK_ACCOUNT':
            data.pop('last4', None)
            data.pop('brand', None)
            # Rename bank_account_last4 to last4 for consistency
            data['last4'] = data.pop('bank_account_last4', None)
        return data 
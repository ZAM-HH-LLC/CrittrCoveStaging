from rest_framework import serializers
from .models import ContractTemplate, Contract

class ContractTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContractTemplate
        fields = '__all__'

class ContractSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contract
        fields = '__all__'
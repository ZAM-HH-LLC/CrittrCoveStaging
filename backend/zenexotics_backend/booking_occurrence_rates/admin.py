from django.contrib import admin
from django import forms
from .models import BookingOccurrenceRate
import json
from django.core.exceptions import ValidationError

class BookingOccurrenceRateAdminForm(forms.ModelForm):
    rates_text = forms.CharField(
        widget=forms.Textarea(attrs={'rows': 10, 'cols': 80}),
        help_text='Enter rates as JSON array. Example:<br/>[{"title": "Base Rate", "description": "Base rate for service", "amount": "$25.00"}]',
        required=False
    )

    class Meta:
        model = BookingOccurrenceRate
        fields = ('occurrence', 'rates_text')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance.pk and self.instance.rates:
            self.fields['rates_text'].initial = json.dumps(self.instance.rates, indent=4)

    def clean_rates_text(self):
        try:
            rates_text = self.cleaned_data['rates_text']
            if not rates_text:
                return []
            rates = json.loads(rates_text)
            if not isinstance(rates, list):
                raise ValidationError('Rates must be a JSON array')
            return rates
        except json.JSONDecodeError:
            raise ValidationError('Invalid JSON format')

    def save(self, commit=True):
        instance = super().save(commit=False)
        instance.rates = self.cleaned_data['rates_text']
        if commit:
            instance.save()
        return instance

@admin.register(BookingOccurrenceRate)
class BookingOccurrenceRateAdmin(admin.ModelAdmin):
    form = BookingOccurrenceRateAdminForm
    list_display = ('occurrence', 'get_total', 'created_at', 'updated_at')
    search_fields = ('occurrence__booking__client__user__email',)
    readonly_fields = ('created_at', 'updated_at')

    def get_fields(self, request, obj=None):
        return ('occurrence', 'rates_text', 'created_at', 'updated_at')

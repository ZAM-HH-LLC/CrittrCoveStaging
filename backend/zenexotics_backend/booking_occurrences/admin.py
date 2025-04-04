from django.contrib import admin
from .models import BookingOccurrence
from booking_occurrence_rates.models import BookingOccurrenceRate
from django import forms
import json
from django.core.exceptions import ValidationError

class BookingOccurrenceRateInlineForm(forms.ModelForm):
    rates_text = forms.CharField(
        widget=forms.Textarea(attrs={'rows': 10, 'cols': 80}),
        help_text='Enter rates as JSON array. Example:<br/>[{"title": "Base Rate", "description": "Base rate for service", "amount": "$25.00"}]',
        required=False
    )

    class Meta:
        model = BookingOccurrenceRate
        fields = ('rates_text',)

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

class BookingOccurrenceRateInline(admin.StackedInline):
    model = BookingOccurrenceRate
    form = BookingOccurrenceRateInlineForm
    extra = 0
    max_num = 1
    can_delete = True
    verbose_name = "Rates"
    verbose_name_plural = "Rates"
    fields = ('rates_text',)

@admin.register(BookingOccurrence)
class BookingOccurrenceAdmin(admin.ModelAdmin):
    list_display = ('occurrence_id', 'booking', 'get_start_datetime', 'get_end_datetime', 'status', 'created_by')
    list_filter = ('status', 'created_by')
    search_fields = ('booking__booking_id', 'occurrence_id')
    readonly_fields = ('created_at', 'updated_at')
    inlines = [BookingOccurrenceRateInline]
    fieldsets = (
        ('Basic Information', {
            'fields': ('booking', 'status')
        }),
        ('Time Details', {
            'fields': ('start_date', 'end_date', 'start_time', 'end_time')
        }),
        ('Financial', {
            'fields': ('calculated_cost',)
        }),
        ('Tracking', {
            'fields': ('created_by', 'last_modified_by')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def get_start_datetime(self, obj):
        return f"{obj.start_date} {obj.start_time.strftime('%H:%M')}"
    get_start_datetime.short_description = 'Start Date/Time (UTC)'
    
    def get_end_datetime(self, obj):
        return f"{obj.end_date} {obj.end_time.strftime('%H:%M')}"
    get_end_datetime.short_description = 'End Date/Time (UTC)'

    def display_calculated_cost(self, obj):
        return f"${float(obj.get_calculated_cost()):.2f}"
    display_calculated_cost.short_description = 'Calculated Cost'

    class Media:
        css = {
            'all': ('admin/css/forms.css',)
        }
        js = ('admin/js/inlines.js',)

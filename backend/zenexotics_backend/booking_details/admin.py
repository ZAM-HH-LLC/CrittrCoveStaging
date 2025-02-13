from django.contrib import admin
from .models import BookingDetails

@admin.register(BookingDetails)
class BookingDetailsAdmin(admin.ModelAdmin):
    list_display = ('detail_id', 'booking_occurrence', 'num_pets', 'base_rate', 'additional_pet_rate', 'holiday_rate', 'calculated_rate')
    search_fields = ('booking_occurrence__booking__client__user__email', 'booking_occurrence__booking__professional__user__email')
    readonly_fields = ('calculated_rate',)
    fieldsets = (
        ('Basic Information', {
            'fields': ('booking_occurrence', 'num_pets')
        }),
        ('Rates', {
            'fields': ('base_rate', 'additional_pet_rate', 'applies_after', 'holiday_rate', 'calculated_rate')
        }),
    )

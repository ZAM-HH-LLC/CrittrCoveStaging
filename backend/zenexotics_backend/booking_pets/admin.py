from django.contrib import admin
from .models import BookingPets

@admin.register(BookingPets)
class BookingPetsAdmin(admin.ModelAdmin):
    list_display = ('bookingspet_id', 'booking', 'pet')
    search_fields = ('booking__client__user__email', 'pet__name')
    fieldsets = (
        ('Basic Information', {
            'fields': ('booking', 'pet')
        }),
    )

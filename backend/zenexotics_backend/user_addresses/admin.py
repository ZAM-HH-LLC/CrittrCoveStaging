from django.contrib import admin
from .models import Address

@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ('user', 'address_type', 'city', 'state', 'zip', 'created_at')
    list_filter = ('address_type', 'state', 'country')
    search_fields = ('user__email', 'address_line_1', 'city', 'state', 'zip')
    ordering = ('-created_at',) 
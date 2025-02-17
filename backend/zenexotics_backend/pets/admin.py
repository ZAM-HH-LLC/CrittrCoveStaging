from django.contrib import admin
from .models import Pet

@admin.register(Pet)
class PetAdmin(admin.ModelAdmin):
    list_display = ('pet_id', 'name', 'species', 'breed', 'owner', 'age_years', 'sex')
    list_filter = ('species', 'created_at', 'sex', 'spayed_neutered')
    search_fields = ('name', 'owner__email', 'breed')
    readonly_fields = ('created_at',)
    
    fieldsets = (
        ('Basic Information', {
            'fields': (
                'owner', 'name', 'species', 'breed', 'pet_type',
                'profile_photo', 'photo_gallery', 'pet_description'
            )
        }),
        ('Physical Details', {
            'fields': (
                'age_years', 'age_months', 'weight', 'birthday',
                'sex', 'adoption_date', 'created_at'
            )
        }),
        ('Compatibility & Training', {
            'classes': ('collapse',),
            'fields': (
                'friendly_with_children', 'friendly_with_cats',
                'friendly_with_dogs', 'spayed_neutered',
                'house_trained', 'microchipped'
            ),
            'description': 'Information about pet behavior and training status'
        }),
        ('Care Information', {
            'classes': ('collapse',),
            'fields': (
                'feeding_schedule', 'potty_break_schedule',
                'energy_level', 'can_be_left_alone',
                'medications', 'medication_notes',
                'special_care_instructions'
            ),
            'description': 'Detailed care requirements and instructions'
        }),
        ('Veterinary Information', {
            'classes': ('collapse',),
            'fields': (
                'vet_name', 'vet_address', 'vet_phone',
                'insurance_provider', 'vet_documents'
            ),
            'description': 'Medical and veterinary contact information'
        }),
    )

    def get_readonly_fields(self, request, obj=None):
        if obj:  # editing an existing object
            return self.readonly_fields + ('created_at',)
        return self.readonly_fields
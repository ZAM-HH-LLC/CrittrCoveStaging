from django.db import migrations

def convert_false_to_null(apps, schema_editor):
    """
    Convert all false values to null for boolean fields in the Pet model
    that haven't been explicitly set by the user.
    """
    Pet = apps.get_model('pets', 'Pet')
    
    # Get all pets
    pets = Pet.objects.all()
    
    # Boolean fields to check
    boolean_fields = [
        'friendly_with_children', 'friendly_with_cats', 'friendly_with_dogs',
        'spayed_neutered', 'house_trained', 'microchipped', 'can_be_left_alone'
    ]
    
    for pet in pets:
        # Check if the pet has any data in fields that would indicate user interaction
        has_user_data = (
            pet.pet_description or 
            pet.feeding_schedule or 
            pet.potty_break_schedule or 
            pet.energy_level or 
            pet.medications or 
            pet.medication_notes or 
            pet.special_care_instructions
        )
        
        # If no user data, assume the boolean fields were not set intentionally
        if not has_user_data:
            updated = False
            for field in boolean_fields:
                if getattr(pet, field) is False:  # Only change False values, not True
                    setattr(pet, field, None)
                    updated = True
            
            if updated:
                pet.save()

class Migration(migrations.Migration):

    dependencies = [
        ('pets', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(convert_false_to_null, migrations.RunPython.noop),
    ] 
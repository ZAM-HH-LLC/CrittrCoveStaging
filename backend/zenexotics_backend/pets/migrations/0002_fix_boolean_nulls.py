from django.db import migrations

def fix_boolean_nulls(apps, schema_editor):
    """
    Set boolean fields to null for existing pets where they are False
    and there's no indication they were intentionally set.
    """
    Pet = apps.get_model('pets', 'Pet')
    
    # Get all pets
    for pet in Pet.objects.all():
        # Check if the pet has any data that would indicate user interaction
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
            # Set all False boolean fields to null
            updated = False
            
            if pet.friendly_with_children is False:
                pet.friendly_with_children = None
                updated = True
                
            if pet.friendly_with_cats is False:
                pet.friendly_with_cats = None
                updated = True
                
            if pet.friendly_with_dogs is False:
                pet.friendly_with_dogs = None
                updated = True
                
            if pet.spayed_neutered is False:
                pet.spayed_neutered = None
                updated = True
                
            if pet.house_trained is False:
                pet.house_trained = None
                updated = True
                
            if pet.microchipped is False:
                pet.microchipped = None
                updated = True
                
            if pet.can_be_left_alone is False:
                pet.can_be_left_alone = None
                updated = True
            
            if updated:
                pet.save()

class Migration(migrations.Migration):
    dependencies = [
        ('pets', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(fix_boolean_nulls, migrations.RunPython.noop),
    ] 
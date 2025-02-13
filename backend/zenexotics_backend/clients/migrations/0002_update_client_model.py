from django.db import migrations, models

def convert_emergency_contacts(apps, schema_editor):
    Client = apps.get_model('clients', 'Client')
    for client in Client.objects.all():
        # Convert existing emergency contact fields to JSON format
        client.emergency_contact = {
            'name': client.emergency_contact_name if hasattr(client, 'emergency_contact_name') else '',
            'phone': client.emergency_contact_phone if hasattr(client, 'emergency_contact_phone') else ''
        }
        client.save()

def convert_household_members(apps, schema_editor):
    Client = apps.get_model('clients', 'Client')
    for client in Client.objects.all():
        members = client.authorized_household_members or ''
        client.authorized_household_members = members.split(',') if members else []
        client.save()

def reverse_convert(apps, schema_editor):
    Client = apps.get_model('clients', 'Client')
    for client in Client.objects.all():
        if client.emergency_contact:
            client.emergency_contact_name = client.emergency_contact.get('name', '')
            client.emergency_contact_phone = client.emergency_contact.get('phone', '')
        client.save()

class Migration(migrations.Migration):

    dependencies = [
        ('clients', '0001_initial'),
    ]

    operations = [
        # First add new fields
        migrations.AddField(
            model_name='client',
            name='emergency_contact',
            field=models.JSONField(default=dict, blank=True),
        ),
        migrations.AddField(
            model_name='client',
            name='verified_payment_method',
            field=models.BooleanField(default=False),
        ),
        # Run data migration for emergency contacts
        migrations.RunPython(convert_emergency_contacts, reverse_convert),
        # Then remove old fields
        migrations.RemoveField(
            model_name='client',
            name='emergency_contact_name',
        ),
        migrations.RemoveField(
            model_name='client',
            name='emergency_contact_phone',
        ),
        # Create temporary field for household members
        migrations.RenameField(
            model_name='client',
            old_name='authorized_household_members',
            new_name='old_household_members',
        ),
        # Add new JSON field
        migrations.AddField(
            model_name='client',
            name='authorized_household_members',
            field=models.JSONField(default=list, blank=True),
        ),
        # Convert data
        migrations.RunPython(convert_household_members),
        # Remove old field
        migrations.RemoveField(
            model_name='client',
            name='old_household_members',
        ),
    ] 
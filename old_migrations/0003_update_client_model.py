from django.db import migrations, models

def convert_emergency_contacts(apps, schema_editor):
    Client = apps.get_model('clients', 'Client')
    for client in Client.objects.all():
        # Convert existing emergency contact fields to JSON format
        if client.emergency_contact_name or client.emergency_contact_phone:
            client.emergency_contact = {
                'primary': {
                    'name': client.emergency_contact_name,
                    'phone': client.emergency_contact_phone
                }
            }
            client.save()

class Migration(migrations.Migration):

    dependencies = [
        ('clients', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='client',
            name='verified_payment_method',
            field=models.BooleanField(default=False, help_text='True if client has a verified payment method'),
        ),
        migrations.AlterField(
            model_name='client',
            name='authorized_household_members',
            field=models.JSONField(blank=True, default=list, help_text='List of people authorized to interact with the pet'),
        ),
        migrations.AddField(
            model_name='client',
            name='emergency_contact',
            field=models.JSONField(blank=True, default=dict, help_text='List of emergency contacts'),
        ),
        migrations.RunPython(convert_emergency_contacts),
        migrations.RemoveField(
            model_name='client',
            name='emergency_contact_name',
        ),
        migrations.RemoveField(
            model_name='client',
            name='emergency_contact_phone',
        ),
    ] 
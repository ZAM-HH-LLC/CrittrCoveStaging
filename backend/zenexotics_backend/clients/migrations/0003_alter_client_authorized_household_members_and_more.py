# Generated by Django 4.2.16 on 2025-01-13 02:36

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("clients", "0002_update_client_model"),
    ]

    operations = [
        migrations.AlterField(
            model_name="client",
            name="authorized_household_members",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text="List of people authorized to interact with the pet",
            ),
        ),
        migrations.AlterField(
            model_name="client",
            name="emergency_contact",
            field=models.JSONField(
                blank=True, default=dict, help_text="List of emergency contacts"
            ),
        ),
        migrations.AlterField(
            model_name="client",
            name="verified_payment_method",
            field=models.BooleanField(
                default=False, help_text="True if client has a verified payment method"
            ),
        ),
    ]

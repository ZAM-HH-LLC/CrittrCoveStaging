# Generated by Django 4.2.19 on 2025-04-08 18:18

import clients.models
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('clients', '0004_alter_client_authorized_household_members_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='client',
            name='home_environment',
            field=models.JSONField(blank=True, default=clients.models.default_list, help_text='List of home environment features'),
        ),
    ]

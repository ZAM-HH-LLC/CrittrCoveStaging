# Generated by Django 4.2.19 on 2025-02-17 18:32

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('services', '0002_alter_service_unit_of_time'),
    ]

    operations = [
        migrations.AddField(
            model_name='service',
            name='applies_after',
            field=models.IntegerField(default=1, help_text='Additional animal rate applies after this many animals'),
        ),
    ]

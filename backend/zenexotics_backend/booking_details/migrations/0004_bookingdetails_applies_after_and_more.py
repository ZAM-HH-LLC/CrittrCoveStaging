# Generated by Django 4.2.16 on 2025-01-28 01:49

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('booking_details', '0003_alter_bookingdetails_pet_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='bookingdetails',
            name='applies_after',
            field=models.PositiveIntegerField(default=1, help_text='Additional pet rate applies after this many pets'),
        ),
        migrations.AddField(
            model_name='bookingdetails',
            name='holiday_rate',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name='bookingdetails',
            name='unit_of_time',
            field=models.CharField(choices=[('15 Min', '15 Min'), ('30 Min', '30 Min'), ('45 Min', '45 Min'), ('1 Hour', '1 Hour'), ('2 Hour', '2 Hour'), ('3 Hour', '3 Hour'), ('4 Hour', '4 Hour'), ('5 Hour', '5 Hour'), ('6 Hour', '6 Hour'), ('7 Hour', '7 Hour'), ('8 Hour', '8 Hour'), ('24 Hour', '24 Hour'), ('Per Day', 'Per Day'), ('Per Visit', 'Per Visit')], default='Per Visit', max_length=20),
        ),
    ]

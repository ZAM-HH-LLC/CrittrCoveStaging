# Generated by Django 4.2.19 on 2025-04-18 22:49

from decimal import Decimal
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('booking_summary', '0005_bookingsummary_subtotal'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='bookingsummary',
            name='fee_percentage',
        ),
        migrations.AddField(
            model_name='bookingsummary',
            name='client_platform_fee',
            field=models.DecimalField(decimal_places=2, default=Decimal('0.00'), help_text='Actual platform fee charged to client', max_digits=10),
        ),
        migrations.AddField(
            model_name='bookingsummary',
            name='client_platform_fee_percentage',
            field=models.DecimalField(decimal_places=2, default=15.0, help_text='Client platform fee percentage (e.g., 15.00 for 15%)', max_digits=5),
        ),
        migrations.AddField(
            model_name='bookingsummary',
            name='pro_platform_fee',
            field=models.DecimalField(decimal_places=2, default=Decimal('0.00'), help_text='Actual platform fee deducted from professional payout', max_digits=10),
        ),
        migrations.AddField(
            model_name='bookingsummary',
            name='pro_platform_fee_percentage',
            field=models.DecimalField(decimal_places=2, default=15.0, help_text='Professional platform fee percentage (e.g., 15.00 for 15%)', max_digits=5),
        ),
    ]

# Generated manually

from django.db import migrations, models
from decimal import Decimal

def initialize_calculated_cost(apps, schema_editor):
    BookingOccurrence = apps.get_model('booking_occurrences', 'BookingOccurrence')
    for occurrence in BookingOccurrence.objects.all():
        if not occurrence.calculated_cost:
            occurrence.calculated_cost = Decimal('0.00')
            occurrence.save()

class Migration(migrations.Migration):
    dependencies = [
        ('booking_occurrences', '0004_alter_bookingoccurrence_options_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='bookingoccurrence',
            name='calculated_cost',
            field=models.DecimalField(
                max_digits=10,
                decimal_places=2,
                default=Decimal('0.00'),
                null=False
            ),
        ),
        migrations.RunPython(initialize_calculated_cost, reverse_code=migrations.RunPython.noop),
    ] 
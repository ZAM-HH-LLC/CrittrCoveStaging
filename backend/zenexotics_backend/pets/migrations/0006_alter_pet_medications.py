# Generated by Django 4.2.7 on 2025-06-09 03:03

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pets', '0005_alter_pet_sex'),
    ]

    operations = [
        migrations.AlterField(
            model_name='pet',
            name='medications',
            field=models.TextField(blank=True),
        ),
    ]

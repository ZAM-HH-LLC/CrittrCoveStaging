# Generated by Django 4.2.19 on 2025-04-11 22:12

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pets', '0002_alter_pet_photo_gallery_alter_pet_profile_photo'),
    ]

    operations = [
        migrations.AlterField(
            model_name='pet',
            name='species',
            field=models.CharField(max_length=50),
        ),
    ]

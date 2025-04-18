# Generated by Django 4.2.19 on 2025-04-14 16:04

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0014_user_is_profile_visible'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='subscription_plan',
            field=models.IntegerField(default=1, help_text='0: Free tier, 1: Waitlist tier, 2: Commission tier, 3: Pro subscription, 4: Client subscription, 5: Dual subscription'),
        ),
    ]

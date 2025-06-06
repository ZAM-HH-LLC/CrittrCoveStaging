# Generated by Django 4.2.16 on 2025-02-11 19:12

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('user_messages', '0001_initial'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='usermessage',
            name='is_booking_request',
        ),
        migrations.AddField(
            model_name='usermessage',
            name='is_clickable',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='usermessage',
            name='type_of_message',
            field=models.CharField(choices=[('initial_booking_request', 'Initial Booking Request'), ('normal_message', 'Normal Message'), ('approval_request', 'Approval Request'), ('request_changes', 'Request Changes')], default='normal_message', max_length=30),
        ),
    ]

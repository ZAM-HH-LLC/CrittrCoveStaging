# Generated by Django 4.2.19 on 2025-04-16 00:27

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('professionals', '0003_alter_professional_options_and_more'),
        ('clients', '0005_client_home_environment'),
    ]

    operations = [
        migrations.AddField(
            model_name='client',
            name='invited_by',
            field=models.ForeignKey(blank=True, help_text='The professional who invited this client', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='invited_clients', to='professionals.professional'),
        ),
    ]

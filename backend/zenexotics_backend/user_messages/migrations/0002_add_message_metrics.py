from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0011_usersettings_email_updates_and_more'),
        ('user_messages', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='MessageMetrics',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('delivery_status', models.CharField(choices=[('websocket_sent', 'WebSocket Sent'), ('websocket_received', 'WebSocket Received'), ('email_sent', 'Email Sent'), ('email_delivered', 'Email Delivered'), ('email_opened', 'Email Opened'), ('read', 'Message Read'), ('failed', 'Delivery Failed')], max_length=20)),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('delivery_latency', models.FloatField(blank=True, help_text='Delivery time in milliseconds', null=True)),
                ('is_recipient_online', models.BooleanField(default=False)),
                ('client_info', models.JSONField(blank=True, help_text='Client browser/device info', null=True)),
                ('message', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='metrics', to='user_messages.usermessage')),
                ('recipient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='users.user')),
            ],
            options={
                'verbose_name': 'Message Metric',
                'verbose_name_plural': 'Message Metrics',
                'ordering': ['-timestamp'],
            },
        ),
    ] 
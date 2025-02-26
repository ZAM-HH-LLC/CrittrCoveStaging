# Generated by Django 4.2.16 on 2025-01-16 01:06

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("bookings", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("conversations", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="UserMessage",
            fields=[
                ("message_id", models.AutoField(primary_key=True, serialize=False)),
                ("content", models.TextField()),
                ("timestamp", models.DateTimeField(auto_now_add=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("sent", "Sent"),
                            ("read", "Read"),
                            ("action_required", "Action Required"),
                        ],
                        default="sent",
                        max_length=20,
                    ),
                ),
                ("is_booking_request", models.BooleanField(default=False)),
                ("metadata", models.JSONField(blank=True, null=True)),
                (
                    "booking",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to="bookings.booking",
                    ),
                ),
                (
                    "conversation",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="conversations.conversation",
                    ),
                ),
                (
                    "sender",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Message",
                "verbose_name_plural": "Messages",
                "ordering": ["-timestamp"],
            },
        ),
    ]

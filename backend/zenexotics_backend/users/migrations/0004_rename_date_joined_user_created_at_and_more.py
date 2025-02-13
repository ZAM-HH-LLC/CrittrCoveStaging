# Generated by Django 4.2.16 on 2025-01-12 19:49

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0003_rename_approved_cat_sitting_user_approved_for_cats_and_more"),
    ]

    operations = [
        migrations.RenameField(
            model_name="user",
            old_name="date_joined",
            new_name="created_at",
        ),
        migrations.RenameField(
            model_name="user",
            old_name="is_verified",
            new_name="email_is_verified",
        ),
        migrations.RemoveField(
            model_name="user",
            name="address",
        ),
        migrations.RemoveField(
            model_name="user",
            name="approved_at",
        ),
        migrations.RemoveField(
            model_name="user",
            name="approved_for_cats",
        ),
        migrations.RemoveField(
            model_name="user",
            name="approved_for_dogs",
        ),
        migrations.RemoveField(
            model_name="user",
            name="approved_for_exotics",
        ),
        migrations.RemoveField(
            model_name="user",
            name="is_client",
        ),
        migrations.RemoveField(
            model_name="user",
            name="is_sitter",
        ),
        migrations.RemoveField(
            model_name="user",
            name="wants_cat_approval",
        ),
        migrations.RemoveField(
            model_name="user",
            name="wants_dog_approval",
        ),
        migrations.RemoveField(
            model_name="user",
            name="wants_exotics_approval",
        ),
        migrations.RemoveField(
            model_name="user",
            name="wants_to_be_sitter",
        ),
        migrations.AddField(
            model_name="user",
            name="birthday",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="user",
            name="identity_verified",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="user",
            name="stripe_customer_id",
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
    ]

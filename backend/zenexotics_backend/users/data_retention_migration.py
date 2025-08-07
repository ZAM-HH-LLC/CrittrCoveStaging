"""
Custom migration script to handle data retention requirements for account deletion.

This script addresses the foreign key relationships that need to be updated
to support proper data retention policies when users are deleted.

Key changes needed:
1. Payment.user: CASCADE -> SET_NULL (retain financial records for 7 years)
2. UserMessage.sender: CASCADE -> SET_NULL (retain messages for legal protection)
3. Add anonymized_user_id fields where needed

Run this as a data migration after creating the new fields.
"""

from django.db import migrations, models
import django.db.models.deletion

def update_foreign_keys_for_retention(apps, schema_editor):
    """
    Update foreign key relationships to support data retention.
    """
    # This will need to be implemented as actual Django migrations
    # for each model that needs updating
    pass

def reverse_foreign_keys_for_retention(apps, schema_editor):
    """
    Reverse the foreign key changes if needed.
    """
    pass

class Migration(migrations.Migration):
    """
    This is a template for the data retention migration.
    Each affected model will need its own migration file.
    """
    
    dependencies = [
        ('users', '0030_add_account_deletion_fields'),
        ('payments', '__latest__'),
        ('user_messages', '__latest__'),
    ]

    operations = [
        # Add anonymized_user_id fields to retain reference after user deletion
        migrations.AddField(
            model_name='payment',
            name='anonymized_user_id',
            field=models.CharField(max_length=50, blank=True, help_text='Anonymized reference to deleted user'),
        ),
        migrations.AddField(
            model_name='usermessage', 
            name='anonymized_sender_id',
            field=models.CharField(max_length=50, blank=True, help_text='Anonymized reference to deleted sender'),
        ),
        
        # The foreign key changes would be handled in separate migrations
        # for each affected app to avoid circular dependencies
        
        migrations.RunPython(
            update_foreign_keys_for_retention,
            reverse_foreign_keys_for_retention
        ),
    ]
# Generated manually for adding counter fields to existing SearchLog table

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('logs', '0001_initial'),
    ]

    operations = [
        # Add the new counter and timestamp fields using SQL
        migrations.RunSQL(
            """
            ALTER TABLE search_logs_searchlog 
            ADD COLUMN IF NOT EXISTS search_count INTEGER DEFAULT 1;
            """,
            reverse_sql="ALTER TABLE search_logs_searchlog DROP COLUMN IF EXISTS search_count;"
        ),
        migrations.RunSQL(
            """
            ALTER TABLE search_logs_searchlog 
            ADD COLUMN IF NOT EXISTS first_searched TIMESTAMP WITH TIME ZONE DEFAULT NOW();
            """,
            reverse_sql="ALTER TABLE search_logs_searchlog DROP COLUMN IF EXISTS first_searched;"
        ),
        migrations.RunSQL(
            """
            ALTER TABLE search_logs_searchlog 
            ADD COLUMN IF NOT EXISTS last_searched TIMESTAMP WITH TIME ZONE DEFAULT NOW();
            """,
            reverse_sql="ALTER TABLE search_logs_searchlog DROP COLUMN IF EXISTS last_searched;"
        ),
        
        # Add indexes for the new fields
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS search_logs_search_count_idx ON search_logs_searchlog (search_count);",
            reverse_sql="DROP INDEX IF EXISTS search_logs_search_count_idx;"
        ),
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS search_logs_first_searched_idx ON search_logs_searchlog (first_searched);",
            reverse_sql="DROP INDEX IF EXISTS search_logs_first_searched_idx;"
        ),
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS search_logs_last_searched_idx ON search_logs_searchlog (last_searched);",
            reverse_sql="DROP INDEX IF EXISTS search_logs_last_searched_idx;"
        ),
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS search_logs_ip_service_location_idx ON search_logs_searchlog (ip_address, service_query, location);",
            reverse_sql="DROP INDEX IF EXISTS search_logs_ip_service_location_idx;"
        ),
    ]
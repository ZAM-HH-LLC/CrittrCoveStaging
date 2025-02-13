from .settings import *
import os
import dj_database_url

# Get database configuration from environment
db_config = dj_database_url.config(default=os.getenv('DATABASE_URL'))

# Use the same database for tests
DATABASES = {
    'default': {
        **db_config,
        'TEST': {
            'NAME': db_config['NAME'],
            'TABLE_PREFIX': 'test_',
            'MIGRATE': True,
            'CREATE_DB': False,
            'DEPENDENCIES': [],
        },
    }
}

# Speed up password hashing
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]

# Use our custom test runner
TEST_RUNNER = 'tests.test_runner.ExistingDatabaseTestRunner'

# Disable migrations for tests
class DisableMigrations:
    def __contains__(self, item):
        return True

    def __getitem__(self, item):
        return None

MIGRATION_MODULES = DisableMigrations()

# Override JSONField for SQLite
from django.db.models import JSONField
def default_list():
    return []

def default_dict():
    return {} 
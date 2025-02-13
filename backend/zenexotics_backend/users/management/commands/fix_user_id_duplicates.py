from django.core.management.base import BaseCommand
from users.models import User
import secrets
import string

class Command(BaseCommand):
    help = 'Fix duplicate user_id values for existing users'

    def handle(self, *args, **kwargs):
        users = User.objects.all()
        for user in users:
            # Ensure user_id is unique
            while User.objects.filter(user_id=user.user_id).count() > 1 or not user.user_id:
                user.user_id = 'user_' + ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(9))
            user.save()
        self.stdout.write(self.style.SUCCESS('Successfully fixed user_id duplicates for existing users'))


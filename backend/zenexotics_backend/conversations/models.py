from django.db import models
from users.models import User

class Conversation(models.Model):
    conversation_id = models.AutoField(primary_key=True)
    participant1 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='conversations_as_participant1')
    participant2 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='conversations_as_participant2')
    role_map = models.JSONField()
    last_message = models.TextField(null=True, blank=True)
    last_message_time = models.DateTimeField(null=True, blank=True)
    unread_count = models.IntegerField(default=0)
    metadata = models.JSONField(null=True, blank=True)

    class Meta:
        ordering = ['-last_message_time']
        verbose_name = 'Conversation'
        verbose_name_plural = 'Conversations'

    def __str__(self):
        return f'Conversation between {self.participant1} and {self.participant2}'

from django.db import models

class ReviewModeration(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]

    moderation_id = models.AutoField(primary_key=True)
    review_id = models.IntegerField()  # We'll handle the polymorphic relationship in the application layer
    status = models.CharField(max_length=50, choices=STATUS_CHOICES)
    moderated_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, related_name='moderated_reviews')
    flagged_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, related_name='flagged_reviews')
    reason = models.TextField()
    decision_notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Review Moderation {self.moderation_id} - {self.status}"

    class Meta:
        db_table = 'review_moderation'
        ordering = ['-created_at']

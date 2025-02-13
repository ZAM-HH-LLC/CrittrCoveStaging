from django.db import models

class ProfessionalReview(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]

    review_id = models.AutoField(primary_key=True)
    booking = models.ForeignKey('bookings.Booking', on_delete=models.CASCADE)
    client = models.ForeignKey('clients.Client', on_delete=models.CASCADE)
    professional = models.ForeignKey('professionals.Professional', on_delete=models.CASCADE)
    rating = models.IntegerField()
    review_text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES)
    moderated_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, related_name='moderated_professional_reviews')
    moderation_reason = models.TextField(null=True, blank=True)
    review_visible = models.BooleanField(default=False)
    review_posted = models.BooleanField(default=False)
    post_deadline = models.DateTimeField()

    def __str__(self):
        return f"Professional Review {self.review_id} by {self.professional} for {self.client}"

    class Meta:
        db_table = 'professional_reviews'
        ordering = ['-created_at']

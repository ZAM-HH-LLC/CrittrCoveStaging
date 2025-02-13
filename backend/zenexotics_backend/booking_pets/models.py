from django.db import models

class BookingPets(models.Model):
    bookingspet_id = models.AutoField(primary_key=True)
    booking = models.ForeignKey('bookings.Booking', on_delete=models.CASCADE, related_name='booking_pets')
    pet = models.ForeignKey('pets.Pet', on_delete=models.CASCADE)

    def __str__(self):
        return f"{self.pet} in Booking {self.booking.booking_id}"

    class Meta:
        db_table = 'booking_pets'
        unique_together = ('booking', 'pet')
        verbose_name_plural = 'booking pets'

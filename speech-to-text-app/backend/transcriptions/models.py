from django.db import models

class Transcription(models.Model):
    language = models.CharField(max_length=20, default="en-US")
    title = models.CharField(max_length=200, blank=True, default="")
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title or f"Transcription {self.pk}"

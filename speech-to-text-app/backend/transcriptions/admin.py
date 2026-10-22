from django.contrib import admin
from .models import Transcription

@admin.register(Transcription)
class TranscriptionAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "language", "created_at", "updated_at")
    search_fields = ("title", "text", "language")
    list_filter = ("language", "created_at")

from rest_framework import serializers
from .models import Transcription

class TranscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transcription
        fields = ["id", "title", "text", "language", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_text(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Transcription text cannot be empty.")
        return value.strip()

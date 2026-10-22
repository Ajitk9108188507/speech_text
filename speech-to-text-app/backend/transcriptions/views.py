from rest_framework import viewsets, filters
from .models import Transcription
from .serializers import TranscriptionSerializer

class TranscriptionViewSet(viewsets.ModelViewSet):
    queryset = Transcription.objects.all()
    serializer_class = TranscriptionSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "text", "language"]
    ordering_fields = ["created_at", "updated_at", "title"]
    ordering = ["-created_at"]

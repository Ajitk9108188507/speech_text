from rest_framework.routers import DefaultRouter
from .views import TranscriptionViewSet

router = DefaultRouter()
router.register("transcriptions", TranscriptionViewSet, basename="transcription")

urlpatterns = router.urls

from django.urls import include, path
from rest_framework.routers import DefaultRouter
from candidates.views import CandidateViewSet
from communications.views import MessageViewSet, BatchViewSet, ProviderWebhookView, DashboardView, HealthView

router = DefaultRouter()
router.register('candidates', CandidateViewSet, basename='candidate')
router.register('messages', MessageViewSet, basename='message')
router.register('batches', BatchViewSet, basename='batch')
urlpatterns = [
    path('api/v1/', include(router.urls)),
    path('api/v1/dashboard/', DashboardView.as_view()),
    path('api/v1/health/', HealthView.as_view()),
    path('api/v1/webhooks/provider/', ProviderWebhookView.as_view()),
]

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ContactViewSet, CallScriptViewSet, CallLogViewSet

router = DefaultRouter()
router.register(r'contacts', ContactViewSet)
router.register(r'call-scripts', CallScriptViewSet)
router.register(r'call-logs', CallLogViewSet)

urlpatterns = [
    path('', include(router.urls)),
] 
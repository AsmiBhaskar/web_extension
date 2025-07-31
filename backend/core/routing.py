from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/call-session/(?P<session_id>[^/]+)/$', consumers.CallSessionConsumer.as_asgi()),
]

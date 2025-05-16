from django.urls import re_path
from . import consumer

websocket_urlpatterns = [
    re_path(r"ws/chat/(?P<room_name>\w+)/$", consumer.ChatConsumer.as_asgi()),
    re_path(r'ws/status/(?P<stream_id>\w+)/$', consumer.StreamStatusConsumer.as_asgi()),
    # re_path(r'ws/stream/(?P<stream_id>\w+)/$', RTSPConsumer.as_asgi()),
]
from channels.routing import ProtocolTypeRouter, URLRouter
from django.urls import path, re_path
from stream.consumer import StreamStatusConsumer, RTSPConsumer

application = ProtocolTypeRouter({
    'websocket': URLRouter([
        path('ws/streams/<str:stream_id>/', StreamStatusConsumer.as_asgi()),
        re_path(r'ws/stream/(?P<stream_id>\w+)/$', RTSPConsumer.as_asgi()),
    ]),
})
from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Stream
from .serializers import StreamSerializer
# from .utils.stream_manager import StreamManager
from drf_spectacular.utils import extend_schema, extend_schema_view

# Create your views here.

@extend_schema_view(
    list=extend_schema(description="List all streams"),
    retrieve=extend_schema(description="Retrieve a specific stream by ID"),
    create=extend_schema(description="Create a new RTSP stream"),
    update=extend_schema(description="Update an existing stream"),
    partial_update=extend_schema(description="Partially update a stream"),
    destroy=extend_schema(description="Delete a stream"),
)
class StreamViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing RTSP streams.
    Allows listing, creating, updating and deleting streams.
    """
    queryset = Stream.objects.all()
    serializer_class = StreamSerializer
    
    @extend_schema(
        description="Activate a stream",
        responses={200: StreamSerializer}
    )
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate a stream"""
        stream = self.get_object()
        stream.is_active = True
        stream.save()
        serializer = self.get_serializer(stream)
        return Response(serializer.data)
    
    @extend_schema(
        description="Deactivate a stream",
        responses={200: StreamSerializer}
    )
    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Deactivate a stream"""
        stream = self.get_object()
        stream.is_active = False
        stream.save()
        
        # Stop the stream if it's running
        # manager = StreamManager()
        # manager.stop_stream(str(stream.id))
        
        serializer = self.get_serializer(stream)
        return Response(serializer.data)
    
    @extend_schema(
        description="List all active streams",
        responses={200: StreamSerializer(many=True)}
    )
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get all active streams"""
        active_streams = Stream.objects.filter(is_active=True)
        serializer = self.get_serializer(active_streams, many=True)
        return Response(serializer.data)

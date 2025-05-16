# streams/consumers.py
from channels.generic.websocket import AsyncWebsocketConsumer
import json
from .utils.stream_manager import StreamManager
from asgiref.sync import sync_to_async
from .models import Stream

class StreamStatusConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()
    
    async def send_stream_metrics(self, event):
        # Send FPS/latency data to frontend
        await self.send(text_data=json.dumps({
            'stream_id': event['stream_id'],
            'fps': event['fps'],
            'status': event['status']
        }))

class RTSPConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.stream_id = self.scope['url_route']['kwargs']['stream_id']
        self.group_name = f'stream_{self.stream_id}'
        
        # Join group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Get the stream details and start streaming
        stream = await self.get_stream(self.stream_id)
        if stream:
            manager = StreamManager()
            if not manager.is_stream_active(self.stream_id):
                await sync_to_async(manager.start_stream)(
                    self.stream_id, 
                    stream.url, 
                    self.group_name
                )
        else:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Stream not found'
            }))
    
    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )
        
        # Check if this is the last client, if so stop the stream
        group_size = await self.get_group_size()
        if group_size == 0:
            manager = StreamManager()
            await sync_to_async(manager.stop_stream)(self.stream_id)
    
    async def get_group_size(self):
        # This is a simplified approach - in production you'd want a more robust way
        # to track the number of clients in a group
        # For demo purposes we'll stop the stream on any disconnect
        return 0
    
    @sync_to_async
    def get_stream(self, stream_id):
        try:
            return Stream.objects.get(id=stream_id, is_active=True)
        except Stream.DoesNotExist:
            return None
    
    # Receive message from WebSocket
    async def receive(self, text_data):
        try:
            text_data_json = json.loads(text_data)
            message_type = text_data_json.get('type')
            
            if message_type == 'start_stream':
                # Logic to start a stream if it was stopped
                pass
            elif message_type == 'stop_stream':
                # Logic to pause a stream
                pass
        except json.JSONDecodeError:
            pass
    
    # Receive message from room group
    async def stream_frame(self, event):
        # Send frame to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'stream_frame',
            'frame': event['frame'],
            'stream_id': event['stream_id']
        }))
    
    # Handle stream errors
    async def stream_error(self, event):
        await self.send(text_data=json.dumps({
            'type': 'stream_error',
            'message': event['message'],
            'stream_id': event['stream_id']
        }))
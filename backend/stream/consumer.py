# streams/consumers.py
from channels.generic.websocket import AsyncWebsocketConsumer
import json
from .utils.stream_manager import StreamManager
from .models import Stream
from asgiref.sync import sync_to_async

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope["url_route"]["kwargs"]["room_name"]
        self.room_group_name = f"chat_{self.room_name}"

        # Join room group
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)

        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    # Receive message from WebSocket
    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json["message"]

        # Send message to room group
        await self.channel_layer.group_send(
            self.room_group_name, {"type": "chat.message", "message": message}
        )

    # Receive message from room group
    async def chat_message(self, event):
        message = event["message"]

        # Send message to WebSocket
        await self.send(text_data=json.dumps({"message": message}))
        
class StreamStatusConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Get the stream_id from URL if provided (optional parameter)
        self.stream_id = self.scope['url_route']['kwargs'].get('stream_id', None)
        if self.stream_id:
            self.group_name = f'status_{self.stream_id}'
        else:
            self.group_name = 'status'
        
        # Join status group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Send initial connection confirmation
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'stream_id': self.stream_id,
            'status': 'connected'
        }))
    
    async def disconnect(self, close_code):
        # Leave status group
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        try:
            text_data_json = json.loads(text_data)
            # Handle incoming messages
            await self.send(text_data=json.dumps({
                'type': 'status_update',
                'message': 'Received your message',
                'data': text_data_json
            }))
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON'
            }))
    
    async def send_stream_metrics(self, event):
        # Send FPS/latency data to frontend
        await self.send(text_data=json.dumps({
            'type': 'stream_metrics',
            'stream_id': event.get('stream_id'),
            'fps': event.get('fps'),
            'status': event.get('status')
        }))

# class RTSPConsumer(AsyncWebsocketConsumer):
#     async def connect(self):
#         print('RTSPConsumer connect')
#         self.stream_id = self.scope['url_route']['kwargs']['stream_id']
#         self.group_name = f'stream_{self.stream_id}'
        
#         # Join group
#         await self.channel_layer.group_add(
#             self.group_name,
#             self.channel_name
#         )
        
#         await self.accept()
        
#         # Get the stream details and start streaming
#         stream = await self.get_stream(self.stream_id)
#         if stream:
#             manager = StreamManager()
#             if not manager.is_stream_active(self.stream_id):
#                 await sync_to_async(manager.start_stream)(
#                     self.stream_id, 
#                     stream.url, 
#                     self.group_name
#                 )
#         else:
#             await self.send(text_data=json.dumps({
#                 'type': 'error',
#                 'message': 'Stream not found'
#             }))
    
#     async def disconnect(self, close_code):
#         # Leave room group
#         await self.channel_layer.group_discard(
#             self.group_name,
#             self.channel_name
#         )
        
#         # Check if this is the last client, if so stop the stream
#         group_size = await self.get_group_size()
#         if group_size == 0:
#             manager = StreamManager()
#             await sync_to_async(manager.stop_stream)(self.stream_id)
    
#     async def get_group_size(self):
#         # This is a simplified approach - in production you'd want a more robust way
#         # to track the number of clients in a group
#         # For demo purposes we'll stop the stream on any disconnect
#         return 0
    
#     @sync_to_async
#     def get_stream(self, stream_id):
#         try:
#             return Stream.objects.get(id=stream_id, is_active=True)
#         except Stream.DoesNotExist:
#             return None
    
#     # Receive message from WebSocket
#     async def receive(self, text_data):
#         try:
#             text_data_json = json.loads(text_data)
#             message_type = text_data_json.get('type')
            
#             if message_type == 'start_stream':
#                 # Logic to start a stream if it was stopped
#                 pass
#             elif message_type == 'stop_stream':
#                 # Logic to pause a stream
#                 pass
#         except json.JSONDecodeError:
#             pass
    
#     # Receive message from room group
#     async def stream_frame(self, event):
#         # Send frame to WebSocket
#         await self.send(text_data=json.dumps({
#             'type': 'stream_frame',
#             'frame': event['frame'],
#             'stream_id': event['stream_id']
#         }))
    
#     # Handle stream errors
#     async def stream_error(self, event):
#         await self.send(text_data=json.dumps({
#             'type': 'stream_error',
#             'message': event['message'],
#             'stream_id': event['stream_id']
#         }))
# streams/consumers.py
from channels.generic.websocket import AsyncWebsocketConsumer
import json
from .utils.rtsp_client import RTSPClient
from .models import Stream
from asgiref.sync import sync_to_async
import logging
import threading
import asyncio

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('rtsp_consumer')

# Simple global dict to track active streams
active_streams = {}
streams_lock = threading.Lock()

# Background task to clean up streams that should be removed
async def cleanup_streams():
    """Periodically check and remove streams marked for removal"""
    while True:
        await asyncio.sleep(5)  # Check every 5 seconds
        with streams_lock:
            to_remove = []
            for stream_id, client in active_streams.items():
                if hasattr(client, 'should_be_removed') and client.should_be_removed:
                    to_remove.append(stream_id)
            
            for stream_id in to_remove:
                logger.info(f"Cleanup: Removing stream {stream_id} from active streams")
                del active_streams[stream_id]

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

class RTSPConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        """Handle new client connection"""
        logger.info('RTSP Consumer connect initiated')
        self.stream_id = self.scope['url_route']['kwargs']['stream_id']
        self.group_name = f'stream_{self.stream_id}'
        
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()
        logger.info(f'Client connected to stream {self.stream_id}')
        
        try:
            stream = await sync_to_async(Stream.objects.get)(id=self.stream_id, is_active=True)
            url = stream.url
        except Stream.DoesNotExist:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Stream not found'
            }))
            await self.close()
            return
        
        client = RTSPClient(self.stream_id, url, self.group_name)
        active_streams[self.stream_id] = client
        client.start()
        await self.send(text_data=json.dumps({
                'type': 'status',
                'message': 'Started new stream'
            }))
            
        # Make sure cleanup task is running
        for task in asyncio.all_tasks():
            if task.get_name() == 'cleanup_streams':
                break
        else:
            # Start cleanup task if not already running
            cleanup_task = asyncio.create_task(cleanup_streams())
            cleanup_task.set_name('cleanup_streams')
    
    async def disconnect(self, close_code):
        """Handle client disconnection"""
        logger.info(f'Client disconnecting from stream {self.stream_id}')
        
        # Leave room group
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )
        
        # Remove client from stream
        def remove_client():
            with streams_lock:
                if self.stream_id in active_streams:
                    client = active_streams[self.stream_id]
                    client.remove_client()
                    # Stream cleanup happens automatically inside RTSPClient
                    
        await sync_to_async(remove_client)()
        logger.info(f'Client disconnected from stream {self.stream_id}')
    
    async def receive(self, text_data):
        """Handle client sending messages"""
        try:
            text_data_json = json.loads(text_data)
            message_type = text_data_json.get('type')
            
            if message_type == 'ping':
                # Simple keepalive response
                await self.send(text_data=json.dumps({
                    'type': 'pong'
                }))
            
        except json.JSONDecodeError:
            pass
    
    async def stream_frame(self, event):
        """Send a video frame to the client"""
        try:
            await self.send(text_data=json.dumps({
                'type': 'stream_frame',
                'frame': event['frame'],
                'stream_id': event['stream_id']
            }))
        except Exception as e:
            logger.error(f"Error sending frame to client: {str(e)}")
    
    async def stream_status(self, event):
        """Send status message to client"""
        try:
            await self.send(text_data=json.dumps({
                'type': 'stream_status',
                'message': event['message'],
                'stream_id': event['stream_id']
            }))
        except Exception as e:
            logger.error(f"Error sending status to client: {str(e)}")
    
    async def stream_error(self, event):
        """Send error message to client"""
        try:
            await self.send(text_data=json.dumps({
                'type': 'stream_error',
                'message': event['message'],
                'stream_id': event['stream_id']
            }))
        except Exception as e:
            logger.error(f"Error sending error to client: {str(e)}")
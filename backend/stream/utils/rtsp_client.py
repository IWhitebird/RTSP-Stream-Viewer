import cv2
import base64
import threading
import time
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

class RTSPClient:
    def __init__(self, stream_id, url, group_name):
        self.stream_id = stream_id
        self.url = url
        self.group_name = group_name
        self.is_running = False
        self.thread = None
        self.cap = None
        self.channel_layer = get_channel_layer()
        
    def start(self):
        if self.is_running:
            return
        
        self.is_running = True
        self.thread = threading.Thread(target=self._stream_loop)
        self.thread.daemon = True
        self.thread.start()
        
    def stop(self):
        self.is_running = False
        if self.cap:
            self.cap.release()
        if self.thread:
            self.thread.join(timeout=1.0)
            
    def _stream_loop(self):
        self.cap = cv2.VideoCapture(self.url)
        
        if not self.cap.isOpened():
            async_to_sync(self.channel_layer.group_send)(
                self.group_name,
                {
                    "type": "stream_error",
                    "message": f"Failed to open RTSP stream: {self.url}",
                    "stream_id": self.stream_id
                }
            )
            return
        
        while self.is_running:
            ret, frame = self.cap.read()
            
            if not ret:
                time.sleep(0.5)  # Short delay before retry
                continue
                
            # Convert frame to JPEG
            ret, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 70])
            if not ret:
                continue
                
            # Convert to base64 string for easy transport over WebSocket
            base64_image = base64.b64encode(buffer).decode('utf-8')
            
            # Send frame to WebSocket group
            async_to_sync(self.channel_layer.group_send)(
                self.group_name,
                {
                    "type": "stream_frame",
                    "frame": base64_image,
                    "stream_id": self.stream_id
                }
            )
            
            # Control frame rate (adjust as needed)
            time.sleep(0.033)  # ~30 FPS
        
        if self.cap:
            self.cap.release() 
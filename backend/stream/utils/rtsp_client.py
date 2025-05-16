import base64
import threading
import time
import subprocess
import json
import os
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

class RTSPClient:
    def __init__(self, stream_id, url, group_name):
        self.stream_id = stream_id
        self.url = url
        self.group_name = group_name
        self.is_running = False
        self.thread = None
        self.process = None
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
        if self.process:
            try:
                self.process.terminate()
            except:
                pass
            self.process = None
        if self.thread:
            self.thread.join(timeout=1.0)
            
    def _stream_loop(self):

        print("Starting stream loop")
        # Try both TCP and UDP transports
        transports = ['tcp']
        success = False
        
        for transport in transports:
            if not self.is_running:
                return
                
            # FFmpeg command with more resilient options
            # command = [
            #     'ffmpeg',
            #     '-rtsp_transport', transport,  # Try both TCP and UDP
            #     '-stimeout', '5000000',        # Increase socket timeout (5 seconds)
            #     '-i', self.url,                # Input RTSP URL
            #     '-an',                         # Disable audio
            #     '-f', 'image2pipe',            # Output format
            #     '-pix_fmt', 'yuv420p',         # Pixel format
            #     '-vcodec', 'mjpeg',            # Output codec
            #     '-q:v', '5',                   # Quality (1-31, 1 is highest)
            #     '-vf', 'fps=15',               # Lower framerate for more stability
            #     '-'                            # Output to pipe
            # ]

            command = [
                "ffmpeg",
                "-rtsp_transport", "tcp",
                "-i", self.url,
                "-an",
                "-f", "mjpeg",
                "-q:v", "5",
                "-vf", "fps=30",
                "-"
            ]
            
            # Notify about connection attempt
            async_to_sync(self.channel_layer.group_send)(
                self.group_name,
                {
                    "type": "stream_error",
                    "message": f"Connecting to stream using {transport.upper()}...",
                    "stream_id": self.stream_id
                }
            )
            
            try:
                print("Starting FFmpeg process")
                self.process = subprocess.Popen(
                    command,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    bufsize=10**8
                )
                
                # Check if process started successfully by reading initial output
                time.sleep(5)
                if self.process.poll() is not None:
                    # Process already terminated
                    error_output = self.process.stderr.read().decode('utf-8', errors='ignore')
                    if error_output:
                        async_to_sync(self.channel_layer.group_send)(
                            self.group_name,
                            {
                                "type": "stream_error",
                                "message": f"FFmpeg error with {transport}: {error_output[:200]}",
                                "stream_id": self.stream_id
                            }
                        )
                    continue  # Try next transport
                
                # Process started successfully
                success = True
                break
                
            except Exception as e:
                async_to_sync(self.channel_layer.group_send)(
                    self.group_name,
                    {
                        "type": "stream_error",
                        "message": f"Failed to start FFmpeg process: {str(e)}",
                        "stream_id": self.stream_id
                    }
                )
                continue  # Try next transport
        
        if not success:
            async_to_sync(self.channel_layer.group_send)(
                self.group_name,
                {
                    "type": "stream_error",
                    "message": f"Failed to connect to RTSP stream: {self.url}. Please check if the URL is correct and the stream is active.",
                    "stream_id": self.stream_id
                }
            )
            return
            
        # Buffer for reading JPEG frames
        buffer = bytearray()
        jpeg_start = bytes([0xFF, 0xD8])
        jpeg_end = bytes([0xFF, 0xD9])
        
        # Notify about successful connection
        async_to_sync(self.channel_layer.group_send)(
            self.group_name,
            {
                "type": "stream_error",
                "message": f"Connected to stream successfully",
                "stream_id": self.stream_id
            }
        )
        
        consecutive_errors = 0
        while self.is_running:
            try:
                # Check if process is still running
                if self.process.poll() is not None:
                    async_to_sync(self.channel_layer.group_send)(
                        self.group_name,
                        {
                            "type": "stream_error",
                            "message": f"FFmpeg process terminated unexpectedly",
                            "stream_id": self.stream_id
                        }
                    )
                    break
                    
                # Read chunk from ffmpeg's stdout with timeout
                chunk = self.process.stdout.read(8192)
                if not chunk:
                    # End of stream or error
                    consecutive_errors += 1
                    if consecutive_errors > 10:
                        async_to_sync(self.channel_layer.group_send)(
                            self.group_name,
                            {
                                "type": "stream_error",
                                "message": f"No data received from stream for too long",
                                "stream_id": self.stream_id
                            }
                        )
                        break
                    time.sleep(0.5)
                    continue
                
                consecutive_errors = 0
                buffer.extend(chunk)
                
                # Find JPEG boundaries
                start_idx = buffer.find(jpeg_start)
                if start_idx == -1:
                    # No start marker found, keep last 1024 bytes and discard the rest
                    if len(buffer) > 1024:
                        buffer = buffer[-1024:]
                    continue
                    
                end_idx = buffer.find(jpeg_end, start_idx)
                if end_idx == -1:
                    # No end marker found, keep accumulating data
                    # But prevent buffer from growing too large
                    if len(buffer) > 1_000_000:  # 1MB limit
                        buffer = buffer[start_idx:]
                    continue
                    
                # Extract complete JPEG frame
                jpeg_data = buffer[start_idx:end_idx+2]
                buffer = buffer[end_idx+2:]
                
                # Ensure we have a valid JPEG (minimum size check)
                if len(jpeg_data) < 100:
                    continue
                
                # Convert to base64 string for WebSocket transport
                base64_image = base64.b64encode(jpeg_data).decode('utf-8')
                
                # Send frame to WebSocket group
                async_to_sync(self.channel_layer.group_send)(
                    self.group_name,
                    {
                        "type": "stream_frame",
                        "frame": base64_image,
                        "stream_id": self.stream_id
                    }
                )
                
                # Control frame rate (adjusted to match vf fps setting)
                time.sleep(0.066)  # ~15 FPS
                
            except Exception as e:
                consecutive_errors += 1
                async_to_sync(self.channel_layer.group_send)(
                    self.group_name,
                    {
                        "type": "stream_error",
                        "message": f"Error processing stream: {str(e)}",
                        "stream_id": self.stream_id
                    }
                )
                if consecutive_errors > 5:
                    break
                time.sleep(1)
        
        if self.process:
            try:
                self.process.terminate()
            except:
                pass
            self.process = None 
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
            
    # def _stream_loop(self):

    #     print("Starting stream loop")
    #     # Try both TCP and UDP transports
    #     transport = 'udp'
    #     success = False
      
    #     # FFmpeg command with more resilient options
    #     # command = [
    #     #     'ffmpeg',
    #     #     '-rtsp_transport', transport,  # Try both TCP and UDP
    #     #     '-stimeout', '5000000',        # Increase socket timeout (5 seconds)
    #     #     '-i', self.url,                # Input RTSP URL
    #     #     '-an',                         # Disable audio
    #     #     '-f', 'image2pipe',            # Output format
    #     #     '-pix_fmt', 'yuv420p',         # Pixel format
    #     #     '-vcodec', 'mjpeg',            # Output codec
    #     #     '-q:v', '5',                   # Quality (1-31, 1 is highest)
    #     #     '-vf', 'fps=15',               # Lower framerate for more stability
    #     #     '-'                            # Output to pipe
    #     # ]

    #     command = [
    #         "ffmpeg",
    #         "-rtsp_transport", transport,
    #         "-i", self.url,
    #         "-an",
    #         "-f", "mjpeg",
    #         "-q:v", "5",
    #         "-vf", "fps=15",
    #         "-"
    #     ]
        
    #     # Notify about connection attempt
    #     async_to_sync(self.channel_layer.group_send)(
    #         self.group_name,
    #         {
    #             "type": "stream_error",
    #             "message": f"Connecting to stream using {transport.upper()}...",
    #             "stream_id": self.stream_id
    #         }
    #     )
        
    #     try:
    #         print("Starting FFmpeg process")
    #         self.process = subprocess.Popen(
    #             command,
    #             stdout=subprocess.PIPE,
    #             stderr=subprocess.PIPE,
    #             bufsize=10**8
    #         )
            
    #         # Check if process started successfully by reading initial output
    #         time.sleep(5)
    #         if self.process.poll() is not None:
    #             # Process already terminated
    #             error_output = self.process.stderr.read().decode('utf-8', errors='ignore')
    #             if error_output:
    #                 async_to_sync(self.channel_layer.group_send)(
    #                     self.group_name,
    #                     {
    #                         "type": "stream_error",
    #                         "message": f"FFmpeg error with {transport}: {error_output[:200]}",
    #                         "stream_id": self.stream_id
    #                     }
    #                 )
            
    #         # Process started successfully
    #         success = True
            
    #     except Exception as e:
    #         print(f"Error starting FFmpeg process: {str(e)}")
    #         async_to_sync(self.channel_layer.group_send)(
    #             self.group_name,
    #             {
    #                 "type": "stream_error",
    #                 "message": f"Failed to start FFmpeg process: {str(e)}",
    #                 "stream_id": self.stream_id
    #             }
    #         )
    
    #     if not success:
    #         async_to_sync(self.channel_layer.group_send)(
    #             self.group_name,
    #             {
    #                 "type": "stream_error",
    #                 "message": f"Failed to connect to RTSP stream: {self.url}. Please check if the URL is correct and the stream is active.",
    #                 "stream_id": self.stream_id
    #             }
    #         )
    #         return
            
    #     # Buffer for reading JPEG frames
    #     buffer = bytearray()
    #     jpeg_start = bytes([0xFF, 0xD8])
    #     jpeg_end = bytes([0xFF, 0xD9])
        
    #     # Notify about successful connection
    #     async_to_sync(self.channel_layer.group_send)(
    #         self.group_name,
    #         {
    #             "type": "stream_error",
    #             "message": f"Connected to stream successfully",
    #             "stream_id": self.stream_id
    #         }
    #     )
        
    #     consecutive_errors = 0
    #     while self.is_running:
    #         try:
    #             # Check if process is still running
    #             if self.process.poll() is not None:
    #                 async_to_sync(self.channel_layer.group_send)(
    #                     self.group_name,
    #                     {
    #                         "type": "stream_error",
    #                         "message": f"FFmpeg process terminated unexpectedly",
    #                         "stream_id": self.stream_id
    #                     }
    #                 )
    #                 break
                    
    #             # Read chunk from ffmpeg's stdout with timeout
    #             chunk = self.process.stdout.read(8192)
    #             if not chunk:
    #                 # End of stream or error
    #                 consecutive_errors += 1
    #                 if consecutive_errors > 10:
    #                     async_to_sync(self.channel_layer.group_send)(
    #                         self.group_name,
    #                         {
    #                             "type": "stream_error",
    #                             "message": f"No data received from stream for too long",
    #                             "stream_id": self.stream_id
    #                         }
    #                     )
    #                     break
    #                 time.sleep(0.5)
    #                 continue
                
    #             consecutive_errors = 0
    #             buffer.extend(chunk)
                
    #             # Find JPEG boundaries
    #             start_idx = buffer.find(jpeg_start)
    #             if start_idx == -1:
    #                 # No start marker found, keep last 1024 bytes and discard the rest
    #                 if len(buffer) > 1024:
    #                     buffer = buffer[-1024:]
    #                 continue
                    
    #             end_idx = buffer.find(jpeg_end, start_idx)
    #             if end_idx == -1:
    #                 # No end marker found, keep accumulating data
    #                 # But prevent buffer from growing too large
    #                 if len(buffer) > 1_000_000:  # 1MB limit
    #                     buffer = buffer[start_idx:]
    #                 continue
                    
    #             # Extract complete JPEG frame
    #             jpeg_data = buffer[start_idx:end_idx+2]
    #             buffer = buffer[end_idx+2:]
                
    #             # Ensure we have a valid JPEG (minimum size check)
    #             if len(jpeg_data) < 100:
    #                 continue
                
    #             # Convert to base64 string for WebSocket transport
    #             base64_image = base64.b64encode(jpeg_data).decode('utf-8')
                
    #             # Send frame to WebSocket group
    #             async_to_sync(self.channel_layer.group_send)(
    #                 self.group_name,
    #                 {
    #                     "type": "stream_frame",
    #                     "frame": base64_image,
    #                     "stream_id": self.stream_id
    #                 }
    #             )
                
    #             # Control frame rate (adjusted to match vf fps setting)
    #             time.sleep(0.066)  # ~15 FPS
                
    #         except Exception as e:
    #             consecutive_errors += 1
    #             async_to_sync(self.channel_layer.group_send)(
    #                 self.group_name,
    #                 {
    #                     "type": "stream_error",
    #                     "message": f"Error processing stream: {str(e)}",
    #                     "stream_id": self.stream_id
    #                 }
    #             )
    #             if consecutive_errors > 5:
    #                 break
    #             time.sleep(1)
        
    #     if self.process:
    #         try:
    #             self.process.terminate()
    #         except:
    #             pass
    #         self.process = None 


    def _stream_loop(self):
        print("Starting optimized stream loop")
        # transport_types = ['udp', 'tcp']  # Test UDP first, then TCP
        transport_types = ['tcp']  # Test UDP first, then TCP
        success = False
        
        # Optimized FFmpeg command for low latency streaming
        base_command = [
            "ffmpeg",
            "-rtsp_transport", "",  # To be filled dynamically
            "-fflags", "nobuffer",
            "-flags", "low_delay",
            "-hwaccel", "auto",     # Use hardware acceleration if available
            "-i", self.url,
            "-an",                  # Disable audio
            "-f", "mjpeg",
            "-q:v", "3",           # Slightly better quality
            "-vf", "fps=15",
            "-vsync", "passthrough",
            "-flush_packets", "1",
            "-"
        ]

        for transport in transport_types:
            command = base_command.copy()
            command[command.index("-rtsp_transport") + 1] = transport

            # Notify connection attempt
            self._send_status(f"Connecting via {transport.upper()}...")
            
            try:
                self.process = subprocess.Popen(
                    command,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    bufsize=1<<18  # 256KB buffer
                )
                
                # Give FFmpeg time to initialize
                for _ in range(5):
                    if self.process.poll() is not None:
                        break
                    time.sleep(1)
                else:
                    success = True
                    break

            except Exception as e:
                self._send_error(f"Connection failed: {str(e)}")
                continue

        if not success:
            self._send_error("All transport protocols failed")
            return

        # Binary frame processing variables
        jpeg_start = memoryview(b'\xff\xd8')
        jpeg_end = memoryview(b'\xff\xd9')
        buffer = bytearray()
        max_buffer_size = 5 * 1024 * 1024  # 5MB max buffer

        # Direct binary frame sending (no base64)
        frame_count = 0
        start_time = time.time()
        
        while self.is_running:
            try:
                # Read larger chunks for efficiency
                chunk = self.process.stdout.read(65536)
                if not chunk:
                    if self.process.poll() is not None:
                        break
                    time.sleep(0.1)
                    continue
                
                buffer.extend(chunk)
                
                # Prevent buffer overflow
                if len(buffer) > max_buffer_size:
                    self._send_warning("Buffer overflow detected")
                    buffer.clear()
                    continue

                while True:
                    start_pos = buffer.find(jpeg_start)
                    if start_pos == -1:
                        break
                    
                    end_pos = buffer.find(jpeg_end, start_pos)
                    if end_pos == -1:
                        break
                        
                    # Extract complete frame
                    frame = buffer[start_pos:end_pos+2]
                    del buffer[:end_pos+2]
                    
                    # Send frame directly as binary
                    self._send_frame(frame)
                    
                    # Maintain target FPS
                    frame_count += 1
                    elapsed = time.time() - start_time
                    target_time = frame_count / 15
                    if elapsed < target_time:
                        time.sleep(target_time - elapsed)

            except Exception as e:
                self._send_error(f"Processing error: {str(e)}")
                time.sleep(1)  # Prevent tight error loop

        # Cleanup
        self._terminate_ffmpeg()

    def _send_frame(self, frame_data):
        encoded = base64.b64encode(frame_data).decode('ascii')
        async_to_sync(self.channel_layer.group_send)(
            self.group_name,
            {
                "type": "stream_frame",
                "frame": encoded,
                "stream_id": self.stream_id
            }
        )


    def _send_status(self, message):
        async_to_sync(self.channel_layer.group_send)(
            self.group_name,
            {
                "type": "stream_error",
                "message": message,
                "stream_id": self.stream_id
            }
        )

    def _send_error(self, message):
        async_to_sync(self.channel_layer.group_send)(
            self.group_name,
            {
                "type": "stream_error",
                "message": message,
                "stream_id": self.stream_id
            }
        )

    def _terminate_ffmpeg(self):
        if self.process:
            try:
                self.process.stdout.close()
                self.process.stderr.close()
                self.process.terminate()
                wait_sec = 5
                for _ in range(wait_sec):
                    if self.process.poll() is not None:
                        break
                    time.sleep(1)
                else:
                    self.process.kill()
            except Exception as e:
                print(f"Cleanup error: {str(e)}")
            finally:
                self.process = None
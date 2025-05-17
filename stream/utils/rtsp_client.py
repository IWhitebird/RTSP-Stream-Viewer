import asyncio
import base64
import threading
import time
import subprocess
import os
import signal
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
import logging
import importlib

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('rtsp_client')

class RTSPClient:
    def __init__(self, stream_id, url, group_name):
        self.stream_id = stream_id
        self.url = url
        self.group_name = group_name
        self.is_running = False
        self.thread = None
        self.process = None
        self.channel_layer = get_channel_layer()
        self.client_count = 0
        self.last_frame_time = 0
        self.fps = 15
        self.frame_buffer = None  # Store last frame for new clients
        self.lock = threading.Lock()  # For thread safety
        
    def start(self):
        with self.lock:
            self.client_count += 1
            logger.info(f"Client joined stream {self.stream_id} - Total clients: {self.client_count}")
            
            if self.is_running:
                return  # Stream already running
            
            self.is_running = True
            self.thread = threading.Thread(target=self._stream_loop)
            self.thread.daemon = True
            self.thread.start()
            logger.info(f"Started stream {self.stream_id}")
    
    def add_client(self):
        """Increment client count without starting the stream if already running"""
        with self.lock:
            self.client_count += 1
            logger.info(f"Client joined stream {self.stream_id} - Total clients: {self.client_count}")
    
    def remove_client(self):
        """Decrement client count and stop stream if no clients remain"""
        with self.lock:
            if self.client_count > 0:
                self.client_count -= 1
            logger.info(f"Client left stream {self.stream_id} - Remaining clients: {self.client_count}")
        self._shutdown()
    
        
    def _stream_loop(self):
        logger.info(f"Starting optimized stream loop for {self.stream_id}")
        
        # Try TCP first as it's more reliable for most RTSP servers
        transport_types = ['tcp']  
        success = False
        
        # Resource usage optimizations
        cpu_count = os.cpu_count() or 4  # Get CPU count or default to 2
        thread_count = max(1, min(cpu_count // 2, 4))  # Use at most half of CPUs, max 4
        
        # Optimized FFmpeg command for low latency streaming
        base_command = [
            "ffmpeg",
            "-rtsp_transport", "",  # To be filled dynamically
            "-fflags", "nobuffer",
            "-flags", "low_delay",
            "-hwaccel", "auto",     # Hardware acceleration
            "-threads", str(thread_count),  # Limit threads
            "-i", self.url,
            "-an",                  # Disable audio
            "-f", "mjpeg",
            "-q:v", "1",            # Slightly lower quality (1-31, lower is better)
            "-vf", f"scale=640:-1,fps={self.fps}",  # Lower resolution and FPS
            "-vsync", "passthrough",
            "-flush_packets", "1",
            "-"
        ]

        # Prioritize TCP as it's more reliable for RTSP
        for transport in transport_types:
            if not self.is_running:
                break
                
            command = base_command.copy()
            command[command.index("-rtsp_transport") + 1] = transport
            
            # Notify connection attempt
            logger.info(f"Connecting via {transport.upper()}...")
            self._send_status(f"Connecting via {transport.upper()}...")
            
            try:
                # Use process group to ensure we can kill ffmpeg and all its children
                self.process = subprocess.Popen(
                    command,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    bufsize=1<<20,  # 1MB buffer
                    preexec_fn=os.setsid  # Create new process group
                )
                
                # Give FFmpeg time to initialize
                for _ in range(3):
                    if not self.is_running or self.process.poll() is not None:
                        break
                    time.sleep(0.5)
                else:
                    success = True
                    break

            except Exception as e:
                logger.error(f"Connection failed: {str(e)}")
                self._send_error(f"Connection failed: {str(e)}")
                continue

        if not success:
            logger.error("All transport protocols failed")
            self._send_error("All transport protocols failed")
            self._shutdown()
            return

        # Binary frame processing variables
        jpeg_start = memoryview(b'\xff\xd8')
        jpeg_end = memoryview(b'\xff\xd9')
        buffer = bytearray()
        max_buffer_size = 1 * 1024 * 1024  # 2MB max buffer
        
        # Frame rate control
        frame_interval = 1.0 / self.fps
        last_frame_time = time.time()
        
        # Send frames only when clients are connected
        while self.is_running:
            # print("Stream loop running")
            try:
                # Check if we have clients before processing
                with self.lock:
                    has_clients = self.client_count > 0
                    
                if not has_clients:
                    # No clients, sleep to reduce CPU usage but keep stream active
                    time.sleep(0.5)
                    continue
                    
                # Read from ffmpeg only when we have clients
                chunk = self.process.stdout.read(65536)
                if not chunk:
                    if self.process.poll() is not None:
                        break
                    time.sleep(0.1)
                    continue
                
                buffer.extend(chunk)
                
                # Prevent buffer overflow
                if len(buffer) > max_buffer_size:
                    buffer = buffer[-max_buffer_size:]  # Keep the last part
                
                # Extract complete frames
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
                    
                    # Check if enough time has passed since last frame
                    current_time = time.time()
                    elapsed = current_time - last_frame_time
                    
                    if elapsed >= frame_interval:
                        # Encode and cache the frame
                        encoded = base64.b64encode(frame).decode('ascii')
                        with self.lock:
                            self.frame_buffer = encoded
                        # Only send if we have clients
                        if has_clients:
                            self._send_frame(encoded)
                            
                        last_frame_time = current_time
                    else:
                        # Skip this frame to maintain target FPS
                        pass

            except Exception as e:
                logger.error(f"Stream processing error: {str(e)}")
                # Don't crash on errors, just log and continue
                time.sleep(0.5)

        self._shutdown()



    def _shutdown(self, delay=2):
        """Wait for a period before shutting down to avoid rapid start/stop cycles"""
        time.sleep(delay)
        logger.info(f"Shutting down stream {self.stream_id} in {delay}s")
        with self.lock:
            logger.info(f"Client count: {self.client_count} and is running: {self.is_running}")
            if self.client_count == 0:
                logger.info(f"No clients for {delay}s, stopping stream {self.stream_id}")
                self._stop_stream()
                
    
    def _stop_stream(self):
        """Internal method to actually stop the stream"""
        self.is_running = False
        if self.process:
            try:
                pgid = os.getpgid(self.process.pid)
                os.killpg(pgid, signal.SIGTERM)
            except:
                try:
                    self.process.terminate()
                except:
                    pass
            self.process = None
            
            logger.info(f"Stopped stream {self.stream_id}")
    
    def _send_frame(self, encoded_frame):
        """Send an encoded frame to all clients in the group"""
        try:
            async_to_sync(self.channel_layer.group_send)(
                self.group_name,
                {
                    "type": "stream_frame",
                    "frame": encoded_frame,
                    "stream_id": self.stream_id
                }
            )
            self.last_frame_time = time.time()
        except Exception as e:
            logger.error(f"Error sending frame: {str(e)}")

    def _send_status(self, message):
        """Send status message to clients"""
        try:
            async_to_sync(self.channel_layer.group_send)(
                self.group_name,
                {
                    "type": "stream_status",
                    "message": message,
                    "stream_id": self.stream_id
                }
            )
        except Exception as e:
            logger.error(f"Error sending status: {str(e)}")

    def _send_error(self, message):
        """Send error message to clients"""
        try:
            async_to_sync(self.channel_layer.group_send)(
                self.group_name,
                {
                    "type": "stream_error",
                    "message": message,
                    "stream_id": self.stream_id
                }
            )
        except Exception as e:
            logger.error(f"Error sending error message: {str(e)}")

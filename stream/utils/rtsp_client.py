import threading
import time
import subprocess
import os
import signal
import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from .mtcnn_detector import MTCNNDetector

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
        self.fps = 30
        self.frame_buffer = None
        self.face_detector = MTCNNDetector()
        
    def start(self):
        self.client_count += 1
        logger.info(f"Client joined stream {self.stream_id} - Total clients: {self.client_count}")
        
        if self.is_running:
            # If already running, and we have a frame buffer, send it to the new client
            if self.frame_buffer:
                logger.info(f"Sending buffered frame to new client for stream {self.stream_id}")
                self._send_frame(self.frame_buffer)
            return
        
        self.is_running = True
        self.thread = threading.Thread(target=self._stream_loop)
        self.thread.daemon = True
        self.thread.start()
        logger.info(f"Started stream {self.stream_id}")
    
    def add_client(self):
        self.client_count += 1
        logger.info(f"Client joined stream {self.stream_id} - Total clients: {self.client_count}")
        # If stream is running and we have a frame buffer, send it
        if self.is_running and self.frame_buffer:
            logger.info(f"Sending buffered frame to new client for stream {self.stream_id}")
            self._send_frame(self.frame_buffer)

    def remove_client(self):
        if self.client_count > 0:
            self.client_count -= 1
        logger.info(f"Client left stream {self.stream_id} - Remaining clients: {self.client_count}")
        
        # Consider stopping the stream if no clients are left after a short delay
        # This part of your logic seemed a bit complex with _shutdown, simplifying:
        if self.client_count == 0 and self.is_running:
            logger.info(f"No clients for stream {self.stream_id}, scheduling stop.")
            # A simple delay before stopping to handle quick reconnects
            threading.Timer(5.0, self._check_and_stop).start() 

    def _check_and_stop(self):
        if self.client_count == 0 and self.is_running:
            logger.info(f"Stopping stream {self.stream_id} due to no clients.")
            self._stop_stream()
            
    def _stream_loop(self):
        logger.info(f"Starting optimized stream loop for {self.stream_id}")
        
        transport_types = ['tcp', 'udp']
        success = False
        
        cpu_count = os.cpu_count() or 4
        thread_count = max(1, min(cpu_count // 2, 4))

        logger.info(f"RTSP URL: {self.url}")
        
        base_command = [
            "ffmpeg",                        # Call FFmpeg executable
            "-rtsp_transport", "",           # Specify RTSP transport protocol (e.g., tcp, udp) — empty here, likely to be filled dynamically
            "-fflags", "nobuffer",           # Disable buffering to reduce latency
            "-flags", "low_delay",           # Enable low delay mode for real-time streaming
            "-hwaccel", "auto",              # Use hardware acceleration if available
            "-threads", str(thread_count),   # Set number of threads for decoding (passed dynamically)
            "-i", self.url,                  # Input stream URL (RTSP in this case)
            "-an",                           # Disable audio processing (no audio)
            "-f", "mjpeg",                   # Set output format to MJPEG (Motion JPEG)
            "-q:v", "10",                     # Set video quality (lower is better, 1 is highest quality)
            "-vf", f"scale=640:-1,fps={self.fps}",  # Apply video filters: scale to 640px width (maintain aspect ratio), set target FPS
            "-vsync", "passthrough",         # Pass through frames without modifying timing (avoid frame duplication/dropping)
            "-flush_packets", "1",           # Flush packets immediately to reduce latency
            "-"                              # Output to stdout (for piping or in-memory handling)
        ]

        for transport in transport_types:
            if not self.is_running:
                break
                
            command = base_command.copy()
            command[command.index("-rtsp_transport") + 1] = transport
            
            logger.info(f"Attempting to connect to {self.stream_id} via {transport.upper()}...")
            self._send_status(f"Connecting via {transport.upper()}...")
            
            try:
                self.process = subprocess.Popen(
                    command,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE, # Capture stderr
                    bufsize=10**8, # Increased buffer for stdout, default might be too small
                    preexec_fn=os.setsid
                )
                
                # Check if ffmpeg started successfully after a short delay
                time.sleep(2) # Give FFmpeg some time to connect or fail
                if self.process.poll() is None: # If poll() is None, process is running
                    logger.info(f"Successfully connected to {self.stream_id} via {transport.upper()}")
                    success = True
                    break
                else:
                    stderr_output = self.process.stderr.read().decode(errors='ignore')
                    logger.error(f"FFmpeg failed to start for {self.stream_id} via {transport.upper()}. Exit code: {self.process.returncode}. Stderr: {stderr_output}")
                    self._send_error(f"FFmpeg failed (transport: {transport.upper()}): {stderr_output[:200]}") # Send part of error

            except Exception as e:
                logger.error(f"Connection failed for {self.stream_id} via {transport.upper()}: {str(e)}")
                self._send_error(f"Connection failed (transport: {transport.upper()}): {str(e)}")
                continue

        if not success:
            logger.error(f"FFmpeg unable to connect to {self.url} using {transport_types}")
            self._send_error(f"FFmpeg unable to connect to {self.url}")
            self._stop_stream() # Ensure is_running is set to False
            return

        jpeg_start = b'\xff\xd8'
        jpeg_end = b'\xff\xd9'
        buffer = bytearray()
        max_buffer_size = 100 * 1024 * 1024  # 10MB max buffer, ensure it's larger than largest possible frame

        # frame_interval = 1.0 / self.fps

        while self.is_running:
            if self.client_count == 0:
                # No clients, FFmpeg might still be running, but we don't process/send.
                # This also means face detection doesn't run, saving CPU.
                time.sleep(0.1) # Sleep a bit to avoid busy-waiting
                continue # Continue checking is_running and client_count

            try:
                chunk = self.process.stdout.read(8096) # Read smaller chunks more frequently
                if not chunk:
                    if self.process.poll() is not None: # FFmpeg process terminated
                        stderr_output = self.process.stderr.read().decode(errors='ignore')
                        logger.error(f"FFmpeg process for {self.stream_id} terminated unexpectedly. Stderr: {stderr_output}")
                        self._send_error("FFmpeg process terminated.")
                        break
                    time.sleep(0.01) # No data, but process alive, wait briefly
                    continue
                
                buffer.extend(chunk)
                
                if len(buffer) > max_buffer_size:
                    # If buffer is too large, try to find the last JPEG start marker
                    # to salvage part of the stream, rather than just truncating the head.
                    last_jpeg_start_pos = buffer.rfind(jpeg_start)
                    if last_jpeg_start_pos != -1:
                        buffer = buffer[last_jpeg_start_pos:]
                    else: # Should not happen if JPEGs are coming
                        buffer = bytearray() # Clear buffer if no start marker found
                    logger.warning(f"Buffer overflow for {self.stream_id}, trimmed buffer.")

                while True:
                    start_pos = buffer.find(jpeg_start)
                    if start_pos == -1:
                        break 
                    
                    end_pos = buffer.find(jpeg_end, start_pos + len(jpeg_start)) # Search after start
                    if end_pos == -1:
                        # Found start, but not end yet, need more data
                        if len(buffer) > max_buffer_size * 0.8 and start_pos > max_buffer_size * 0.2:
                             # If a partial frame is consuming too much buffer and not at the beginning,
                             # discard the beginning part to make space for its end.
                            buffer = buffer[start_pos:]
                        break 
                        
                    raw_frame_bytes = bytes(buffer[start_pos : end_pos + len(jpeg_end)])
                    
                    # Basic validation of extracted frame bytes
                    if not raw_frame_bytes or len(raw_frame_bytes) < 200: # Arbitrary small size for a JPEG
                        logger.warning(f"Skipping very small/empty frame candidate: {len(raw_frame_bytes)} bytes for {self.stream_id}")
                        del buffer[:end_pos + len(jpeg_end)]
                        continue

                    del buffer[:end_pos + len(jpeg_end)] # Consume frame from buffer
                    # current_time = time.time()
                    processed_frame_bytes = raw_frame_bytes
                    if self.face_detector:
                        try:
                            modified_frame_bytes, success = self.face_detector.detect_faces(raw_frame_bytes)
                            if success:
                                processed_frame_bytes = modified_frame_bytes
                        except Exception as e:
                            logger.error(f"Unhandled exception in face detection for {self.stream_id}: {e}", exc_info=True)
                    
                    self.frame_buffer = processed_frame_bytes 
                    self._send_frame(processed_frame_bytes)
                    # self.last_frame_time = current_time
                        
                    # else: Skip frame to maintain FPS
            
            except Exception as e:
                logger.error(f"Error in stream loop for {self.stream_id}: {str(e)}", exc_info=True)
                # If stdout.read() fails, it might be an OSError if the pipe is broken
                if isinstance(e, BrokenPipeError) or isinstance(e, OSError):
                    logger.error(f"Pipe broken for {self.stream_id}. FFmpeg might have crashed.")
                    break
                time.sleep(0.1) # Avoid tight loop on other errors

        logger.info(f"Stream loop for {self.stream_id} ended.")
        self._stop_stream() # Clean up FFmpeg if loop exits

    def _stop_stream(self):
        self.is_running = False
        
        original_process = self.process
        pid = original_process.pid if original_process else None

        self.process = None # Clear immediately
        self.frame_buffer = None

        if original_process and pid:
            logger.info(f"Attempting to stop FFmpeg process for stream {self.stream_id} (PID: {pid}).")
            try:
                if original_process.poll() is None: # Check if it's running
                    original_process.terminate()
                    try:
                        # Brief wait for terminate to take effect
                        original_process.wait(timeout=1.0) 
                    except subprocess.TimeoutExpired:
                        logger.warning(f"FFmpeg process {pid} (stream {self.stream_id}) didn't terminate quickly. Killing.")
                        if original_process.poll() is None: # Check again before kill
                           original_process.kill()
                           original_process.wait(timeout=1.0) # Brief wait for kill
                    except Exception: # Catch if wait fails (e.g., process died before wait)
                        pass # Already stopped or error during wait, proceed
                
                if original_process.poll() is None:
                    logger.error(f"FFmpeg process {pid} (stream {self.stream_id}) may still be running after stop attempts.")
                else:
                    logger.info(f"FFmpeg process {pid} (stream {self.stream_id}) stopped or was already stopped. Return code: {original_process.returncode}")

            except Exception as e:
                logger.error(f"Error during FFmpeg stop for stream {self.stream_id} (PID: {pid}): {e}")
        else:
            logger.info(f"No FFmpeg process to stop for stream {self.stream_id}, or it was already cleared.")
        
        logger.info(f"Stream {self.stream_id} cleanup attempt complete. is_running: {self.is_running}")

    def _send_frame(self, frame_bytes):
        try:
            async_to_sync(self.channel_layer.group_send)(
                self.group_name,
                {
                    "type": "stream_frame",
                    "frame": frame_bytes, # Send raw bytes
                }
            )
        except Exception as e:
            logger.error(f"Error sending frame for {self.stream_id}: {str(e)}")

    def _send_status(self, message):
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
            logger.error(f"Error sending status for {self.stream_id}: {str(e)}")

    def _send_error(self, message):
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
            logger.error(f"Error sending error message for {self.stream_id}: {str(e)}")
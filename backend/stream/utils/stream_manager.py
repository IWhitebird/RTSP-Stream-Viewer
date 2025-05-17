from .rtsp_client import RTSPClient
import logging
import time
import threading

# Set up logging
logger = logging.getLogger('stream_manager')

class StreamManager:
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(StreamManager, cls).__new__(cls)
                cls._instance.streams = {}
                cls._instance.stream_metrics = {}
                cls._instance._initialize()
            return cls._instance
    
    def _initialize(self):
        """Initialize the manager with monitoring"""
        self.monitor_thread = threading.Thread(target=self._stream_monitor)
        self.monitor_thread.daemon = True
        self.monitor_thread.start()
        logger.info("Stream Manager initialized")
    
    def _stream_monitor(self):
        """Background thread to monitor stream health"""
        while True:
            try:
                # Check each stream's health every 10 seconds
                for stream_id in list(self.streams.keys()):
                    try:
                        if stream_id in self.stream_metrics:
                            last_frame = self.stream_metrics[stream_id].get('last_frame_time', 0)
                            if last_frame > 0 and time.time() - last_frame > 10:
                                logger.warning(f"Stream {stream_id} appears frozen - restarting")
                                self.restart_stream(stream_id)
                    except Exception as e:
                        logger.error(f"Error monitoring stream {stream_id}: {str(e)}")
            except Exception as e:
                logger.error(f"Error in stream monitor: {str(e)}")
            time.sleep(10)
    
    def start_stream(self, stream_id, url, group_name):
        """Start a new RTSP stream"""
        with self._lock:
            if stream_id in self.streams:
                logger.info(f"Stream {stream_id} already exists - adding client")
                self.streams[stream_id].add_client()
                return True
            
            logger.info(f"Starting new stream {stream_id}")
            client = RTSPClient(stream_id, url, group_name)
            self.streams[stream_id] = client
            self.stream_metrics[stream_id] = {
                'start_time': time.time(),
                'last_frame_time': 0,
                'clients': 1,
                'restarts': 0
            }
            client.start()
            return True
    
    def restart_stream(self, stream_id):
        """Restart a problematic stream"""
        with self._lock:
            if stream_id in self.streams and stream_id in self.stream_metrics:
                try:
                    # Get stream details before stopping
                    old_client = self.streams[stream_id]
                    url = old_client.url
                    group_name = old_client.group_name
                    client_count = old_client.client_count
                    
                    # Stop the old stream
                    logger.info(f"Restarting stream {stream_id}")
                    old_client.stop()
                    
                    # Create a new stream
                    new_client = RTSPClient(stream_id, url, group_name)
                    self.streams[stream_id] = new_client
                    
                    # Update metrics
                    self.stream_metrics[stream_id]['restarts'] += 1
                    self.stream_metrics[stream_id]['last_restart'] = time.time()
                    
                    # Restore client count and start
                    with new_client.lock:
                        new_client.client_count = client_count
                    new_client.start()
                    
                    # Send notification
                    new_client._send_status("Stream restarted due to connection issues")
                    
                    return True
                except Exception as e:
                    logger.error(f"Error restarting stream {stream_id}: {str(e)}")
            return False
    
    def add_client_to_stream(self, stream_id):
        """Add a client to an existing stream"""
        with self._lock:
            if stream_id in self.streams:
                self.streams[stream_id].add_client()
                if stream_id in self.stream_metrics:
                    self.stream_metrics[stream_id]['clients'] = self.streams[stream_id].client_count
                return True
            return False
    
    def remove_client_from_stream(self, stream_id):
        """Remove a client from a stream"""
        with self._lock:
            if stream_id in self.streams:
                self.streams[stream_id].remove_client()
                if stream_id in self.stream_metrics:
                    self.stream_metrics[stream_id]['clients'] = self.streams[stream_id].client_count
                return True
            return False
    
    def stop_stream(self, stream_id):
        """Force stop a running stream"""
        with self._lock:
            if stream_id in self.streams:
                logger.info(f"Stopping stream {stream_id}")
                self.streams[stream_id].stop()
                del self.streams[stream_id]
                if stream_id in self.stream_metrics:
                    del self.stream_metrics[stream_id]
                return True
            return False
    
    def is_stream_active(self, stream_id):
        """Check if a stream is currently active"""
        with self._lock:
            return stream_id in self.streams
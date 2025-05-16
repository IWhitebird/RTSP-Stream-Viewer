from .rtsp_client import RTSPClient

class StreamManager:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(StreamManager, cls).__new__(cls)
            cls._instance.streams = {}
        return cls._instance
    
    def start_stream(self, stream_id, url, group_name):
        """Start a new RTSP stream"""
        if stream_id in self.streams:
            self.stop_stream(stream_id)
            
        client = RTSPClient(stream_id, url, group_name)
        self.streams[stream_id] = client
        client.start()
        return True
    
    def stop_stream(self, stream_id):
        """Stop a running stream"""
        if stream_id in self.streams:
            self.streams[stream_id].stop()
            del self.streams[stream_id]
            return True
        return False
    
    def get_active_streams(self):
        """Get a list of all active stream IDs"""
        return list(self.streams.keys())
    
    def stop_all_streams(self):
        """Stop all running streams"""
        for stream_id in list(self.streams.keys()):
            self.stop_stream(stream_id)
            
    def is_stream_active(self, stream_id):
        """Check if a stream is currently active"""
        return stream_id in self.streams 
import React, { useEffect, useState, useRef } from 'react';
import { Card, CardDescription, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Play, Pause, RefreshCw, Maximize, Minimize, Video, VideoOff, Activity, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResizablePanel } from "../ui/resizable";

interface StreamViewerProps {
  streamId: string;
  streamName: string;
  baseUrl?: string;
  removeStream: () => void;
}

interface StreamFrame {
  type: string;
  frame?: string;
  message?: string;
  stream_id: string;
}

const StreamViewer: React.FC<StreamViewerProps> = ({ 
  streamId, 
  streamName,
  baseUrl = 'ws://127.0.0.1:8000/ws', // Default to local development
  removeStream
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  //Put data frames in a queue so we show smooth video.
  const [, setFrameQueue] = useState<string[]>([]);
  const [currentFrame, setCurrentFrame] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [, setLastFrameTime] = useState<number | null>(null);
  const [showControls, setShowControls] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const frameTimesRef = useRef<number[]>([]);

  const STREAM_FRAMES = useRef(15);

  useEffect(() => {
    connectWebSocket();
    return () => {
      disconnectWebSocket();
    };
  }, [streamId]);

  useEffect(() => {
    if (isPaused) return;
  
    const interval = setInterval(() => {
      setFrameQueue(prevQueue => {
        if (prevQueue.length === 0) return prevQueue;
  
        const [nextFrame, ...rest] = prevQueue;
        setCurrentFrame(nextFrame);
        setLastFrameTime(Date.now());
        return rest;
      });
    }, 1000 / STREAM_FRAMES.current);
  
    return () => clearInterval(interval);
  }, []);
  

  const connectWebSocket = () => {
    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
    }

    // Create new WebSocket connection
    // Use path without ws/ prefix to match backend routes
    const ws = new WebSocket(`${baseUrl}/stream/${streamId}/`);
    wsRef.current = ws;

    ws.onopen = () => {
      setFrameQueue([]);
      setCurrentFrame(null);
      setIsConnected(true);
      setError(null);
      frameTimesRef.current = [];
    };

    ws.onmessage = (event) => {
      try {
        const data: StreamFrame = JSON.parse(event.data);
        
        if (!isPaused && data.type === 'stream_frame' && data.frame) {
          setFrameQueue(prevQueue => {
            const newQueue = [...prevQueue, data.frame!];
            // Optional: Limit queue length to prevent memory bloating
            if (newQueue.length > STREAM_FRAMES.current) newQueue.shift();
            return newQueue;
          });

          setLastFrameTime(Date.now());
        } else if (data.type === 'stream_error' && data.message) {
          setError(data.message);
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('Connection error');
      setIsConnected(false);
    };

    ws.onclose = () => {
      setIsConnected(false);
    };
  };

  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  const handleReconnect = () => {
    connectWebSocket();
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const toggleFullscreen = () => {
    if (!cardRef.current) return;
    
    if (!document.fullscreenElement) {
      cardRef.current.requestFullscreen()
        .then(() => {
          setIsFullscreen(true);
        })
        .catch(err => {
          console.error('Error attempting to enable fullscreen:', err);
        });
    } else {
      document.exitFullscreen()
        .then(() => {
          setIsFullscreen(false);
        })
        .catch(err => {
          console.error('Error attempting to exit fullscreen:', err);
        });
    }
  };

  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return (
    <ResizablePanel defaultSize={100}>
      <Card 
        ref={cardRef} 
        className={cn(
          "min-w-full min-h-full transition-all overflow-hidden border-none ", 
          isFullscreen ? "fixed inset-0 z-50 rounded-none" : ""
        )}
      >
        <div 
          className="relative flex items-center justify-center h-full w-full overflow-hidden aspect-video "
          onMouseEnter={() => setShowControls(true)}
          onMouseLeave={() => setShowControls(false)}
        >
          {currentFrame && !isPaused ? (
            <img
              src={`data:image/jpeg;base64,${currentFrame}`}
              alt="RTSP Stream"
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-center text-foreground/50 p-4 w-full h-full">
              {error ? (
                <div className="flex flex-col items-center justify-center text-center text-foreground/50 p-4">
                  <VideoOff className="mb-2" />
                  <p>{error}</p>
                </div>
              ) : (
                <>
                  <Video className="h-12 w-12 mb-2 animate-pulse" />
                  <p>Waiting for stream...</p>
                </>
              )}
            </div>
          )}
          
          {isPaused && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
              <Pause className="h-16 w-16 text-white" />
            </div>
          )}

          {/* Overlay controls */}
          <div 
            className={cn(
              "absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-2 transition-opacity duration-200",
              showControls ? "opacity-100" : "opacity-0"
            )}
          >
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className={`${isFullscreen ? 'text-2xl' : ''} text-white`}>{streamName}</CardTitle>
                {!isFullscreen && (
                  <CardDescription className="text-xs truncate text-white/70">
                    Stream ID: {streamId}
                  </CardDescription>
                )}
              </div>
              <div className="flex items-center gap-2">
                {STREAM_FRAMES.current !== null && isConnected && !isPaused && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Activity className="h-3 w-3" />
                    <span>{STREAM_FRAMES.current} FPS</span>
                  </Badge>
                )}
                <Badge 
                  variant={isConnected ? "success" : "destructive"}
                >
                  {isConnected ? "Connected" : "Disconnected"}
                </Badge>
                <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="text-white hover:bg-white/10">
                  {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={togglePause}
                  className="text-white hover:bg-white/10"
                >
                  {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleReconnect}
                  className="text-white hover:bg-white/10"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={removeStream}
                  className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </ResizablePanel>
  );
};

export default StreamViewer; 
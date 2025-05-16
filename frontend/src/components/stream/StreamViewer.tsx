import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Play, Pause, RefreshCw, Maximize, Minimize, Video, VideoOff, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StreamViewerProps {
  streamId: string;
  streamName: string;
  baseUrl?: string;
  fullHeight?: boolean;
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
  fullHeight = false
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFrame, setCurrentFrame] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastFrameTime, setLastFrameTime] = useState<number | null>(null);
  const [fps, setFps] = useState<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const frameTimesRef = useRef<number[]>([]);

  useEffect(() => {
    // Connect to WebSocket when component mounts
    connectWebSocket();

    // Clean up WebSocket connection when component unmounts
    return () => {
      disconnectWebSocket();
    };
  }, [streamId]);

  // Calculate FPS
  useEffect(() => {
    if (!lastFrameTime) return;
    
    frameTimesRef.current.push(lastFrameTime);
    
    // Keep only the last 10 frames for FPS calculation
    if (frameTimesRef.current.length > 10) {
      frameTimesRef.current.shift();
    }
    
    if (frameTimesRef.current.length >= 2) {
      const timeElapsed = frameTimesRef.current[frameTimesRef.current.length - 1] - frameTimesRef.current[0];
      const frameCount = frameTimesRef.current.length - 1;
      const calculatedFps = Math.round((frameCount / timeElapsed) * 1000);
      setFps(calculatedFps);
    }
  }, [lastFrameTime]);

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
      setIsConnected(true);
      setError(null);
      frameTimesRef.current = [];
    };

    ws.onmessage = (event) => {
      try {
        const data: StreamFrame = JSON.parse(event.data);
        
        if (!isPaused && data.type === 'stream_frame' && data.frame) {
          setCurrentFrame(data.frame);
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
    <Card 
      ref={cardRef} 
      className={cn(
        "w-full transition-all overflow-hidden", 
        isFullscreen ? "fixed inset-0 z-50 rounded-none" : "",
        fullHeight ? "h-full" : ""
      )}
    >
      <CardHeader className={cn("pb-2", fullHeight ? "bg-muted/40" : "")}>
        <div className="flex justify-between items-center">
          <CardTitle className={`${isFullscreen ? 'text-2xl' : ''}`}>{streamName}</CardTitle>
          <div className="flex items-center gap-2">
            {fps !== null && isConnected && !isPaused && (
              <Badge variant="outline" className="bg-green-50 text-green-900 dark:bg-green-900/20 dark:text-green-300 flex items-center gap-1">
                <Activity className="h-3 w-3" />
                <span>{fps} FPS</span>
              </Badge>
            )}
            <Badge 
              variant={isConnected ? "outline" : "outline"}
              className={cn(
                isConnected 
                  ? "bg-green-50 text-green-900 dark:bg-green-900/20 dark:text-green-300 border-green-200" 
                  : "bg-red-50 text-red-900 dark:bg-red-900/20 dark:text-red-300 border-red-200"
              )}
            >
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
          </div>
        </div>
        {!isFullscreen && !fullHeight && (
          <CardDescription className="text-xs truncate">
            Stream ID: {streamId}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className={fullHeight ? "flex-1 p-0" : ""}>
        <div 
          className={cn(
            "relative bg-black flex items-center justify-center rounded-md overflow-hidden", 
            isFullscreen ? "h-[calc(100vh-130px)]" : "",
            fullHeight ? "h-[calc(100%-80px)]" : "aspect-video"
          )}
        >
          {currentFrame ? (
            <img 
              src={`data:image/jpeg;base64,${currentFrame}`} 
              alt="RTSP Stream" 
              className={cn(
                "w-full h-full", 
                isFullscreen || fullHeight ? "object-contain" : "object-cover"
              )}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-center text-gray-400 p-4">
              {error ? (
                <>
                  <VideoOff className="h-12 w-12 mb-2 text-gray-500" />
                  <p>{error}</p>
                </>
              ) : (
                <>
                  <Video className="h-12 w-12 mb-2 text-gray-500 animate-pulse" />
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
        </div>
      </CardContent>
      <CardFooter className={cn(
        "flex justify-between pt-2", 
        fullHeight ? "bg-muted/40 absolute bottom-0 left-0 right-0" : ""
      )}>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={togglePause}
            disabled={!isConnected}
            className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm"
          >
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleReconnect}
            disabled={isConnected}
            className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={toggleFullscreen}
          disabled={!currentFrame}
          className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm"
        >
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default StreamViewer; 
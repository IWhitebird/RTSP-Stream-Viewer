import React, { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertCircle } from 'lucide-react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../ui/resizable';
import { useStreams, type Stream } from '@/query/stream';
import StreamList from './StreamList';
import StreamViewPanel from './StreamViewPanel';

const StreamManager: React.FC = () => {
  const [selectedStream, setSelectedStream] = useState<Stream | null>(null);
  const [displayedStreams, setDisplayedStreams] = useState<Stream[]>([]);

  // Fetch streams using the custom hook
  const { data: streams = [], isLoading, error, refetch } = useStreams();

  return (
    <div className="p-2 h-[calc(100vh-3.5rem)]">
      {error && (
        <Alert variant="destructive" className="mb-2 border-red-500 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error?.message || 'Failed to load streams'}</AlertDescription>
        </Alert>
      )}
      
      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mb-4" />
          <div className="text-muted-foreground">Loading streams...</div>
        </div>
      ) : (
        <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg border">
          
          <ResizablePanel defaultSize={25} minSize={20} maxSize={40} className="bg-card">
            <StreamList 
              streams={streams}
              onRefresh={refetch}
              selectedStream={selectedStream}
              onSelectStream={setSelectedStream}
              displayedStreams={displayedStreams}
              setDisplayedStreams={setDisplayedStreams}
            />
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          <ResizablePanel defaultSize={75}>
            <StreamViewPanel 
              selectedStream={selectedStream}
              setSelectedStream={setSelectedStream}
              displayedStreams={displayedStreams}
              setDisplayedStreams={setDisplayedStreams}
              streams={streams}
            />
          </ResizablePanel>
          
        </ResizablePanelGroup>
      )}
    </div>
  );
};

export default StreamManager; 
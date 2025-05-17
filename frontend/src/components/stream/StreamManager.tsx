import React, { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertCircle } from 'lucide-react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../ui/resizable';
import { useStreams } from '@/query/stream';
import StreamList from './StreamList';
import StreamViewPanel from './StreamViewPanel';

const StreamManager: React.FC = () => {
  const [selectedStream, setSelectedStream] = useState<string | null>(null);

  // Fetch streams using the custom hook
  const { data: streams = [], isLoading, isError, error, refetch } = useStreams();


  const handleSelectStream = (streamId: string | null) => {
    console.log(streamId)
    setSelectedStream(streamId);
  }

  // Get the selected stream data
  const selectedStreamData = streams.find(stream => stream.id === selectedStream);

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
              selectedStream={selectedStream}
              onSelectStream={handleSelectStream}
              isLoading={isLoading}
            />
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          <ResizablePanel defaultSize={75}>
            <StreamViewPanel 
              selectedStream={selectedStreamData || null}
              setSelectedStream={setSelectedStream}
              onRefresh={refetch}
              isLoading={isLoading}
              streams={streams}
              isError={isError}
              error={error?.message || null}
            />
          </ResizablePanel>
          
        </ResizablePanelGroup>
      )}
    </div>
  );
};

export default StreamManager; 
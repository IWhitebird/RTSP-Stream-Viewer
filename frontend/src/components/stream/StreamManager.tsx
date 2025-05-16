import React, { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertCircle, PlusCircle } from 'lucide-react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../ui/resizable';
import { Button } from '../ui/button';
import { useStreams } from '@/query/stream';
import StreamList from './StreamList';
import StreamViewPanel from './StreamViewPanel';
import AddStreamDialog from './AddStreamDialog';

const StreamManager: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [selectedStream, setSelectedStream] = useState<string | null>(null);

  // Fetch streams using the custom hook
  const { data: streams = [], isLoading, isError, refetch } = useStreams();

  // Get the selected stream data
  const selectedStreamData = streams.find(stream => stream.id === selectedStream);
  
  // Select the first active stream by default if none is selected
  const activeStreams = streams.filter(stream => stream.is_active);
  if (!selectedStream && activeStreams.length > 0 && !isLoading) {
    setSelectedStream(activeStreams[0].id);
  }

  return (
    <div className="p-2 h-[calc(100vh-3.5rem)]">
      {error && (
        <Alert variant="destructive" className="mb-2 border-red-500 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mb-4" />
          <div className="text-muted-foreground">Loading streams...</div>
        </div>
      ) 
      : isError ? (
        <div className="space-y-4">
          <Alert variant="destructive" className="border-red-500 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-200">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to load streams</AlertTitle>
            <AlertDescription>There was an error loading the streams. Please try refreshing.</AlertDescription>
          </Alert>
          <div className="text-center">
            <Button 
              onClick={() => refetch()} 
              className="mr-2"
            >
              Refresh
            </Button>
            <AddStreamDialog trigger={
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Stream
              </Button>
            } />
          </div>
        </div>
      ) : (
        <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg border">
          <ResizablePanel defaultSize={25} minSize={20} maxSize={40} className="bg-card">
            <StreamList 
              streams={streams}
              selectedStream={selectedStream}
              onSelectStream={setSelectedStream}
              isLoading={isLoading}
            />
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          <ResizablePanel defaultSize={75}>
            <StreamViewPanel 
              selectedStream={selectedStreamData || null}
              onRefresh={refetch}
              isLoading={isLoading}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </div>
  );
};

export default StreamManager; 
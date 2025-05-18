import React, { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { PlusCircle, AlertCircle } from 'lucide-react';
import StreamViewer from './StreamViewer';
import AddStreamDialog from './AddStreamDialog';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '../ui/resizable';
import type { Stream } from '@/query/stream';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface StreamViewPanelProps {
  selectedStream: Stream | null;
  setSelectedStream: (streams: Stream | null) => void;

  displayedStreams: Stream[];
  setDisplayedStreams: (streams: Stream[]) => void;

  // streams: Stream[];
}

// Helper component for rendering a single stream within a resizable panel
const StreamPanelItem: React.FC<{ stream: Stream | undefined; removeStream: (streamId: string) => void }> = ({ stream, removeStream }) => {
  if (!stream) {
    // This case should ideally not be hit if streamsToDisplay is managed correctly
    return (
      <ResizablePanel defaultSize={50} collapsible={false} minSize={15}>
        <div className="relative h-full w-full p-1 flex items-center justify-center text-muted-foreground">
          Empty Panel
        </div>
      </ResizablePanel>
    );
  }
  return (
    <ResizablePanel defaultSize={50} collapsible={false} minSize={15} key={stream.id /* Add key here if mapping, or ensure parent does it */}>
      <div className="relative h-full w-full p-1">
        <StreamViewer
          streamId={stream.id}
          streamName={stream.name}
          removeStream={() => removeStream(stream.id)}
        />
      </div>
    </ResizablePanel>
  );
};

const StreamViewPanel: React.FC<StreamViewPanelProps> = ({ 
  selectedStream, 
  setSelectedStream,
  setDisplayedStreams,
  displayedStreams,
  // streams = [],
}) => {
  // Array of stream IDs to display in the panel

  const [layoutError, setLayoutError] = useState<string | null>(null);

  // Add selected stream to the displayed streams
  const addStreamToView = (stream: Stream) => {
    if (!stream) return;
    
    // Maximum 4 streams can be displayed
    if (displayedStreams.length >= 4) {
      setLayoutError("Maximum of 4 streams can be displayed at once");
      setTimeout(() => setLayoutError(null), 3000);
      return;
    }
    
    if (!displayedStreams.some(s => s.id === stream.id)) {
      setDisplayedStreams([...displayedStreams, stream]);
      setSelectedStream(stream); // Keep selected stream in sync
    }
  };

  // Remove a stream from the displayed streams
  const removeStreamFromView = (streamId: string) => {
    const newDisplayedStreams = displayedStreams.filter(s => s.id !== streamId);
    setDisplayedStreams(newDisplayedStreams);
    // If the removed stream was the selected one, or if no streams are left, set selected to null
    // Or, select the last remaining stream if any.
    if (selectedStream && selectedStream.id === streamId) {
      setSelectedStream(newDisplayedStreams.length > 0 ? newDisplayedStreams[newDisplayedStreams.length - 1] : null);
    } else if (newDisplayedStreams.length === 0) {
      setSelectedStream(null);
    }
  };

  // Add the selected stream to display if it's not already there
  React.useEffect(() => {
      if (selectedStream) {
        addStreamToView(selectedStream);
      }
  }, [selectedStream]); // Dependency array should ideally include addStreamToView if it's not stable

  const NoStreamsView = () => (
    <div className="h-full flex items-center justify-center">
      <Card className="border-dashed w-full max-w-md">
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">No stream selected</p>
          <p className="text-sm text-muted-foreground mt-2">Select a stream from the sidebar or add a new one.</p>
          <AddStreamDialog trigger={
            <Button 
              variant="default" 
              className="mt-4"
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Stream
            </Button>
          } />
        </CardContent>
      </Card>
    </div>
  );

  // Render the appropriate layout based on number of streams
  const renderStreamLayout = () => {
    const streamsToDisplay = displayedStreams.slice(0, 4); // Ensure we only use up to 4 streams for layout

    switch (streamsToDisplay.length) {
      case 1:
        return (
          <div className="h-full w-full mt-2">
            <StreamViewer 
              streamId={streamsToDisplay[0].id} 
              streamName={streamsToDisplay[0].name}
              removeStream={() => removeStreamFromView(streamsToDisplay[0].id)}
            />
          </div>
        );
        
      case 2:
        return (
          <ResizablePanelGroup 
            direction="horizontal" 
            className="h-full w-full mt-2"
          >
            <StreamPanelItem stream={streamsToDisplay[0]} removeStream={removeStreamFromView} />
            <ResizableHandle withHandle />
            <StreamPanelItem stream={streamsToDisplay[1]} removeStream={removeStreamFromView} />
          </ResizablePanelGroup>
        );
        
      case 3:
        return (
          <ResizablePanelGroup 
            direction="vertical" 
            className="h-full w-full mt-2"
          >
            <ResizablePanel defaultSize={50} collapsible={false} minSize={15}>
              <ResizablePanelGroup 
                direction="horizontal" 
                className="h-full w-full"
              >
                <StreamPanelItem stream={streamsToDisplay[0]} removeStream={removeStreamFromView} />
                <ResizableHandle withHandle />
                <StreamPanelItem stream={streamsToDisplay[1]} removeStream={removeStreamFromView} />
              </ResizablePanelGroup>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <StreamPanelItem stream={streamsToDisplay[2]} removeStream={removeStreamFromView} />
          </ResizablePanelGroup>
        );
        
      case 4:
        return (
          <ResizablePanelGroup 
            direction="vertical" 
            className="h-full w-full mt-2"
          >
            <ResizablePanel defaultSize={50} collapsible={false} minSize={15}>
              <ResizablePanelGroup 
                direction="horizontal" 
                className="h-full w-full"
              >
                <StreamPanelItem stream={streamsToDisplay[0]} removeStream={removeStreamFromView} />
                <ResizableHandle withHandle />
                <StreamPanelItem stream={streamsToDisplay[1]} removeStream={removeStreamFromView} />
              </ResizablePanelGroup>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50} collapsible={false} minSize={15}>
              <ResizablePanelGroup 
                direction="horizontal" 
                className="h-full w-full"
              >
                <StreamPanelItem stream={streamsToDisplay[2]} removeStream={removeStreamFromView} />
                <ResizableHandle withHandle />
                <StreamPanelItem stream={streamsToDisplay[3]} removeStream={removeStreamFromView} />
              </ResizablePanelGroup>
            </ResizablePanel>
          </ResizablePanelGroup>
        );
        
      default:
        return <NoStreamsView />;
    }
  };

  return (
    <>
      <div className="p-4 bg-background h-full w-full flex flex-col">
        {layoutError && (
          <Alert variant="destructive" className="mb-2">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{layoutError}</AlertDescription>
          </Alert>
        )}
        
        {displayedStreams.length > 0 ? (
          <>
            <h3 className="text-sm font-medium">Displayed Streams ({displayedStreams.length}/4)</h3>
            <div className="flex-1 h-full w-full overflow-hidden">
              {renderStreamLayout()}
            </div>
          </>
        ) : (
          <NoStreamsView />
        )}
      </div>
    </>
  );
};

export default StreamViewPanel; 
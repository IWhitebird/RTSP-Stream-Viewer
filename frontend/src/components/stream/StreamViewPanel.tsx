import React, { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { PlusCircle, AlertCircle } from 'lucide-react';
import StreamViewer from './StreamViewer';
import AddStreamDialog from './AddStreamDialog';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '../ui/resizable';
import { ScrollArea } from '../ui/scroll-area';
import type { Stream } from '@/query/stream';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface StreamViewPanelProps {
  selectedStream: Stream | null;
  setSelectedStream: (streams: Stream | null) => void;

  displayedStreams: Stream[];
  setDisplayedStreams: (streams: Stream[]) => void;

  streams: Stream[];
}

const StreamViewPanel: React.FC<StreamViewPanelProps> = ({ 
  selectedStream, 
  setSelectedStream,
  setDisplayedStreams,
  displayedStreams,
  streams = [],
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
      setSelectedStream(stream);
    }
  };

  // Remove a stream from the displayed streams
  const removeStreamFromView = (streamId: string) => {
    setDisplayedStreams(displayedStreams.filter(s => s.id !== streamId));
    setSelectedStream(null);
  };

  // Add the selected stream to display if it's not already there
  React.useEffect(() => {
    // if (selectedStream && !displayedStreams.some(s => s.id === selectedStream.id)) {
      if (selectedStream) {
        addStreamToView(selectedStream);
      }
    // }
  }, [selectedStream]);

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
    switch (displayedStreams.length) {
      case 1:
        // Single stream, full width
        // return (
        //   <div className="h-full">
        //     <StreamViewer 
        //       streamId={displayedStreams[0].id} 
        //       streamName={displayedStreams[0].name}
        //       removeStream={() => removeStreamFromView(displayedStreams[0].id)}
        //       fullHeight
        //     />
        //   </div>
        // );
        
      case 2:
        // Two streams side by side
        return (
          <ResizablePanelGroup 
            direction="horizontal" 
            className="flex-1 mt-2"
            style={{ direction: "rtl" }}
          >
            {displayedStreams.map((stream, index) => (
              <React.Fragment key={stream.id}>
                {index > 0 && <ResizableHandle withHandle />}
                <ResizablePanel 
                  defaultSize={50}
                  collapsible={false}
                  minSize={15}
                  style={{ direction: "ltr" }}
                >
                  <div className="relative h-full">
                    <StreamViewer 
                      streamId={stream.id} 
                      streamName={stream.name}
                      removeStream={() => removeStreamFromView(stream.id)}
                    />
                  </div>
                </ResizablePanel>
              </React.Fragment>
            ))}
          </ResizablePanelGroup>
        );
        
      case 3:
        // 2 streams on top, 1 on bottom
        return (
          <ResizablePanelGroup 
            direction="vertical" 
            className="flex-1 mt-2"
          >
            <ResizablePanel 
              defaultSize={50}
              collapsible={false}
              minSize={15}
            >
              <ResizablePanelGroup 
                direction="horizontal" 
                className="h-full"
                style={{ direction: "rtl" }}
              >
                <ResizablePanel 
                  defaultSize={50}
                  collapsible={false}
                  minSize={15}
                  style={{ direction: "ltr" }}
                >
                  <StreamViewer 
                    streamId={displayedStreams[0].id} 
                    streamName={displayedStreams[0].name}
                    removeStream={() => removeStreamFromView(displayedStreams[0].id)}
                  />
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel 
                  defaultSize={50}
                  collapsible={false}
                  minSize={15}
                  style={{ direction: "ltr" }}
                >
                  <StreamViewer 
                    streamId={displayedStreams[1].id} 
                    streamName={displayedStreams[1].name}
                    removeStream={() => removeStreamFromView(displayedStreams[1].id)}
                  />
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel 
              defaultSize={50}
              collapsible={false}
              minSize={15}
            >
              <StreamViewer 
                streamId={displayedStreams[2].id} 
                streamName={displayedStreams[2].name}
                removeStream={() => removeStreamFromView(displayedStreams[2].id)}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        );
        
      case 4:
        // 2x2 grid layout
        return (
          <ResizablePanelGroup 
            direction="vertical" 
            className="flex-1 mt-2"
          >
            <ResizablePanel 
              defaultSize={50}
              collapsible={false}
              minSize={15}
            >
              <ResizablePanelGroup 
                direction="horizontal" 
                className="h-full"
                style={{ direction: "rtl" }}
              >
                <ResizablePanel 
                  defaultSize={50}
                  collapsible={false}
                  minSize={15}
                  style={{ direction: "ltr" }}
                >
                  <StreamViewer 
                    streamId={displayedStreams[0].id} 
                    streamName={displayedStreams[0].name}
                    removeStream={() => removeStreamFromView(displayedStreams[0].id)}
                  />
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel 
                  defaultSize={50}
                  collapsible={false}
                  minSize={15}
                  style={{ direction: "ltr" }}
                >
                  <StreamViewer 
                    streamId={displayedStreams[1].id} 
                    streamName={displayedStreams[1].name}
                    removeStream={() => removeStreamFromView(displayedStreams[1].id)}
                  />
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel 
              defaultSize={50}
              collapsible={false}
              minSize={15}
            >
              <ResizablePanelGroup 
                direction="horizontal" 
                className="h-full"
                style={{ direction: "rtl" }}
              >
                <ResizablePanel 
                  defaultSize={50}
                  collapsible={false}
                  minSize={15}
                  style={{ direction: "ltr" }}
                >
                  <StreamViewer 
                    streamId={displayedStreams[2].id} 
                    streamName={displayedStreams[2].name}
                    removeStream={() => removeStreamFromView(displayedStreams[2].id)}
                  />
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel 
                  defaultSize={50}
                  collapsible={false}
                  minSize={15}
                  style={{ direction: "ltr" }}
                >
                  <StreamViewer 
                    streamId={displayedStreams[3].id} 
                    streamName={displayedStreams[3].name}
                    removeStream={() => removeStreamFromView(displayedStreams[3].id)}
                  />
                </ResizablePanel>
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
      <div className="p-4 bg-background h-full flex flex-col">
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
            {renderStreamLayout()}
          </>
        ) : (
          <NoStreamsView />
        )}
      </div>
    </>
  );
};

export default StreamViewPanel; 
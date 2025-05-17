import React, { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { RefreshCcw, Settings, Info, PlusCircle, X } from 'lucide-react';
import StreamViewer from './StreamViewer';
import AddStreamDialog from './AddStreamDialog';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '../ui/resizable';
import { ScrollArea } from '../ui/scroll-area';
import type { Stream } from '@/query/stream';

interface StreamViewPanelProps {
  selectedStream: Stream | null;
  setSelectedStream: (stream: string | null) => void;
  onRefresh: () => void;
  isLoading: boolean;
  streams: Stream[];
  isError: boolean;
  error: string | null;
}

const StreamViewPanel: React.FC<StreamViewPanelProps> = ({ 
  selectedStream, 
  setSelectedStream,
  onRefresh,
  isLoading,
  streams = [],
  isError,
  error
}) => {
  // Array of stream IDs to display in the panel
  const [displayedStreams, setDisplayedStreams] = useState<Stream[]>([]);

  // Add selected stream to the displayed streams
  const addStreamToView = (stream: Stream) => {
    if (!stream) return;
    if (!displayedStreams.some(s => s.id === stream.id)) {
      setDisplayedStreams([...displayedStreams, stream]);
      setSelectedStream(stream.id);
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

  const StreamSelector = () => (
    <div className="p-2 bg-card border-b flex items-center justify-between">
      <h3 className="text-sm font-medium">Displayed Streams</h3>
      <div className="flex gap-2">
        <ScrollArea className="max-w-[300px]">
          <div className="flex gap-1">
            {streams
              .filter(stream => stream.is_active && !displayedStreams.some(s => s.id === stream.id))
              .map(stream => (
                <Button 
                  key={stream.id} 
                  variant="outline" 
                  size="sm" 
                  onClick={() => addStreamToView(stream)}
                  className="whitespace-nowrap"
                >
                  <PlusCircle className="h-3 w-3 mr-1" /> {stream.name}
                </Button>
              ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );

  console.log(displayedStreams)

  return (
    <>
      <div className="p-4 bg-background h-full flex flex-col">
        {displayedStreams.length > 0 ? (
          <>
            {/* <StreamSelector /> */}
            <ResizablePanelGroup 
              direction={displayedStreams.length > 2 ? "vertical" : "horizontal"} 
              className="flex-1 mt-2"
              onLayout={(sizes) => {
                // Force layout recalculation to fix direction issues
                window.dispatchEvent(new Event('resize'));
              }}
              style={{ direction: "rtl" }}
            >
              {displayedStreams.map((stream, index) => (
                <React.Fragment key={stream.id}>
                  {index > 0 && <ResizableHandle withHandle />}
                  <ResizablePanel 
                    defaultSize={100 / displayedStreams.length}
                    collapsible={false}
                    minSize={15}
                    style={{ direction: "ltr" }}
                  >
                    <div className="relative h-full">
                      <StreamViewer 
                        streamId={stream.id} 
                        streamName={stream.name} 
                        removeStream={() => removeStreamFromView(stream.id)}
                        fullHeight
                      />
                    </div>
                  </ResizablePanel>
                </React.Fragment>
              ))}
            </ResizablePanelGroup>
          </>
        ) : (
          <NoStreamsView />
        )}
      </div>
    </>
  );
};

export default StreamViewPanel; 
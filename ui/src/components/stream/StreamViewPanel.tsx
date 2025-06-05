import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { PlusCircle, AlertCircle } from 'lucide-react';
import StreamViewer from './StreamViewer'; // Assuming this component is stable
import AddStreamDialog from './AddStreamDialog';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '../ui/resizable';
import type { Stream } from '@/query/stream'; // Assuming this type definition
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface StreamViewPanelProps {
  selectedStream: Stream | null;
  setSelectedStream: (stream: Stream | null) => void;
  displayedStreams: Stream[];
  setDisplayedStreams: (streams: Stream[]) => void;
}

// Configurable: How many streams per row at most
const MAX_COLS_PER_ROW = 2;
// Configurable: Absolute maximum streams you want to allow to be added
const MAX_STREAMS_ALLOWED = 9; // Example: for a 3x3 grid if MAX_COLS_PER_ROW was 3

// Helper component for rendering a single stream within a resizable panel
// This remains largely the same, but the key is applied by its parent when mapping
const StreamCell: React.FC<{ stream: Stream; removeStream: (streamId: string) => void }> = ({ stream, removeStream }) => {
  return (
    // The ResizablePanel itself needs a key if it's directly part of a map,
    // which it will be in the dynamic layout.
    <ResizablePanel
      key={stream.id} // Crucial for preserving panel state
      defaultSize={100 / MAX_COLS_PER_ROW} // Distribute equally by default
      collapsible={false}
      minSize={15}
    >
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
  displayedStreams,
  setDisplayedStreams,
}) => {
  const [layoutError, setLayoutError] = useState<string | null>(null);

  const addStreamToView = useCallback((stream: Stream) => {
    if (!stream) return;

    if (displayedStreams.length >= MAX_STREAMS_ALLOWED) {
      setLayoutError(`Maximum of ${MAX_STREAMS_ALLOWED} streams can be displayed at once.`);
      setTimeout(() => setLayoutError(null), 3000);
      return;
    }

    if (!displayedStreams.some(s => s.id === stream.id)) {
      setDisplayedStreams([...displayedStreams, stream]);
      // setSelectedStream(stream); // Optionally auto-select added stream
    }
  }, [displayedStreams, setDisplayedStreams, setSelectedStream]); // Added setSelectedStream for completeness if used

  const removeStreamFromView = useCallback((streamId: string) => {
    const newDisplayedStreams = displayedStreams.filter(s => s.id !== streamId);
    setDisplayedStreams(newDisplayedStreams);

    if (selectedStream && selectedStream.id === streamId) {
      setSelectedStream(newDisplayedStreams.length > 0 ? newDisplayedStreams[newDisplayedStreams.length - 1] : null);
    } else if (newDisplayedStreams.length === 0) {
      setSelectedStream(null);
    }
  }, [displayedStreams, setDisplayedStreams, selectedStream, setSelectedStream]);

  // Effect to add a newly selected stream (from sidebar, etc.) to the view
  React.useEffect(() => {
    if (selectedStream && !displayedStreams.some(s => s.id === selectedStream.id)) {
      addStreamToView(selectedStream);
    }
  }, [selectedStream, displayedStreams, addStreamToView]);


  const NoStreamsView = () => (
    <div className="h-full flex items-center justify-center">
      <Card className="border-dashed w-full max-w-md">
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">No streams are being displayed.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Select a stream from the sidebar to view it, or add a new one.
          </p>
          <AddStreamDialog trigger={
            <Button variant="default" className="mt-4">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Stream
            </Button>
          } />
        </CardContent>
      </Card>
    </div>
  );

  // Memoize the layout generation
  const streamLayout = useMemo(() => {
    if (displayedStreams.length === 0) {
      return <NoStreamsView />;
    }

    const numStreams = displayedStreams.length;
    const numRows = Math.ceil(numStreams / MAX_COLS_PER_ROW);
    const rows: React.ReactNode[] = [];

    for (let i = 0; i < numRows; i++) {
      const streamsInThisRow: Stream[] = [];
      const rowStreamCells: React.ReactNode[] = [];
      
      for (let j = 0; j < MAX_COLS_PER_ROW; j++) {
        const streamIndex = i * MAX_COLS_PER_ROW + j;
        if (streamIndex < numStreams) {
          const stream = displayedStreams[streamIndex];
          streamsInThisRow.push(stream);
          // StreamCell will now include the ResizablePanel with its own key
          rowStreamCells.push(
            <StreamCell
              key={stream.id} // Key for React's diffing of StreamCell components
              stream={stream}
              removeStream={removeStreamFromView}
            />
          );
          // Add handle if not the last cell in the row (and more than one cell)
          if (j < MAX_COLS_PER_ROW - 1 && streamIndex + 1 < numStreams && (streamIndex + 1) % MAX_COLS_PER_ROW !== 0) {
             // Only add handle if there's actually a next cell in this row
             if(j < streamsInThisRow.length -1 || (streamsInThisRow.length === MAX_COLS_PER_ROW && j < MAX_COLS_PER_ROW -1)){
                 rowStreamCells.push(<ResizableHandle key={`col-handle-${i}-${j}`} withHandle />);
             }
          }
        }
      }
      
      if (rowStreamCells.length > 0) {
          const rowPanelContent = rowStreamCells.length === 1 && streamsInThisRow.length === 1 ? (
            // If only one stream in this "conceptual" row, render it directly without inner group
            // This is because ResizablePanelGroup needs at least two children to be useful
            // The StreamCell itself already contains a ResizablePanel, so that will take full width/height of its parent.
            <div className="h-full w-full"> {/* Ensure this div takes up space for the single StreamCell */}
                 <StreamCell
                    key={streamsInThisRow[0].id}
                    stream={streamsInThisRow[0]}
                    removeStream={removeStreamFromView}
                  />
            </div>
          ) : (
            <ResizablePanelGroup direction="horizontal" className="h-full w-full">
              {rowStreamCells}
            </ResizablePanelGroup>
          );


        rows.push(
          <ResizablePanel
            key={`row-${i}`} // Stable key for the row panel
            defaultSize={100 / numRows}
            collapsible={false}
            minSize={10} // Min size for a row
          >
            {rowPanelContent}
          </ResizablePanel>
        );

        // Add row handle if not the last row
        if (i < numRows - 1) {
          rows.push(<ResizableHandle key={`row-handle-${i}`} withHandle />);
        }
      }
    }
    
    // Single stream case optimization: no need for outer group
    if (numStreams === 1 && displayedStreams[0]) {
        return (
             <div className="h-full w-full mt-2">
                <StreamViewer // Or StreamCell if you prefer consistency, but StreamViewer is simpler here
                  streamId={displayedStreams[0].id} 
                  streamName={displayedStreams[0].name}
                  removeStream={() => removeStreamFromView(displayedStreams[0].id)}
                />
            </div>
        );
    }


    return (
      <ResizablePanelGroup direction="vertical" className="h-full w-full mt-2">
        {rows}
      </ResizablePanelGroup>
    );
  }, [displayedStreams, removeStreamFromView]); // removeStreamFromView is memoized

  return (
    <div className="p-4 bg-background h-full w-full flex flex-col">
      {layoutError && (
        <Alert variant="destructive" className="mb-2 fixed top-4 right-4 z-50 w-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{layoutError}</AlertDescription>
        </Alert>
      )}

      {displayedStreams.length > 0 ? (
        <>
          <h3 className="text-sm font-medium mb-2">
            Displayed Streams ({displayedStreams.length} / {MAX_STREAMS_ALLOWED})
          </h3>
          <div className="flex-1 h-full w-full overflow-hidden">
            {streamLayout}
          </div>
        </>
      ) : (
        <NoStreamsView />
      )}
    </div>
  );
};

export default StreamViewPanel;
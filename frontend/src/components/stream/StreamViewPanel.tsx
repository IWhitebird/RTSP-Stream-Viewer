import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { RefreshCcw, Settings, Info, PlusCircle } from 'lucide-react';
import StreamViewer from './StreamViewer';
import AddStreamDialog from './AddStreamDialog';
import type { Stream } from '@/query/stream';

interface StreamViewPanelProps {
  selectedStream: Stream | null;
  onRefresh: () => void;
  isLoading: boolean;
}

const StreamViewPanel: React.FC<StreamViewPanelProps> = ({ 
  selectedStream, 
  onRefresh,
  isLoading 
}) => {
  return (
    <div className="p-4 bg-background h-full flex flex-col">
      {selectedStream ? (
        <StreamViewer 
          streamId={selectedStream.id} 
          streamName={selectedStream.name} 
          fullHeight
        />
      ) : (
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
      )}
    </div>
  );
};

export default StreamViewPanel; 
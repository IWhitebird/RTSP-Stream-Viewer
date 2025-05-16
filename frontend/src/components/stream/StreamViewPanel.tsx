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
        <div className="h-full flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-semibold">{selectedStream.name}</h2>
              <p className="text-sm text-muted-foreground">{selectedStream.url}</p>
            </div>
            <div className="flex gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={onRefresh}
                      disabled={isLoading}
                    >
                      <RefreshCcw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Refresh streams</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Stream settings</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Info className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Stream details</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <div className="flex-1">
            <StreamViewer 
              streamId={selectedStream.id} 
              streamName={selectedStream.name} 
              fullHeight
            />
          </div>
        </div>
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
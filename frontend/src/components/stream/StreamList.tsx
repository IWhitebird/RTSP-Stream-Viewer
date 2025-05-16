import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Play, Pause, Trash2, PlusCircle } from 'lucide-react';
import { useToggleStreamActive, useDeleteStream } from '@/query/stream';
import type { Stream } from '@/query/stream';
import AddStreamDialog from './AddStreamDialog';

interface StreamListProps {
  streams: Stream[];
  selectedStream: string | null;
  onSelectStream: (streamId: string) => void;
  isLoading: boolean;
}

const StreamList: React.FC<StreamListProps> = ({
  streams,
  selectedStream,
  onSelectStream,
  isLoading
}) => {
  const toggleActiveMutation = useToggleStreamActive();
  const deleteMutation = useDeleteStream();

  const activeStreams = streams.filter(stream => stream.is_active);

  const handleToggleStreamActive = (stream: Stream, activate: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleActiveMutation.mutate({ streamId: stream.id, activate });
  };

  const handleDeleteStream = (streamId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this stream?')) {
      deleteMutation.mutate(streamId);
    }
  };

  const addButtonTrigger = (
    <Button size="sm" className="w-full">
      <PlusCircle className="mr-2 h-4 w-4" /> Add Stream
    </Button>
  );

  return (
    <Tabs defaultValue="active" className="h-full flex flex-col">
      <div className="p-2 border-b flex items-center">
        <TabsList className="flex-1 w-[80%]">
          <TabsTrigger value="active" className="flex-1">Active</TabsTrigger>
          <TabsTrigger value="all" className="flex-1">All Streams</TabsTrigger>
        </TabsList>
        <div className="ml-2">
          <AddStreamDialog trigger={
            <Button variant="outline" size="sm" className="flex items-center">
              <PlusCircle className="h-4 w-4 mr-1" /> Add Stream
            </Button>
          } />
        </div>
      </div>

      <ScrollArea className="flex-1 px-4 py-2">
        <TabsContent value="active" className="mt-0 h-full">
          {activeStreams.length > 0 ? (
            <div className="space-y-2">
              {activeStreams.map(stream => (
                <div
                  key={stream.id}
                  className="p-3 rounded-md border cursor-pointer"
                  onClick={() => onSelectStream(stream.id)}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-medium">{stream.name}</div>
                    <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300">
                      Active
                    </Badge>
                  </div>
                  <div className="text-xs truncate text-muted-foreground mb-3">{stream.url}</div>
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleToggleStreamActive(stream, false, e)}
                      disabled={toggleActiveMutation.isPending}
                      className="h-8 px-2"
                    >
                      <Pause className="h-3.5 w-3.5 mr-1" /> Pause
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDeleteStream(stream.id, e)}
                      disabled={deleteMutation.isPending}
                      className="h-8 px-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="mb-2 text-muted-foreground">No active streams</div>
              <AddStreamDialog trigger={addButtonTrigger} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-0 h-full">
          {streams.length > 0 ? (
            <div className="space-y-2">
              {streams.map(stream => (
                <div
                  key={stream.id}
                  className={`p-3 rounded-md border cursor-pointer ${selectedStream === stream.id ? 'border-primary' : ''
                    }`}
                  onClick={() => stream.is_active && onSelectStream(stream.id)}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-medium">{stream.name}</div>
                    {stream.is_active ? (
                      <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">Inactive</Badge>
                    )}
                  </div>
                  <div className="text-xs truncate text-muted-foreground mb-3">{stream.url}</div>
                  <div className="flex justify-end gap-1">
                    {stream.is_active ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleToggleStreamActive(stream, false, e)}
                        disabled={toggleActiveMutation.isPending}
                        className="h-8 px-2"
                      >
                        <Pause className="h-3.5 w-3.5 mr-1" /> Pause
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleToggleStreamActive(stream, true, e)}
                        disabled={toggleActiveMutation.isPending}
                        className="h-8 px-2"
                      >
                        <Play className="h-3.5 w-3.5 mr-1" /> Activate
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDeleteStream(stream.id, e)}
                      disabled={deleteMutation.isPending}
                      className="h-8 px-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="mb-2 text-muted-foreground">No streams available</div>
              <AddStreamDialog trigger={addButtonTrigger} />
            </div>
          )}
        </TabsContent>
      </ScrollArea>
    </Tabs>
  );
};

export default StreamList; 
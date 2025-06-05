import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Play, Pause, Trash2, PlusCircle, CircleX, Pencil, Eye } from 'lucide-react';
import { useToggleStreamActive, useDeleteStream } from '@/query/stream';
import type { Stream } from '@/query/stream';
import AddStreamDialog from './AddStreamDialog';
import EditStreamDialog from './EditStreamDialog';

interface StreamListProps {
  streams: Stream[];
  onRefresh: () => void;
  selectedStream: Stream | null;
  onSelectStream: (stream: Stream) => void;
  displayedStreams: Stream[];
  setDisplayedStreams: (streams: Stream[]) => void;
}

const StreamList: React.FC<StreamListProps> = ({
  streams,
  onRefresh,
  selectedStream,
  onSelectStream,
  displayedStreams,
  setDisplayedStreams,
}) => {
  const toggleActiveMutation = useToggleStreamActive();
  const deleteMutation = useDeleteStream();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [streamToEdit, setStreamToEdit] = useState<Stream | null>(null);

  const activeStreams = streams.filter(stream => stream.is_active);

  const handleToggleStreamActive = (stream: Stream, activate: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    let updatedDisplayedStreams = [...displayedStreams];
    if (activate) {
      if (!updatedDisplayedStreams.find(s => s.id === stream.id)) {
        updatedDisplayedStreams.push(stream);
      }
    } else {
      updatedDisplayedStreams = updatedDisplayedStreams.filter(s => s.id !== stream.id);
    }
    setDisplayedStreams(updatedDisplayedStreams);

    toggleActiveMutation.mutate({ streamId: stream.id, activate }, {
      onSuccess: () => {
        onRefresh();
      },
      onError: () => {
        setDisplayedStreams(displayedStreams);
        onRefresh();
      }
    });
  };

  const handleDeleteStream = (streamId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this stream?')) {
      deleteMutation.mutate(streamId, {
        onSuccess: () => {
          setDisplayedStreams(displayedStreams.filter(s => s.id !== streamId));
          onRefresh();
        }
      });
    }
  };

  const handleOpenEditDialog = (stream: Stream, e: React.MouseEvent) => {
    e.stopPropagation();
    setStreamToEdit(stream);
    setIsEditDialogOpen(true);
  };

  const addButtonTrigger = (
    <Button size="sm" className="w-full">
      <PlusCircle className="mr-2 h-4 w-4" /> Add Stream
    </Button>
  );

  const renderStreamItem = (stream: Stream) => {
    const isDisplayed = displayedStreams.some(ds => ds.id === stream.id);
    return (
      <div
        key={stream.id}
        className={`p-3 w-auto rounded-md border cursor-pointer ${selectedStream?.id === stream.id ? 'border-primary bg-muted/50' : 'hover:bg-muted/50'
          }`}
        onClick={() => onSelectStream(stream)}
      >
        <div className="flex justify-between items-center mb-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            {isDisplayed && <Eye className="h-4 w-4 text-primary" />}
            <div className="font-medium truncate">{stream.name}</div>
          </div>
          {stream.is_active ? (
            <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300">Active</Badge>
          ) : (
            <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">Inactive</Badge>
          )}
        </div>
        <div className="text-xs truncate text-muted-foreground mb-3">{stream.url}</div>
        <div className="flex justify-end gap-1 flex-wrap">
          {stream.is_active ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => handleToggleStreamActive(stream, false, e)}
              disabled={toggleActiveMutation.isPending}
              className="h-8 px-2"
              title="Deactivate"
            >
              <CircleX className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => handleToggleStreamActive(stream, true, e)}
              disabled={toggleActiveMutation.isPending}
              className="h-8 px-2"
              title="Activate"
            >
              <Play className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => handleOpenEditDialog(stream, e)}
            className="h-8 px-2"
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => handleDeleteStream(stream.id, e)}
            disabled={deleteMutation.isPending}
            className="h-8 px-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <>
      <Tabs defaultValue="active" className="h-full flex flex-col">
        <div className="p-2 border-b flex items-center">
          <TabsList className="flex-1 w-[80%]">
            <TabsTrigger value="active" className="flex-1">Active</TabsTrigger>
            <TabsTrigger value="all" className="flex-1">All Streams</TabsTrigger>
          </TabsList>
          <div className="ml-2">
            <AddStreamDialog 
              onSuccess={onRefresh}
              trigger={
              <Button variant="outline" size="sm" className="flex items-center">
                <PlusCircle className="h-4 w-4 mr-1" /> Add
              </Button>
            } />
          </div>
        </div>

        <div className="overflow-y-auto p-4 custom-scrollbar">
          <TabsContent value="active" className="mt-0 h-full">
            {activeStreams.length > 0 ? (
              <div className="space-y-2">
                {activeStreams.map(renderStreamItem)}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="mb-2 text-muted-foreground">No active streams</div>
                <AddStreamDialog trigger={addButtonTrigger} onSuccess={onRefresh} />
              </div>
            )}
          </TabsContent>

          <TabsContent value="all" className="mt-0 h-full">
            {streams.length > 0 ? (
              <div className="space-y-2">
                {streams.map(renderStreamItem)}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="mb-2 text-muted-foreground">No streams available</div>
                <AddStreamDialog trigger={addButtonTrigger} onSuccess={onRefresh} />
              </div>
            )}
          </TabsContent>
        </div>
        
      </Tabs>
      {streamToEdit && (
        <EditStreamDialog
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          stream={streamToEdit}
          onSuccess={() => {
            onRefresh();
            setIsEditDialogOpen(false);
            setStreamToEdit(null);
          }}
        />
      )}
    </>
  );
};

export default StreamList; 
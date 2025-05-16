import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

import { PlusCircle, RefreshCcw, AlertCircle, Play, Pause, Trash2, Settings, Info } from 'lucide-react';
import StreamViewer from './StreamViewer';
import { fetchStreams, createStream, toggleStreamActive, deleteStream } from '@/api/stream';

export interface Stream {
  id: string;
  name: string;
  url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const StreamManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newStreamName, setNewStreamName] = useState('');
  const [newStreamUrl, setNewStreamUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedStream, setSelectedStream] = useState<string | null>(null);

  // Queries
  const { data: streams = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['streams'],
    queryFn: fetchStreams,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createStream,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streams'] });
      setNewStreamName('');
      setNewStreamUrl('');
      setIsDialogOpen(false);
      setError(null);
    },
    onError: (err) => {
      console.error('Error adding stream:', err);
      setError('Failed to add stream. Please try again.');
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: toggleStreamActive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streams'] });
    },
    onError: (err) => {
      console.error('Error toggling stream:', err);
      setError('Failed to update stream status.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteStream,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streams'] });
      if (selectedStream) {
        setSelectedStream(null);
      }
    },
    onError: (err) => {
      console.error('Error deleting stream:', err);
      setError('Failed to delete stream.');
    }
  });

  const handleAddStream = () => {
    if (!newStreamName || !newStreamUrl) {
      setError('Please enter both name and URL for the stream.');
      return;
    }

    createMutation.mutate({
      name: newStreamName,
      url: newStreamUrl,
      is_active: true
    });
  };

  const handleToggleStreamActive = (stream: Stream, activate: boolean) => {
    toggleActiveMutation.mutate({ streamId: stream.id, activate });
  };

  const handleDeleteStream = (streamId: string) => {
    if (window.confirm('Are you sure you want to delete this stream?')) {
      deleteMutation.mutate(streamId);
    }
  };

  const isLoaderActive = createMutation.isPending || toggleActiveMutation.isPending || deleteMutation.isPending;
  
  const activeStreams = streams.filter(stream => stream.is_active);
  // Select the first stream by default if none is selected and there are active streams
  if (!selectedStream && activeStreams.length > 0 && !isLoading) {
    setSelectedStream(activeStreams[0].id);
  }

  const selectedStreamData = streams.find(stream => stream.id === selectedStream);

  return (
    <div className="container max-w-full mx-auto p-2 h-[calc(100vh-4rem)]">
      <div className="flex flex-col h-full space-y-4">
        <div className="flex justify-between items-center bg-gradient-to-r from-blue-600 to-indigo-700 rounded-lg p-4 text-white shadow-lg">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">RTSP Stream Viewer</h1>
            <p className="opacity-90">Your surveillance camera streams in one sleek interface</p>
          </div>
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => refetch()}
                    disabled={isLoading || isLoaderActive}
                    className="bg-white/20 hover:bg-white/30 border-0 text-white hover:text-white"
                  >
                    <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Refresh stream list</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  size="sm"
                  className="bg-white text-indigo-700 hover:bg-white/90 hover:text-indigo-800"
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Stream
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New RTSP Stream</DialogTitle>
                  <DialogDescription>
                    Enter the details of the RTSP stream you want to add.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-2">
                    <Label htmlFor="name" className="col-span-1">Name</Label>
                    <Input 
                      id="name" 
                      value={newStreamName} 
                      onChange={(e) => setNewStreamName(e.target.value)} 
                      placeholder="Living Room Camera"
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-2">
                    <Label htmlFor="url" className="col-span-1">RTSP URL</Label>
                    <Input 
                      id="url" 
                      value={newStreamUrl} 
                      onChange={(e) => setNewStreamUrl(e.target.value)} 
                      placeholder="rtsp://username:password@camera-ip:port/path"
                      className="col-span-3"
                    />
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddStream} disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Adding...' : 'Add Stream'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        {error && (
          <Alert variant="destructive" className="mb-2 border-red-500 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-200">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : isError ? (
          <Alert variant="destructive" className="border-red-500 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-200">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to load streams</AlertTitle>
            <AlertDescription>There was an error loading the streams. Please try refreshing.</AlertDescription>
          </Alert>
        ) : (
          <ResizablePanelGroup direction="horizontal" className="flex-1 h-full rounded-lg border">
            <ResizablePanel defaultSize={25} minSize={20} maxSize={40} className="bg-card">
              <Tabs defaultValue="active" className="h-full flex flex-col">
                <div className="p-4 border-b">
                  <TabsList className="w-full">
                    <TabsTrigger value="active" className="flex-1">Active</TabsTrigger>
                    <TabsTrigger value="all" className="flex-1">All Streams</TabsTrigger>
                  </TabsList>
                </div>
                
                <ScrollArea className="flex-1 px-4 py-2">
                  <TabsContent value="active" className="mt-0 h-full">
                    {activeStreams.length > 0 ? (
                      <div className="space-y-2">
                        {activeStreams.map(stream => (
                          <div 
                            key={stream.id} 
                            onClick={() => setSelectedStream(stream.id)}
                            className={`p-3 rounded-md cursor-pointer transition-all ${
                              selectedStream === stream.id 
                                ? 'bg-primary text-primary-foreground' 
                                : 'hover:bg-accent'
                            }`}
                          >
                            <div className="font-medium">{stream.name}</div>
                            <div className="text-xs truncate opacity-80">{stream.url}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="mb-2 text-muted-foreground">No active streams</div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setIsDialogOpen(true)}
                        >
                          <PlusCircle className="h-4 w-4 mr-2" /> Add Stream
                        </Button>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="all" className="mt-0 h-full">
                    {streams.length > 0 ? (
                      <div className="space-y-2">
                        {streams.map(stream => (
                          <div 
                            key={stream.id} 
                            className="p-3 rounded-md border"
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
                                  onClick={() => handleToggleStreamActive(stream, false)}
                                  disabled={toggleActiveMutation.isPending}
                                  className="h-8 px-2"
                                >
                                  <Pause className="h-3.5 w-3.5 mr-1" /> Pause
                                </Button>
                              ) : (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleToggleStreamActive(stream, true)}
                                  disabled={toggleActiveMutation.isPending}
                                  className="h-8 px-2"
                                >
                                  <Play className="h-3.5 w-3.5 mr-1" /> Activate
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleDeleteStream(stream.id)}
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
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setIsDialogOpen(true)}
                        >
                          <PlusCircle className="h-4 w-4 mr-2" /> Add Stream
                        </Button>
                      </div>
                    )}
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            </ResizablePanel>
            
            <ResizableHandle withHandle />
            
            <ResizablePanel defaultSize={75} className="p-4 bg-background">
              {selectedStreamData ? (
                <div className="h-full flex flex-col">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h2 className="text-2xl font-semibold">{selectedStreamData.name}</h2>
                      <p className="text-sm text-muted-foreground">{selectedStreamData.url}</p>
                    </div>
                    <div className="flex gap-2">
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
                      streamId={selectedStreamData.id} 
                      streamName={selectedStreamData.name} 
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
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => setIsDialogOpen(true)}
                      >
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Stream
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
    </div>
  );
};

export default StreamManager; 
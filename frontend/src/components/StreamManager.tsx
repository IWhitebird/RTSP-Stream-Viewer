import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { PlusCircle, RefreshCcw, AlertCircle, Play, Pause, Trash2 } from 'lucide-react';
import StreamViewer from './StreamViewer';
import { Badge } from './ui/badge';
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

  return (
    <div className="container max-w-7xl mx-auto p-4">
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">RTSP Stream Viewer</h1>
            <p className="text-muted-foreground">Add and manage your RTSP camera streams in one place.</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()}
              disabled={isLoading || isLoaderActive}
            >
              <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
            </Button>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Stream
                </Button>
              </DialogTrigger>
              <DialogContent>
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
          <Alert variant="destructive" className="mb-4">
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
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to load streams</AlertTitle>
            <AlertDescription>There was an error loading the streams. Please try refreshing.</AlertDescription>
          </Alert>
        ) : (
          <Tabs defaultValue="active" className="mt-6">
            <TabsList className="mb-4">
              <TabsTrigger value="active">Active Streams</TabsTrigger>
              <TabsTrigger value="all">All Streams</TabsTrigger>
            </TabsList>
            
            <TabsContent value="active">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {streams
                  ?.filter(stream => stream.is_active)
                  .map(stream => (
                    <StreamViewer 
                      key={stream.id} 
                      streamId={stream.id} 
                      streamName={stream.name} 
                    />
                  ))}
                  
                {streams?.filter(stream => stream.is_active).length === 0 && (
                  <div className="col-span-full">
                    <Card className="border-dashed">
                      <CardContent className="pt-6 text-center">
                        <p className="text-muted-foreground">No active streams found.</p>
                        <p className="text-sm text-muted-foreground mt-2">Add a new stream or activate an existing one.</p>
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
              </div>
            </TabsContent>
            
            <TabsContent value="all">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {streams.map(stream => (
                  <Card key={stream.id} className={!stream.is_active ? "opacity-70" : ""}>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle>{stream.name}</CardTitle>
                        {stream.is_active ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                      </div>
                      <CardDescription className="truncate">{stream.url}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-end gap-2">
                        {stream.is_active ? (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleToggleStreamActive(stream, false)}
                            disabled={toggleActiveMutation.isPending}
                          >
                            <Pause className="mr-2 h-4 w-4" /> Deactivate
                          </Button>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleToggleStreamActive(stream, true)}
                            disabled={toggleActiveMutation.isPending}
                          >
                            <Play className="mr-2 h-4 w-4" /> Activate
                          </Button>
                        )}
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => handleDeleteStream(stream.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {streams.length === 0 && (
                  <div className="col-span-full">
                    <Card className="border-dashed">
                      <CardContent className="pt-6 text-center">
                        <p className="text-muted-foreground">No streams found.</p>
                        <p className="text-sm text-muted-foreground mt-2">Add your first RTSP stream to get started.</p>
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
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default StreamManager; 
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useUpdateStream, type Stream } from '@/query/stream';

interface EditStreamDialogProps {
  stream: Stream | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess?: () => void;
}

const EditStreamDialog: React.FC<EditStreamDialogProps> = ({ stream, isOpen, onOpenChange, onSuccess }) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const updateMutation = useUpdateStream();

  useEffect(() => {
    if (stream) {
      setName(stream.name);
      setUrl(stream.url);
      setError(null);
    } else {

      setName('');
      setUrl('');
      setError(null);
    }
  }, [stream, isOpen]);

  const handleUpdateStream = () => {
    if (!stream) {
      setError('No stream selected for editing.');
      return;
    }
    if (!name || !url) {
      setError('Please enter both name and URL for the stream.');
      return;
    }

    updateMutation.mutate(
      {
        id: stream.id,
        name,
        url,
        is_active: stream.is_active
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setError(null);
          onSuccess?.();
        },
        onError: (err: any) => {
          console.error('Error updating stream:', err);
          setError(err.message || 'Failed to update stream. Please try again.');
        }
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit RTSP Stream</DialogTitle>
          <DialogDescription>
            Update the details of the RTSP stream.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {error && (
            <div className="text-red-500 text-sm p-2 bg-red-50 rounded border border-red-200">
              {error}
            </div>
          )}
          <div className="grid grid-cols-4 items-center gap-2">
            <Label htmlFor="edit-name" className="col-span-1">Name</Label>
            <Input 
              id="edit-name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Living Room Camera"
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-2">
            <Label htmlFor="edit-url" className="col-span-1">RTSP URL</Label>
            <Input 
              id="edit-url" 
              value={url} 
              onChange={(e) => setUrl(e.target.value)} 
              placeholder="rtsp://username:password@camera-ip:port/path"
              className="col-span-3"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleUpdateStream} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditStreamDialog; 
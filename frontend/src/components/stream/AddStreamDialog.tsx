import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { PlusCircle } from 'lucide-react';
import { useCreateStream } from '@/query/stream';

interface AddStreamDialogProps {
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

const AddStreamDialog: React.FC<AddStreamDialogProps> = ({ onSuccess, trigger }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateStream();

  const handleAddStream = () => {
    if (!name || !url) {
      setError('Please enter both name and URL for the stream.');
      return;
    }

    createMutation.mutate(
      {
        name,
        url,
        is_active: true
      },
      {
        onSuccess: () => {
          setName('');
          setUrl('');
          setIsOpen(false);
          setError(null);
          onSuccess?.();
        },
        onError: (err) => {
          console.error('Error adding stream:', err);
          setError('Failed to add stream. Please try again.');
        }
      }
    );
  };

  const defaultTrigger = (
    <Button size="sm">
      <PlusCircle className="mr-2 h-4 w-4" /> Add Stream
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New RTSP Stream</DialogTitle>
          <DialogDescription>
            Enter the details of the RTSP stream you want to add.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {error && (
            <div className="text-red-500 text-sm p-2 bg-red-50 rounded border ">
              {error}
            </div>
          )}
          <div className="grid grid-cols-4 items-center gap-2">
            <Label htmlFor="name" className="col-span-1">Name</Label>
            <Input 
              id="name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Living Room Camera"
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-2">
            <Label htmlFor="url" className="col-span-1">RTSP URL</Label>
            <Input 
              id="url" 
              value={url} 
              onChange={(e) => setUrl(e.target.value)} 
              placeholder="rtsp://username:password@camera-ip:port/path"
              className="col-span-3"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} >Cancel</Button>
          <Button onClick={handleAddStream} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Adding...' : 'Add Stream'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddStreamDialog; 
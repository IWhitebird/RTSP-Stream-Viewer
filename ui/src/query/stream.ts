import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchStreams, createStream, toggleStreamActive, deleteStream } from '@/api/stream';

export interface Stream {
  id: string;
  name: string;
  url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useStreams = () => {
  return useQuery({
    queryKey: ['streams'],
    queryFn: fetchStreams,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useCreateStream = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createStream,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streams'] });
    }
  });
};

export const useToggleStreamActive = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: toggleStreamActive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streams'] });
    }
  });
};

export const useDeleteStream = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteStream,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streams'] });
    }
  });
};

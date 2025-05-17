import axios from 'axios';
import { API_BASE_URL } from '@/cofig';
import type { Stream } from '@/query/stream';

// API functions

export const fetchStreams = async (): Promise<Stream[]> => {
  const response = await axios.get(`${API_BASE_URL}/api/streams/`);
  return response.data.results;
};
// /rtsp://172.20.14.95:8554/city-traffic
export const createStream = async (data: { name: string; url: string; is_active: boolean }): Promise<Stream> => {
  console.log('createStream', data);
  const response = await axios.post(`${API_BASE_URL}/api/streams/`, data);
  return response.data;
};

export const toggleStreamActive = async ({ streamId, activate }: { streamId: string; activate: boolean }): Promise<Stream> => {
  const action = activate ? 'activate' : 'deactivate';
  const response = await axios.post(`${API_BASE_URL}/api/streams/${streamId}/${action}/`);
  return response.data;
};

export const deleteStream = async (streamId: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/api/streams/${streamId}/`);
};

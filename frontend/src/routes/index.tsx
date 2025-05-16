import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import StreamManager from '../components/StreamManager';

export const Route = createFileRoute('/')({
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="py-8">
        <StreamManager />
      </div>
    </div>
  );
}

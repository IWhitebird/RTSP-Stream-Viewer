import { createFileRoute } from '@tanstack/react-router';
import StreamManager from '../components/stream/StreamManager';
import { Header } from '../components/Header';

export const Route = createFileRoute('/')({
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
      <main className="flex-1">
        <StreamManager />
      </main>
    </div>
  );
}

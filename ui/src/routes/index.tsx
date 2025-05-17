import { createFileRoute } from '@tanstack/react-router';
import StreamManager from '../components/stream/StreamManager';

export const Route = createFileRoute('/')({
  component: Index,
});

function Index() {
  return (
    <main className="max-h-screen">
        <StreamManager />
    </main>
  );
}

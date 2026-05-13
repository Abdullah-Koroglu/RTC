import { env } from '@/lib/env';

export default function HomePage() {
  return (
    <main>
      <h1>Realtime Communication Platform</h1>
      <p>API: {env.NEXT_PUBLIC_API_URL}</p>
      <p>Signaling: {env.NEXT_PUBLIC_SIGNALING_URL}</p>
    </main>
  );
}

import { SignalingClient } from '@repo/rtc-sdk';
import { getSession } from 'next-auth/react';

let instance: SignalingClient | null = null;

async function fetchSignalingToken(participantId: string): Promise<string> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

  // Always use the client-generated participantId as the JWT subject so that the
  // server's participantId and the client's peerId are the same value everywhere.
  // Authenticated users get an additional `role` claim for access control.
  const session = await getSession();
  const body = session?.user
    ? { subject: participantId, role: 'user' }
    : { subject: participantId };

  const response = await fetch(`${apiUrl}/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch token: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { accessToken: string };
  return data.accessToken;
}

export async function initializeSignalingClient(options: {
  participantId: string;
  reconnect?: {
    maxAttempts: number;
    baseDelayMs: number;
    maxDelayMs: number;
  };
}): Promise<SignalingClient> {
  if (instance) {
    return instance;
  }

  const token = await fetchSignalingToken(options.participantId);
  const signalingUrl = process.env.NEXT_PUBLIC_SIGNALING_URL ?? 'ws://localhost:4010/ws';

  instance = new SignalingClient({
    ...options,
    url: signalingUrl,
    token,
  });

  await instance.connect();
  return instance;
}

export function getSignalingClient(): SignalingClient | null {
  return instance;
}

export async function disconnectSignalingClient(reason?: string): Promise<void> {
  if (!instance) {
    return;
  }

  await instance.disconnect(reason);
  instance.dispose();
  instance = null;
}

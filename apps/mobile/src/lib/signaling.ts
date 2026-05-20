import { SignalingClient } from '@repo/rtc-sdk/signaling-client';
import { getEnv } from './env';

let instance: SignalingClient | null = null;

async function fetchSignalingToken(participantId: string): Promise<string> {
  const { API_URL } = getEnv();
  const response = await fetch(`${API_URL}/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject: participantId }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch token: ${response.status}`);
  }

  const data = (await response.json()) as { accessToken: string };
  return data.accessToken;
}

export async function initializeSignalingClient(options: {
  participantId: string;
  reconnect?: { maxAttempts: number; baseDelayMs: number; maxDelayMs: number };
}): Promise<SignalingClient> {
  if (instance?.isConnected()) return instance;

  const { SIGNALING_WS_URL } = getEnv();
  const token = await fetchSignalingToken(options.participantId);

  instance = new SignalingClient({
    ...options,
    url: `${SIGNALING_WS_URL}/ws`,
    token,
  });

  await instance.connect();
  return instance;
}

export function getSignalingClient(): SignalingClient | null {
  return instance;
}

export async function disconnectSignalingClient(reason?: string): Promise<void> {
  if (!instance) return;
  await instance.disconnect(reason);
  instance.dispose();
  instance = null;
}

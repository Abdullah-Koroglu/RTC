import { z } from 'zod';

export const channelVersion = 'v1' as const;

export const signalingChannels = {
  distributedSync: `rtc:signaling:distributed:${channelVersion}`,
  roomEvents: `rtc:signaling:room-events:${channelVersion}`,
  roomScoped: (roomId: string) => `rtc:signaling:room:${roomId}:${channelVersion}`,
} as const;

export const channelNameSchema = z.string().min(1).max(200);

export type ChannelName = z.infer<typeof channelNameSchema>;

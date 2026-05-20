import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateUUID } from './uuid';

const PEER_ID_KEY = 'rtc:peerId';

export const Storage = {
  async get(key: string): Promise<string | null> {
    return AsyncStorage.getItem(key);
  },

  async set(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, value);
  },

  async remove(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  },
};

export const KEYS = {
  DISPLAY_NAME: 'rtc:displayName',
  PEER_ID: 'rtc:peerId',
  MIC_ON: 'rtc:micOn',
  CAM_ON: 'rtc:camOn',
  BREAKOUTS: (mainRoomId: string) => `rtc:breakouts:${mainRoomId}`,
} as const;

export async function getOrCreatePeerId(): Promise<string> {
  const stored = await Storage.get(PEER_ID_KEY);
  if (stored) return stored;
  const id = `usr-${generateUUID().slice(0, 8)}`;
  await Storage.set(PEER_ID_KEY, id);
  return id;
}

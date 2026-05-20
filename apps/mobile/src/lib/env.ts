import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as {
  apiUrl?: string;
  signalingUrl?: string;
  signalingWsUrl?: string;
  mediasoupUrl?: string;
};

export function getEnv() {
  return {
    API_URL: extra.apiUrl ?? 'http://localhost:4000',
    SIGNALING_URL: extra.signalingUrl ?? 'http://localhost:4010',
    SIGNALING_WS_URL: extra.signalingWsUrl ?? 'ws://localhost:4010',
    MEDIASOUP_URL: extra.mediasoupUrl ?? 'http://localhost:4020',
  };
}

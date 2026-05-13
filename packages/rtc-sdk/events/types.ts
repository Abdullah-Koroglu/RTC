export interface WebRtcSdkEventMap {
    [key: string]: unknown;
  'peer.connection-state': { state: RTCPeerConnectionState };
  'peer.ice-connection-state': { state: RTCIceConnectionState };
  'peer.ice-gathering-state': { state: RTCIceGatheringState };
  'peer.signaling-state': { state: RTCSignalingState };
  'peer.remote-track': { stream: MediaStream; track: MediaStreamTrack };
  'peer.local-description': { description: RTCSessionDescriptionInit };
  'peer.remote-description': { description: RTCSessionDescriptionInit };
  'peer.ice-candidate': { candidate: RTCIceCandidateInit };
  'peer.negotiation-needed': Record<string, never>;
  'media.local-stream-updated': { stream: MediaStream };
  'media.devices-updated': { devices: MediaDeviceInfo[] };
  'media.error': { error: Error };
  'signaling.message': { message: SignalingMessage };
  'signaling.connected': Record<string, never>;
  'signaling.disconnected': { reason?: string };
  'reconnect.scheduled': { delayMs: number; attempt: number };
  'reconnect.succeeded': { attempt: number };
  'reconnect.failed': { attempt: number; error: Error };
}

export interface BaseSignalingMessage {
  type: string;
  peerId: string;
  roomId: string;
  ts: number;
}

export interface SdpOfferMessage extends BaseSignalingMessage {
  type: 'sdp_offer';
  sdp: RTCSessionDescriptionInit;
}

export interface SdpAnswerMessage extends BaseSignalingMessage {
  type: 'sdp_answer';
  sdp: RTCSessionDescriptionInit;
}

export interface IceCandidateMessage extends BaseSignalingMessage {
  type: 'ice_candidate';
  candidate: RTCIceCandidateInit;
}

export interface HeartbeatMessage extends BaseSignalingMessage {
  type: 'heartbeat';
}

export interface ReconnectMessage extends BaseSignalingMessage {
  type: 'reconnect';
  recoveryToken?: string;
}

export type SignalingMessage =
  | SdpOfferMessage
  | SdpAnswerMessage
  | IceCandidateMessage
  | HeartbeatMessage
  | ReconnectMessage;

export interface RoomParticipant {
  participantId: string;
  displayName?: string;
  isMuted: boolean;
}

export interface RoomState {
  roomId: string;
  participants: RoomParticipant[];
}

export interface RtcSdkOptions {
  roomId: string;
  peerId: string;
  rtcConfig?: RTCConfiguration;
  reconnect?: {
    maxAttempts: number;
    baseDelayMs: number;
    maxDelayMs: number;
  };
}

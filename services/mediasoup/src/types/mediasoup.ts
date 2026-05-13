import type {
  Consumer,
  DtlsParameters,
  MediaKind,
  Producer,
  Router,
  RtpCapabilities,
  RtpParameters,
  Transport,
  WebRtcTransport,
  WebRtcTransportOptions,
  Worker,
  WorkerLogTag,
} from 'mediasoup/node/lib/types';

export type {
  Consumer,
  DtlsParameters,
  MediaKind,
  Producer,
  Router,
  RtpCapabilities,
  RtpParameters,
  Transport,
  WebRtcTransport,
  WebRtcTransportOptions,
  Worker,
  WorkerLogTag,
};

export type PeerId = string;
export type RoomId = string;
export type WorkerId = string;
export type TransportId = string;
export type ProducerId = string;
export type ConsumerId = string;

export interface WorkerSnapshot {
  workerId: WorkerId;
  pid: number;
  roomCount: number;
  closed: boolean;
}

export interface TransportConnectInput {
  dtlsParameters: DtlsParameters;
}

export interface CreateTransportInput {
  roomId: RoomId;
  peerId: PeerId;
  appData?: Record<string, unknown>;
}

export interface CreateProducerInput {
  roomId: RoomId;
  peerId: PeerId;
  transportId: TransportId;
  kind: MediaKind;
  rtpParameters: RtpParameters;
  appData?: Record<string, unknown>;
}

export interface CreateConsumerInput {
  roomId: RoomId;
  peerId: PeerId;
  producerId: ProducerId;
  appData?: Record<string, unknown>;
}

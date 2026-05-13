import type { WebsocketClientMessage, WebsocketServerMessage } from './websocket/contracts';

export type ClientToServerSignal = WebsocketClientMessage;
export type ServerToClientSignal = WebsocketServerMessage;

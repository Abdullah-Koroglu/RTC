import { env } from '@/config/env';
import type { Peer } from '@/peers/peer';
import type { Router, TransportConnectInput, WebRtcTransport } from '@/types/mediasoup';

export class TransportManager {
  async createWebRtcTransport(router: Router, peer: Peer, appData: Record<string, unknown> = {}): Promise<WebRtcTransport> {
    const transport = await router.createWebRtcTransport({
      listenInfos: [
        {
          ip: env.MEDIASOUP_LISTEN_IP,
          announcedAddress: env.MEDIASOUP_ANNOUNCED_IP,
          protocol: 'udp',
        },
        {
          ip: env.MEDIASOUP_LISTEN_IP,
          announcedAddress: env.MEDIASOUP_ANNOUNCED_IP,
          protocol: 'tcp',
        },
      ],
      enableUdp: env.MEDIASOUP_ENABLE_UDP,
      enableTcp: env.MEDIASOUP_ENABLE_TCP,
      preferUdp: env.MEDIASOUP_PREFER_UDP,
      initialAvailableOutgoingBitrate: env.MEDIASOUP_INITIAL_AVAILABLE_OUTGOING_BITRATE,
      appData,
    });

    if (env.MEDIASOUP_MAX_INCOMING_BITRATE > 0) {
      await transport.setMaxIncomingBitrate(env.MEDIASOUP_MAX_INCOMING_BITRATE);
    }

    peer.transports.set(transport.id, transport);

    transport.observer.on('close', () => {
      peer.transports.delete(transport.id);
    });

    return transport;
  }

  async connectTransport(transport: WebRtcTransport, input: TransportConnectInput): Promise<void> {
    await transport.connect({ dtlsParameters: input.dtlsParameters });
  }

  closePeerTransports(peer: Peer): void {
    for (const transport of peer.transports.values()) {
      if (!transport.closed) {
        transport.close();
      }
    }
    peer.transports.clear();
  }
}

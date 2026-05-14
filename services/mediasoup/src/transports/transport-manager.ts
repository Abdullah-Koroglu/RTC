import { env } from '@/config/env';
import { logger } from '@/core/logger';
import type { Peer } from '@/peers/peer';
import type { Router, TransportConnectInput, WebRtcTransport } from '@/types/mediasoup';

export class TransportManager {
  async createWebRtcTransport(
    router: Router,
    peer: Peer,
    appData: Record<string, unknown> = {},
    onPeerGone?: () => void,
  ): Promise<WebRtcTransport> {
    const listenInfos: Array<{ ip: string; announcedAddress?: string; protocol: 'udp' | 'tcp' }> = [];

    if (env.MEDIASOUP_ENABLE_UDP) {
      listenInfos.push({
        ip: env.MEDIASOUP_LISTEN_IP,
        announcedAddress: env.MEDIASOUP_ANNOUNCED_IP,
        protocol: 'udp',
      });
    }

    if (env.MEDIASOUP_ENABLE_TCP) {
      listenInfos.push({
        ip: env.MEDIASOUP_LISTEN_IP,
        announcedAddress: env.MEDIASOUP_ANNOUNCED_IP,
        protocol: 'tcp',
      });
    }

    if (listenInfos.length === 0) {
      throw new Error('At least one of MEDIASOUP_ENABLE_UDP or MEDIASOUP_ENABLE_TCP must be true');
    }

    const transport = await router.createWebRtcTransport({
      listenInfos,
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

    // Auto-cleanup: if ICE disconnects and doesn't recover, remove the peer
    // so stale producers don't appear to other participants after a refresh.
    let iceTimeoutId: ReturnType<typeof setTimeout> | null = null;

    const cancelIceTimeout = () => {
      if (iceTimeoutId !== null) {
        clearTimeout(iceTimeoutId);
        iceTimeoutId = null;
      }
    };

    const triggerPeerGone = () => {
      cancelIceTimeout();
      if (!transport.closed) {
        logger.warn({
          transportId: transport.id,
          peerId: peer.id,
          roomId: (transport.appData as Record<string, unknown>).roomId,
        }, 'transport_ice_peer_gone');
        onPeerGone?.();
      }
    };

    transport.on('icestatechange', (state) => {
      logger.info({
        transportId: transport.id,
        peerId: peer.id,
        roomId: (transport.appData as Record<string, unknown>).roomId,
        type: (transport.appData as Record<string, unknown>).type,
        state,
      }, 'transport_ice_state_changed');

      if (state === 'disconnected') {
        // Give 20 s for mobile network switches / brief outages before cleaning up
        iceTimeoutId = setTimeout(triggerPeerGone, 20_000);
      } else if (state === 'connected' || state === 'completed') {
        cancelIceTimeout();
      } else if (state === 'failed') {
        // ICE has definitively given up — clean up immediately
        triggerPeerGone();
      }
    });

    transport.on('dtlsstatechange', (state) => {
      logger.info({
        transportId: transport.id,
        peerId: peer.id,
        roomId: (transport.appData as Record<string, unknown>).roomId,
        type: (transport.appData as Record<string, unknown>).type,
        state,
      }, 'transport_dtls_state_changed');
    });

    transport.observer.on('close', () => {
      cancelIceTimeout();
      peer.transports.delete(transport.id);
    });

    return transport;
  }

  async connectTransport(transport: WebRtcTransport, input: TransportConnectInput): Promise<void> {
    logger.info({
      transportId: transport.id,
      roomId: (transport.appData as Record<string, unknown>).roomId,
      peerId: (transport.appData as Record<string, unknown>).peerId,
      type: (transport.appData as Record<string, unknown>).type,
    }, 'transport_connect_requested');

    await transport.connect({ dtlsParameters: input.dtlsParameters });

    logger.info({
      transportId: transport.id,
      roomId: (transport.appData as Record<string, unknown>).roomId,
      peerId: (transport.appData as Record<string, unknown>).peerId,
      type: (transport.appData as Record<string, unknown>).type,
      iceState: transport.iceState,
      dtlsState: transport.dtlsState,
    }, 'transport_connect_completed');
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

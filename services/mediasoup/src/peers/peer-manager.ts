import { Peer } from '@/peers/peer';

export class PeerManager {
  private readonly peersByRoom = new Map<string, Map<string, Peer>>();

  getOrCreate(roomId: string, peerId: string, sessionId?: string): Peer {
    let roomPeers = this.peersByRoom.get(roomId);
    if (!roomPeers) {
      roomPeers = new Map();
      this.peersByRoom.set(roomId, roomPeers);
    }

    let peer = roomPeers.get(peerId);
    if (!peer) {
      peer = new Peer(peerId, sessionId);
      roomPeers.set(peerId, peer);
    }

    return peer;
  }

  get(roomId: string, peerId: string): Peer | undefined {
    return this.peersByRoom.get(roomId)?.get(peerId);
  }

  remove(roomId: string, peerId: string, sessionId?: string): boolean {
    const roomPeers = this.peersByRoom.get(roomId);
    if (!roomPeers) {
      return false;
    }

    const peer = roomPeers.get(peerId);
    if (!peer) {
      return false;
    }

    if (sessionId !== undefined && peer.sessionId !== sessionId) {
      return false;
    }

    peer.close();
    roomPeers.delete(peerId);

    if (roomPeers.size === 0) {
      this.peersByRoom.delete(roomId);
    }

    return true;
  }

  removeRoom(roomId: string): void {
    const roomPeers = this.peersByRoom.get(roomId);
    if (!roomPeers) {
      return;
    }

    for (const peer of roomPeers.values()) {
      peer.close();
    }

    this.peersByRoom.delete(roomId);
  }

  listRoomPeers(roomId: string): Peer[] {
    return Array.from(this.peersByRoom.get(roomId)?.values() ?? []);
  }

  getCounts(): { peerCount: number } {
    let peerCount = 0;
    for (const room of this.peersByRoom.values()) {
      peerCount += room.size;
    }
    return { peerCount };
  }
}

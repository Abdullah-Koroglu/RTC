import { TypedEventEmitter } from '@/events/event-emitter';
import type { WebRtcSdkEventMap } from '@/events/types';

export interface GetMediaOptions {
  audio?: boolean | MediaTrackConstraints;
  video?: boolean | MediaTrackConstraints;
}

export class MediaManager {
  private localStream: MediaStream | null = null;
  private readonly emitter = new TypedEventEmitter<WebRtcSdkEventMap>();

  on = this.emitter.on.bind(this.emitter);

  async getUserMedia(options: GetMediaOptions = { audio: true, video: false }): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: options.audio ?? true,
        video: options.video ?? false,
      });

      this.replaceLocalStream(stream);
      return stream;
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error('Failed to acquire local media');
      this.emitter.emit('media.error', { error });
      throw error;
    }
  }

  async listDevices(): Promise<MediaDeviceInfo[]> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    this.emitter.emit('media.devices-updated', { devices });
    return devices;
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  async switchAudioInput(deviceId: string): Promise<MediaStream> {
    return this.getUserMedia({
      audio: { deviceId: { exact: deviceId } },
      video: false,
    });
  }

  stopLocalTracks(): void {
    if (!this.localStream) {
      return;
    }

    for (const track of this.localStream.getTracks()) {
      track.stop();
    }

    this.localStream = null;
  }

  dispose(): void {
    this.stopLocalTracks();
    this.emitter.clear();
  }

  private replaceLocalStream(stream: MediaStream): void {
    this.stopLocalTracks();
    this.localStream = stream;
    this.emitter.emit('media.local-stream-updated', { stream });
  }
}

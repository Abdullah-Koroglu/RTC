'use client';

import { useEffect, useState } from 'react';

export interface DeviceList {
  cameras: MediaDeviceInfo[];
  microphones: MediaDeviceInfo[];
  loading: boolean;
  error: Error | null;
}

export function useDevices(): DeviceList {
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        // Request permission first so labels are populated (otherwise they are empty strings).
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

        const devices = await navigator.mediaDevices.enumerateDevices();

        if (cancelled) return;

        setCameras(devices.filter((d) => d.kind === 'videoinput'));
        setMicrophones(devices.filter((d) => d.kind === 'audioinput'));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Could not access media devices'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    // Re-enumerate when devices are plugged in / unplugged
    navigator.mediaDevices.addEventListener('devicechange', load as EventListener);
    return () => {
      cancelled = true;
      navigator.mediaDevices.removeEventListener('devicechange', load as EventListener);
    };
  }, []);

  return { cameras, microphones, loading, error };
}

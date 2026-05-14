'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, Mic } from 'lucide-react';
import { useDevices } from '@/hooks/useDevices';

interface DeviceSelectModalProps {
  onConfirm: (videoDeviceId: string | undefined, audioDeviceId: string | undefined) => void;
}

export function DeviceSelectModal({ onConfirm }: DeviceSelectModalProps) {
  const { cameras, microphones, loading, error } = useDevices();
  const [selectedCamera, setSelectedCamera] = useState('');
  const [selectedMic, setSelectedMic] = useState('');
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);

  // Sync default selections when device list loads
  useEffect(() => {
    if (cameras.length > 0 && !selectedCamera) setSelectedCamera(cameras[0]?.deviceId ?? '');
  }, [cameras, selectedCamera]);

  useEffect(() => {
    if (microphones.length > 0 && !selectedMic) setSelectedMic(microphones[0]?.deviceId ?? '');
  }, [microphones, selectedMic]);

  // Live camera preview
  useEffect(() => {
    if (!selectedCamera) return;

    let active = true;

    const startPreview = async () => {
      // Stop previous stream
      previewStreamRef.current?.getTracks().forEach((t) => t.stop());

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: selectedCamera ? { deviceId: { exact: selectedCamera } } : true,
          audio: false,
        });

        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        previewStreamRef.current = stream;
        if (previewRef.current) {
          previewRef.current.srcObject = stream;
          void previewRef.current.play().catch(() => undefined);
        }
      } catch {
        // Preview unavailable (e.g., permissions denied) — ignore silently
      }
    };

    void startPreview();

    return () => {
      active = false;
      previewStreamRef.current?.getTracks().forEach((t) => t.stop());
      previewStreamRef.current = null;
    };
  }, [selectedCamera]);

  const handleConfirm = () => {
    // Stop preview stream before handing off to publishMedia
    previewStreamRef.current?.getTracks().forEach((t) => t.stop());
    previewStreamRef.current = null;
    onConfirm(selectedCamera || undefined, selectedMic || undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <h2 className="mb-4 text-base font-semibold text-slate-100">Kamera ve Mikrofon</h2>

        {/* Camera preview */}
        <div className="mb-5 overflow-hidden rounded-xl bg-slate-950">
          <video
            ref={previewRef}
            autoPlay
            playsInline
            muted
            className="aspect-video w-full object-cover"
          />
        </div>

        {loading && (
          <p className="mb-4 text-center text-xs text-slate-500">Cihazlar yükleniyor…</p>
        )}

        {error && (
          <p className="mb-4 rounded-lg bg-rose-950/50 px-3 py-2 text-xs text-rose-300">
            Kamera/mikrofon erişimi reddedildi. Tarayıcı izinlerini kontrol et.
          </p>
        )}

        <div className="space-y-4">
          {/* Camera select */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-slate-400">
              <Camera size={12} /> Kamera
            </label>
            <select
              value={selectedCamera}
              onChange={(e) => setSelectedCamera(e.target.value)}
              disabled={cameras.length === 0}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 disabled:opacity-40"
            >
              {cameras.length === 0 && <option value="">Kamera bulunamadı</option>}
              {cameras.map((cam) => (
                <option key={cam.deviceId} value={cam.deviceId}>
                  {cam.label || `Kamera ${cam.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </div>

          {/* Microphone select */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-slate-400">
              <Mic size={12} /> Mikrofon
            </label>
            <select
              value={selectedMic}
              onChange={(e) => setSelectedMic(e.target.value)}
              disabled={microphones.length === 0}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 disabled:opacity-40"
            >
              {microphones.length === 0 && <option value="">Mikrofon bulunamadı</option>}
              {microphones.map((mic) => (
                <option key={mic.deviceId} value={mic.deviceId}>
                  {mic.label || `Mikrofon ${mic.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={handleConfirm}
          className="mt-6 w-full rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-500"
        >
          Katıl
        </button>
      </div>
    </div>
  );
}

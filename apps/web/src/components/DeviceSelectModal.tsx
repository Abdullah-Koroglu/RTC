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
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);
  const supportsImageCapture = typeof window !== 'undefined' && typeof (window as { ImageCapture?: unknown }).ImageCapture === 'function';

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

  // Paint preview frames onto canvas without using HTML video element.
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    const stream = previewStreamRef.current;
    const track = stream?.getVideoTracks()[0];
    const ImageCaptureCtor = (window as unknown as { ImageCapture?: new (track: MediaStreamTrack) => { grabFrame: () => Promise<ImageBitmap> } }).ImageCapture;

    if (!canvas || !track || !ImageCaptureCtor) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const capture = new ImageCaptureCtor(track);
    let disposed = false;
    let rafId: number | null = null;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
    };

    const drawCover = (bitmap: ImageBitmap) => {
      const cw = canvas.width;
      const ch = canvas.height;
      const iw = bitmap.width;
      const ih = bitmap.height;
      if (!cw || !ch || !iw || !ih) return;

      const scale = Math.max(cw / iw, ch / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      const dx = (cw - dw) / 2;
      const dy = (ch - dh) / 2;

      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(bitmap, dx, dy, dw, dh);
    };

    const render = async () => {
      if (disposed) return;
      resizeCanvas();
      try {
        const bitmap = await capture.grabFrame();
        drawCover(bitmap);
        bitmap.close();
      } catch {
        // Ignore transient frame errors.
      }
      if (!disposed) {
        rafId = window.requestAnimationFrame(() => {
          void render();
        });
      }
    };

    window.addEventListener('resize', resizeCanvas);
    void render();

    return () => {
      disposed = true;
      window.removeEventListener('resize', resizeCanvas);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
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
          <canvas ref={previewCanvasRef} className="aspect-video w-full" />
        </div>
        {!supportsImageCapture && (
          <p className="mb-4 text-center text-xs text-amber-300">
            Bu tarayicida canli onizleme desteklenmiyor.
          </p>
        )}

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

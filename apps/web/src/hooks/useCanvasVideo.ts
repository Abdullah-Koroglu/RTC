'use client';

import { useEffect, useRef } from 'react';

/**
 * Renders a MediaStream onto a canvas element using requestAnimationFrame.
 *
 * We intentionally avoid requestVideoFrameCallback (rVFC) here: the spec requires
 * the video element to be "presented for composition" (i.e. in the visible viewport)
 * for rVFC to fire. Because our video element is off-DOM, rVFC would stop firing
 * whenever the browser de-prioritises it (tab hidden, modal open, etc.), causing the
 * canvas to freeze. rAF + currentTime-change detection is slightly less CPU-optimal
 * but completely reliable across all browsers and visibility states.
 *
 * The video element is kept off-DOM so we can add canvas post-processing (blur,
 * filters) in the future without touching the component tree.
 */
export function useCanvasVideo(
  stream: MediaStream | null,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  active = true,
): void {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !stream || !active) return;

    if (!videoRef.current) {
      videoRef.current = document.createElement('video');
      videoRef.current.autoplay = true;
      videoRef.current.playsInline = true;
      // Keep extractor muted so autoplay is never blocked.
      videoRef.current.muted = true;
    }
    const video = videoRef.current;
    video.muted = true;
    video.srcObject = stream;
    void video.play().catch(() => undefined);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = -1;

    const onFrame = () => {
      // Only redraw when a new frame has actually arrived.
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.currentTime !== lastTime) {
        lastTime = video.currentTime;
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth || canvas.width;
          canvas.height = video.videoHeight || canvas.height;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
      rafRef.current = requestAnimationFrame(onFrame);
    };
    rafRef.current = requestAnimationFrame(onFrame);

    return () => {
      cancelAnimationFrame(rafRef.current);
      video.srcObject = null;
      rafRef.current = 0;
    };
  }, [stream, canvasRef, active]);

  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current = null;
      }
    };
  }, []);
}

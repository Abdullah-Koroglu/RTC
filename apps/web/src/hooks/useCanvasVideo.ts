'use client';

import { useEffect, useRef } from 'react';

type VideoWithRVFC = HTMLVideoElement & {
  requestVideoFrameCallback: (cb: (now: DOMHighResTimeStamp, meta: { mediaTime: number }) => void) => number;
  cancelVideoFrameCallback: (handle: number) => void;
};

/**
 * Renders a MediaStream onto a canvas element.
 *
 * Uses requestVideoFrameCallback (rVFC) when available — fires exactly once per
 * decoded video frame, avoiding unnecessary redraws and saving CPU vs rAF.
 * Falls back to requestAnimationFrame with a currentTime change check.
 *
 * The video element is kept off-DOM (just a useRef). This lets us apply
 * post-processing (blur, filters) on the canvas in the future without
 * changing the component tree.
 */
export function useCanvasVideo(
  stream: MediaStream | null,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  active = true,
): void {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const handleRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !stream || !active) return;

    // Create (or reuse) an off-DOM video element
    if (!videoRef.current) {
      videoRef.current = document.createElement('video');
      videoRef.current.autoplay = true;
      videoRef.current.playsInline = true;
      videoRef.current.muted = true; // audio is handled separately by the consumer
    }
    const video = videoRef.current;
    video.srcObject = stream;
    void video.play().catch(() => undefined);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        // Match canvas size to video frame
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth || canvas.width;
          canvas.height = video.videoHeight || canvas.height;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
    };

    const supportsRVFC = typeof (video as VideoWithRVFC).requestVideoFrameCallback === 'function';

    if (supportsRVFC) {
      // rVFC: called exactly once per decoded frame — no wasted draws
      const rvfc = video as VideoWithRVFC;
      const onFrame = () => {
        draw();
        handleRef.current = rvfc.requestVideoFrameCallback(onFrame);
      };
      handleRef.current = rvfc.requestVideoFrameCallback(onFrame);
    } else {
      // rAF fallback: only redraw when currentTime has advanced
      let lastTime = -1;
      const onFrame = () => {
        if (video.currentTime !== lastTime) {
          lastTime = video.currentTime;
          draw();
        }
        handleRef.current = requestAnimationFrame(onFrame);
      };
      handleRef.current = requestAnimationFrame(onFrame);
    }

    return () => {
      if (supportsRVFC && handleRef.current) {
        (video as VideoWithRVFC).cancelVideoFrameCallback(handleRef.current);
      } else {
        cancelAnimationFrame(handleRef.current);
      }
      video.srcObject = null;
      handleRef.current = 0;
    };
  }, [stream, canvasRef, active]);

  // Cleanup video element on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current = null;
      }
    };
  }, []);
}

import type { RefObject } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLiveAPIContext } from '../contexts/LiveAPIContext';

interface VideoStreamHookProps {
  videoRef: RefObject<HTMLVideoElement>;
  activeVideoStream: MediaStream | null;
}

const TARGET_FPS = 10; // Limit to 10 FPS to reduce bandwidth
const FRAME_INTERVAL = 1000 / TARGET_FPS;

export function useVideoStream({ videoRef, activeVideoStream }: VideoStreamHookProps) {
  const liveApiContext = useLiveAPIContext();
  const { client, connected } = useMemo(() => ({
    client: liveApiContext.client,
    connected: liveApiContext.connected
  }), [liveApiContext]);
  const renderCanvasRef = useRef<HTMLCanvasElement>(null);
  const frameRequestRef = useRef<number>();
  const lastFrameTimeRef = useRef<number>(0);
  const [error, setError] = useState<Error | null>(null);

  const sendVideoFrame = useCallback((timestamp: number) => {
    const video = videoRef.current;
    const canvas = renderCanvasRef.current;

    // Implement frame rate limiting
    if (timestamp - lastFrameTimeRef.current < FRAME_INTERVAL) {
      frameRequestRef.current = requestAnimationFrame(sendVideoFrame);
      return;
    }

    // Debug: Check video and canvas state
    console.debug('[VideoStream] Frame attempt:', {
      video: video?.readyState,
      canvas: !!canvas,
      connected,
      hasActiveStream: !!activeVideoStream,
      fps: 1000 / (timestamp - lastFrameTimeRef.current)
    });

    if (!video || !canvas || video.readyState < 2 || !connected || !activeVideoStream) {
      console.debug('[VideoStream] Waiting for video/canvas to be ready');
      frameRequestRef.current = requestAnimationFrame(sendVideoFrame);
      return;
    }

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      setError(new Error('Failed to get canvas context'));
      return;
    }

    try {
      // Scale down resolution based on video dimensions
      const scaleFactor = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight));
      canvas.width = video.videoWidth * scaleFactor;
      canvas.height = video.videoHeight * scaleFactor;

      if (canvas.width > 0 && canvas.height > 0) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        const data = base64.slice(base64.indexOf(',') + 1);
        
        console.debug('[VideoStream] Sending frame:', {
          width: canvas.width,
          height: canvas.height,
          dataLength: data.length,
          timestamp
        });

        client.sendRealtimeInput([{ 
          mimeType: 'image/jpeg',
          data 
        }]);

        lastFrameTimeRef.current = timestamp;
      } else {
        console.warn('[VideoStream] Invalid canvas dimensions');
        setError(new Error('Invalid video dimensions'));
      }
    } catch (error) {
      console.error('[VideoStream] Error processing frame:', error);
      setError(error instanceof Error ? error : new Error('Unknown error processing frame'));
    }

    frameRequestRef.current = requestAnimationFrame(sendVideoFrame);
  }, [client, videoRef, connected, activeVideoStream]);

  useEffect(() => {
    console.debug('[VideoStream] Stream/connection changed:', {
      hasVideo: !!videoRef.current,
      hasStream: !!activeVideoStream,
      connected
    });

    if (!videoRef.current) return;
    
    const video = videoRef.current;
    let mounted = true;
    
    const setupVideo = async () => {
      if (activeVideoStream && mounted) {
        try {
          video.srcObject = activeVideoStream;
          await video.play();
          console.debug('[VideoStream] Video playing:', {
            width: video.videoWidth,
            height: video.videoHeight,
            readyState: video.readyState
          });
          setError(null);
        } catch (err) {
          console.error('[VideoStream] Failed to setup video:', err);
          setError(err instanceof Error ? err : new Error('Failed to setup video'));
        }
      }
    };

    setupVideo();

    if (connected && activeVideoStream) {
      console.debug('[VideoStream] Starting frame capture');
      frameRequestRef.current = requestAnimationFrame(sendVideoFrame);
    }

    return () => {
      console.debug('[VideoStream] Cleanup');
      mounted = false;
      if (frameRequestRef.current) {
        cancelAnimationFrame(frameRequestRef.current);
      }
      if (video.srcObject) {
        video.pause();
        video.srcObject = null;
      }
    };
  }, [connected, activeVideoStream, videoRef, sendVideoFrame]);

  return { renderCanvasRef, error };
} 
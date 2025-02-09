import React, { useEffect, useRef } from 'react';
import { useVideoStream } from '../../hooks/use-video-stream';
import './video-stream.scss';

interface VideoStreamProps {
  stream: MediaStream | null;
}

const VideoStream: React.FC<VideoStreamProps> = ({ stream }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { renderCanvasRef, error } = useVideoStream({
    videoRef,
    activeVideoStream: stream
  });

  // Determine container classes based on stream presence and error state
  const containerClasses = `video-stream-container ${stream ? 'streaming' : ''} ${error ? 'error' : ''}`;

  return (
    <div className={containerClasses}>
      {/* Hidden canvas for frame capture */}
      <canvas ref={renderCanvasRef} style={{ display: 'none' }} />

      {/* "ON AIR" Indicator */}
      {stream && !error && (
        <div className="on-air-indicator">
          <span className="material-symbols-outlined">live_tv</span>
          ON AIR
        </div>
      )}

      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={stream && !error ? '' : 'hidden'}
      />

      {/* Error State */}
      {error && (
        <div className="video-error">
          <span className="material-symbols-outlined">error</span>
          <p>{error.message}</p>
        </div>
      )}

      {/* Placeholder/Loading State */}
      {!stream && !error && (
        <div className="video-placeholder">
          <span className="material-symbols-outlined">videocam_off</span>
          <p>Waiting for video stream...</p>
        </div>
      )}
    </div>
  );
};

export default VideoStream; 
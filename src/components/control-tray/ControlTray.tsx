/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import cn from "classnames";
import { memo, ReactNode, RefObject, useCallback, useEffect, useRef, useState } from "react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { UseMediaStreamResult } from "../../hooks/use-media-stream-mux";
import { useScreenCapture } from "../../hooks/use-screen-capture";
import { useWebcam } from "../../hooks/use-webcam";
import { AudioRecorder } from "../../lib/audio-recorder";
import AudioPulse from "../audio-pulse/AudioPulse";
import "./control-tray.scss";
import { ToolHandler } from "../../lib/tool-handler";
import { ChatWidgetComponent } from "../chat/ChatWidgetComponent";
import { useVideoStream } from '../../hooks/use-video-stream';
import { useChat } from '../../contexts/ChatContext';

export type ControlTrayProps = {
  videoRef: RefObject<HTMLVideoElement>;
  children?: ReactNode;
  supportsVideo: boolean;
  onVideoStreamChange?: (stream: MediaStream | null) => void;
};

type MediaStreamButtonProps = {
  isStreaming: boolean;
  onIcon: string;
  offIcon: string;
  start: () => Promise<any>;
  stop: () => any;
  disabled?: boolean;
  error?: Error | null;
};

/**
 * button used for triggering webcam or screen-capture
 */
const MediaStreamButton = memo(
  ({ isStreaming, onIcon, offIcon, start, stop, disabled, error }: MediaStreamButtonProps) => {
    const [isLoading, setIsLoading] = useState(false);
    
    const handleStart = async () => {
      if (disabled || isLoading) return;
      setIsLoading(true);
      try {
        await start();
      } catch (error) {
        console.error('Failed to start stream:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const handleStop = () => {
      if (disabled) return;
      stop();
    };

    const buttonClass = cn("action-button", {
      disabled,
      error: !!error,
      loading: isLoading
    });

    return isStreaming ? (
      <button className={buttonClass} onClick={handleStop} title={error?.message}>
        <span className="material-symbols-outlined">{onIcon}</span>
      </button>
    ) : (
      <button className={buttonClass} onClick={handleStart} title={error?.message}>
        <span className="material-symbols-outlined">{offIcon}</span>
        {isLoading && <span className="loading-indicator" />}
      </button>
    )
  }
);

function ControlTray({
  videoRef,
  children,
  onVideoStreamChange = () => {},
  supportsVideo,
}: ControlTrayProps) {
  const webcamStream = useWebcam();
  const screenCaptureStream = useScreenCapture();
  const [activeVideoStream, setActiveVideoStream] = useState<MediaStream | null>(null);
  const [streamError, setStreamError] = useState<Error | null>(null);
  const [inVolume, setInVolume] = useState(0);
  const [audioRecorder] = useState(() => new AudioRecorder());
  const [muted, setMuted] = useState(false);
  const { renderCanvasRef, error: videoProcessingError } = useVideoStream({ 
    videoRef, 
    activeVideoStream 
  });
  const connectButtonRef = useRef<HTMLButtonElement>(null);
  const { client, connected, connect, disconnect, volume } = useLiveAPIContext();
  const toolHandlerRef = useRef<ToolHandler | null>(null);
  const { isVisible: chatVisible, showChat, hideChat, setShouldCleanup } = useChat();

  // Handle stream changes
  const changeStreams = useCallback(async (nextStream?: UseMediaStreamResult) => {
    try {
      console.debug('[ControlTray] Changing streams:', {
        next: nextStream?.type,
        currentStream: activeVideoStream ? 'active' : 'none'
      });

      // Stop all streams
      [webcamStream, screenCaptureStream].forEach(msr => {
        if (msr.isStreaming) {
          console.debug('[ControlTray] Stopping stream:', msr.type);
          msr.stop();
        }
      });

      if (nextStream) {
        console.debug('[ControlTray] Starting new stream:', nextStream.type);
        try {
          const mediaStream = await nextStream.start();
          console.debug('[ControlTray] Stream started:', {
            tracks: mediaStream.getTracks().map(t => t.kind)
          });
          
          setActiveVideoStream(mediaStream);
          onVideoStreamChange(mediaStream);
          setStreamError(null);

          // Handle track ended events
          mediaStream.getTracks().forEach(track => {
            track.onended = () => {
              console.debug('[ControlTray] Track ended:', track.kind);
              setActiveVideoStream(null);
              onVideoStreamChange(null);
              setStreamError(new Error(`${track.kind} stream ended`));
            };
          });
        } catch (error) {
          console.error('[ControlTray] Failed to start stream:', error);
          setStreamError(error instanceof Error ? error : new Error('Failed to start stream'));
          throw error;
        }
      } else {
        console.debug('[ControlTray] Clearing stream');
        setActiveVideoStream(null);
        onVideoStreamChange(null);
        setStreamError(null);
      }
    } catch (error) {
      console.error('[ControlTray] Failed to change video stream:', error);
      setActiveVideoStream(null);
      onVideoStreamChange(null);
      setStreamError(error instanceof Error ? error : new Error('Failed to change stream'));
    }
  }, [webcamStream, screenCaptureStream, activeVideoStream, onVideoStreamChange]);

  // Handle connection changes
  useEffect(() => {
    if (!connected && connectButtonRef.current) {
      connectButtonRef.current.focus();
    }
  }, [connected]);

  // Handle volume visualization
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--volume",
      `${Math.max(5, Math.min(inVolume * 200, 8))}px`,
    );
  }, [inVolume]);

  // Handle audio recording
  useEffect(() => {
    const onData = (base64: string) => {
      client.sendRealtimeInput([
        {
          mimeType: "audio/pcm;rate=16000",
          data: base64,
        },
      ]);
    };
    if (connected && !muted && audioRecorder) {
      audioRecorder.on("data", onData).on("volume", setInVolume).start();
    } else {
      audioRecorder.stop();
    }
    return () => {
      audioRecorder.off("data", onData).off("volume", setInVolume);
    };
  }, [connected, client, muted, audioRecorder]);

  // Handle tool initialization
  useEffect(() => {
    if (connected) {
      if (toolHandlerRef.current) {
        try {
          toolHandlerRef.current.initializeWidgets();
        } catch (error) {
          console.error('Error initializing widgets:', error);
        }
      }
    } else {
      if (toolHandlerRef.current) {
        try {
          toolHandlerRef.current.destroyWidgets();
        } catch (error) {
          console.error('Error destroying widgets:', error);
        }
      }
    }
  }, [connected]);

  // Handle disconnect
  const handleDisconnect = useCallback(() => {
    setShouldCleanup(true);
    disconnect();
  }, [disconnect, setShouldCleanup]);

  // Reset cleanup flag when connection state changes
  useEffect(() => {
    if (connected) {
      setShouldCleanup(false);
    }
  }, [connected, setShouldCleanup]);

  // Handle chat toggle
  const toggleChat = useCallback(() => {
    if (chatVisible) {
      hideChat();
    } else {
      showChat();
    }
  }, [chatVisible, showChat, hideChat]);

  return (
    <>
      <section className={cn("control-tray", { "chat-visible": chatVisible })}>
        <canvas style={{ display: "none" }} ref={renderCanvasRef} />
        
        {/* Connect/Disconnect button outside the disabled nav */}
        <button
          ref={connectButtonRef}
          className={cn("action-button connect-toggle", { connected })}
          onClick={connected ? handleDisconnect : connect}
          title={connected ? "Disconnect" : "Connect"}
        >
          <span className="material-symbols-outlined filled">
            {connected ? "power_settings_new" : "play_arrow"}
          </span>
        </button>

        <nav className={cn("actions-nav", { disabled: !connected })}>
          <button
            className={cn("action-button mic-button", { muted })}
            onClick={() => setMuted(!muted)}
            title={muted ? "Unmute microphone" : "Mute microphone"}
          >
            {!muted ? (
              <span className="material-symbols-outlined filled">mic</span>
            ) : (
              <span className="material-symbols-outlined filled">mic_off</span>
            )}
          </button>

          <div className="action-button no-action outlined">
            <AudioPulse volume={volume} active={connected} hover={false} />
          </div>

          {supportsVideo && (
            <>
              <MediaStreamButton
                isStreaming={screenCaptureStream.isStreaming}
                start={() => changeStreams(screenCaptureStream)}
                stop={() => changeStreams()}
                onIcon="cancel_presentation"
                offIcon="present_to_all"
                disabled={!connected}
                error={streamError}
              />
              <MediaStreamButton
                isStreaming={webcamStream.isStreaming}
                start={() => changeStreams(webcamStream)}
                stop={() => changeStreams()}
                onIcon="videocam_off"
                offIcon="videocam"
                disabled={!connected}
                error={streamError || videoProcessingError}
              />
            </>
          )}

          <button
            className={cn("action-button", { active: chatVisible })}
            onClick={toggleChat}
            title={chatVisible ? "Hide chat" : "Show chat"}
          >
            <span className="material-symbols-outlined filled">chat</span>
          </button>

          {children}
        </nav>
      </section>

      {/* Render chat in persistent layer */}
      <div className={cn("persistent-chat-layer", { "has-chat": chatVisible })}>
        <ChatWidgetComponent />
      </div>
    </>
  );
}

export default memo(ControlTray);

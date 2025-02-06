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

import { memo, ReactNode, RefObject, useEffect, useRef, useState } from "react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { UseMediaStreamResult } from "../../hooks/use-media-stream-mux";
import { useScreenCapture } from "../../hooks/use-screen-capture";
import { useWebcam } from "../../hooks/use-webcam";
import { AudioRecorder } from "../../lib/audio-recorder";
import { ChatWidget } from "../widgets/chat/chat-widget";
import AudioPulse from "../audio-pulse/AudioPulse";
import "./control-tray.scss";
import { ToolHandler } from "../../lib/tool-handler";

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
};

/**
 * button used for triggering webcam or screen-capture
 */
const MediaStreamButton = memo(
  ({ isStreaming, onIcon, offIcon, start, stop }: MediaStreamButtonProps) =>
    isStreaming ? (
      <button className="action-button" onClick={stop}>
        <span className="material-symbols-outlined">{onIcon}</span>
      </button>
    ) : (
      <button className="action-button" onClick={start}>
        <span className="material-symbols-outlined">{offIcon}</span>
      </button>
    ),
);

function ControlTray({
  videoRef,
  children,
  onVideoStreamChange = () => {},
  supportsVideo,
}: ControlTrayProps) {
  const videoStreams = [useWebcam(), useScreenCapture()];
  const [activeVideoStream, setActiveVideoStream] =
    useState<MediaStream | null>(null);
  const [webcam, screenCapture] = videoStreams;
  const [inVolume, setInVolume] = useState(0);
  const [audioRecorder] = useState(() => new AudioRecorder());
  const [muted, setMuted] = useState(false);
  const renderCanvasRef = useRef<HTMLCanvasElement>(null);
  const connectButtonRef = useRef<HTMLButtonElement>(null);

  const { client, connected, connect, disconnect, volume } =
    useLiveAPIContext();

  const toolHandlerRef = useRef<ToolHandler | null>(null);
  const [chatWidgetVisible, setChatWidgetVisible] = useState(false);
  const chatWidgetRef = useRef<ChatWidget | null>(null);

  useEffect(() => {
    if (!connected && connectButtonRef.current) {
      connectButtonRef.current.focus();
    }
  }, [connected]);
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--volume",
      `${Math.max(5, Math.min(inVolume * 200, 8))}px`,
    );
  }, [inVolume]);

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

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = activeVideoStream;
    }

    let timeoutId = -1;

    function sendVideoFrame() {
      const video = videoRef.current;
      const canvas = renderCanvasRef.current;

      if (!video || !canvas) {
        return;
      }

      const ctx = canvas.getContext("2d")!;
      canvas.width = video.videoWidth * 0.25;
      canvas.height = video.videoHeight * 0.25;
      if (canvas.width + canvas.height > 0) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL("image/jpeg", 1.0);
        const data = base64.slice(base64.indexOf(",") + 1, Infinity);
        client.sendRealtimeInput([{ mimeType: "image/jpeg", data }]);
      }
      if (connected) {
        timeoutId = window.setTimeout(sendVideoFrame, 1000 / 0.5);
      }
    }
    if (connected && activeVideoStream !== null) {
      requestAnimationFrame(sendVideoFrame);
    }
    return () => {
      clearTimeout(timeoutId);
    };
  }, [connected, activeVideoStream, client, videoRef]);

  useEffect(() => {
    if (connected) {
      // Initialize tools and widgets when connected
      if (toolHandlerRef.current) {
        try {
          toolHandlerRef.current.initializeWidgets();
        } catch (error) {
          console.error('Error initializing widgets:', error);
        }
      }
    } else {
      // Cleanup when disconnected
      if (toolHandlerRef.current) {
        try {
          toolHandlerRef.current.destroyWidgets();
        } catch (error) {
          console.error('Error destroying widgets:', error);
        }
      }
    }
  }, [connected]);

  useEffect(() => {
    if (connected && chatWidgetVisible && !chatWidgetRef.current) {
      // Initialize chat widget when needed
      chatWidgetRef.current = new ChatWidget({
        id: 'control-tray-chat',
        liveAPIClient: client
      });
      const container = document.querySelector('.chat-widget-container');
      if (container) {
        chatWidgetRef.current.render().then(html => {
          container.innerHTML = html;
        });
      }
    }
  }, [connected, chatWidgetVisible, client]);

  //handler for swapping from one video-stream to the next
  const changeStreams = (next?: UseMediaStreamResult) => async () => {
    try {
      // First stop other streams
      videoStreams.filter((msr) => msr !== next).forEach((msr) => msr.stop());
      
      if (next) {
        const mediaStream = await next.start();
        setActiveVideoStream(mediaStream);
        onVideoStreamChange(mediaStream);
      } else {
        setActiveVideoStream(null);
        onVideoStreamChange(null);
      }
    } catch (error) {
      console.error('Failed to change video stream:', error);
      // Reset state on error
      setActiveVideoStream(null);
      onVideoStreamChange(null);
    }
  };

  const toggleChat = () => {
    setChatWidgetVisible(!chatWidgetVisible);
  };

  return (
    <>
      <section className="control-tray">
        <canvas style={{ display: "none" }} ref={renderCanvasRef} />
        <nav className={cn("actions-nav", { disabled: !connected })}>
          <button
            className={cn("action-button mic-button")}
            onClick={() => setMuted(!muted)}
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
                isStreaming={screenCapture.isStreaming}
                start={changeStreams(screenCapture)}
                stop={changeStreams()}
                onIcon="cancel_presentation"
                offIcon="present_to_all"
              />
              <MediaStreamButton
                isStreaming={webcam.isStreaming}
                start={changeStreams(webcam)}
                stop={changeStreams()}
                onIcon="videocam_off"
                offIcon="videocam"
              />
            </>
          )}

          <button
            className={cn("action-button", { active: chatWidgetVisible })}
            onClick={toggleChat}
          >
            <span className="material-symbols-outlined filled">
              {chatWidgetVisible ? "close" : "chat"}
            </span>
          </button>

          {children}
        </nav>

        <div className={cn("connection-container", { connected })}>
          <div className="connection-button-container">
            <button
              ref={connectButtonRef}
              className={cn("action-button connect-toggle", { connected })}
              onClick={connected ? disconnect : connect}
            >
              <span className="material-symbols-outlined filled">
                {connected ? "pause" : "play_arrow"}
              </span>
            </button>
          </div>
          <span className="text-indicator">Streaming</span>
        </div>
      </section>

      {chatWidgetVisible && (
        <div className="chat-widget-container fixed right-24 bottom-24 w-96 h-[32rem] bg-base-100 rounded-lg shadow-xl overflow-hidden">
          <div className="chat-widget-header flex justify-between items-center p-4 border-b border-base-200">
            <h3 className="font-medium">Chat</h3>
            <button className="btn btn-ghost btn-sm" onClick={toggleChat}>
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default memo(ControlTray);

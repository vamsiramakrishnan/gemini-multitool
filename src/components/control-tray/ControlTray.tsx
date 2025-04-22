import cn from "classnames";
import { memo, ReactNode, RefObject, useCallback, useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from 'framer-motion';
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
import ToolSelector from '../tool-selector/ToolSelector';
import { ToolDeclaration } from '../../lib/tool-declarations/types';
import { createLiveConfig } from '../../lib/config-helper';

export type ControlTrayProps = {
  videoRef: RefObject<HTMLVideoElement>;
  children?: ReactNode;
  supportsVideo: boolean;
  onVideoStreamChange?: (stream: MediaStream | null) => void;
  isConnected: boolean;
};

type MediaStreamButtonProps = {
  isStreaming: boolean;
  onIcon: string;
  offIcon: string;
  start: () => Promise<any>;
  stop: () => any;
  disabled?: boolean;
  error?: Error | null;
  tooltip?: string;
};

/**
 * button used for triggering webcam or screen-capture
 */
const MediaStreamButton = memo(
  ({ isStreaming, onIcon, offIcon, start, stop, disabled, error, tooltip }: MediaStreamButtonProps) => {
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
      loading: isLoading,
      active: isStreaming
    });

    return (
      <motion.button 
        className={buttonClass} 
        onClick={isStreaming ? handleStop : handleStart} 
        title={tooltip || error?.message}
        whileHover={{ y: -3, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}
        whileTap={{ y: 0, scale: 0.97 }}
      >
        <span className="material-symbols-outlined">{isStreaming ? onIcon : offIcon}</span>
        {isLoading && <span className="loading-indicator" />}
      </motion.button>
    );
  }
);

function ControlTray({
  videoRef,
  children,
  onVideoStreamChange = () => {},
  supportsVideo,
  isConnected
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
  
  // Get the context values
  const liveApiContext = useLiveAPIContext();
  
  // Memoize the values we need from the context
  const {
    client,
    connected,
    connect,
    disconnect,
    volume,
    updateSelectedTools,
    selectedTools,
    updateAndApplyConfig,
    config,
    setConfig
  } = useMemo(() => ({
    client: liveApiContext.client,
    connected: liveApiContext.connected,
    connect: liveApiContext.connect,
    disconnect: liveApiContext.disconnect,
    volume: liveApiContext.volume,
    updateSelectedTools: liveApiContext.updateSelectedTools,
    selectedTools: liveApiContext.selectedTools,
    updateAndApplyConfig: liveApiContext.updateAndApplyConfig,
    config: liveApiContext.config,
    setConfig: liveApiContext.setConfig
  }), [liveApiContext]);
  
  const toolHandlerRef = useRef<ToolHandler | null>(null);
  const { isVisible: chatVisible, showChat, hideChat, setShouldCleanup } = useChat();
  const [isExpanded, setIsExpanded] = useState(true);

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

  // Handle connect with selected tools
  const handleConnect = useCallback(async () => {
    try {
      updateAndApplyConfig();
      connect();
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  }, [connect, updateAndApplyConfig]);

  // Handle webcam toggle
  const handleWebcamToggle = useCallback(async () => {
    if (webcamStream.isStreaming) {
      await changeStreams();
    } else {
      await changeStreams(webcamStream);
    }
  }, [webcamStream, changeStreams]);

  // Handle screen capture toggle
  const handleScreenCaptureToggle = useCallback(async () => {
    if (screenCaptureStream.isStreaming) {
      await changeStreams();
    } else {
      await changeStreams(screenCaptureStream);
    }
  }, [screenCaptureStream, changeStreams]);

  // Handle mic toggle
  const handleMicToggle = useCallback(() => {
    setMuted(!muted);
  }, [muted]);

  // Toggle tray expansion
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  // Handle tool selection changes
  const handleToolSelectionChange = (newSelectedTools: ToolDeclaration[]) => {
    if (!isConnected) {
      // Update the selected tools in context
      if (updateSelectedTools) {
        updateSelectedTools(newSelectedTools);
      }
      
      // Update the config with new selected tools
      if (config && setConfig) {
        const systemInstructions = config.systemInstruction?.parts.map(p => p.text).join('') || '';
        const newConfig = createLiveConfig(systemInstructions, newSelectedTools);
        setConfig(newConfig);
      }
    }
  };

  return (
    <motion.div 
      className="control-tray-container"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="control-tray-header">
        <motion.button 
          className="expand-toggle"
          onClick={toggleExpand}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="material-symbols-outlined">
            {isExpanded ? "expand_more" : "expand_less"}
          </span>
        </motion.button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            className="control-tray"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="control-tray-section main-buttons">
              <div className="section-title">Connection</div>
              <button
                ref={connectButtonRef}
                className={cn("connect-toggle", { connected })}
                onClick={connected ? handleDisconnect : handleConnect}
              >
                <span className="material-symbols-outlined">
                  {connected ? "power_off" : "power_settings_new"}
                </span>
                {connected ? "Disconnect" : "Connect"}
              </button>
              
              <button
                className={cn("action-button chat-toggle", { active: chatVisible })}
                onClick={toggleChat}
              >
                <span className="material-symbols-outlined">chat</span>
              </button>
            </div>

            <div className="control-tray-section media-controls">
              <div className="section-title">Media</div>
              <div className="button-group">
                <MediaStreamButton
                  isStreaming={webcamStream.isStreaming}
                  start={handleWebcamToggle}
                  stop={handleWebcamToggle}
                  onIcon="videocam"
                  offIcon="videocam_off"
                  disabled={!supportsVideo}
                  error={streamError}
                  tooltip="Toggle Webcam"
                />
                
                <MediaStreamButton
                  isStreaming={screenCaptureStream.isStreaming}
                  start={handleScreenCaptureToggle}
                  stop={handleScreenCaptureToggle}
                  onIcon="cast"
                  offIcon="cast"
                  disabled={!supportsVideo}
                  error={streamError}
                  tooltip="Toggle Screen Sharing"
                />
                
                <button
                  className={cn("action-button mic-button", { muted })}
                  onClick={handleMicToggle}
                  title="Toggle Microphone"
                >
                  <span className="material-symbols-outlined">
                    {muted ? "mic_off" : "mic"}
                  </span>
                  {connected && !muted && <AudioPulse volume={volume} active={true} />}
                </button>
              </div>
            </div>

            <div className="control-tray-section tool-selection">
              <div className="section-title">Tools</div>
              <div className="tool-selector-container">
                <ToolSelector
                  onToolSelectionChange={handleToolSelectionChange}
                  isConnected={isConnected}
                  disabled={isConnected}
                />
              </div>
            </div>

            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default memo(ControlTray);

import React, { useEffect, useRef, useState, FormEvent, useCallback, useMemo } from 'react';
import { Message } from '../../types/chat';
import { useChat } from '../../contexts/ChatContext';
import AudioPulse from '../audio-pulse/AudioPulse';
import './chat-widget.scss';

// Memoized message component for better performance
const ChatMessage: React.FC<{
  message: Message;
  playingAudioId: string | null;
  audioRefs: React.MutableRefObject<{ [key: string]: HTMLAudioElement | null }>;
  onAudioPlay: (id: string) => void;
  onAudioPause: () => void;
  onAudioEnded: () => void;
}> = React.memo(({ 
  message, 
  playingAudioId, 
  audioRefs, 
  onAudioPlay, 
  onAudioPause, 
  onAudioEnded 
}) => {
  const [volume, setVolume] = useState(0.5);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Simulate volume changes for the pulse animation
  useEffect(() => {
    if (message.isCollectingAudio) {
      const interval = setInterval(() => {
        setVolume(Math.random() * 0.5 + 0.3);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [message.isCollectingAudio]);

  // Set up audio ref when component mounts
  useEffect(() => {
    if (message.audioUrl && audioRef.current) {
      audioRefs.current[message.id!] = audioRef.current;
    }
    return () => {
      if (message.id) {
        delete audioRefs.current[message.id];
      }
    };
  }, [message.id, message.audioUrl, audioRefs]);

  const handlePlayClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const audio = audioRef.current;
    console.log('Play button clicked, attempting to play/pause');
    
    if (!audio) {
      console.error('No audio element found');
      return;
    }

    console.log('Audio state:', {
      paused: audio.paused,
      readyState: audio.readyState,
      currentSrc: audio.currentSrc,
      error: audio.error
    });

    try {
      if (audio.paused) {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('Audio playback started successfully');
              onAudioPlay(message.id!);
            })
            .catch(error => {
              console.error('Error playing audio:', error);
            });
        }
      } else {
        audio.pause();
        onAudioPause();
      }
    } catch (error) {
      console.error('Error handling play/pause:', error);
    }
  }, [message.id, onAudioPlay, onAudioPause]);

  return (
    <div className={`message ${message.role}`}>
      {message.content && message.content !== 'Voice message' && (
        <div className="message-content">{message.content}</div>
      )}
      <div className="message-audio-container">
        {message.isCollectingAudio && (
          <div className="audio-pulse-wrapper">
            <AudioPulse active={true} volume={volume} />
            <span className="collecting-text">Receiving audio...</span>
          </div>
        )}
        {message.audioUrl && !message.isCollectingAudio && (
          <div className={`message-audio ${playingAudioId === message.id ? 'playing' : ''}`}>
            <div className="audio-player-wrapper retrofuture">
              <div className="audio-player-controls">
                <button 
                  className="play-button"
                  onClick={handlePlayClick}
                  type="button"
                  aria-label={playingAudioId === message.id ? 'Pause' : 'Play'}
                  tabIndex={0}
                >
                  <span className="material-symbols-outlined">
                    {playingAudioId === message.id ? 'pause' : 'play_arrow'}
                  </span>
                </button>
                <div className="audio-info">
                  <div className="audio-title">Voice message</div>
                  <div className="audio-duration">
                    {audioRef.current?.duration 
                      ? `${Math.floor(audioRef.current.duration)}s` 
                      : 'Loading...'}
                  </div>
                </div>
              </div>
              <audio 
                ref={audioRef}
                src={message.audioUrl}
                preload="metadata"
                onPlay={() => {
                  console.log('Audio started playing:', message.id);
                  onAudioPlay(message.id!);
                }}
                onPause={() => {
                  console.log('Audio paused:', message.id);
                  onAudioPause();
                }}
                onEnded={() => {
                  console.log('Audio ended:', message.id);
                  onAudioEnded();
                }}
                onLoadedMetadata={(e) => {
                  const audio = e.currentTarget;
                  console.log('Audio metadata loaded:', {
                    duration: audio.duration,
                    readyState: audio.readyState,
                    src: audio.src,
                    currentTime: audio.currentTime
                  });
                  setVolume(v => v);
                }}
                onError={(e) => {
                  const audio = e.currentTarget;
                  console.error('Audio error:', {
                    error: audio.error,
                    src: audio.src,
                    readyState: audio.readyState,
                    networkState: audio.networkState
                  });
                }}
              />
              <div className="audio-waveform">
                <div className="waveform-line" />
                <div className="waveform-line" />
                <div className="waveform-line" />
                <div className="waveform-line" />
                <div className="waveform-line" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.message === nextProps.message &&
    prevProps.playingAudioId === nextProps.playingAudioId
  );
});

export const ChatWidgetComponent: React.FC = () => {
  const {
    isVisible,
    messages,
    hideChat,
    minimizeChat,
    sendMessage,
  } = useChat();
  
  const [inputValue, setInputValue] = useState('');
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({});

  // Cleanup audio elements when component unmounts
  useEffect(() => {
    return () => {
      Object.values(audioRefs.current).forEach(audio => {
        if (audio) {
          audio.pause();
          audio.src = '';
          URL.revokeObjectURL(audio.src);
        }
      });
      audioRefs.current = {};
    };
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current && isVisible) {
      const scrollOptions = { behavior: 'smooth' as const };
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView(scrollOptions);
      });
    }
  }, [messages, isVisible]);

  // Focus input when chat becomes visible
  useEffect(() => {
    if (isVisible && inputRef.current) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [isVisible]);

  // Memoized handlers
  const handleAudioPlay = useCallback((messageId: string) => {
    // Stop any currently playing audio
    if (playingAudioId && playingAudioId !== messageId) {
      const currentAudio = audioRefs.current[playingAudioId];
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
    }
    setPlayingAudioId(messageId);
  }, [playingAudioId]);

  const handleAudioPause = useCallback(() => {
    setPlayingAudioId(null);
  }, []);

  const handleAudioEnded = useCallback(() => {
    setPlayingAudioId(null);
  }, []);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    await sendMessage(inputValue.trim());
    setInputValue('');
  }, [inputValue, sendMessage]);

  // Add ESC key handler
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isVisible) {
        hideChat();
      }
    };

    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }, [isVisible, hideChat]);

  if (!isVisible) return null;

  return (
    <div className="chat-widget">
      <div className="chat-content">
        <div className="chat-header">
          <div className="chat-title">
            <span className="material-symbols-outlined">chat</span>
            <h2>Chat</h2>
          </div>
          <div className="controls">
            <button
              onClick={minimizeChat}
              className="control-button minimize"
              title="Minimize chat"
            >
              <span className="material-symbols-outlined">remove</span>
            </button>
            <button
              onClick={hideChat}
              className="control-button close"
              title="Close chat (ESC)"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
        
        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="empty-state">
              <span className="material-symbols-outlined icon">chat</span>
              <h3>Start a conversation</h3>
              <p>Type a message to begin chatting with the assistant</p>
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                playingAudioId={playingAudioId}
                audioRefs={audioRefs}
                onAudioPlay={handleAudioPlay}
                onAudioPause={handleAudioPause}
                onAudioEnded={handleAudioEnded}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="input-form">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your message..."
            className="message-input"
          />
          <button type="submit" className="send-button" disabled={!inputValue.trim()}>
            <span className="material-symbols-outlined">send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
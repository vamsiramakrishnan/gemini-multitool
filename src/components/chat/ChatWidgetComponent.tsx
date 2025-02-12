import React, { useEffect, useRef, useState, FormEvent } from 'react';
import { Message } from '../../types/chat';
import { useChat } from '../../contexts/ChatContext';
import './chat-widget.scss';

export const ChatWidgetComponent: React.FC = () => {
  const {
    isVisible,
    messages,
    hideChat,
    minimizeChat,
    sendMessage,
    clearMessages
  } = useChat();
  
  const [inputValue, setInputValue] = useState('');
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({});

  useEffect(() => {
    if (messagesEndRef.current && isVisible) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isVisible]);

  // Focus input when chat becomes visible
  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isVisible]);

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    await sendMessage(inputValue.trim());
    setInputValue('');
  };

  const handleAudioPlay = (messageId: string) => {
    // Stop any currently playing audio
    if (playingAudioId && playingAudioId !== messageId) {
      const currentAudio = audioRefs.current[playingAudioId];
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
    }
    setPlayingAudioId(messageId);
  };

  const handleAudioPause = () => {
    setPlayingAudioId(null);
  };

  const handleAudioEnded = () => {
    setPlayingAudioId(null);
  };

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
              <div key={message.id} className={`message ${message.role}`}>
                {message.content && (
                  <div className="message-content">{message.content}</div>
                )}
                {message.audioUrl && (
                  <div className={`message-audio ${playingAudioId === message.id ? 'playing' : ''}`}>
                    <div className="audio-player-wrapper">
                      <div className="audio-player-controls">
                        <button 
                          className="play-button"
                          onClick={() => {
                            const audio = audioRefs.current[message.id!];
                            if (audio) {
                              if (audio.paused) {
                                audio.play();
                              } else {
                                audio.pause();
                              }
                            }
                          }}
                        >
                          <span className="material-symbols-outlined">
                            {playingAudioId === message.id ? 'pause' : 'play_arrow'}
                          </span>
                        </button>
                        <div className="audio-info">
                          <div className="audio-title">Voice message</div>
                          <div className="audio-duration">
                            {audioRefs.current[message.id!]?.duration 
                              ? `${Math.floor(audioRefs.current[message.id!]!.duration)}s` 
                              : 'Loading...'}
                          </div>
                        </div>
                      </div>
                      <audio 
                        ref={el => audioRefs.current[message.id!] = el}
                        src={message.audioUrl}
                        onPlay={() => handleAudioPlay(message.id!)}
                        onPause={handleAudioPause}
                        onEnded={handleAudioEnded}
                        onError={(e) => {
                          console.error('Audio player error:', e);
                          const audio = e.currentTarget;
                          console.log('Audio state:', {
                            error: audio.error,
                            networkState: audio.networkState,
                            readyState: audio.readyState
                          });
                        }}
                        onLoadedMetadata={(e) => {
                          console.log('Audio metadata loaded:', {
                            duration: e.currentTarget.duration,
                            src: e.currentTarget.src
                          });
                          // Force a re-render to update duration display
                          setPlayingAudioId(curr => curr);
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
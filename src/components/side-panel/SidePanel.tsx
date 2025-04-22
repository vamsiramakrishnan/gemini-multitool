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

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import cn from 'classnames';
import { RiSidebarFoldLine, RiSidebarUnfoldLine } from 'react-icons/ri';
import { FiMaximize2, FiMinimize2, FiSend, FiMessageSquare, FiVideo, FiSmile } from 'react-icons/fi';
import { useLiveAPIContext } from '../../contexts/LiveAPIContext';
import { useLoggerStore } from '../../lib/store-logger';
import Logger from '../logger/Logger';
import VideoStream from '../video-stream/VideoStream';
import './side-panel.scss';
import { useLayout } from '../../contexts/LayoutContext';
import { useWidget } from '../../contexts/RootContext';

// Define the props type for the CollapsibleSection component
interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

// Define the collapsible section component
const CollapsibleSection = ({ title, icon, children, defaultOpen = true }: CollapsibleSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="collapsible-section">
      <button 
        className="section-header" 
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <div className="section-title">
          {icon}
          <span>{title}</span>
        </div>
        <span className="section-chevron">
          {isOpen ? '▲' : '▼'}
        </span>
      </button>
      {isOpen && (
        <div className="section-content">
          {children}
        </div>
      )}
    </div>
  );
};

// Define the store state type
interface LoggerStoreState {
  maxLogs: number;
  logs: any[];
  log: (streamingLog: any) => void;
  clearLogs: () => void;
  setMaxLogs?: (n: number) => void;
}

interface SidePanelProps {
  videoStream: MediaStream | null;
}

export default function SidePanel({ videoStream }: SidePanelProps) {
  // Get the context values and memoize them
  const liveApiContext = useLiveAPIContext();
  const { connected, client } = useMemo(() => ({
    connected: liveApiContext.connected,
    client: liveApiContext.client
  }), [liveApiContext]);

  const { panelOpen, setPanelOpen } = useLayout();
  const { widgetData } = useWidget();
  const loggerRef = useRef<HTMLDivElement>(null);
  
  // Access the logger store with individual selectors for better memoization
  const log = useLoggerStore(state => state.log);
  const logs = useLoggerStore(state => state.logs);

  const [textInput, setTextInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [videoFullscreen, setVideoFullscreen] = useState(false);

  // Scroll to bottom of logger when new logs arrive
  useEffect(() => {
    if (loggerRef.current && panelOpen) {
      const el = loggerRef.current;
      el.scrollTo({
        top: el.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [logs, panelOpen]);

  useEffect(() => {
    client.on('log', log);
    return () => {
      client.off('log', log);
    };
  }, [client, log]);

  const handleSubmit = useCallback(() => {
    if (textInput.trim()) {
      client.send([{ text: textInput.trim() }]);
      setTextInput('');
      if (inputRef.current) {
        inputRef.current.value = ''; // Clear textarea
      }
    }
  }, [client, textInput]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  // Mock emoji insertion
  const insertEmoji = (emoji: string) => {
    setTextInput(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  // Array of emojis for the picker
  const emojis = ["😊", "👍", "🎉", "❤️", "😂", "🤔", "👏", "🙏", "🔥", "✨", "💯", "🤝"];

  return (
    <>
      <button
        className={cn('panel-toggle', { open: panelOpen })}
        onClick={() => setPanelOpen(!panelOpen)}
        aria-label={panelOpen ? 'Close activity panel' : 'Open activity panel'}
      >
        {panelOpen ? (
          <RiSidebarFoldLine />
        ) : (
          <RiSidebarUnfoldLine />
        )}
      </button>

      <div className={cn('side-panel', { open: panelOpen })}>
        <div className="panel-header">
          <h2>Activity Panel</h2>
          <div className={cn('streaming-indicator', { connected })}>
            {connected ? '🟢 Live' : '⏸️ Paused'}
          </div>
        </div>

        <div className="panel-content">
          <CollapsibleSection 
            title="Video Stream" 
            icon={<FiVideo />}
            defaultOpen={true}
          >
            <div className={cn(
              "video-container",
              { fullscreen: videoFullscreen }
            )}>
              <VideoStream stream={videoStream} />
              <button 
                className="fullscreen-toggle"
                onClick={() => setVideoFullscreen(!videoFullscreen)}
                aria-label={videoFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {videoFullscreen ? <FiMinimize2 /> : <FiMaximize2 />}
              </button>
            </div>
          </CollapsibleSection>

          <CollapsibleSection 
            title="System Logs" 
            icon={<FiMessageSquare />}
            defaultOpen={true}
          >
            <div className="logger-section">
              <div className="logger-content" ref={loggerRef}>
                <Logger />
              </div>
            </div>
          </CollapsibleSection>

          <div className={cn('input-container', { disabled: !connected })}>
            <div className="input-content">
              <div className="input-wrapper">
                <textarea
                  className="input-area"
                  ref={inputRef}
                  onKeyDown={handleKeyDown}
                  onChange={(e) => setTextInput(e.target.value)}
                  value={textInput}
                  placeholder="Type something..."
                  disabled={!connected}
                  aria-label="Message input"
                />
                <div className="input-actions">
                  <button
                    className="emoji-button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    aria-label="Add emoji"
                    type="button"
                  >
                    <FiSmile />
                  </button>
                  <button
                    className="send-button"
                    onClick={handleSubmit}
                    disabled={!connected}
                    aria-label="Send message"
                    type="button"
                  >
                    <FiSend />
                  </button>
                </div>
              </div>

              {showEmojiPicker && (
                <div className="emoji-picker">
                  {emojis.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => insertEmoji(emoji)}
                      className="emoji-option"
                      type="button"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

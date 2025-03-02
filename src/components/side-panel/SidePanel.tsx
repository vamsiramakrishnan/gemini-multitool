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

import React, { useState, useRef, useEffect, useCallback } from 'react';
import cn from 'classnames';
import { RiSidebarFoldLine, RiSidebarUnfoldLine } from 'react-icons/ri';
import { useLiveAPIContext } from '../../contexts/LiveAPIContext';
import { useLoggerStore } from '../../lib/store-logger';
import Logger from '../logger/Logger';
import VideoStream from '../video-stream/VideoStream';
import './side-panel.scss';
import { useLayout } from '../../contexts/LayoutContext';
import { useWidget } from '../../contexts/RootContext';

interface SidePanelProps {
  videoStream: MediaStream | null;
}

export default function SidePanel({ videoStream }: SidePanelProps) {
  const { connected, client } = useLiveAPIContext();
  const { panelOpen, setPanelOpen } = useLayout();
  const { widgetData } = useWidget();
  const loggerRef = useRef<HTMLDivElement>(null);
  const { log, logs } = useLoggerStore();

  const [textInput, setTextInput] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  return (
    <>
      <button
        className={cn('panel-toggle', { open: panelOpen })}
        onClick={() => setPanelOpen(!panelOpen)}
        aria-label={panelOpen ? 'Close activity panel' : 'Open activity panel'}
        style={{ transition: 'transform 0.3s ease', transform: panelOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
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
          <div className="video-stream-section">
            <VideoStream stream={videoStream} />
          </div>

          <div className="logger-section">
            <div className="logger-content" ref={loggerRef}>
              <Logger />
            </div>
          </div>

          <div className={cn('input-container', { disabled: !connected })}>
            <div className="input-content">
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
              <button
                className="send-button material-symbols-outlined"
                onClick={handleSubmit}
                disabled={!connected}
                aria-label="Send message"
              >
                send
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

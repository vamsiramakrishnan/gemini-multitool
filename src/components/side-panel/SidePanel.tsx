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
import Select from 'react-select';
import { useLiveAPIContext } from '../../contexts/LiveAPIContext';
import { useLoggerStore } from '../../lib/store-logger';
import Logger, { LoggerFilterType } from '../logger/Logger';
import VideoStream from '../video-stream/VideoStream';
import './side-panel.scss';
import { useLayout } from '../../contexts/LayoutContext';
import { useWidget } from '../../contexts/RootContext';

interface SidePanelProps {
  videoStream: MediaStream | null;
}

const filterOptions = [
  { value: 'conversations', label: 'Conversations' },
  { value: 'tools', label: 'Tool Use' },
  { value: 'none', label: 'All' },
];

export default function SidePanel({ videoStream }: SidePanelProps) {
  const { connected, client } = useLiveAPIContext();
  const { panelOpen, setPanelOpen } = useLayout();
  const { widgetData } = useWidget();
  const loggerRef = useRef<HTMLDivElement>(null);
  const { log, logs } = useLoggerStore();

  const [textInput, setTextInput] = useState('');
  const [selectedOption, setSelectedOption] = useState<{ value: string; label: string } | null>(null);
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
      {/* Panel Toggle Button - Move outside the side panel container */}
      <button
        className={cn('panel-toggle', { open: panelOpen })}
        onClick={() => setPanelOpen(!panelOpen)}
        aria-label={panelOpen ? 'Close panel' : 'Open panel'}
      >
        {panelOpen ? (
          <RiSidebarFoldLine style={{ color: 'var(--retro-blue)' }} />
        ) : (
          <RiSidebarUnfoldLine style={{ color: 'var(--retro-blue)' }} />
        )}
      </button>

      <div className={cn('side-panel', { open: panelOpen })}>
        <div className="panel-header">
          <h2>Activity Panel</h2>
        </div>

        <div className="panel-content">
          <div className="video-stream-section">
            <VideoStream stream={videoStream} />
          </div>

          <div className="logger-section">
            <div className="logger-header">
              <div className="filters">
                <Select
                  className="react-select"
                  classNamePrefix="react-select"
                  styles={{
                    control: (baseStyles) => ({
                      ...baseStyles,
                      backgroundColor: 'var(--retro-black)',
                      border: '1px solid var(--retro-blue)',
                      color: 'var(--retro-green)',
                      height: '30px',
                      minHeight: 'unset',
                    }),
                    singleValue: (styles) => ({
                      ...styles,
                      color: 'var(--retro-green)',
                    }),
                    menu: (styles) => ({
                      ...styles,
                      backgroundColor: 'var(--retro-black)',
                      color: 'var(--retro-green)',
                    }),
                    option: (styles, { isFocused, isSelected }) => ({
                      ...styles,
                      backgroundColor: isFocused
                        ? 'rgba(var(--retro-blue), 0.2)'
                        : isSelected
                          ? 'rgba(var(--retro-blue), 0.1)'
                          : 'transparent',
                      color: isSelected ? 'var(--retro-blue)' : 'var(--retro-green)',
                    }),
                  }}
                  defaultValue={selectedOption}
                  options={filterOptions}
                  onChange={(e) => setSelectedOption(e)}
                  isSearchable={false}
                />
                <div className={cn('streaming-indicator', { connected })}>
                  {connected ? '🔵 Streaming' : '⏸️ Paused'}
                </div>
              </div>
            </div>
            <div className="logger-content" ref={loggerRef}>
              <Logger filter={(selectedOption?.value as LoggerFilterType) || 'none'} />
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
                aria-label="Type your message"
              />
              <button
                className="send-button material-symbols-outlined filled"
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

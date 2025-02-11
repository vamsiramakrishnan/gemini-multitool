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
import { useEffect, useRef, useState } from "react";
import { RiSidebarFoldLine, RiSidebarUnfoldLine } from "react-icons/ri";
import Select from "react-select";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { useLoggerStore } from "../../lib/store-logger";
import Logger, { LoggerFilterType } from "../logger/Logger";
import VideoStream from "../video-stream/VideoStream";
import "./side-panel.scss";
import { useLayout } from "../../contexts/LayoutContext";
import { useWidget } from "../../contexts/RootContext";

interface SidePanelProps {
  videoStream: MediaStream | null;
}

const filterOptions = [
  { value: "conversations", label: "Conversations" },
  { value: "tools", label: "Tool Use" },
  { value: "none", label: "All" },
];

export default function SidePanel({ videoStream }: SidePanelProps) {
  const { connected, client } = useLiveAPIContext();
  const { panelOpen, setPanelOpen } = useLayout();
  const { widgetData } = useWidget();
  const loggerRef = useRef<HTMLDivElement>(null);
  const { log, logs } = useLoggerStore();

  const [textInput, setTextInput] = useState("");
  const [selectedOption, setSelectedOption] = useState<{
    value: string;
    label: string;
  } | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (loggerRef.current && panelOpen) {
      const el = loggerRef.current;
      el.scrollTo({
        top: el.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [logs, panelOpen]);

  useEffect(() => {
    client.on("log", log);
    return () => {
      client.off("log", log);
    };
  }, [client, log]);

  const handleSubmit = () => {
    client.send([{ text: textInput }]);
    setTextInput("");
    if (inputRef.current) {
      inputRef.current.innerText = "";
    }
  };

  return (
    <>
      {/* Panel Toggle Button - Move outside the side panel container */}
      <button
        className={cn("panel-toggle", { open: panelOpen })}
        onClick={() => setPanelOpen(!panelOpen)}
        aria-label={panelOpen ? "Close panel" : "Open panel"}
      >
        {panelOpen ? (
          <RiSidebarFoldLine style={{ color: 'var(--retro-blue)' }} />
        ) : (
          <RiSidebarUnfoldLine style={{ color: 'var(--retro-blue)' }} />
        )}
      </button>

      <div className={cn("side-panel", { open: panelOpen })}>
        <div className="panel-header">
          <h2>Activity Panel</h2>
        </div>

        <div className="video-stream-section">
          <div className="video-stream-container">
            <VideoStream stream={videoStream} />
            {videoStream && (
              <div className="on-air-indicator">
                <span className="material-symbols-outlined">videocam</span>
                ON AIR
              </div>
            )}
            {!videoStream && (
              <div className="video-placeholder">
                <span className="material-symbols-outlined">videocam_off</span>
                <p>No video stream available</p>
              </div>
            )}
          </div>
        </div>

        {/* Logger Section */}
        <div className="logger-section">
          {/* Logger Header with Filters */}
          <div className="logger-header">
            <div className="filters">
              <Select
                className="react-select"
                classNamePrefix="react-select"
                styles={{
                  control: (baseStyles) => ({
                    ...baseStyles,
                    backgroundColor: "var(--Neutral-20)",
                    border: "1px solid var(--Neutral-30)",
                    color: "var(--Neutral-90)",
                    height: "30px",
                    minHeight: "unset",
                  }),
                  singleValue: (styles) => ({
                    ...styles,
                    color: "var(--Neutral-90)",
                  }),
                  menu: (styles) => ({
                    ...styles,
                    backgroundColor: "var(--Neutral-20)",
                    color: "var(--Neutral-90)",
                  }),
                  option: (styles, { isFocused, isSelected }) => ({
                    ...styles,
                    backgroundColor: isFocused
                      ? "var(--Neutral-30)"
                      : isSelected
                        ? "var(--Neutral-20)"
                        : undefined,
                  }),
                }}
                defaultValue={selectedOption}
                options={filterOptions}
                onChange={(e) => setSelectedOption(e)}
              />
              <div className={cn("streaming-indicator", { connected })}>
                {connected ? "🔵 Streaming" : "⏸️ Paused"}
              </div>
            </div>
          </div>

          {/* Logger Content */}
          <div className="logger-content" ref={loggerRef}>
            <Logger
              filter={(selectedOption?.value as LoggerFilterType) || "none"}
            />
          </div>
        </div>

        {/* Input Container */}
        <div className={cn("input-container", { disabled: !connected })}>
          <div className="input-content">
            <textarea
              className="input-area"
              ref={inputRef}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSubmit();
                }
              }}
              onChange={(e) => setTextInput(e.target.value)}
              value={textInput}
              placeholder="Type something..."
            />
            <button
              className="send-button material-symbols-outlined filled"
              onClick={handleSubmit}
            >
              send
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

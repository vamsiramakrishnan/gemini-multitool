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

import "./logger.scss";

import { Part } from "@google/generative-ai";
import cn from "classnames";
import { ReactNode, useRef, useState, useEffect, memo, useMemo, useCallback } from "react";
import { useLoggerStore } from "../../lib/store-logger";
import SyntaxHighlighter from "react-syntax-highlighter";
import { vs2015 as dark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import memoize from 'lodash/memoize';
import {
  ClientContentMessage,
  isClientContentMessage,
  isInterrupted,
  isModelTurn,
  isServerContentMessage,
  isToolCallCancellationMessage,
  isToolCallMessage,
  isToolResponseMessage,
  isTurnComplete,
  ModelTurn,
  ServerContentMessage,
  StreamingLog,
  ToolCallCancellationMessage,
  ToolCallMessage,
  ToolResponseMessage,
} from "../../multimodal-live-types";

const formatTime = (d: Date) => d.toLocaleTimeString().slice(0, -3);

const LogEntry = ({
  log,
  MessageComponent,
}: {
  log: StreamingLog;
  MessageComponent: ({
    message,
  }: {
    message: StreamingLog["message"];
  }) => ReactNode;
}): JSX.Element => (
  <li
    className={cn(
      `plain-log`,
      `source-${log.type.slice(0, log.type.indexOf("."))}`,
      {
        receive: log.type.includes("receive"),
        send: log.type.includes("send"),
      },
    )}
  >
    <span className="timestamp">{formatTime(log.date)}</span>
    <span className="source">{log.type}</span>
    <span className="message">
      <MessageComponent message={log.message} />
    </span>
    {log.count && <span className="count">{log.count}</span>}
  </li>
);

const PlainTextMessage = ({
  message,
}: {
  message: StreamingLog["message"];
}) => <span>{message as string}</span>;

type Message = { message: StreamingLog["message"] };

const AnyMessage = ({ message }: Message) => (
  <pre>{JSON.stringify(message, null, "  ")}</pre>
);

function tryParseCodeExecutionResult(output: string) {
  try {
    const json = JSON.parse(output);
    return JSON.stringify(json, null, "  ");
  } catch (e) {
    return output;
  }
}

type CodeExecutionOutcome = 'success' | 'error';

const RenderPart = memo(({ part }: { part: Part }) => {
  if (part.text && part.text.length) {
    return <p className="part part-text">{part.text}</p>;
  }
  
  if (part.executableCode) {
    return (
      <div className="part part-executableCode">
        <h5>Code: {part.executableCode.language}</h5>
        <SyntaxHighlighter
          language={part.executableCode.language.toLowerCase()}
          style={dark}
          customStyle={{ margin: 0 }}
        >
          {part.executableCode.code}
        </SyntaxHighlighter>
      </div>
    );
  }
  
  if (part.codeExecutionResult) {
    const outcome = (part.codeExecutionResult.outcome as unknown) as CodeExecutionOutcome;
    return (
      <div className="part part-codeExecutionResult">
        <h5 className={outcome === 'success' ? 'success' : 'error'}>
          Result: {outcome}
        </h5>
        <SyntaxHighlighter
          language="json"
          style={dark}
          customStyle={{ margin: 0 }}
        >
          {tryParseCodeExecutionResult(part.codeExecutionResult.output)}
        </SyntaxHighlighter>
      </div>
    );
  }
  
  return (
    <div className="part part-inlinedata">
      <h5>Inline Data: {part.inlineData?.mimeType}</h5>
    </div>
  );
});

const ClientContentLog = ({ message }: Message) => {
  const { turns, turnComplete } = (message as ClientContentMessage)
    .clientContent;
  return (
    <div className="rich-log client-content user">
      <h4 className="roler-user">User</h4>
      {turns.map((turn, i) => (
        <div key={`message-turn-${i}`}>
          {turn.parts
            .filter((part) => !(part.text && part.text === "\n"))
            .map((part, j) => (
              <RenderPart part={part} key={`message-turh-${i}-part-${j}`} />
            ))}
        </div>
      ))}
      {!turnComplete ? <span>turnComplete: false</span> : ""}
    </div>
  );
};

const ToolCallLog = ({ message }: Message) => {
  const { toolCall } = message as ToolCallMessage;
  return (
    <div className={cn("rich-log tool-call")}>
      {toolCall.functionCalls.map((fc, i) => (
        <div key={fc.id} className="part part-functioncall">
          <h5>Function call: {fc.name}</h5>
          <SyntaxHighlighter language="json" style={dark}>
            {JSON.stringify(fc, null, "  ")}
          </SyntaxHighlighter>
        </div>
      ))}
    </div>
  );
};

const ToolCallCancellationLog = ({ message }: Message): JSX.Element => (
  <div className={cn("rich-log tool-call-cancellation")}>
    <span>
      {" "}
      ids:{" "}
      {(message as ToolCallCancellationMessage).toolCallCancellation.ids.map(
        (id) => (
          <span className="inline-code" key={`cancel-${id}`}>
            "{id}"
          </span>
        ),
      )}
    </span>
  </div>
);

const ToolResponseLog = ({ message }: Message): JSX.Element => (
  <div className={cn("rich-log tool-response")}>
    {(message as ToolResponseMessage).toolResponse.functionResponses.map(
      (fc) => (
        <div key={`tool-response-${fc.id}`} className="part">
          <h5>Function Response: {fc.id}</h5>
          <SyntaxHighlighter language="json" style={dark}>
            {JSON.stringify(fc.response, null, "  ")}
          </SyntaxHighlighter>
        </div>
      ),
    )}
  </div>
);

const ModelTurnLog = ({ message }: Message): JSX.Element => {
  const serverContent = (message as ServerContentMessage).serverContent;
  const { modelTurn } = serverContent as ModelTurn;
  const { parts } = modelTurn;

  return (
    <div className="rich-log model-turn model">
      <h4 className="role-model">Model</h4>
      {parts
        .filter((part) => !(part.text && part.text === "\n"))
        .map((part, j) => (
          <RenderPart part={part} key={`model-turn-part-${j}`} />
        ))}
    </div>
  );
};

const CustomPlainTextLog = (msg: string) => () => (
  <PlainTextMessage message={msg} />
);

const FILTER_TYPES = {
  ALL: 'all',
  CHAT: 'chat',
  TOOLS: 'tools'
} as const;

type FilterType = typeof FILTER_TYPES[keyof typeof FILTER_TYPES];

// Memoized log entry components
const MemoizedLogEntry = memo(LogEntry);
const MemoizedRenderPart = memo(RenderPart);

// Update virtualization config for better content handling
const VIRTUALIZATION_CONFIG = {
  itemHeight: 80, // Increased base height for rich content
  overscan: 3,    // Reduced overscan for better performance
  batchSize: 15,  // Adjusted batch size
  containerHeight: '100%' // Use full height
};

// Enhanced virtualization logic with dynamic height handling
const useVirtualization = (
  logs: StreamingLog[], 
  filter: FilterType,
  searchQuery: string
) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesFilter = 
        filter === FILTER_TYPES.ALL ||
        (filter === FILTER_TYPES.CHAT && (isClientContentMessage(log.message) || isServerContentMessage(log.message))) ||
        (filter === FILTER_TYPES.TOOLS && (isToolCallMessage(log.message) || isToolResponseMessage(log.message)));

      if (!searchQuery) return matchesFilter;
      
      const searchLower = searchQuery.toLowerCase();
      return matchesFilter && JSON.stringify(log).toLowerCase().includes(searchLower);
    });
  }, [logs, filter, searchQuery]);
  
  // Update container height on mount and resize
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };
    
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / VIRTUALIZATION_CONFIG.itemHeight);
    const visibleCount = Math.ceil(containerHeight / VIRTUALIZATION_CONFIG.itemHeight);
    const end = Math.min(
      start + visibleCount + VIRTUALIZATION_CONFIG.overscan,
      filteredLogs.length
    );
    return {
      start: Math.max(0, start - VIRTUALIZATION_CONFIG.overscan),
      end
    };
  }, [scrollTop, containerHeight, filteredLogs.length]);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  };

  const totalHeight = filteredLogs.length * VIRTUALIZATION_CONFIG.itemHeight;
  const offsetY = visibleRange.start * VIRTUALIZATION_CONFIG.itemHeight;

  return {
    containerRef,
    visibleLogs: filteredLogs.slice(visibleRange.start, visibleRange.end),
    totalHeight,
    offsetY,
    handleScroll,
    containerHeight
  };
};

// Memoized message component selector
const getMessageComponent = memoize((log: StreamingLog) => {
  if (typeof log.message === "string") return PlainTextMessage;
  if (isClientContentMessage(log.message)) return ClientContentLog;
  if (isToolCallMessage(log.message)) return ToolCallLog;
  if (isToolCallCancellationMessage(log.message)) return ToolCallCancellationLog;
  if (isToolResponseMessage(log.message)) return ToolResponseLog;
  if (isServerContentMessage(log.message)) {
    const { serverContent } = log.message;
    if (isInterrupted(serverContent)) return CustomPlainTextLog("interrupted");
    if (isTurnComplete(serverContent)) return CustomPlainTextLog("turnComplete");
    if (isModelTurn(serverContent)) return ModelTurnLog;
  }
  return AnyMessage;
});

const Logger = memo(() => {
  const { logs } = useLoggerStore();
  const [isPopped, setIsPopped] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>(FILTER_TYPES.ALL);
  const [searchQuery, setSearchQuery] = useState('');

  const {
    containerRef,
    visibleLogs,
    totalHeight,
    offsetY,
    handleScroll
  } = useVirtualization(logs, activeFilter, searchQuery);

  const counts = useMemo(() => ({
    [FILTER_TYPES.ALL]: logs.length,
    [FILTER_TYPES.CHAT]: logs.filter(log => 
      isClientContentMessage(log.message) || isServerContentMessage(log.message)
    ).length,
    [FILTER_TYPES.TOOLS]: logs.filter(log =>
      isToolCallMessage(log.message) || isToolResponseMessage(log.message)
    ).length
  }), [logs]);
  
  const handleClearLogs = useCallback(() => {
    // Implement clear logs functionality
  }, []);

  const handleDownloadLogs = useCallback(() => {
    const logData = JSON.stringify(logs, null, 2);
    const blob = new Blob([logData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [logs]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPopped) {
        setIsPopped(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isPopped]);

  // Handle pop-out click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (isPopped && target.classList.contains('logger-backdrop')) {
        setIsPopped(false);
      }
    };

    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [isPopped]);

  return (
    <>
      {isPopped && <div className="logger-backdrop" />}
      <div className={cn('logger', { 
        'popped-out': isPopped,
        'collapsed': isCollapsed 
      })}>
        <div className="logger-header">
          <div className="header-left">
            <h2>Activity Log</h2>
            <div className="log-stats">
              <div className="stat">
                <span className="material-symbols-outlined">chat</span>
                {counts[FILTER_TYPES.CHAT]}
              </div>
              <div className="stat">
                <span className="material-symbols-outlined">tools</span>
                {counts[FILTER_TYPES.TOOLS]}
              </div>
            </div>
          </div>
          <div className="header-right">
            <div className="view-controls">
              <button 
                className={cn('toolbar-button', { active: isCollapsed })}
                onClick={() => setIsCollapsed(!isCollapsed)}
                title={isCollapsed ? "Expand" : "Collapse"}
              >
                <span className="material-symbols-outlined">
                  {isCollapsed ? 'expand_more' : 'expand_less'}
                </span>
              </button>
              <button 
                className={cn('toolbar-button', { active: isPopped })}
                onClick={() => setIsPopped(!isPopped)}
                title={isPopped ? "Minimize" : "Pop out"}
              >
                <span className="material-symbols-outlined">
                  {isPopped ? 'close_fullscreen' : 'open_in_full'}
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="logger-toolbar">
          <div className="toolbar-group">
            <button 
              className={cn('toolbar-button', { active: activeFilter === FILTER_TYPES.ALL })}
              onClick={() => setActiveFilter(FILTER_TYPES.ALL)}
            >
              <span className="material-symbols-outlined">list</span>
              All
            </button>
            <button 
              className={cn('toolbar-button', { active: activeFilter === FILTER_TYPES.CHAT })}
              onClick={() => setActiveFilter(FILTER_TYPES.CHAT)}
            >
              <span className="material-symbols-outlined">chat</span>
              Chat
            </button>
            <button 
              className={cn('toolbar-button', { active: activeFilter === FILTER_TYPES.TOOLS })}
              onClick={() => setActiveFilter(FILTER_TYPES.TOOLS)}
            >
              <span className="material-symbols-outlined">tools</span>
              Tools
            </button>
          </div>
          <div className="toolbar-group">
            <input
              type="text"
              className="search-input"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button 
              className="toolbar-button icon-only"
              onClick={handleClearLogs}
              title="Clear logs"
            >
              <span className="material-symbols-outlined">delete</span>
            </button>
            <button 
              className="toolbar-button icon-only"
              onClick={handleDownloadLogs}
              title="Download logs"
            >
              <span className="material-symbols-outlined">download</span>
            </button>
          </div>
        </div>

        <div 
          ref={containerRef}
          className="logger-virtual-scroll"
          style={{ 
            height: VIRTUALIZATION_CONFIG.containerHeight,
            overflow: 'auto',
            position: 'relative'
          }}
          onScroll={handleScroll}
        >
          {visibleLogs.length === 0 ? (
            <div className="logger-empty">
              <span className="material-symbols-outlined">description</span>
              <span>No logs to display</span>
            </div>
          ) : (
            <div style={{ height: totalHeight, position: 'relative' }}>
              <ul 
                className="logger-list"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  transform: `translateY(${offsetY}px)`
                }}
              >
                {visibleLogs.map((log, index) => (
                  <MemoizedLogEntry
                    MessageComponent={getMessageComponent(log)}
                    log={log}
                    key={`${log.date.getTime()}-${index}`}
                  />
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </>
  );
});

export default Logger;

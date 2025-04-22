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
  hasModelTurn,
  hasFunctionCalls,
  hasFunctionResponses,
  isTurnComplete,
  LiveServerMessage,
  StreamingLog,
} from "../../multimodal-live-types";

// Constants and configuration
const VIRTUALIZATION_CONFIG = {
  itemHeight: 36, // Base height of each log entry
  containerHeight: 400, // Default container height
  overscan: 5, // Number of items to render outside of visible area
};

const FILTER_TYPES = {
  ALL: "all",
  CHAT: "chat",
  TOOLS: "tools",
  ERROR: "error",
  SYSTEM: "system",
} as const;

const THEME_OPTIONS = {
  LIGHT: "light",
  DARK: "dark",
  SYSTEM: "system",
} as const;

// Time formatting helper
const formatTime = (d: Date) => d.toLocaleTimeString().slice(0, -3);

// Utility function to determine log type for filtering
const getLogCategory = (log: StreamingLog): string => {
  const type = log.type.toLowerCase();
  
  if (type.includes("error") || type.includes("exception")) {
    return FILTER_TYPES.ERROR;
  }
  
  if (type.includes("tool") || type.includes("function")) {
    return FILTER_TYPES.TOOLS;
  }
  
  if (type.includes("content") || type.includes("chat")) {
    return FILTER_TYPES.CHAT;
  }
  
  return FILTER_TYPES.SYSTEM;
};

// Small, reusable components
const LogEntryIcon = ({ type }: { type: string }) => {
  const category = type.toLowerCase();
  
  if (category.includes("error") || category.includes("exception")) {
    return <span className="material-symbols-outlined log-icon error">error</span>;
  }
  
  if (category.includes("tool") || category.includes("function")) {
    return <span className="material-symbols-outlined log-icon tool">build</span>;
  }
  
  if (category.includes("send")) {
    return <span className="material-symbols-outlined log-icon send">arrow_upward</span>;
  }
  
  if (category.includes("receive")) {
    return <span className="material-symbols-outlined log-icon receive">arrow_downward</span>;
  }
  
  if (category.includes("content") || category.includes("chat")) {
    return <span className="material-symbols-outlined log-icon chat">chat</span>;
  }
  
  return <span className="material-symbols-outlined log-icon">info</span>;
};

// Log entry component
const LogEntry = memo(({
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
      `log-entry`,
      `source-${log.type.slice(0, log.type.indexOf("."))}`,
      getLogCategory(log),
      {
        "log-receive": log.type.includes("receive"),
        "log-send": log.type.includes("send"),
      },
    )}
  >
    <div className="log-entry-header">
      <LogEntryIcon type={log.type} />
      <span className="timestamp">{formatTime(log.date)}</span>
      <span className="source">{log.type}</span>
      {log.count && <span className="count">{log.count}</span>}
      <span className="expand-toggle material-symbols-outlined">expand_more</span>
    </div>
    <div className="log-entry-content">
      <MessageComponent message={log.message} />
    </div>
  </li>
));

const MemoizedLogEntry = memo(LogEntry);

// Message renderers
const PlainTextMessage = ({ message }: { message: StreamingLog["message"] }) => 
  <span className="plain-text-message">{message as string}</span>;

type Message = { message: StreamingLog["message"] };

const AnyMessage = ({ message }: Message) => (
  <pre className="any-message">{JSON.stringify(message, null, "  ")}</pre>
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

const RenderPart = memo(({ part }: { part: any }) => {
  if (part.text) {
    return <div className="text-part">{part.text}</div>;
  }
  
  if (part.inlineData) {
    return (
      <div className="inline-data-part">
        {part.inlineData.mimeType.startsWith("image/") ? (
          <img 
            src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`} 
            alt="Inline data" 
            className="inline-image"
          />
        ) : (
          <div className="data-block">
            <span className="mime-type">{part.inlineData.mimeType}</span>
            <span className="data-size">{part.inlineData.data.length} bytes</span>
          </div>
        )}
      </div>
    );
  }
  
  if (part.functionCall) {
    return (
      <div className="function-call-part">
        <span className="function-name">{part.functionCall.name}</span>
        <div className="function-args">
          <SyntaxHighlighter language="json" style={dark}>
            {JSON.stringify(part.functionCall.args || {}, null, 2)}
          </SyntaxHighlighter>
        </div>
      </div>
    );
  }
  
  if (part.functionResponse) {
    return (
      <div className="function-response-part">
        <span className="function-name">{part.functionResponse.name}</span>
        <div className="response-content">
          <SyntaxHighlighter language="json" style={dark}>
            {JSON.stringify(part.functionResponse.response || {}, null, 2)}
          </SyntaxHighlighter>
        </div>
      </div>
    );
  }
  
  return <div className="unknown-part">[Unknown part type]</div>;
});

const ClientContentLog = ({ message }: Message) => {
  const { turns, turnComplete } = (message as any)
    .clientContent;
  return (
    <div className="rich-log client-content user">
      <div className="log-header">
        <span className="role-badge user">User</span>
        {!turnComplete && <span className="status-badge incomplete">In Progress</span>}
      </div>
      {turns.map((turn, i) => (
        <div key={`message-turn-${i}`} className="message-turn">
          {turn.parts
            .filter((part) => !(part.text && part.text === "\n"))
            .map((part, j) => (
              <RenderPart part={part} key={`message-turn-${i}-part-${j}`} />
            ))}
        </div>
      ))}
    </div>
  );
};

const ToolCallLog = ({ message }: Message) => {
  // Updated to work with LiveServerMessage structure from the SDK
  const serverMessage = message as LiveServerMessage;
  const [isExpanded, setIsExpanded] = useState(false);
   
   return (
     <div className={cn("rich-log tool-call", { expanded: isExpanded })}>
       <div className="log-header">
         <span className="role-badge tool">Tool Call</span>
         <button 
           className="expand-toggle" 
           onClick={() => setIsExpanded(!isExpanded)}
           aria-label={isExpanded ? "Collapse" : "Expand"}
         >
           <span className="material-symbols-outlined">
             {isExpanded ? "unfold_less" : "unfold_more"}
           </span>
         </button>
       </div>
       
       {serverMessage.serverContent?.modelTurn?.parts
         ?.filter((part: any) => part.functionCall)
         .map((part: any, i: number) => {
           const call = part.functionCall;
           return (
             <div key={`call-${i}`} className="function-call">
               <div className="call-header">
                 <span className="function-name">{call.name || "Unnamed Call"}</span>
               </div>
               <div className="function-args">
                 <SyntaxHighlighter language="json" style={dark}>
                   {JSON.stringify(call.args || {}, null, 2)}
                 </SyntaxHighlighter>
               </div>
             </div>
           );
         })}
     </div>
   );
};

const ToolCallCancellationLog = ({ message }: Message): JSX.Element => {
  // Simple generic rendering for tool cancellation messages 
  return (
    <div className="tool-cancellation-log">
      <div className="tool-cancellation-title">Tool Call Cancelled</div>
      <div className="tool-cancellation-details">
        {typeof message === 'object' && message !== null ? (
          <pre className="json-content">
            {JSON.stringify(message, null, 2)}
          </pre>
        ) : (
          <span className="simple-message">Tool call was cancelled</span>
        )}
      </div>
    </div>
  );
};

const ToolResponseLog = ({ message }: Message): JSX.Element => {
  const [isExpanded, setIsExpanded] = useState(false);
  // The message structure has changed from the old ToolResponseMessage
  // We'll access the data in a more flexible way
  const serverMessage = message as any;
  let responseData: any = null;
  
  // Try to extract function response data in the new structure
  if (serverMessage.clientContent?.turns) {
    // Look for function responses in turns
    const functionResponses = serverMessage.clientContent.turns
      .flatMap((turn: any) => turn.parts || [])
      .filter((part: any) => part.functionResponse);
      
    if (functionResponses.length > 0) {
      responseData = functionResponses[0].functionResponse;
    }
  }
   
   return (
     <div className={cn("rich-log tool-response")}>
       <div className="log-header">
         <span className="role-badge tool-response">Tool Response</span>
         {responseData && <span className="function-name">{responseData.name || "Unnamed Response"}</span>}
         <button 
           className="expand-toggle" 
           onClick={() => setIsExpanded(!isExpanded)}
           aria-label={isExpanded ? "Collapse" : "Expand"}
         >
           <span className="material-symbols-outlined">
             {isExpanded ? "unfold_less" : "unfold_more"}
           </span>
         </button>
       </div>
       
       {responseData ? (
         <div className="response-content">
           {typeof responseData.response === 'object' ? (
             <>
               <SyntaxHighlighter language="json" style={dark}>
                 {JSON.stringify(responseData.response, null, 2)}
               </SyntaxHighlighter>
               
               {isExpanded && responseData.response && 'error' in responseData.response && (
                 <div className="error-details">
                   <h4>Error Details</h4>
                   <pre>{responseData.response.error}</pre>
                 </div>
               )}
             </>
           ) : (
             <div className="simple-response">{String(responseData.response)}</div>
           )}
         </div>
       ) : (
         <div className="missing-response">No function response data available</div>
       )}
     </div>
   );
};

const ModelTurnLog = ({ message }: Message): JSX.Element => {
  // Updated to work with LiveServerMessage structure from the SDK
  const serverMessage = message as LiveServerMessage;
  if (!serverMessage?.serverContent?.modelTurn?.parts) {
    return <div className="empty-content">[Empty content]</div>;
  }

  return (
    <div className="model-turn-log">
      <div className="model-parts">
        {serverMessage.serverContent.modelTurn.parts.map((part: any, i: number) => (
          <div className="model-part" key={i}>
            {part.text ? (
              <span>{part.text}</span>
            ) : part.inlineData ? (
              <div className="inline-data">
                {part.inlineData.mimeType.startsWith("image/") ? (
                  <img className="inline-image" src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`} alt="Inline" />
                ) : (
                  <pre className="code-block">[Data: {part.inlineData.mimeType}]</pre>
                )}
              </div>
            ) : (
              <pre>[Unsupported part type]</pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const CustomPlainTextLog = (msg: string) => () => (
  <div className="custom-plain-text">
    <span>{msg}</span>
  </div>
);

type FilterType = typeof FILTER_TYPES[keyof typeof FILTER_TYPES];
type ThemeType = typeof THEME_OPTIONS[keyof typeof THEME_OPTIONS];

// Add a type definition for the log stats
type LogStatsType = {
  [FILTER_TYPES.ALL]: number;
  [FILTER_TYPES.CHAT]: number;
  [FILTER_TYPES.TOOLS]: number;
  [FILTER_TYPES.ERROR]: number;
  [FILTER_TYPES.SYSTEM]: number;
  [key: string]: number;  // Add index signature for dynamic keys
};

// Virtualization implementation for better performance
const useVirtualization = (
  logs: StreamingLog[], 
  filter: FilterType,
  searchQuery: string
) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ startIndex: 0, endIndex: 20 });
  const [itemHeights, setItemHeights] = useState<Record<string, number>>({});
  const [containerHeight, setContainerHeight] = useState(VIRTUALIZATION_CONFIG.containerHeight);
  
  // Filter logs based on the active filter and search query
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Apply category filter
      if (filter !== FILTER_TYPES.ALL && filter !== getLogCategory(log)) {
        return false;
      }
      
      // Apply search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const type = log.type.toLowerCase();
        const messageStr = typeof log.message === 'string' 
          ? log.message.toLowerCase() 
          : JSON.stringify(log.message).toLowerCase();
          
        return type.includes(query) || messageStr.includes(query);
      }
      
      return true;
    });
  }, [logs, filter, searchQuery]);
  
  const totalHeight = useMemo(() => {
    return filteredLogs.reduce((total, log, index) => {
      const key = `${log.date.getTime()}-${index}`;
      return total + (itemHeights[key] || VIRTUALIZATION_CONFIG.itemHeight);
    }, 0);
  }, [filteredLogs, itemHeights]);
  
  // Update container height on resize
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current && containerRef.current.parentElement) {
        const parentHeight = containerRef.current.parentElement.clientHeight;
        setContainerHeight(parentHeight - 110); // Adjust for header and toolbar height
      }
    };
    
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);
  
  // Calculate visible items based on scroll position
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight } = event.currentTarget;
    
    let currentHeight = 0;
    let startIndex = 0;
    let endIndex = 0;
    
    // Find start index
    for (let i = 0; i < filteredLogs.length; i++) {
      const key = `${filteredLogs[i].date.getTime()}-${i}`;
      const height = itemHeights[key] || VIRTUALIZATION_CONFIG.itemHeight;
      
      if (currentHeight + height > scrollTop) {
        startIndex = i;
        break;
      }
      
      currentHeight += height;
    }
    
    // Find end index
    currentHeight = 0;
    for (let i = 0; i < filteredLogs.length; i++) {
      const key = `${filteredLogs[i].date.getTime()}-${i}`;
      const height = itemHeights[key] || VIRTUALIZATION_CONFIG.itemHeight;
      currentHeight += height;
      
      if (currentHeight > scrollTop + clientHeight) {
        endIndex = i;
        break;
      }
    }
    
    // Add overscan
    startIndex = Math.max(0, startIndex - VIRTUALIZATION_CONFIG.overscan);
    endIndex = Math.min(filteredLogs.length - 1, endIndex + VIRTUALIZATION_CONFIG.overscan);
    
    setVisibleRange({ startIndex, endIndex });
  };
  
  // Calculate offset for absolute positioning
  const offsetY = useMemo(() => {
    let offset = 0;
    for (let i = 0; i < visibleRange.startIndex; i++) {
      const key = `${filteredLogs[i]?.date.getTime()}-${i}`;
      offset += itemHeights[key] || VIRTUALIZATION_CONFIG.itemHeight;
    }
    return offset;
  }, [filteredLogs, visibleRange.startIndex, itemHeights]);
  
  // Visible logs based on range
  const visibleLogs = useMemo(() => {
    return filteredLogs.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [filteredLogs, visibleRange]);
  
  return {
    containerRef,
    visibleLogs,
    totalHeight,
    offsetY,
    handleScroll,
    containerHeight,
    filteredLogs
  };
};

// Function to get the appropriate message component based on message type
const getMessageComponent = memoize((log: StreamingLog) => {
  const message = log.message;
  
  // Check if message is a LiveServerMessage from the SDK
  if (typeof message === 'object' && message !== null && hasModelTurn(message as LiveServerMessage)) {
    return ModelTurnLog;
  }
  
  // Check for function/tool calls in the LiveServerMessage
  if (typeof message === 'object' && message !== null && hasFunctionCalls(message as LiveServerMessage)) {
    return ToolCallLog;
  }
  
  // Check for function/tool responses in the LiveServerMessage
  if (typeof message === 'object' && message !== null && hasFunctionResponses(message as LiveServerMessage)) {
    return ToolResponseLog;
  }
  
  // Check for client content - for outgoing messages
  // This checks if the message has a structure we expect for client messages
  if (typeof message === 'object' && message !== null && 
      ('content' in message || 'parts' in message || 'turns' in message)) {
    return ClientContentLog;
  }
  
  if (message instanceof Error) {
    return CustomPlainTextLog(message.message);
  }
  
  if (typeof message === "string") {
    return PlainTextMessage;
  }
  
  return AnyMessage;
});

// Main component
const Logger = memo(() => {
  // Replace the selector function with individual selectors
  const logs = useLoggerStore(state => state.logs);
  const clearLogs = useLoggerStore(state => state.clearLogs);
  
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isPopped, setIsPopped] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>(FILTER_TYPES.ALL);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTheme, setCurrentTheme] = useState<ThemeType>(THEME_OPTIONS.DARK);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [visibleRange, setVisibleRange] = useState({ startIndex: 0, endIndex: 0 });
  
  // Update the counts logic to use the correct type
  const counts = useMemo(() => {
    return logs.reduce((acc: LogStatsType, log: StreamingLog) => {
      const category = getLogCategory(log);
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, { 
      [FILTER_TYPES.ALL]: logs.length,
      [FILTER_TYPES.CHAT]: 0,
      [FILTER_TYPES.TOOLS]: 0,
      [FILTER_TYPES.ERROR]: 0,
      [FILTER_TYPES.SYSTEM]: 0
    } as LogStatsType);
  }, [logs]);
  
  const {
    containerRef,
    visibleLogs,
    totalHeight,
    offsetY,
    handleScroll,
    containerHeight,
    filteredLogs
  } = useVirtualization(logs, activeFilter, searchQuery);
  
  // Handle clearing logs
  const handleClearLogs = useCallback(() => {
    if (window.confirm('Are you sure you want to clear all logs?')) {
      clearLogs();
    }
  }, [clearLogs]);
  
  // Handle downloading logs
  const handleDownloadLogs = useCallback(() => {
    const data = JSON.stringify(logs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-logs-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }, [logs]);
  
  // Handle ESC key to exit popped out mode
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPopped) {
        setIsPopped(false);
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isPopped]);
  
  // Handle clicking outside the popped logger to close it
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      if (isPopped && !target.closest('.logger') && !target.closest('.logger-backdrop')) {
        setIsPopped(false);
      }
    };
    
    if (isPopped) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPopped]);
  
  return (
    <>
      {isPopped && <div className="logger-backdrop" />}
      <div className={cn('logger', { 
        'popped-out': isPopped,
        'collapsed': isCollapsed,
        'light-theme': currentTheme === THEME_OPTIONS.LIGHT,
        'dark-theme': currentTheme === THEME_OPTIONS.DARK,
        'sidebar-open': isSidebarOpen
      })}>
        <div className="logger-header">
          <div className="header-left">
            <button 
              className="sidebar-toggle" 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              title={isSidebarOpen ? "Hide sidebar" : "Show sidebar"}
            >
              <span className="material-symbols-outlined">
                {isSidebarOpen ? 'menu_open' : 'menu'}
              </span>
            </button>
            <h2>Activity Logger</h2>
            <div className="log-stats">
              <div className="stat-badge all">
                <span className="material-symbols-outlined">format_list_bulleted</span>
                <span className="count">{counts[FILTER_TYPES.ALL]}</span>
              </div>
              <div className="stat-badge chat">
                <span className="material-symbols-outlined">chat</span>
                <span className="count">{counts[FILTER_TYPES.CHAT]}</span>
              </div>
              <div className="stat-badge tools">
                <span className="material-symbols-outlined">build</span>
                <span className="count">{counts[FILTER_TYPES.TOOLS]}</span>
              </div>
              <div className="stat-badge error">
                <span className="material-symbols-outlined">error</span>
                <span className="count">{counts[FILTER_TYPES.ERROR]}</span>
              </div>
            </div>
          </div>
          <div className="header-right">
            <div className="view-controls">
              <button 
                className={cn('theme-toggle', { active: currentTheme !== THEME_OPTIONS.DARK })}
                onClick={() => setCurrentTheme(currentTheme === THEME_OPTIONS.DARK ? THEME_OPTIONS.LIGHT : THEME_OPTIONS.DARK)}
                title={`Switch to ${currentTheme === THEME_OPTIONS.DARK ? 'light' : 'dark'} theme`}
              >
                <span className="material-symbols-outlined">
                  {currentTheme === THEME_OPTIONS.DARK ? 'light_mode' : 'dark_mode'}
                </span>
              </button>
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

        <div className="logger-content">
          {isSidebarOpen && (
            <div className="logger-sidebar">
              <div className="sidebar-section">
                <h3 className="sidebar-title">Filters</h3>
                <ul className="filter-list">
                  <li 
                    className={cn('filter-item', { active: activeFilter === FILTER_TYPES.ALL })}
                    onClick={() => setActiveFilter(FILTER_TYPES.ALL)}
                  >
                    <span className="material-symbols-outlined">format_list_bulleted</span>
                    <span className="filter-label">All Logs</span>
                    <span className="count">{counts[FILTER_TYPES.ALL]}</span>
                  </li>
                  <li 
                    className={cn('filter-item', { active: activeFilter === FILTER_TYPES.CHAT })}
                    onClick={() => setActiveFilter(FILTER_TYPES.CHAT)}
                  >
                    <span className="material-symbols-outlined">chat</span>
                    <span className="filter-label">Chat</span>
                    <span className="count">{counts[FILTER_TYPES.CHAT]}</span>
                  </li>
                  <li 
                    className={cn('filter-item', { active: activeFilter === FILTER_TYPES.TOOLS })}
                    onClick={() => setActiveFilter(FILTER_TYPES.TOOLS)}
                  >
                    <span className="material-symbols-outlined">build</span>
                    <span className="filter-label">Tools</span>
                    <span className="count">{counts[FILTER_TYPES.TOOLS]}</span>
                  </li>
                  <li 
                    className={cn('filter-item', { active: activeFilter === FILTER_TYPES.ERROR })}
                    onClick={() => setActiveFilter(FILTER_TYPES.ERROR)}
                  >
                    <span className="material-symbols-outlined">error</span>
                    <span className="filter-label">Errors</span>
                    <span className="count">{counts[FILTER_TYPES.ERROR]}</span>
                  </li>
                  <li 
                    className={cn('filter-item', { active: activeFilter === FILTER_TYPES.SYSTEM })}
                    onClick={() => setActiveFilter(FILTER_TYPES.SYSTEM)}
                  >
                    <span className="material-symbols-outlined">desktop_windows</span>
                    <span className="filter-label">System</span>
                    <span className="count">{counts[FILTER_TYPES.SYSTEM]}</span>
                  </li>
                </ul>
              </div>
              
              <div className="sidebar-section">
                <h3 className="sidebar-title">Actions</h3>
                <ul className="action-list">
                  <li 
                    className="action-item"
                    onClick={handleClearLogs}
                  >
                    <span className="material-symbols-outlined">delete</span>
                    <span className="action-label">Clear Logs</span>
                  </li>
                  <li 
                    className="action-item"
                    onClick={handleDownloadLogs}
                  >
                    <span className="material-symbols-outlined">download</span>
                    <span className="action-label">Download Logs</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
          
          <div className="logger-main">
            <div className="logger-toolbar">
              <div className="search-container">
                <span className="material-symbols-outlined search-icon">search</span>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button 
                    className="clear-search"
                    onClick={() => setSearchQuery('')}
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                )}
              </div>
              
              <div className="filter-info">
                {filteredLogs.length} / {logs.length} logs
                {searchQuery && (
                  <span className="search-info">
                    (filtered by "{searchQuery}")
                  </span>
                )}
              </div>
            </div>
            
            <div 
              ref={containerRef}
              className="logger-virtual-scroll"
              style={{ 
                height: containerHeight,
                overflow: 'auto',
                position: 'relative'
              }}
              onScroll={handleScroll}
            >
              {filteredLogs.length === 0 ? (
                <div className="logger-empty">
                  <span className="material-symbols-outlined">description</span>
                  <span>{searchQuery ? "No matching logs found" : "No logs to display"}</span>
                  {searchQuery && (
                    <button 
                      className="clear-search-button"
                      onClick={() => setSearchQuery('')}
                    >
                      Clear search
                    </button>
                  )}
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
                        key={`${log.date.getTime()}-${index + visibleRange.startIndex}`}
                      />
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

export default Logger;

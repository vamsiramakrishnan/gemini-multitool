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

import { useRef, useState, useEffect } from "react";
import "./App.scss";
import { LiveAPIProvider, useLiveAPIContext } from "./contexts/LiveAPIContext";
import SidePanel from "./components/side-panel/SidePanel";
import ControlTray from "./components/control-tray/ControlTray";
import cn from "classnames";
import { WidgetManager } from "./lib/widget-manager";
import { ToolHandler } from "./lib/tool-handler";
import { loadSystemInstructions, createLiveConfig } from "./lib/config-helper";
import { GroundingMetadata, ToolCall } from "./multimodal-live-types";
import { WidgetItem } from './components/widgets/item/WidgetItem';
import { Item, WidgetState } from './types/widget';
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { reorder } from '@atlaskit/pragmatic-drag-and-drop/reorder';
import { TabsContainer } from './components/tabs/TabsContainer';

const API_KEY = process.env.REACT_APP_GEMINI_API_KEY as string;
if (typeof API_KEY !== "string") {
  throw new Error("set REACT_APP_GEMINI_API_KEY in .env");
}

const host = "generativelanguage.googleapis.com";
const uri = `wss://${host}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent`;

// Add a global initialization flag
const isInitialized = Symbol('app_initialized');

declare global {
  interface Window {
    [isInitialized]?: boolean;
    app?: any;
  }
}

function AppContent() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const { client, config, setConfig } = useLiveAPIContext();
  const widgetManagerRef = useRef<WidgetManager | null>(null);
  const toolHandlerRef = useRef<ToolHandler | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  
  // Update widgets state to be dynamic
  const [widgets, setWidgets] = useState<Item[]>([]);
  const [widgetData, setWidgetData] = useState<Record<string, any>>({});
  const [widgetStates, setWidgetStates] = useState<Record<string, WidgetState>>({});
  
  const widgetsContainerRef = useRef<HTMLDivElement>(null);

  // Add state for active tab
  const [activeTabId, setActiveTabId] = useState('default');

  // Handle widget manager events
  useEffect(() => {
    if (!widgetManagerRef.current) {
      console.log('Widget manager not initialized yet');
      return;
    }

    console.log('Widget manager initialized:', widgetManagerRef.current);
  }, []);

  // Initialize app with widget manager and tool handler
  useEffect(() => {
    async function initializeApp() {
      // Check if already initialized
      if (window[isInitialized]) {
        console.log('App already initialized, skipping...');
        return;
      }

      try {
        console.log('Initializing app...');
        const widgetManager = new WidgetManager();
        
        // Set up event listeners before attaching to window
        const onWidgetCreated = async (event: { id: string; type: string; data: any; tabId: string }) => {
          console.log('Widget created event received:', event);
          
          setWidgets(prev => {
            const newWidget = { 
              id: event.id, 
              type: event.type,
              tabId: event.tabId || activeTabId
            };
            return [newWidget, ...prev];
          });
          
          setWidgetData(prev => {
            const newData = { ...prev, [event.id]: event.data };
            console.log('Widget data updated:', newData);
            return newData;
          });
          
          setWidgetStates(prev => {
            const newStates = { ...prev, [event.id]: { isMaximized: false, isMinimized: false }};
            console.log('Widget states updated:', newStates);
            return newStates;
          });
        };

        const onWidgetDestroyed = (event: { id: string; tabId: string }) => {
          console.log('Widget destroyed event received:', event);
          
          setWidgets(prev => prev.filter(widget => widget.id !== event.id));
          setWidgetData(prev => {
            const newData = { ...prev };
            delete newData[event.id];
            return newData;
          });
          setWidgetStates(prev => {
            const newStates = { ...prev };
            delete newStates[event.id];
            return newStates;
          });
        };

        const onWidgetMoved = (event: { id: string; tabId: string }) => {
          console.log('Widget moved event received:', event);
          
          setWidgets(prev => prev.map(widget => 
            widget.id === event.id 
              ? { ...widget, tabId: event.tabId }
              : widget
          ));
        };

        console.log('Setting up widget event listeners');
        widgetManager.on('widgetCreated', onWidgetCreated);
        widgetManager.on('widgetDestroyed', onWidgetDestroyed);
        widgetManager.on('widgetMoved', onWidgetMoved);

        // Attach widget manager to window.app
        (window as any).app = {
          ...(window as any).app,
          widgetManager
        };
        
        widgetManagerRef.current = widgetManager;
        toolHandlerRef.current = new ToolHandler(widgetManager);

        const systemInstructions = await loadSystemInstructions();
        const config = createLiveConfig(systemInstructions);
        setConfig(config);
        
        // Mark as initialized
        window[isInitialized] = true;
        console.log('App initialized successfully');
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setConfigError('Failed to load configuration. Please refresh the page.');
      }
    }

    initializeApp();

    // Cleanup
    return () => {
      if (window[isInitialized]) {
        console.log('Cleaning up app...');
        if (widgetManagerRef.current) {
          widgetManagerRef.current.destroyAllWidgets();
        }
        // Clean up window.app and initialization flag
        delete window.app;
        delete window[isInitialized];
      }
    };
  }, []);

  // Add separate effect for handling widget tab assignment
  useEffect(() => {
    if (!widgetManagerRef.current || !toolHandlerRef.current) return;

    console.log('App: Updating active tab to:', activeTabId);
    
    // Update tool handler's active tab
    toolHandlerRef.current.setActiveTab(activeTabId);

    // Update any new widgets without a tabId to the current active tab
    setWidgets(prev => {
      const updated = prev.map(widget => {
        if (!widget.tabId) {
          console.log('Assigning widget to tab:', { widgetId: widget.id, tabId: activeTabId });
          return { ...widget, tabId: activeTabId };
        }
        return widget;
      });
      return updated;
    });
  }, [activeTabId]);

  // Handle tool calls and grounding
  useEffect(() => {
    const onToolCall = async (toolCall: ToolCall) => {
      if (toolHandlerRef.current) {
        try {
          const responses = await toolHandlerRef.current.handleToolCall(toolCall);
          client.sendToolResponse({ functionResponses: responses });
        } catch (error) {
          console.error('Error handling tool call:', error);
        }
      }
    };

    const onGrounding = async (groundingMetadata: GroundingMetadata) => {
      if (toolHandlerRef.current) {
        try {
          await toolHandlerRef.current.handleGroundingChunks(groundingMetadata);
        } catch (error) {
          console.error('Error handling grounding chunks:', error);
        }
      }
    };

    client.on("toolcall", onToolCall);
    client.on("grounding", onGrounding);

    return () => {
      client.off("toolcall", onToolCall);
      client.off("grounding", onGrounding);
      if (widgetManagerRef.current) {
        widgetManagerRef.current.destroyAllWidgets();
      }
    };
  }, [client]);

  // Handle drag and drop
  useEffect(() => {
    if (!widgetsContainerRef.current) return;

    return combine(
      monitorForElements({
        canMonitor({ source }) {
          return source.data.type === 'widget';
        },
        onDrop({ location, source }) {
          const target = location.current.dropTargets[0];
          if (!target) return;
          
          const sourceData = source.data as { index: number };
          const targetData = target.data as { index: number };
          
          if (sourceData.index === targetData.index) return;
          
          setWidgets(widgets => 
            reorder({
              list: widgets,
              startIndex: sourceData.index,
              finishIndex: targetData.index
            })
          );
        },
      }),
      autoScrollForElements({
        element: widgetsContainerRef.current,
        canScroll: () => true
      })
    );
  }, []);

  if (configError) {
    return (
      <div className="error-container">
        <div className="error-message">{configError}</div>
      </div>
    );
  }

  return (
    <div className="streaming-console">
      <SidePanel />
      <main>
        <div className="main-app-area">
          <TabsContainer
            widgets={widgets}
            widgetData={widgetData}
            widgetStates={widgetStates}
            onWidgetStateChange={(widgetId, state) => {
              setWidgetStates(prev => ({
                ...prev,
                [widgetId]: state
              }));
            }}
            setWidgets={setWidgets}
            activeTabId={activeTabId}
            onTabChange={setActiveTabId}
          />
          <div className="media-container">
            <video
              className={cn("stream", {
                hidden: !videoStream,
              })}
              ref={videoRef}
              autoPlay
              playsInline
              muted
            />
          </div>
        </div>

        <ControlTray
          videoRef={videoRef}
          supportsVideo={true}
          onVideoStreamChange={setVideoStream}
        />
      </main>
    </div>
  );
}

function App() {
  return (
    <div className="App">
      <LiveAPIProvider url={uri} apiKey={API_KEY}>
        <AppContent />
      </LiveAPIProvider>
    </div>
  );
}

export default App;

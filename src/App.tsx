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

import { useRef, useState, useEffect, useCallback } from "react";
import "./App.scss";
import { RootProvider, useLiveAPIContext, useWidget, useTab, useActiveTab, useTabWidgets, useTabWidgetStates } from "./contexts/RootContext";
import SidePanel from "./components/side-panel/SidePanel";
import ControlTray from "./components/control-tray/ControlTray";
import cn from "classnames";
import { WidgetManager } from "./lib/widget-manager";
import { ToolHandler } from "./lib/tool-handler";
import { loadSystemInstructions, createLiveConfig } from "./lib/config-helper";
import { GroundingMetadata, ToolCall } from "./multimodal-live-types";
import { WidgetItem } from './components/widgets/item/WidgetItem';
import { TabsContainer } from './components/tabs/TabsContainer';
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { reorder } from '@atlaskit/pragmatic-drag-and-drop/reorder';
import { Item, WidgetState } from './types/widget';
import { Onboarding } from './components/onboarding/Onboarding';
import { ChatWidgetComponent } from './components/widgets/chat/ChatWidgetComponent';
import { useLayout } from './contexts/LayoutContext';
import VideoStream from "./components/video-stream/VideoStream";
import { LayoutProvider } from './contexts/LayoutContext';
import { WidgetRegistry, WidgetType } from './components/widgets/registry';

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
  const { dispatch: widgetDispatch, widgetManager } = useWidget();
  const { activeTabId, setActiveTab } = useTab();
  const [configError, setConfigError] = useState<string | null>(null);
  const toolHandlerRef = useRef<ToolHandler | null>(null);
  const widgetsContainerRef = useRef<HTMLDivElement>(null);
  const { panelOpen, setPanelOpen, mode, setMode } = useLayout();
  const [chatWidgetVisible, setChatWidgetVisible] = useState(false);

  // Get current tab's widgets and states
  const activeTab = useActiveTab();
  const [tabWidgets, updateTabWidgets] = useTabWidgets(activeTabId);
  const [tabWidgetStates, updateTabWidgetStates] = useTabWidgetStates(activeTabId);

  // Initialize app with widget manager and tool handler
  useEffect(() => {
    async function initializeApp() {
      if (window[isInitialized]) {
        console.log('App already initialized, skipping...');
        return;
      }

      try {
        console.log('Initializing app...');
        
        // Initialize tool handler
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

    return () => {
      if (window[isInitialized]) {
        console.log('Cleaning up app...');
        delete window.app;
        delete window[isInitialized];
      }
    };
  }, []);

  // Update tool handler when active tab changes
  useEffect(() => {
    if (toolHandlerRef.current) {
      toolHandlerRef.current.setActiveTab(activeTabId);
    }
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
          
          const widgetEntries = Array.from(widgetManager.getWidgets().values());
          const reorderedWidgets = reorder({
            list: widgetEntries.map(entry => ({
              id: entry.id,
              type: entry.widget.constructor.name.toLowerCase(),
              tabId: entry.tabId
            })),
            startIndex: sourceData.index,
            finishIndex: targetData.index
          });

          widgetDispatch({
            type: 'REORDER_WIDGETS',
            payload: { widgets: reorderedWidgets }
          });
        },
      }),
      autoScrollForElements({
        element: widgetsContainerRef.current,
        canScroll: () => true
      })
    );
  }, [widgetDispatch, widgetManager]);

  const handleWidgetStateChange = useCallback((widgetId: string, state: WidgetState) => {
    updateTabWidgetStates({
      ...tabWidgetStates,
      [widgetId]: state
    });
  }, [tabWidgetStates, updateTabWidgetStates]);

  // Add debug effect
  useEffect(() => {
    console.debug('[App] Video stream changed:', {
      hasStream: !!videoStream,
      videoElement: !!videoRef.current
    });
  }, [videoStream]);

  if (configError) {
    return (
      <div className="error-container">
        <div className="error-message">{configError}</div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Main workspace area */}
      <div className="workspace">
        {/* Only render TabsContainer here */}
        <TabsContainer 
          activeTabId={activeTabId}
          onTabChange={setActiveTab}
        />
      </div>

      {/* Side Panel */}
      <SidePanel videoStream={videoStream} />

      {/* Bottom control bar */}
      <div className="workspace-controls">
        <ControlTray
          videoRef={videoRef}
          supportsVideo={true}
          onVideoStreamChange={setVideoStream}
        />
      </div>
    </div>
  );
}

function App() {
  const [showOnboarding, setShowOnboarding] = useState(true);
  
  // Check if user has seen onboarding
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (hasSeenOnboarding) {
      setShowOnboarding(false);
    }
  }, []);

  const handleOnboardingComplete = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    setShowOnboarding(false);
  };

  const widgetManager = new WidgetManager();

  return (
    <>
      {showOnboarding ? (
        <Onboarding onComplete={handleOnboardingComplete} />
      ) : (
        <div className="App">
          <LayoutProvider>
            <RootProvider url={uri} apiKey={API_KEY} widgetManager={widgetManager}>
              <AppContent />
            </RootProvider>
          </LayoutProvider>
        </div>
      )}
    </>
  );
}

export default App;

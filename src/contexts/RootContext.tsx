import React, { ReactNode } from 'react';
import { LiveAPIProvider, LiveAPIProviderProps } from './LiveAPIContext';
import { WidgetProvider } from './WidgetContext';
import { TabProvider } from './TabContext';
import { WidgetManager } from '../lib/widget-manager';

interface RootProviderProps extends LiveAPIProviderProps {
  children: ReactNode;
  widgetManager: WidgetManager;
}

export function RootProvider({ children, url, apiKey, widgetManager }: RootProviderProps) {
  return (
    <LiveAPIProvider url={url} apiKey={apiKey}>
      <WidgetProvider widgetManager={widgetManager}>
        <TabProvider>
          {children}
        </TabProvider>
      </WidgetProvider>
    </LiveAPIProvider>
  );
}

// Re-export all context hooks for convenience
export { useLiveAPIContext } from './LiveAPIContext';
export { useWidget, useWidgetState, useWidgetData } from './WidgetContext';
export { useTab, useActiveTab, useTabWidgets, useTabWidgetStates } from './TabContext';
export { useLayout } from './LayoutContext'; 
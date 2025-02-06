import React, { useRef } from 'react';
import './widget-item.scss';
import { Item, WidgetState } from '../../../types/widget';
import { WeatherWidget } from '../weather/WeatherWidget';
import { StockWidget } from '../stock/StockWidget';
import { MapWidget } from '../map/MapWidget';
import { PlacesWidget } from '../places/PlacesWidget';
import { SearchWidget } from '../search/SearchWidget';
import { ChatWidget } from '../chat/ChatWidget';
import { AltairWidget } from '../altair/Altair';
import { CodeExecutionWidget } from '../code-execution/CodeExecutionWidget';

interface WidgetItemProps {
  item: Item;
  index: number;
  widgetData: any;
  widgetState: WidgetState;
  onStateChange: (state: WidgetState) => void;
  setWidgets: React.Dispatch<React.SetStateAction<Item[]>>;
}

const WidgetComponents: Record<string, React.ComponentType<any>> = {
  weather: WeatherWidget,
  stock: StockWidget,
  map: MapWidget,
  places: PlacesWidget,
  google_search: SearchWidget,
  chat: ChatWidget,
  altair: AltairWidget,
  code_execution: CodeExecutionWidget
};

export function WidgetItem({ 
  item, 
  index,
  widgetData,
  widgetState,
  onStateChange,
  setWidgets
}: WidgetItemProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Get the appropriate widget component
  const WidgetComponent = WidgetComponents[item.type];
  if (!WidgetComponent) {
    console.error(`No component found for widget type: ${item.type}`);
    return null;
  }

  const handleStateChange = (newState: Partial<WidgetState>) => {
    onStateChange({ 
      ...widgetState, 
      ...newState 
    });
  };

  return (
    <div 
      className={`widget-item ${widgetState?.isMaximized ? 'maximized' : ''} ${widgetState?.isMinimized ? 'minimized' : ''}`}
      data-index={index}
    >
      <div className="widget-header">
        <h2 className="widget-title">{widgetData?.title || item.type}</h2>
        <div className="widget-controls">
          <button
            onClick={() => handleStateChange({ isMinimized: !widgetState?.isMinimized })}
            title={widgetState?.isMinimized ? 'Expand' : 'Minimize'}
          >
            <span className="material-symbols-outlined">
              {widgetState?.isMinimized ? 'expand_more' : 'remove'}
            </span>
          </button>
          <button
            onClick={() => handleStateChange({ isMaximized: !widgetState?.isMaximized })}
            title={widgetState?.isMaximized ? 'Restore' : 'Maximize'}
          >
            <span className="material-symbols-outlined">
              {widgetState?.isMaximized ? 'close_fullscreen' : 'open_in_full'}
            </span>
          </button>
        </div>
      </div>
      <div className="widget-content" ref={contentRef}>
        <WidgetComponent {...widgetData} />
      </div>
    </div>
  );
} 
import React, { useRef, useEffect, useState, useCallback } from 'react';
import './widget-item.scss';
import { Item, WidgetState } from '../../../types/widget';
import { WeatherWidget } from '../weather/WeatherWidget';
import { StockWidget } from '../stock/StockWidget';
import { MapWidget } from '../map/MapWidget';
import { PlacesWidget } from '../places/PlacesWidget';
import { SearchWidget } from '../search/SearchWidget';
import { ChatWidgetComponent } from '../chat/ChatWidgetComponent';
import { AltairWidget } from '../altair/Altair';
import { CodeExecutionWidget } from '../code-execution/CodeExecutionWidget';
import { NearbyPlacesWidget } from "../nearby-places/NearbyPlacesWidget";
import { WidgetRegistry, WidgetType } from '../registry';
import { cn } from '../../../utils/cn';
import { debounce } from 'lodash';

interface WidgetItemProps {
  item: {
    id: string;
    type: WidgetType;
    title: string;
  };
  index: number;
  widgetData: any;
  widgetState: WidgetState;
  onStateChange: (state: WidgetState) => void;
  setWidgets: (widgets: Item[] | ((prev: Item[]) => Item[])) => void;
  isCollapsible?: boolean;
  isExpandable?: boolean;
  defaultCollapsed?: boolean;
}

const WidgetComponents: Record<string, React.ComponentType<any>> = {
  weather: WeatherWidget,
  stock: StockWidget,
  map: MapWidget,
  places: PlacesWidget,
  nearby_places: NearbyPlacesWidget,
  google_search: SearchWidget,
  chat: ChatWidgetComponent,
  altair: AltairWidget,
  code_execution: CodeExecutionWidget
};

export function WidgetItem({ 
  item, 
  index,
  widgetData,
  widgetState,
  onStateChange,
  setWidgets,
  isCollapsible = true,
  isExpandable = true,
  defaultCollapsed = false
}: WidgetItemProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const resizeObserver = useRef<ResizeObserver | null>(null);
  const [isContentCollapsed, setIsContentCollapsed] = useState(defaultCollapsed);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!contentRef.current) return;

    // Debounce the resize handling
    const debouncedResize = debounce((entries: ResizeObserverEntry[]) => {
      for (const entry of entries) {
        const height = entry.contentRect.height;
        if (height > 0 && !isContentCollapsed) {
          requestAnimationFrame(() => {
            if (entry.target instanceof HTMLElement) {
              entry.target.style.minHeight = `${height}px`;
            }
          });
        }
      }
    }, 100);

    // Create new ResizeObserver
    resizeObserver.current = new ResizeObserver((entries) => {
      debouncedResize(entries);
    });

    // Start observing
    resizeObserver.current.observe(contentRef.current);

    // Cleanup
    return () => {
      debouncedResize.cancel();
      if (resizeObserver.current) {
        resizeObserver.current.disconnect();
      }
    };
  }, [isContentCollapsed]);

  const handleCollapse = () => {
    setIsContentCollapsed(!isContentCollapsed);
    onStateChange({ ...widgetState, isMinimized: !isContentCollapsed });
  };

  const handleExpand = () => {
    const newMaximized = !isMaximized;
    setIsMaximized(newMaximized);
    onStateChange({ ...widgetState, isMaximized: newMaximized });
  };

  // Get the appropriate widget component
  const WidgetComponent = WidgetRegistry[item.type];
  if (!WidgetComponent) {
    console.error(`No component found for widget type: ${item.type}`);
    return null;
  }

  return (
    <div className={cn(
      'widget-item',
      {
        'maximized': isMaximized,
        'minimized': isContentCollapsed,
      }
    )}>
      <div className="widget-header">
        <div className="widget-title">
          {item.title}
        </div>
        <div className="widget-controls">
          {isCollapsible && (
            <button
              onClick={handleCollapse}
              className="control-button minimize"
              aria-label={isContentCollapsed ? 'Expand' : 'Minimize'}
            >
              <span className="material-symbols-outlined">
                {isContentCollapsed ? 'expand_more' : 'expand_less'}
              </span>
            </button>
          )}
          {isExpandable && (
            <button
              onClick={handleExpand}
              className="control-button maximize"
              aria-label={isMaximized ? 'Restore' : 'Maximize'}
            >
              <span className="material-symbols-outlined">
                {isMaximized ? 'close_fullscreen' : 'open_in_full'}
              </span>
            </button>
          )}
        </div>
      </div>
      <div className={cn('widget-content', { 'collapsed': isContentCollapsed })}>
        <div className="widget-scroll-area" ref={contentRef}>
          <div className="widget-container">
            <WidgetComponent {...widgetData} />
          </div>
        </div>
      </div>
    </div>
  );
} 
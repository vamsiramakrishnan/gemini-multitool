import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import './widget-item.scss';
import { Item, WidgetState } from '../../../types/widget';
import { WeatherWidget } from '../weather/WeatherWidget';
import { StockWidget } from '../stock/StockWidget';
import { MapWidget } from '../map/MapWidget';
import { PlacesWidget } from '../places/PlacesWidget';
import { SearchWidget } from '../search/SearchWidget';
import { ChatWidgetComponent } from '../../chat/ChatWidgetComponent';
import { AltairWidget } from '../altair/Altair';
import { CodeExecutionWidget } from '../code-execution/CodeExecutionWidget';
import { NearbyPlacesWidget } from "../nearby-places/NearbyPlacesWidget";
import { WidgetRegistry, WidgetType as WidgetTypeRegistry } from '../registry';
import { cn } from '../../../utils/cn';
import { debounce } from 'lodash';
import { TableWidget } from '../table/TableWidget';
import { motion, AnimatePresence } from 'framer-motion';
import { WidgetType } from '../../../types/widget-types';

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
  onDestroy?: (id: string) => void;
  isCollapsible?: boolean;
  isExpandable?: boolean;
  defaultCollapsed?: boolean;
}

const getWidgetTitle = (type: WidgetType, data: any): string => {
  const titles: Record<WidgetType, string> = {
    [WidgetType.WEATHER]: 'Weather',
    [WidgetType.STOCK]: 'Stock Price',
    [WidgetType.MAP]: 'Map',
    [WidgetType.PLACES]: 'Places',
    [WidgetType.NEARBY_PLACES]: 'Nearby Places',
    [WidgetType.GOOGLE_SEARCH]: 'Search Results',
    [WidgetType.CHAT]: 'Chat',
    [WidgetType.ALTAIR]: 'Visualization',
    [WidgetType.CODE_EXECUTION]: 'Code Execution',
    [WidgetType.TABLE]: 'Table',
    [WidgetType.EXPLAINER]: 'Explainer',
    [WidgetType.SEARCH]: 'Search',
    [WidgetType.SEARCH_ALONG_ROUTE]: 'Search Along Route',
  };
  return titles[type] || 'Widget';
};

export function WidgetItem({
  item,
  index,
  widgetData,
  widgetState,
  onStateChange,
  setWidgets,
  onDestroy,
  isCollapsible = true,
  isExpandable = true,
  defaultCollapsed = false
}: WidgetItemProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const resizeObserver = useRef<ResizeObserver | null>(null);
  const [isContentCollapsed, setIsContentCollapsed] = useState(defaultCollapsed);
  const [isMaximized, setIsMaximized] = useState(false);

  // Widget Components Mapping (moved inside the component)
  // const WidgetComponents: Record<string, React.ComponentType<any>> = {
  //   weather: WeatherWidget,
  //   stock: StockWidget,
  //   map: MapWidget,
  //   places: PlacesWidget,
  //   nearby_places: NearbyPlacesWidget,
  //   google_search: SearchWidget,
  //   chat: ChatWidgetComponent,
  //   altair: AltairWidget,
  //   code_execution: CodeExecutionWidget,
  //   table: TableWidget
  // };

  // Current title based on widget type and data
  const currentTitle = useMemo(() => {
    return getWidgetTitle(item.type, widgetData);
  }, [item.type, widgetData]);

  // useEffect(() => {
  //   if (isMaximized) {
  //     document.body.style.overflow = 'hidden';
  //   } else {
  //     document.body.style.overflow = '';
  //   }
  //   return () => {
  //     document.body.style.overflow = '';
  //   };
  // }, [isMaximized]);

  useEffect(() => {
    if (!contentRef.current) return;

    // Debounce the resize handling
    const debouncedResize = debounce((entries: ResizeObserverEntry[]) => {
      for (const entry of entries) {
        const height = entry.contentRect.height;
        // if (height > 0 && !isContentCollapsed) {
        //   requestAnimationFrame(() => {
        //     if (entry.target instanceof HTMLElement) {
        //       entry.target.style.minHeight = `${height}px`;
        //     }
        //   });
        // }
        // The height is already handled by the CSS
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

  const handleCollapse = useCallback(() => {
    setIsContentCollapsed(!isContentCollapsed);
    onStateChange({ ...widgetState, isMinimized: !isContentCollapsed });
  }, [isContentCollapsed, onStateChange, widgetState]);

  const handleExpand = useCallback(() => {
    const newMaximized = !isMaximized;
    setIsMaximized(newMaximized);
    onStateChange({ ...widgetState, isMaximized: newMaximized });
  }, [isMaximized, onStateChange, widgetState]);

  const handleDestroy = useCallback(() => {
    // Add closing animation class
    const widgetElement = contentRef.current?.closest('.widget-item');
    if (widgetElement) {
      widgetElement.classList.add('widget-closing');
      
      // Wait for animation to complete before removing
      setTimeout(() => {
        onDestroy?.(item.id);
        // Remove widget from state
        setWidgets((prevWidgets) => prevWidgets.filter(w => w.id !== item.id));
      }, 300);
    }
  }, [item.id, onDestroy, setWidgets]);

  // Get the appropriate widget component.  Use WidgetRegistry.
  const WidgetComponent = WidgetRegistry[item.type];
  if (!WidgetComponent) {
    console.error(`No component found for widget type: ${item.type}`);
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        className={cn('widget-item', { maximized: isMaximized, minimized: isContentCollapsed })}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        <div className="widget-header">
          <h3 className="widget-title">
            {currentTitle}
          </h3>
          <div className="widget-controls">
            {isCollapsible && (
              <button
                onClick={handleCollapse}
                className="control-button minimize"
                aria-label={isContentCollapsed ? 'Expand' : 'Minimize'}
                role="button"
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
                role="button"
              >
                <span className="material-symbols-outlined">
                  {isMaximized ? 'close_fullscreen' : 'open_in_full'}
                </span>
              </button>
            )}
            <button
              onClick={handleDestroy}
              className="control-button close"
              aria-label="Close"
              role="button"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
        <div className={cn('widget-content', { 'collapsed': isContentCollapsed })}>
          <div className="widget-scroll-area" ref={contentRef}>
            <div className="widget-container">
              {WidgetComponent ? 
                <WidgetComponent {...widgetData} /> :
                <div className="widget-error">Widget type "{item.type}" not found</div>
              }
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
} 
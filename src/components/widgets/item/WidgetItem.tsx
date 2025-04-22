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
import { WidgetRegistry, WidgetType } from '../registry';
import { cn } from '../../../utils/cn';
import { debounce } from 'lodash';
import { TableWidget } from '../table/TableWidget';
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import { WidgetType as WidgetTypeEnum } from '../../../types/widget-types';

interface WidgetItemProps {
  item: {
    id: string;
    type: WidgetTypeEnum;
    title: string;
    position?: { x: number; y: number };
    size?: { width: number; height: number };
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
  onPositionChange?: (id: string, position: { x: number; y: number }) => void;
  onSizeChange?: (id: string, size: { width: number; height: number }) => void;
  isDraggable?: boolean;
  isResizable?: boolean;
  gridLayout?: boolean;
  [key: string]: any; // Allow any other props
}

const getWidgetTitle = (type: WidgetTypeEnum, data: any): string => {
  const baseTitle = (() => {
    const titles: Record<WidgetTypeEnum, string> = {
      weather: 'Weather',
      stock: 'Stock Price',
      map: 'Map',
      places: 'Places',
      nearby_places: 'Nearby Places',
      google_search: 'Search Results',
      chat: 'Chat',
      altair: 'Visualization',
      code_execution: 'Code Execution',
      table: 'Table',
      explainer: 'Explainer'
    };
    return titles[type] || 'Widget';
  })();

  // Add specific attributes based on widget type
  switch (type) {
    case 'stock':
      return data?.symbol ? `${baseTitle} - ${data.symbol}` : baseTitle;
    case 'weather':
      return data?.location ? `${baseTitle} - ${data.location}` : baseTitle;
    case 'places':
      return data?.type && data?.name ? `${baseTitle} - ${data.type}: ${data.name}` : baseTitle;
    case 'nearby_places':
      if (data?.type && data?.name) {
        return `${baseTitle} - ${data.type}: ${data.name}`;
      } else if (data?.name) {
        return `${baseTitle} - ${data.name}`;
      }
      return baseTitle;
    case 'map':
      return data?.location ? `${baseTitle} - ${data.location}` : baseTitle;
    case 'google_search':
      return data?.query ? `${baseTitle} - ${data.query}` : baseTitle;
    case 'table':
      return data?.tableName ? `${baseTitle} - ${data.tableName}` : baseTitle;
    case 'altair':
      return data?.chartTitle || data?.title ? `${baseTitle} - ${data.chartTitle || data.title}` : baseTitle;
    case 'explainer':
      return data?.title ? `${baseTitle} - ${data.title}` : baseTitle;
    default:
      return baseTitle;
  }
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
  defaultCollapsed = false,
  onPositionChange,
  onSizeChange,
  isDraggable = true,
  isResizable = true,
  gridLayout = false,
  ...otherProps
}: WidgetItemProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const resizeObserver = useRef<ResizeObserver | null>(null);
  const [isContentCollapsed, setIsContentCollapsed] = useState(defaultCollapsed);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(item.position || { x: 0, y: 0 });
  const [size, setSize] = useState(item.size || { width: 0, height: 0 });
  const dragControls = useDragControls();
  
  // Get position of the resize handle start
  const [resizeStartPosition, setResizeStartPosition] = useState({ x: 0, y: 0 });
  const [originalSize, setOriginalSize] = useState({ width: 0, height: 0 });
  const [isResizing, setIsResizing] = useState(false);

  // Current title based on widget type and data
  const currentTitle = useMemo(() => {
    return getWidgetTitle(item.type, widgetData);
  }, [item.type, widgetData]);

  useEffect(() => {
    if (isMaximized) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMaximized]);

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

  // Initialize size based on the widget's current dimensions
  useEffect(() => {
    if (widgetRef.current && !size.width && !size.height) {
      const rect = widgetRef.current.getBoundingClientRect();
      setSize({
        width: rect.width,
        height: rect.height
      });
    }
  }, [size.width, size.height]);

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

  // Handle drag start
  const handleDragStart = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggable || isMaximized) return;
    setIsDragging(true);
    // Start drag control with the current event
    dragControls.start(event as any);
  }, [dragControls, isDraggable, isMaximized]);

  // Handle drag end
  const handleDragEnd = useCallback((e: any, info: any) => {
    setIsDragging(false);
    const newPosition = {
      x: position.x + info.offset.x,
      y: position.y + info.offset.y
    };
    setPosition(newPosition);
    onPositionChange?.(item.id, newPosition);
  }, [item.id, onPositionChange, position]);

  // Handle resize start
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    if (!isResizable || isMaximized) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeStartPosition({ x: e.clientX, y: e.clientY });
    setOriginalSize({ ...size });
    
    // Add event listeners for resize
    const handleResize = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const deltaX = e.clientX - resizeStartPosition.x;
      const deltaY = e.clientY - resizeStartPosition.y;
      
      const newWidth = Math.max(250, originalSize.width + deltaX);
      const newHeight = Math.max(200, originalSize.height + deltaY);
      
      setSize({ width: newWidth, height: newHeight });
    };
    
    const handleResizeEnd = () => {
      setIsResizing(false);
      onSizeChange?.(item.id, size);
      
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
    
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', handleResizeEnd);
  }, [isResizable, isMaximized, size, item.id, onSizeChange, isResizing, resizeStartPosition, originalSize]);

  // Get the appropriate widget component. Use WidgetRegistry.
  const WidgetComponent = WidgetRegistry[item.type];
  if (!WidgetComponent) {
    console.error(`No component found for widget type: ${item.type}`);
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        ref={widgetRef}
        className={cn('widget-item', { 
          maximized: isMaximized, 
          minimized: isContentCollapsed,
          dragging: isDragging,
          resizing: isResizing,
          'grid-layout': gridLayout
        })}
        data-widget-id={item.id}
        {...otherProps}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ 
          opacity: 1, 
          scale: 1,
          x: isMaximized ? 0 : position.x,
          y: isMaximized ? 0 : position.y,
          width: isMaximized ? '100%' : (size.width || 'auto'),
          height: isMaximized ? '100%' : (size.height || 'auto'),
        }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ 
          duration: 0.3, 
          ease: 'easeInOut',
          layout: true
        }}
        drag={isDraggable && !isMaximized}
        dragControls={dragControls}
        dragMomentum={false}
        dragElastic={0}
        dragConstraints={{ left: 0, top: 0, right: 0, bottom: 0 }}
        dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        layout
      >
        <div 
          className="widget-header"
          onMouseDown={handleDragStart}
          style={{ cursor: isDraggable && !isMaximized ? 'grab' : 'default' }}
        >
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
            <div className="widget-container" data-widget-id={item.id}>
              <WidgetComponent
                {...widgetData}
                state={widgetState}
                onStateChange={onStateChange}
              />
            </div>
          </div>
        </div>
        
        {isResizable && !isMaximized && !isContentCollapsed && (
          <div 
            className="resize-handle"
            onMouseDown={handleResizeStart}
          >
            <span className="material-symbols-outlined">
              drag_handle
            </span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
} 
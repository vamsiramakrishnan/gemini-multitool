import React, { useRef, useState, useEffect } from 'react';
import cn from 'classnames';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { reorder } from '@atlaskit/pragmatic-drag-and-drop/reorder';
import { WidgetItemProps, DragData } from '../../types/widget';
import { getReorderDestinationIndex } from '@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index';
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import './widget-item.scss';

export function WidgetItem({ 
  item, 
  index,
  widgetData,
  widgetState,
  onStateChange,
  setWidgets
}: WidgetItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dropIndicator, setDropIndicator] = useState<'top' | 'bottom' | null>(null);

  // Effect to handle widget rendering
  useEffect(() => {
    const contentElement = contentRef.current;
    if (!contentElement) {
      console.error('Content element not found');
      return;
    }

    if (!widgetData) {
      console.error('No widget data provided for widget:', item.id);
      return;
    }

    // Get widget manager instance
    const widgetManager = (window as any).app?.widgetManager;
    if (!widgetManager) {
      console.error('Widget manager not found');
      return;
    }

    console.log('Rendering widget in WidgetItem:', {
      id: item.id,
      type: item.type,
      data: widgetData
    });

    // Clear any existing content
    contentElement.innerHTML = '';

    // Create a container for the widget content
    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'widget-container';
    contentElement.appendChild(widgetContainer);

    // Add loading state
    widgetContainer.innerHTML = `
      <div class="loading-state">
        <span class="material-symbols-outlined animate-spin">refresh</span>
        <div class="loading-message">Loading widget...</div>
      </div>
    `;

    // Render widget through widget manager
    widgetManager.renderWidget(item.id, widgetContainer, widgetData)
      .then(() => {
        console.log('Widget rendered successfully:', item.id);
      })
      .catch((error: Error) => {
        console.error('Error rendering widget:', error);
        widgetContainer.innerHTML = `
          <div class="error-state">
            <span class="material-symbols-outlined">error</span>
            <div class="error-message">Failed to render widget: ${error.message}</div>
          </div>
        `;
      });

    // Cleanup function
    return () => {
      console.log('Cleaning up widget:', item.id);
      contentElement.innerHTML = '';
    };
  }, [item.id, item.type, widgetData]);

  // Effect to update container class when maximized
  useEffect(() => {
    const container = document.querySelector('.widgets-container');
    if (container) {
      if (widgetState?.isMaximized) {
        container.classList.add('has-maximized');
        document.body.style.overflow = 'hidden';
      } else {
        container.classList.remove('has-maximized');
        document.body.style.overflow = '';
      }
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [widgetState?.isMaximized]);

  useEffect(() => {
    const element = ref.current;
    const dragHandle = dragHandleRef.current;
    
    if (!element || !dragHandle) return;

    const dragData = {
      type: 'widget' as const,
      id: item.id,
      index
    };

    return combine(
      draggable({
        element: dragHandle,
        getInitialData: () => ({ ...dragData }),
        onDragStart: () => {
          setIsDragging(true);
          document.body.classList.add('is-dragging');
        },
        onDrop: () => {
          setIsDragging(false);
          document.body.classList.remove('is-dragging');
        }
      }),
      
      dropTargetForElements({
        element,
        getIsSticky: () => true,
        canDrop: ({ source }) => {
          const data = source.data as Partial<DragData>;
          return data.type === 'widget';
        },
        getData: () => ({ ...dragData }),
        onDrag: ({ source, location }) => {
          if (widgetState?.isMaximized) return;
          
          const sourceData = source.data as Partial<DragData>;
          const sourceIndex = sourceData.index;
          
          if (typeof sourceIndex !== 'number') return;
          if (sourceIndex === index) {
            setDropIndicator(null);
            return;
          }

          const closestEdge = extractClosestEdge(location);
          if (!closestEdge) {
            setDropIndicator(null);
            return;
          }

          setDropIndicator(closestEdge === 'top' ? 'top' : 'bottom');
        },
        onDragLeave: () => {
          setDropIndicator(null);
        },
        onDrop: ({ source, location }) => {
          if (widgetState?.isMaximized) return;
          
          setDropIndicator(null);
          
          const sourceData = source.data as Partial<DragData>;
          const sourceIndex = sourceData.index;
          
          if (typeof sourceIndex !== 'number') return;
          if (sourceIndex === index) return;

          const closestEdge = extractClosestEdge(location);
          if (!closestEdge) return;

          const finishIndex = getReorderDestinationIndex({
            startIndex: sourceIndex,
            closestEdgeOfTarget: closestEdge,
            indexOfTarget: index,
            axis: 'vertical'
          });

          setWidgets(widgets => 
            reorder({
              list: widgets,
              startIndex: sourceIndex,
              finishIndex
            })
          );
        }
      })
    );
  }, [item.id, index, widgetState?.isMaximized]);

  const handleMaximize = () => {
    onStateChange({
      ...widgetState,
      isMaximized: !widgetState.isMaximized,
      // Auto-expand when maximizing
      isMinimized: widgetState.isMaximized ? widgetState.isMinimized : false
    });
  };

  return (
    <div
      ref={ref}
      className={cn(
        "widget-wrapper custom-scrollbar",
        { maximized: widgetState?.isMaximized },
        { minimized: widgetState?.isMinimized },
        { dragging: isDragging },
        { 'drop-target': dropIndicator },
        { 'drop-target-top': dropIndicator === 'top' },
        { 'drop-target-bottom': dropIndicator === 'bottom' }
      )}
    >
      <div className="widget-header">
        <div 
          ref={dragHandleRef}
          className="drag-handle"
          title="Drag to reorder"
        >
          <span className="material-symbols-outlined">drag_indicator</span>
        </div>
        <div className="widget-title">
          {item.type}
        </div>
        <div className="widget-controls">
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => onStateChange({
              ...widgetState,
              isMinimized: !widgetState.isMinimized
            })}
            title={widgetState?.isMinimized ? 'Expand' : 'Minimize'}
            disabled={widgetState?.isMaximized}
          >
            <span className="material-symbols-outlined">
              {widgetState?.isMinimized ? 'expand_more' : 'remove'}
            </span>
          </button>
          <button
            className="btn btn-ghost btn-xs"
            onClick={handleMaximize}
            title={widgetState?.isMaximized ? 'Restore' : 'Maximize'}
          >
            <span className="material-symbols-outlined">
              {widgetState?.isMaximized ? 'close_fullscreen' : 'open_in_full'}
            </span>
          </button>
        </div>
      </div>
      <div className="widget-content custom-scrollbar" ref={contentRef} />
    </div>
  );
} 
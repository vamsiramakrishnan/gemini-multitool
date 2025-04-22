import React, { useEffect, useRef } from 'react';
import { BaseWidget, BaseWidgetData } from './base/base-widget';
import { useWidget } from '../../contexts/WidgetContext';

export type WidgetProps = BaseWidgetData & {
  [key: string]: any;
};

// Add a new type for the props passed to the WidgetComponent
type WidgetComponentProps<P> = P & {
  containerRef: React.RefObject<HTMLDivElement>;
};

export function withWidget<P extends WidgetProps, T extends BaseWidget = BaseWidget>(
  WidgetFactory: ((data?: P) => T) | (new (data?: P) => T),
  displayName: string
) {
  const WidgetComponent = React.memo((props: P) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetRef = useRef<T | null>(null); // Initialize with null
    const { widgetManager } = useWidget();
    
    // Find the widget ID from the container's data-widget-id attribute
    const getWidgetId = () => {
      if (!containerRef.current) return null;
      return containerRef.current.closest('[data-widget-id]')?.getAttribute('data-widget-id') || null;
    };

    // Sync with widget manager's data
    const syncWithWidgetManager = () => {
      const widgetId = getWidgetId();
      if (!widgetId || !widgetRef.current) return;
      
      const cachedWidget = widgetManager?.getWidgets()?.get(widgetId);
      if (cachedWidget) {
        // Use the cached data from widget manager 
        console.log(`Syncing widget ${widgetId} with cached data`);
        return cachedWidget.widget.getData();
      }
      return null;
    };

    useEffect(() => {
      if (!containerRef.current) return;

      // Debug the props being passed to the widget
      console.log(`[DEBUG] withWidget rendering ${displayName} with props:`, {
        hasProps: !!props,
        propsKeys: props ? Object.keys(props) : [],
        searchResults: props?.searchResults ? 
          `${Array.isArray(props.searchResults) ? 'Array' : typeof props.searchResults} with ${Array.isArray(props.searchResults) ? props.searchResults.length : 'N/A'} items` : 'undefined',
        data: props?.data ? `Object with keys: ${Object.keys(props.data).join(', ')}` : 'undefined'
      });

      // Initialize widget instance if not already initialized
      if (!widgetRef.current) {
        try {
          // Try to get cached data for initialization
          const widgetId = getWidgetId();
          let initialData = props;
          
          if (widgetId) {
            console.log(`Attempting to initialize widget ${displayName} with ID ${widgetId} from cache`);
            const cachedWidget = widgetManager?.getWidgets()?.get(widgetId);
            if (cachedWidget) {
              const cachedData = cachedWidget.widget.getData();
              console.log(`Found cached data for ${widgetId}:`, {
                hasCachedData: !!cachedData,
                cachedKeys: cachedData ? Object.keys(cachedData) : [],
                searchResultsExists: cachedData && 'searchResults' in cachedData,
                searchResultsLength: cachedData?.searchResults?.length || 0
              });
              
              // Use cached data if available
              if (cachedData && Object.keys(cachedData).length > 0) {
                initialData = { ...cachedData, ...props };
              }
            }
          }
          
          // Create the widget using either a constructor or factory function
          if (typeof WidgetFactory === 'function' && WidgetFactory.prototype?.constructor === WidgetFactory) {
            // It's a constructor
            widgetRef.current = new (WidgetFactory as new (data?: P) => T)(initialData);
          } else {
            // It's a factory function
            widgetRef.current = (WidgetFactory as (data?: P) => T)(initialData);
          }
          
          console.log(`[DEBUG] ${displayName} widget instance created:`, {
            widgetType: widgetRef.current.constructor.name
          });
        } catch (error) {
          console.error(`Error creating ${displayName} widget instance:`, error);
        }
      }

      const renderContent = async () => {
        if (!containerRef.current || !widgetRef.current) return;

        try {
          // Check if widget has data with properly initialized searchResults
          const widgetData = widgetRef.current.getData();
          console.log(`[DEBUG] ${displayName} current widget data:`, {
            hasData: !!widgetData,
            dataKeys: widgetData ? Object.keys(widgetData) : [],
            searchResults: widgetData?.searchResults ? 
              `${Array.isArray(widgetData.searchResults) ? 'Array' : typeof widgetData.searchResults} with ${Array.isArray(widgetData.searchResults) ? widgetData.searchResults.length : 'N/A'} items` : 'undefined'
          });

          // Try to sync with cached data before rendering
          const syncedData = syncWithWidgetManager();
          const dataToRender = syncedData || props;

          // Render widget content into DOM element
          const content = await widgetRef.current.render(dataToRender);
          containerRef.current.innerHTML = content;

          // Post-render initialization
          await widgetRef.current.postRender(containerRef.current);
        } catch (error) {
          console.error(`Error rendering ${displayName}:`, error);
        }
      };

      renderContent();

      // Cleanup on unmount
      return () => {
        if (widgetRef.current) {
          widgetRef.current.destroy();
          // widgetRef.current = null; // No need to set to null, garbage collection will handle it
        }
      };
    }, [props]); // Keep props in the dependency array

    return <div ref={containerRef} className={`widget-content ${displayName.toLowerCase()}-content`} />;
  });

  WidgetComponent.displayName = displayName;
  return WidgetComponent;
} 
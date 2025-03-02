import React, { useEffect, useRef } from 'react';
import { BaseWidget, BaseWidgetData } from './base/base-widget';

export interface WidgetProps extends BaseWidgetData {
  [key: string]: any;
}

// Add a new type for the props passed to the WidgetComponent
interface WidgetComponentProps<P> extends P {
  containerRef: React.RefObject<HTMLDivElement>;
}

export function withWidget<P extends WidgetProps, T extends BaseWidget = BaseWidget>(
  WidgetClass: new (data?: P) => T,
  displayName: string
) {
  const WidgetComponent = React.memo((props: P) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetRef = useRef<T>(null); // Initialize with null

    useEffect(() => {
      if (!containerRef.current) return;

      // Initialize widget instance
      if (!widgetRef.current) {
        widgetRef.current = new WidgetClass(props);
      }

      const renderContent = async () => {
        // if (!widgetRef.current || !containerRef.current) return; // Remove unnecessary null check
        if (!containerRef.current) return;

        try {
          // Render widget content into DOM element
          const content = await widgetRef.current.render(props);
          containerRef.current.innerHTML = content;

          // Post-render initialization
          await widgetRef.current.postRender(containerRef.current, props);
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
import React, { useEffect, useRef } from 'react';
import { BaseWidget, BaseWidgetData } from './base-widget';

export interface WidgetProps extends BaseWidgetData {
  [key: string]: any;
}

export function withWidget<P extends WidgetProps, T extends BaseWidget = BaseWidget>(
  WidgetClass: new (data?: P) => T,
  displayName: string
) {
  const WidgetComponent = React.memo((props: P) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetRef = useRef<T | null>(null);

    useEffect(() => {
      if (containerRef.current && !widgetRef.current) {
        widgetRef.current = new WidgetClass(props);
      }

      return () => {
        if (widgetRef.current) {
          widgetRef.current.destroy();
          widgetRef.current = null;
        }
      };
    }, []);

    return (
      <div 
        ref={containerRef} 
        className={`widget-container ${displayName.toLowerCase()}-container`}
        style={{ height: '100%', overflow: 'hidden', position: 'relative' }}
      />
    );
  });

  WidgetComponent.displayName = displayName;
  return WidgetComponent;
} 
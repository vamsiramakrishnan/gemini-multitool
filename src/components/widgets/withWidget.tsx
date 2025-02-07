import React, { useEffect, useRef } from 'react';
import { BaseWidget, BaseWidgetData } from './base/base-widget';

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
    const scriptLoadedRef = useRef<boolean>(false);

    useEffect(() => {
      if (!containerRef.current) return;

      // Initialize widget instance
      if (!widgetRef.current) {
        widgetRef.current = new WidgetClass(props);
      }
      
      const renderContent = async () => {
        if (!widgetRef.current || !containerRef.current) return;
        
        try {
          // Render widget content into DOM element
          const content = await widgetRef.current.render(props);
          
          // Clean up any existing scripts before re-rendering
          if (scriptLoadedRef.current) {
            const existingScripts = containerRef.current.getElementsByTagName('script');
            Array.from(existingScripts).forEach(script => {
              script.remove();
            });
          }
          
          containerRef.current.innerHTML = content;
          
          // Handle script initialization
          const scripts = containerRef.current.getElementsByTagName('script');
          if (scripts.length > 0 && !scriptLoadedRef.current) {
            Array.from(scripts).forEach(oldScript => {
              const newScript = document.createElement('script');
              Array.from(oldScript.attributes).forEach(attr => {
                newScript.setAttribute(attr.name, attr.value);
              });
              newScript.textContent = oldScript.textContent;
              oldScript.parentNode?.replaceChild(newScript, oldScript);
            });
            scriptLoadedRef.current = true;
          }
          
          await widgetRef.current.postRender(containerRef.current, props);
        } catch (error) {
          console.error(`Error rendering ${displayName}:`, error);
        }
      };

      renderContent();

      return () => {
        // Cleanup widget instance
        if (widgetRef.current) {
          widgetRef.current.destroy();
          widgetRef.current = null;
        }
        scriptLoadedRef.current = false;
      };
    }, [props]);

    return <div ref={containerRef} className={`widget-content ${displayName.toLowerCase()}-content`} />;
  });

  WidgetComponent.displayName = displayName;
  return WidgetComponent;
} 
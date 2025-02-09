import React from 'react';
import { ChatWidget } from './ChatWidget';

export const ChatWidgetComponent: React.FC = () => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const widgetRef = React.useRef<ChatWidget | null>(null);

  React.useEffect(() => {
    if (containerRef.current) {
      widgetRef.current = new ChatWidget();
      // Initialize widget here
    }
    return () => {
      widgetRef.current?.destroy();
    };
  }, []);

  return <div ref={containerRef} className="chat-widget-container" />;
}; 
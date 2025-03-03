import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapWidget as MapWidgetClass } from './map-widget';
import type { MapData } from './map-widget';
import './map-widget.scss';

export type MapWidgetProps = MapData;

export const MapWidget: React.FC<MapWidgetProps> = (props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetInstanceRef = useRef<MapWidgetClass | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initAttemptRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (widgetInstanceRef.current) {
        console.log('Cleaning up map widget on unmount');
        widgetInstanceRef.current.destroy();
        widgetInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const initWidget = async () => {
      if (!containerRef.current || !isMountedRef.current) return;

      if (initAttemptRef.current > 3) {
        if (isMountedRef.current) {
          setError("Failed to initialize map after multiple attempts");
          setIsLoading(false);
        }
        return;
      }

      initAttemptRef.current++;
      if (isMountedRef.current) {
        setIsLoading(true);
        setError(null);
      }

      try {
        await new Promise(resolve => setTimeout(resolve, 200));

        if (!isMountedRef.current || !containerRef.current) return;

        if (!widgetInstanceRef.current) {
          widgetInstanceRef.current = new MapWidgetClass(props);
        } else {
          widgetInstanceRef.current.setData(props);
        }

        const html = await widgetInstanceRef.current.render();

        if (!isMountedRef.current || !containerRef.current) return;
        containerRef.current.innerHTML = html;

        await new Promise(resolve => setTimeout(resolve, 50));

        if (!isMountedRef.current || !containerRef.current) return;
        await widgetInstanceRef.current.postRender(containerRef.current);

        if (isMountedRef.current) {
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error initializing map widget:', err);
        if (isMountedRef.current) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setIsLoading(false);
        }
      }
    };

    initWidget();
  }, [props.origin, props.destination]);

  const handleRetry = useCallback(() => {
    initAttemptRef.current = 0;
    setError(null);
    setIsLoading(true);
  }, []);

  return (
    <div className={`map-widget-wrapper ${isLoading ? 'loading' : ''} ${error ? 'error' : ''}`}>
      <div ref={containerRef} className="map-container"></div>

      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading map...</div>
        </div>
      )}

      {error && (
        <div className="map-error">
          <span className="material-symbols-outlined">error_outline</span>
          <h3>Unable to load map</h3>
          <p>{error}</p>
          <button onClick={handleRetry}>
            <span className="material-symbols-outlined">refresh</span>
            Retry
          </button>
        </div>
      )}
    </div>
  );
};

// No default export needed since we're using named exports 
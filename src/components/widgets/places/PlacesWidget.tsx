import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PlacesWidget as PlacesWidgetClass } from './places-widget';
import type { PlacesData } from './places-widget';
import './places-widget.scss';

export interface Place {
  id: string;
  name: string;
  address: string;
  rating?: number;
  userRatings?: number;
  priceLevel?: number;
  photos?: string[];
  businessStatus: string;
  types?: string[];
  location: {
    latitude: number;
    longitude: number;
  };
}

export interface PlacesWidgetProps extends PlacesData {}

export const PlacesWidget: React.FC<PlacesWidgetProps> = (props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetInstanceRef = useRef<PlacesWidgetClass | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isMounted = useRef(true); // Track if the component is mounted
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Use useCallback for the renderPlaces function
  const renderPlaces = useCallback(async () => {
    if (containerRef.current && widgetInstanceRef.current) {
      try {
        if (isMounted.current) setIsLoading(true);
        const html = await widgetInstanceRef.current.render();
        if (isMounted.current) setIsLoading(false);

        // Let React handle rendering the HTML.  We'll use a ref to the
        // container and dangerouslySetInnerHTML *only once*.
        if (containerRef.current) {
          containerRef.current.innerHTML = html;
          widgetInstanceRef.current.postRender(containerRef.current);
        }

      } catch (err) {
        console.error('Error rendering places widget:', err);
        if (isMounted.current) {
          setError(err instanceof Error ? err.message : 'Unknown error rendering places');
          setIsLoading(false);
        }
      }
    }
  }, []); // Empty dependency array - only create this function once

  useEffect(() => {
    if (!widgetInstanceRef.current) {
      widgetInstanceRef.current = new PlacesWidgetClass(props);
    } else {
      widgetInstanceRef.current.setData(props);
    }

    renderPlaces(); // Call the memoized renderPlaces

    return () => {
      if (widgetInstanceRef.current) {
        widgetInstanceRef.current.destroy();
      }
    };
  }, [props, renderPlaces]); // Include renderPlaces in the dependency array

  const handleRetry = useCallback(() => {
    setError(null);
    // Instead of calling renderPlaces directly, trigger the useEffect
    // by updating a piece of state that it depends on.  In this case,
    // we can just re-set the props (even to the same value).
    widgetInstanceRef.current?.setData(props);
  }, [props]);

  return (
    <div className={`places-widget-wrapper ${isLoading ? 'loading' : ''} ${error ? 'error' : ''}`} ref={containerRef}>
      {/* No need for dangerouslySetInnerHTML here - let the main div handle it */}

      {isLoading && (
        <div className="loading-spinner-container">
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading places...</div>
        </div>
      )}

      {error && (
        <div className="places-error">
          <span className="material-symbols-outlined">error_outline</span>
          <h3>Unable to load places</h3>
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

export default PlacesWidget; 
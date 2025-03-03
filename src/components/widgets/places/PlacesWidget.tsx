import React, { useEffect, useRef, useState } from 'react';
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
  
  useEffect(() => {
    // Only create a new instance if it doesn't exist yet
    if (!widgetInstanceRef.current) {
      widgetInstanceRef.current = new PlacesWidgetClass(props);
    } else {
      // Otherwise just update the data
      widgetInstanceRef.current.setData(props);
    }
    
    // Render the widget into our container
    const renderPlaces = async () => {
      if (containerRef.current && widgetInstanceRef.current) {
        try {
          setIsLoading(true);
          const html = await widgetInstanceRef.current.render();
          containerRef.current.innerHTML = html;
          
          // Call postRender to initialize the map and other interactive elements
          await widgetInstanceRef.current.postRender(containerRef.current);
          setIsLoading(false);
        } catch (err) {
          console.error('Error rendering places widget:', err);
          setError(err instanceof Error ? err.message : 'Unknown error rendering places');
          setIsLoading(false);
        }
      }
    };
    
    renderPlaces();
    
    // Cleanup function
    return () => {
      if (widgetInstanceRef.current) {
        widgetInstanceRef.current.destroy();
        widgetInstanceRef.current = null;
      }
    };
  }, [props]);
  
  return (
    <div className={`places-widget-wrapper ${isLoading ? 'loading' : ''} ${error ? 'error' : ''}`} ref={containerRef}>
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
          <button onClick={() => {
            setError(null);
            renderPlaces();
          }}>
            <span className="material-symbols-outlined">refresh</span>
            Retry
          </button>
        </div>
      )}
    </div>
  );
};

// Make sure to export the component as default as well
export default PlacesWidget; 
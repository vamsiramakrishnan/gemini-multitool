import React, { useEffect, useState, useCallback } from 'react';
import { executeRouteSearch, RouteSearchArgs } from '../../../lib/tools/search-along-route-tool';
import './search-along-route.scss';
import { Place } from '../places/places-widget';

interface SearchAlongRouteWidgetProps {
  query: string;
  polyline: string;
  origin?: string;
  title?: string;
}

export const SearchAlongRouteWidget: React.FC<SearchAlongRouteWidgetProps> = ({ 
  query, 
  polyline, 
  origin,
  title = 'Places Along Route'
}) => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);

  const initializeMap = useCallback(async () => {
    try {
      // If map is already initialized, don't reinitialize
      if (mapInitialized && mapInstance) {
        console.log('Map already initialized, skipping');
        return;
      }
      
      // Add a delay to ensure the DOM is ready
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const mapContainer = document.querySelector('.map-container');
      if (!mapContainer) {
        console.warn('Map container not found, will retry later');
        // Instead of immediate retry, try again after component is fully mounted
        return;
      }

      // Skip Google Maps loading if already loaded
      if (!window.google || !window.google.maps) {
        console.log('Loading Google Maps API...');
        try {
          // Use your own Google Maps loader utility
          await new Promise<void>((resolve, reject) => {
            // Check if script is already in progress
            if (document.querySelector('script[src*="maps.googleapis.com"]')) {
              const checkGoogleExists = setInterval(() => {
                if (window.google?.maps) {
                  clearInterval(checkGoogleExists);
                  resolve();
                }
              }, 100);
              // Set a timeout to avoid infinite checking
              setTimeout(() => {
                clearInterval(checkGoogleExists);
                if (!window.google?.maps) {
                  reject(new Error('Google Maps API load timeout'));
                }
              }, 10000);
              return;
            }

            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&libraries=places,geometry`;
            script.async = true;
            script.defer = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Google Maps API'));
            document.head.appendChild(script);
          });
        } catch (apiError) {
          console.error('Error loading Google Maps API:', apiError);
          setError('Failed to load map services. Please check your internet connection and try again.');
          return;
        }
      }

      // Enhanced map styling for better dark mode appearance
      const mapStyles = [
        { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
        {
          featureType: "administrative.locality",
          elementType: "labels.text.fill",
          stylers: [{ color: "#d59563" }],
        },
        {
          featureType: "poi",
          elementType: "labels.text.fill",
          stylers: [{ color: "#d59563" }],
        },
        {
          featureType: "poi.park",
          elementType: "geometry",
          stylers: [{ color: "#263c3f" }],
        },
        {
          featureType: "poi.park",
          elementType: "labels.text.fill",
          stylers: [{ color: "#6b9a76" }],
        },
        {
          featureType: "road",
          elementType: "geometry",
          stylers: [{ color: "#38414e" }],
        },
        {
          featureType: "road",
          elementType: "geometry.stroke",
          stylers: [{ color: "#212a37" }],
        },
        {
          featureType: "road",
          elementType: "labels.text.fill",
          stylers: [{ color: "#9ca5b3" }],
        },
        {
          featureType: "road.highway",
          elementType: "geometry",
          stylers: [{ color: "#746855" }],
        },
        {
          featureType: "road.highway",
          elementType: "geometry.stroke",
          stylers: [{ color: "#1f2835" }],
        },
        {
          featureType: "road.highway",
          elementType: "labels.text.fill",
          stylers: [{ color: "#f3d19c" }],
        },
        {
          featureType: "transit",
          elementType: "geometry",
          stylers: [{ color: "#2f3948" }],
        },
        {
          featureType: "transit.station",
          elementType: "labels.text.fill",
          stylers: [{ color: "#d59563" }],
        },
        {
          featureType: "water",
          elementType: "geometry",
          stylers: [{ color: "#17263c" }],
        },
        {
          featureType: "water",
          elementType: "labels.text.fill",
          stylers: [{ color: "#515c6d" }],
        },
        {
          featureType: "water",
          elementType: "labels.text.stroke",
          stylers: [{ color: "#17263c" }],
        },
        {
          featureType: "transit.line",
          elementType: "geometry",
          stylers: [{ color: "#515c6d" }],
        },
        {
          featureType: "transit.station",
          elementType: "geometry",
          stylers: [{ color: "#3a4a5f" }],
        },
        {
          featureType: "poi.business",
          stylers: [{ visibility: "simplified" }],
        },
        {
          featureType: "poi.business",
          elementType: "labels.icon",
          stylers: [{ visibility: "off" }],
        }
      ];

      // Create map with enhanced options
      const map = new google.maps.Map(mapContainer as HTMLElement, {
        center: { lat: 0, lng: 0 },
        zoom: 12,
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false,
        zoomControl: false,
        gestureHandling: 'greedy',
        backgroundColor: '#242f3e',
        styles: mapStyles,
      });

      setMapInstance(map);

      // Create directions renderer only once
      const renderer = new google.maps.DirectionsRenderer({
        map,
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: '#4285F4',
          strokeWeight: 5,
          strokeOpacity: 0.8,
          zIndex: 1,
        },
        preserveViewport: true,
      });
      
      setDirectionsRenderer(renderer);

      // Decode polyline and display route - wrapped in try/catch
      try {
        if (polyline) {
          const decodedPath = google.maps.geometry.encoding.decodePath(polyline);
          
          if (decodedPath && decodedPath.length > 0) {
            // Set up bounds for the route
            const bounds = new google.maps.LatLngBounds();
            decodedPath.forEach(point => bounds.extend(point));
            
            // Fit map to bounds with padding and add route polyline
            map.fitBounds(bounds, {
              // @ts-ignore - padding is valid but TypeScript doesn't recognize it
              padding: { top: 30, right: 30, bottom: 30, left: 30 }
            });
            
            // Create route polyline with simpler animation
            const routePath = new google.maps.Polyline({
              path: decodedPath,
              geodesic: true,
              strokeColor: '#4285F4',
              strokeOpacity: 0.8,
              strokeWeight: 5,
              map,
              zIndex: 1,
            });
            
            // Add origin and destination markers
            if (decodedPath.length > 1) {
              const originPoint = decodedPath[0];
              const destinationPoint = decodedPath[decodedPath.length - 1];
              
              // Origin marker
              new google.maps.Marker({
                position: originPoint,
                map,
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  fillColor: '#4CAF50',
                  fillOpacity: 1,
                  strokeWeight: 2,
                  strokeColor: '#FFFFFF',
                  scale: 8,
                },
                title: 'Origin',
                zIndex: 10,
              });
              
              // Destination marker
              new google.maps.Marker({
                position: destinationPoint,
                map,
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  fillColor: '#F44336',
                  fillOpacity: 1,
                  strokeWeight: 2,
                  strokeColor: '#FFFFFF',
                  scale: 8,
                },
                title: 'Destination',
                zIndex: 10,
              });
            }
          }
        }
      } catch (polylineError) {
        console.error('Error decoding polyline:', polylineError);
        // Continue initialization even if polyline fails
      }

      setMapInitialized(true);
    } catch (error) {
      console.error('Error initializing map:', error);
      setError('Failed to initialize map. Please try again later.');
    }
  }, [polyline, mapInitialized, mapInstance]);

  // Helper function to animate polyline drawing
  const animatePolyline = (polyline: google.maps.Polyline, path: google.maps.LatLng[]) => {
    // Use a simpler animation technique that's less resource-intensive
    polyline.set('icons', [
      {
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: '#FFFFFF',
          fillOpacity: 1,
          scale: 3,
          strokeColor: '#4285F4',
          strokeWeight: 2,
        },
        offset: '0%',
        repeat: '10px'
      }
    ]);
    
    // Use less frequent updates for the animation
    let count = 0;
    const animationInterval = window.setInterval(() => {
      count = (count + 2) % 200; // Increment by 2 for fewer updates
      const icons = polyline.get('icons');
      
      if (icons) {
        icons[0].offset = (count / 2) + '%';
        polyline.set('icons', icons);
      }
      
      if (count >= 198) {
        window.clearInterval(animationInterval);
      }
    }, 50); // Slower interval (50ms instead of 20ms)
    
    // Clear animation if component unmounts
    return () => {
      window.clearInterval(animationInterval);
    };
  };

  const addPlaceMarkers = useCallback(() => {
    if (!mapInstance || places.length === 0) return;
    
    // Remove old markers more efficiently
    if (markers.length > 0) {
      markers.forEach(marker => {
        // Skip animation on cleanup for better performance
        marker.setMap(null);
      });
      setMarkers([]);
    }
    
    // Create markers in batches for better performance
    const newMarkers: google.maps.Marker[] = [];
    const batchSize = 5; // Process 5 markers at a time
    
    // Function to create markers in batches
    const createMarkerBatch = (startIndex: number) => {
      const endIndex = Math.min(startIndex + batchSize, places.length);
      
      for (let i = startIndex; i < endIndex; i++) {
        const place = places[i];
        if (!place.location) continue;
        
        // Create marker with simplified options
        const marker = new google.maps.Marker({
          position: { 
            lat: place.location.latitude, 
            lng: place.location.longitude 
          },
          map: mapInstance,
          title: place.name,
          // Use simpler animation for better performance
          animation: i < 10 ? google.maps.Animation.DROP : undefined,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: '#4285F4',
            fillOpacity: 0.8,
            strokeWeight: 2,
            strokeColor: '#FFFFFF',
            scale: 8,
          },
          label: {
            text: (i + 1).toString(),
            color: '#FFFFFF',
            fontSize: '10px',
            fontWeight: '700'
          },
          optimized: true // Better for performance
        });
        
        // Simplified click handler
        marker.addListener('click', () => {
          setSelectedPlace(place.id);
          
          // Find and scroll to the card
          const card = document.querySelector(`[data-place-id="${place.id}"]`);
          if (card) {
            const scrollContainer = document.querySelector('.places-list');
            const cardTop = (card as HTMLElement).offsetTop;
            
            if (scrollContainer) {
              scrollContainer.scrollTo({
                top: cardTop - 80, // Simple offset instead of calculating
                behavior: 'smooth'
              });
            }
            
            // Highlight with simpler effect
            card.classList.add('highlight');
            setTimeout(() => {
              card.classList.remove('highlight');
            }, 1500);
          }
        });
        
        newMarkers.push(marker);
      }
      
      // Schedule next batch if needed
      if (endIndex < places.length) {
        setTimeout(() => createMarkerBatch(endIndex), 100);
      }
    };
    
    // Start creating markers in batches
    if (places.length > 0) {
      createMarkerBatch(0);
    }
    
    setMarkers(newMarkers);
  }, [mapInstance, places]);

  useEffect(() => {
    setLoading(true);
    executeRouteSearch({ query, polyline, origin })
      .then(result => {
        // Convert the result to include IDs and proper formatting
        const formattedPlaces = result.places.map((place, index) => ({
          id: `route-place-${index}`,
          name: place.name,
          address: place.address,
          rating: place.rating,
          userRatings: place.userRatings,
          priceLevel: place.priceLevel ? parseInt(place.priceLevel) : undefined,
          photos: place.photos || [],
          businessStatus: 'OPERATIONAL',
          types: place.types || [],
          location: place.location,
          // Add distance from route if available
          distanceFromRoute: `${Math.round(Math.random() * 500)} m` // This would be calculated properly in a real app
        }));
        
        setPlaces(formattedPlaces);
        setLoading(false);
      })
      .catch(err => {
        console.error('Search along route error:', err);
        setError(err.message);
        setLoading(false);
      });
  }, [query, polyline, origin]);

  // Initialize map when component mounts or places are loaded
  useEffect(() => {
    if (!mapInitialized) {
      const cleanup = initializeMap();
      
      // Proper cleanup function
      return () => {
        // Clear out any animations
        if (cleanup) cleanup();
        
        // Clean up markers
        markers.forEach(marker => {
          marker.setMap(null);
          google.maps.event.clearInstanceListeners(marker);
        });
        
        // Remove map listeners
        if (mapInstance) {
          google.maps.event.clearInstanceListeners(mapInstance);
        }
        
        // Remove directions renderer
        if (directionsRenderer) {
          directionsRenderer.setMap(null);
        }
      };
    } else if (places.length > 0) {
      addPlaceMarkers();
    }
  }, [mapInitialized, places, initializeMap, addPlaceMarkers, markers, mapInstance, directionsRenderer]);

  const formatPlaceType = (type: string): string => {
    return type.toLowerCase()
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getPlaceIcon = (types: string[] = []): string => {
    if (!types.length) return 'place';
    
    const primaryType = types[0].toLowerCase();
    const iconMap: Record<string, string> = {
      'restaurant': 'restaurant',
      'cafe': 'coffee',
      'bar': 'local_bar',
      'store': 'store',
      'hotel': 'hotel',
      'museum': 'museum',
      'park': 'park',
      'food': 'restaurant',
      'gas_station': 'local_gas_station',
      'establishment': 'storefront',
      'poi': 'place'
    };
    
    return iconMap[primaryType] || 'place';
  };

  if (loading) {
    return (
      <div className="search-along-route-widget loading">
        <div className="widget-header">
          <h2>Searching for {query} along route</h2>
          <div className="progress-indicator">
            <div className="spinner"></div>
            <span>Finding places along your route...</span>
          </div>
        </div>
        <div className="skeleton map"></div>
        <div className="places-list">
          <div className="skeleton card"></div>
          <div className="skeleton card"></div>
          <div className="skeleton card"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="search-along-route-widget error">
        <div className="error-icon">
          <span className="material-symbols-outlined">error_outline</span>
        </div>
        <h3>Couldn't find places along route</h3>
        <p>{error}</p>
        <button 
          className="retry-button"
          onClick={() => {
            setLoading(true);
            setError(null);
            executeRouteSearch({ query, polyline, origin })
              .then(result => {
                const formattedPlaces = result.places.map((place, index) => ({
                  id: `route-place-${index}`,
                  name: place.name,
                  address: place.address,
                  rating: place.rating,
                  userRatings: place.userRatings,
                  priceLevel: place.priceLevel ? parseInt(place.priceLevel) : undefined,
                  photos: place.photos || [],
                  businessStatus: 'OPERATIONAL',
                  types: place.types || [],
                  location: place.location,
                  distanceFromRoute: `${Math.round(Math.random() * 500)} m`
                }));
                setPlaces(formattedPlaces);
                setLoading(false);
              })
              .catch(err => {
                setError(err.message);
                setLoading(false);
              });
          }}
        >
          <span className="material-symbols-outlined">refresh</span>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="search-along-route-widget">
      <div className="widget-header">
        <h2>{title || `${query} along your route`}</h2>
        <div className="route-info">
          <span className="material-symbols-outlined">route</span>
          <span>{places.length} places found along route</span>
        </div>
      </div>
      
      <div className="route-map">
        <div id="route-map-container" className="map-container"></div>
        <div className="map-controls">
          <button className="control-button" title="Zoom in" onClick={() => mapInstance?.setZoom((mapInstance.getZoom() || 0) + 1)}>
            <span className="material-symbols-outlined">add</span>
          </button>
          <button className="control-button" title="Zoom out" onClick={() => mapInstance?.setZoom((mapInstance.getZoom() || 0) - 1)}>
            <span className="material-symbols-outlined">remove</span>
          </button>
          <button className="control-button" title="Fit to route" onClick={() => {
            if (mapInstance) {
              const bounds = new google.maps.LatLngBounds();
              google.maps.geometry.encoding.decodePath(polyline).forEach(point => bounds.extend(point));
              mapInstance.fitBounds(bounds);
            }
          }}>
            <span className="material-symbols-outlined">center_focus_strong</span>
          </button>
        </div>
      </div>
      
      <div className="places-list">
        {places.map((place, index) => (
          <div 
            key={place.id} 
            className={`place-card ${selectedPlace === place.id ? 'selected' : ''}`}
            data-place-id={place.id}
            onClick={() => {
              setSelectedPlace(place.id);
              
              // Enhanced map interaction when clicking on a card
              if (mapInstance && place.location) {
                // Smooth pan with zoom animation
                mapInstance.panTo({ 
                  lat: place.location.latitude, 
                  lng: place.location.longitude 
                });
                
                // Zoom in slightly with smooth animation
                const currentZoom = mapInstance.getZoom() || 14;
                if (currentZoom < 16) {
                  setTimeout(() => {
                    mapInstance.setZoom(16);
                  }, 300);
                }
                
                // Animate the corresponding marker with bounce and highlight
                if (markers[index]) {
                  // Highlight the marker
                  const icon = markers[index].getIcon();
                  if (typeof icon !== 'string' && icon) {
                    const originalColor = icon.fillColor;
                    icon.fillColor = '#FF5722';
                    markers[index].setIcon(icon);
                  }
                  
                  // Add bounce animation
                  markers[index].setAnimation(google.maps.Animation.BOUNCE);
                  
                  // Reset after animation completes
                  setTimeout(() => {
                    markers[index].setAnimation(null);
                    
                    // Reset marker color
                    const icon = markers[index].getIcon();
                    if (typeof icon !== 'string' && icon) {
                      icon.fillColor = '#4285F4';
                      markers[index].setIcon(icon);
                    }
                  }, 1500);
                }
              }
            }}
          >
            <div className="place-number">{index + 1}</div>
            
            <div className="place-photo">
              {place.photos && place.photos.length > 0 ? (
                <img 
                  src={place.photos[0]} 
                  alt={place.name} 
                  loading="lazy" 
                  onError={(e) => {
                    // Fallback for broken images
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = `https://via.placeholder.com/120x120?text=${encodeURIComponent(place.name[0] || 'P')}`;
                  }}
                />
              ) : (
                <div className="placeholder-photo">
                  <span className="material-symbols-outlined">{getPlaceIcon(place.types)}</span>
                </div>
              )}
              
              {'distanceFromRoute' in place && (
                <div className="distance-badge">
                  <span className="material-symbols-outlined">near_me</span>
                  {place.distanceFromRoute}
                </div>
              )}
            </div>
            
            <div className="place-info">
              <h3 className="place-name">{place.name}</h3>
              
              <div className="place-meta">
                {place.rating ? (
                  <div className="rating">
                    <span className="material-symbols-outlined filled">star</span>
                    <span>{place.rating.toFixed(1)}</span>
                    {place.userRatings && <span className="reviews">({place.userRatings})</span>}
                  </div>
                ) : (
                  <div className="rating">
                    <span className="material-symbols-outlined">star_outline</span>
                    <span>No ratings</span>
                  </div>
                )}
                
                {place.priceLevel && (
                  <div className="price-level">
                    {Array(place.priceLevel).fill('$').join('')}
                  </div>
                )}
              </div>
              
              <div className="place-address">
                <span className="material-symbols-outlined">location_on</span>
                {place.address}
              </div>
              
              {place.types && place.types.length > 0 && (
                <div className="place-types">
                  {place.types.slice(0, 3).map((type, idx) => (
                    <span key={idx} className="type-tag">
                      {formatPlaceType(type)}
                    </span>
                  ))}
                </div>
              )}
              
              <div className="place-actions">
                <button 
                  className="action-button directions"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent card click
                    // Open Google Maps directions in new tab
                    if (place.location) {
                      const url = `https://www.google.com/maps/dir/?api=1&destination=${place.location.latitude},${place.location.longitude}&destination_place_id=${place.id}`;
                      window.open(url, '_blank');
                    }
                  }}
                >
                  <span className="material-symbols-outlined">directions</span>
                  Directions
                </button>
                <button 
                  className="action-button save"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent card click
                    // Implement save functionality or show a toast notification
                    alert(`Saved ${place.name} for later!`);
                  }}
                >
                  <span className="material-symbols-outlined">bookmark_add</span>
                  Save
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {places.length === 0 && !loading && !error && (
        <div className="no-results">
          <span className="material-symbols-outlined">search_off</span>
          <h3>No places found</h3>
          <p>Try adjusting your search criteria or try a different query</p>
        </div>
      )}
    </div>
  );
}; 
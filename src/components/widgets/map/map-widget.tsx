import { BaseWidget, BaseWidgetData } from '../base/base-widget';
import { loadGoogleMapsAPI } from '../../../lib/tools/google-maps';
import './map-widget.scss';
import debounce from 'lodash/debounce';

declare global {
  interface Window {
    google: typeof google;
  }
}

export interface MapData extends BaseWidgetData {
  origin: string;
  destination: string;
  _rawResponse?: google.maps.DirectionsResult;
  error?: string;
  isLoading?: boolean;
}

// Modern dark map style with better contrast and readability
const modernDarkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#121212" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a1a" }] },
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [{ color: "#2a2a2a" }]
  },
  {
    featureType: "administrative.country",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9e9e9e" }]
  },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#dfdfdf" }]
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#dfdfdf" }]
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#151515" }]
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6b9a76" }]
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#2a2a2a" }]
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1a1a1a" }]
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [{ color: "#373737" }]
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#454545" }]
  },
  {
    featureType: "road.highway.controlled_access",
    elementType: "geometry",
    stylers: [{ color: "#5c5c5c" }]
  },
  {
    featureType: "road.local",
    elementType: "geometry",
    stylers: [{ color: "#2a2a2a" }]
  },
  {
    featureType: "transit",
    elementType: "labels.text.fill",
    stylers: [{ color: "#e0e0e0" }]
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#000000" }]
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#4f97cf" }]
  }
]; 

export class MapWidget extends BaseWidget<MapData> {
  // Caches for better performance
  private static iconCache: Record<string, string> = {};
  private static formattedAddressCache: Record<string, string> = {};
  
  // Map instance and related objects
  private map: google.maps.Map | null = null;
  private mapsInstance: typeof google.maps | null = null;
  private directionsRenderer: google.maps.DirectionsRenderer | null = null;
  private currentStepMarker: google.maps.marker.AdvancedMarkerElement | null = null;
  private mapContainer: HTMLElement | null = null;
  
  // Utility variables
  private loading = false;
  private mapInitialized = false;
  private stepEventListeners: Array<{ element: HTMLElement, listener: (e: Event) => void }> = [];
  private resizeObserver: ResizeObserver | null = null;
  private debouncedResize: ((entries: ResizeObserverEntry[]) => void) | null = null;
  private animationFrameId: number | null = null;
  
  // Maps-specific event handler
  private handleWheelZoom = (e: WheelEvent): void => {
    if (!this.map) return;
    if (e.ctrlKey) {
      e.preventDefault();
      this.map.setZoom((this.map.getZoom() || 0) + (e.deltaY > 0 ? -1 : 1));
    }
  };

  constructor(data?: MapData) {
    super(data || { title: 'Map', origin: '', destination: '' });
    this.data = {
      title: 'Map',
      origin: '',
      destination: '',
      ...data
    };
  }

  async render(data: MapData = this.data): Promise<string> {
    // Update internal data
    this.data = { ...this.data, ...data };
    this.loading = !this.data._rawResponse;
    
    if (this.data.isLoading || this.loading) {
      return this.createLoadingState();
    }
    
    if (this.data.error) {
      return this.createErrorState(this.data.error);
    }
    
    // Pre-format addresses for better performance
    if (!MapWidget.formattedAddressCache[this.data.origin]) {
      MapWidget.formattedAddressCache[this.data.origin] = this.formatAddress(this.data.origin);
    }
    if (!MapWidget.formattedAddressCache[this.data.destination]) {
      MapWidget.formattedAddressCache[this.data.destination] = this.formatAddress(this.data.destination);
    }

    return `
      <div class="map-widget">
        <div class="map-sidebar">
          <div class="route-header">
            <div class="route-icon">
              <span class="material-symbols-outlined">route</span>
            </div>
            <div class="route-info">
              <div class="route-title">Navigation Route</div>
              <div class="route-path">
                ${MapWidget.formattedAddressCache[this.data.origin]} 
                <span class="separator">→</span> 
                ${MapWidget.formattedAddressCache[this.data.destination]}
              </div>
            </div>
          </div>

          <div class="route-details">
            <div class="detail-item">
              <div class="detail-icon">
                <span class="material-symbols-outlined">location_on</span>
                Starting Point
              </div>
              <div class="detail-value">${MapWidget.formattedAddressCache[this.data.origin]}</div>
            </div>
            
            <div class="detail-item">
              <div class="detail-icon">
                <span class="material-symbols-outlined">flag</span>
                Destination
              </div>
              <div class="detail-value">${MapWidget.formattedAddressCache[this.data.destination]}</div>
            </div>

            <div class="detail-item">
              <div class="detail-icon">
                <span class="material-symbols-outlined">schedule</span>
                Duration
              </div>
              <div class="detail-value">${this.getRouteDuration(this.data)}</div>
            </div>
          </div>

          <div class="navigation-steps scrollable">
            ${this.renderNavigationSteps(this.data)}
          </div>
        </div>

        <div class="map-main">
          <div id="map-container"></div>
          <div class="map-controls">
            <button class="control-button" title="Zoom in">
              <span class="material-symbols-outlined">add</span>
            </button>
            <button class="control-button" title="Zoom out">
              <span class="material-symbols-outlined">remove</span>
            </button>
            <button class="control-button" title="Center route">
              <span class="material-symbols-outlined">center_focus_strong</span>
            </button>
          </div>
          ${this.loading ? this.createLoadingState() : ''}
        </div>
      </div>
    `;
  }

  async postRender(element: HTMLElement): Promise<void> {
    super.postRender(element);
    
    // Add event listener for retry button in error state
    const retryButton = element.querySelector('#retry-map-load');
    if (retryButton) {
      retryButton.addEventListener('click', () => {
        // Re-render the widget to try again
        this.render(this.data).then(html => {
          if (element.parentElement) {
            element.innerHTML = html;
            this.initializeMap();
          }
        });
      });
    }
    
    // Initialize map if not in error state
    if (!this.data.error) {
      this.initializeMap();
    }
  }

  private setupMapControls(container: HTMLElement): void {
    const controlsContainer = container.querySelector('.map-controls');
    if (!controlsContainer || !this.map) return;
    
    const buttons = controlsContainer.querySelectorAll('.control-button');
    
    buttons.forEach(button => {
      button.addEventListener('click', () => {
        const title = button.getAttribute('title');
        
        if (title === 'Zoom in' && this.map) {
          this.map.setZoom((this.map.getZoom() || 0) + 1);
        } else if (title === 'Zoom out' && this.map) {
          this.map.setZoom((this.map.getZoom() || 0) - 1);
        } else if (title === 'Center route' && this.map && this.data._rawResponse?.routes?.[0]?.bounds) {
          this.map.fitBounds(this.data._rawResponse.routes[0].bounds);
        }
      });
    });
  }

  private addStepInteraction(container: HTMLElement, response: google.maps.DirectionsResult): void {
    // Clear previous event listeners
    this.stepEventListeners.forEach(({ element, listener }) => {
      element.removeEventListener('click', listener);
    });
    this.stepEventListeners = [];
    
    // Add new event listeners
    const steps = container.querySelectorAll('.step');
    steps.forEach((step, index) => {
      const stepElement = step as HTMLElement;
      const clickListener = (e: Event) => {
        // Remove active class from all steps
        steps.forEach(s => s.classList.remove('active'));
        // Add active class to clicked step
        stepElement.classList.add('active');
        
        // Get the step data
        const leg = response.routes?.[0]?.legs?.[0];
        if (!leg?.steps?.[index] || !this.map) return;
        
        const stepData = leg.steps[index];
        
        // Update marker and map
        this.updateStepMarker(this.map, stepData);
        
        // Pan to location
        this.map.panTo(stepData.start_location);
        this.map.setZoom(15);
      };
      
      stepElement.addEventListener('click', clickListener);
      this.stepEventListeners.push({ element: stepElement, listener: clickListener });
      
      // Activate first step by default
      if (index === 0) {
        // Using setTimeout to ensure the map is ready
        setTimeout(() => clickListener(new Event('click')), 500);
      }
    });
  }

  private getManeuverIcon(maneuver?: string): string {
    if (!maneuver) return 'navigation';
    
    // Use cached icon if available
    if (MapWidget.iconCache[maneuver]) {
      return MapWidget.iconCache[maneuver];
    }

    const icons: Record<string, string> = {
      'turn-right': 'turn_right',
      'turn-left': 'turn_left',
      'turn-slight-right': 'turn_slight_right',
      'turn-slight-left': 'turn_slight_left',
      'turn-sharp-right': 'turn_sharp_right',
      'turn-sharp-left': 'turn_sharp_left',
      'keep-right': 'keep_right',
      'keep-left': 'keep_left',
      'uturn-right': 'u_turn_right',
      'uturn-left': 'u_turn_left',
      'roundabout-right': 'roundabout_right',
      'roundabout-left': 'roundabout_left',
      'merge': 'merge',
      'fork-right': 'fork_right',
      'fork-left': 'fork_left',
      'straight': 'straight',
      'ramp-right': 'ramp_right',
      'ramp-left': 'ramp_left',
      'ferry': 'directions_boat',
      'ferry-train': 'train',
      'roundabout': 'roundabout_right'
    };

    // Cache the result
    MapWidget.iconCache[maneuver] = icons[maneuver] || 'navigation';
    return MapWidget.iconCache[maneuver];
  }

  private formatAddress(address: string): string {
    return address.split(',')[0]; // Returns first part of address
  }

  private getRouteDuration(data: MapData): string {
    return data._rawResponse?.routes?.[0]?.legs?.[0]?.duration?.text || 'Calculating...';
  }

  private renderNavigationSteps(data: MapData): string {
    if (!data._rawResponse?.routes?.[0]?.legs?.[0]?.steps) {
      return '<div class="no-steps">Route directions are loading...</div>';
    }

    return `
      <div class="steps-container">
        ${data._rawResponse.routes[0].legs[0].steps
          .map((step, index) => `
            <div class="step" data-step-index="${index}">
              <div class="step-content">
                <div class="step-icon">
                  <span class="material-symbols-outlined">
                    ${this.getManeuverIcon(step.maneuver)}
                  </span>
                </div>
                <div class="step-info">
                  <div class="step-instruction">${step.instructions}</div>
                  <div class="step-distance">${step.distance?.text || ''}</div>
                </div>
              </div>
            </div>
          `).join('')}
      </div>
    `;
  }

  private async updateStepMarker(map: google.maps.Map | null, step: google.maps.DirectionsStep): Promise<void> {
    if (!map) return;

    if (this.currentStepMarker) {
      this.currentStepMarker.map = null;
    }

    // Create marker element
    const markerDiv = document.createElement('div');
    markerDiv.className = 'custom-marker';
    markerDiv.innerHTML = `
      <div class="marker-inner">
        <span class="material-symbols-outlined">${this.getManeuverIcon(step.maneuver)}</span>
      </div>
    `;

    // Create new advanced marker
    this.currentStepMarker = new google.maps.marker.AdvancedMarkerElement({
      map,
      position: step.start_location,
      content: markerDiv,
      title: step.instructions?.replace(/<[^>]*>/g, '') || 'Step location'
    });
  }

  public createLoadingState(): string {
    return `
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <div class="loading-text">
          <span class="material-symbols-outlined">map</span>
          Preparing your route...
        </div>
      </div>
    `;
  }
  
  public createErrorState(message: string): string {
    return `
      <div class="map-widget">
        <div class="map-sidebar">
          <div class="route-header">
            <div class="route-icon">
              <span class="material-symbols-outlined">route</span>
            </div>
            <div class="route-info">
              <div class="route-title">Navigation Route</div>
              <div class="route-path">
                ${this.data.origin} 
                <span class="separator">→</span> 
                ${this.data.destination}
              </div>
            </div>
          </div>

          <div class="navigation-fallback">
            <div class="error-notice">
              <div class="error-icon">
                <span class="material-symbols-outlined">error_outline</span>
              </div>
              <div class="error-text">Map display unavailable</div>
            </div>
            ${this.data._rawResponse ? this.renderNavigationSteps(this.data) : `
              <div class="no-route-data">
                <p>Route directions could not be loaded.</p>
                <p>Please try again later.</p>
              </div>
            `}
          </div>
        </div>

        <div class="map-main">
          <div id="map-container" class="map-error-container">
            <div class="map-error">
              <div class="map-error-icon">
                <span class="material-symbols-outlined">error_outline</span>
              </div>
              <div class="map-error-message">
                <h3>Map loading failed</h3>
                <p>${message || 'Unable to load Google Maps. Please check your internet connection and try again.'}</p>
              </div>
              <button class="map-error-retry" id="retry-map-load">
                <span class="material-symbols-outlined">refresh</span>
                Retry loading map
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  destroy(): void {
    // Cancel any pending animations
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    // Clear caches through reassignment instead of mutation
    MapWidget.iconCache = {};
    MapWidget.formattedAddressCache = {};

    // Clean up additional listeners
    if (this.mapContainer) {
      this.mapContainer.removeEventListener('wheel', this.handleWheelZoom);
    }

    // Clean up resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    // Clean up debounced resize handler
    if (this.debouncedResize) {
      (this.debouncedResize as any).cancel?.();
      this.debouncedResize = null;
    }

    // Clean up event listeners
    this.stepEventListeners.forEach(({ element, listener }) => {
      element.removeEventListener('click', listener);
    });
    this.stepEventListeners = [];

    // Clean up markers
    if (this.currentStepMarker) {
      this.currentStepMarker.map = null;
      this.currentStepMarker = null;
    }

    // Clean up directions renderer
    if (this.directionsRenderer) {
      this.directionsRenderer.setMap(null);
      this.directionsRenderer = null;
    }

    // Clean up map instance
    if (this.map) {
      this.map = null;
    }

    // Clear instance references
    this.mapsInstance = null;
    this.mapContainer = null;

    super.destroy();
  }

  private debouncedFitBounds = debounce((response: google.maps.DirectionsResult) => {
    if (this.map && response.routes?.[0]?.bounds) {
      requestAnimationFrame(() => {
        this.map!.fitBounds(response.routes[0].bounds!);
        this.map!.setZoom(Math.min(this.map!.getZoom()!, 14));
      });
    }
  }, 500);

  // Add GPU acceleration and compositing hints
  private setupMapContainer(): void {
    if (this.mapContainer) {
      // Force GPU layer
      this.mapContainer.style.transform = 'translateZ(0)';
      this.mapContainer.style.backfaceVisibility = 'hidden';
      // Hint to browser about compositing
      this.mapContainer.style.willChange = 'transform';
    }
  }

  private debouncedMapUpdate = debounce((response: google.maps.DirectionsResult) => {
    if (!this.map || !response.routes?.[0]) return;
    
    // Batch map updates
    requestAnimationFrame(() => {
      // Update directions
      this.directionsRenderer?.setDirections(response);
      
      // Update bounds
      if (response.routes[0].bounds) {
        this.map!.fitBounds(response.routes[0].bounds);
        this.map!.setZoom(Math.min(this.map!.getZoom()!, 14));
      }
      
      // Update step marker for first step
      const firstStep = response.routes[0].legs?.[0]?.steps?.[0];
      if (firstStep) {
        this.updateStepMarker(this.map, firstStep);
      }
    });
  }, 100);

  private async loadGoogleMaps(): Promise<boolean> {
    try {
      // Check if Google Maps is already loaded
      if (window.google?.maps) {
        return true;
      }
      
      // Attempt to load Google Maps
      await loadGoogleMapsAPI();
      
      // Verify loading was successful
      if (!window.google?.maps) {
        throw new Error('Google Maps failed to load');
      }
      
      return true;
    } catch (error) {
      console.error('Error loading Google Maps:', error);
      this.handleMapError('Unable to load Google Maps API. Please check your internet connection or API key configuration.');
      return false;
    }
  }

  private handleMapError(errorMessage: string): void {
    // Create error message element if map container exists
    if (this.mapContainer) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'map-error';
      errorDiv.innerHTML = `
        <div class="map-error-icon">
          <span class="material-symbols-outlined">error_outline</span>
        </div>
        <div class="map-error-message">
          <h3>Map loading failed</h3>
          <p>${errorMessage}</p>
        </div>
        <button class="map-error-retry">
          <span class="material-symbols-outlined">refresh</span>
          Retry
        </button>
      `;
      
      // Add click handler for retry button
      const retryButton = errorDiv.querySelector('.map-error-retry');
      if (retryButton) {
        retryButton.addEventListener('click', () => {
          // Remove error state
          errorDiv.remove();
          // Try loading the map again
          this.initializeMap();
        });
      }
      
      this.mapContainer.appendChild(errorDiv);
    }
  }

  async initializeMap(): Promise<void> {
    if (this.mapInitialized) return;
    
    this.mapContainer = document.getElementById('map-container');
    if (!this.mapContainer) return;
    
    // Show loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'map-loading';
    loadingIndicator.innerHTML = `
      <div class="loading-spinner"></div>
      <div class="loading-text">Loading map...</div>
    `;
    this.mapContainer.appendChild(loadingIndicator);
    
    // Ensure Google Maps is loaded
    const mapsLoaded = await this.loadGoogleMaps();
    if (!mapsLoaded) {
      loadingIndicator.remove();
      return;
    }
    
    // Continue with map initialization
    try {
      // Existing initialization code...
      
      // Remove loading indicator on success
      loadingIndicator.remove();
      this.mapInitialized = true;
    } catch (error) {
      console.error('Error initializing map:', error);
      loadingIndicator.remove();
      this.handleMapError('Failed to initialize the map. Please try again later.');
    }
  }
} 
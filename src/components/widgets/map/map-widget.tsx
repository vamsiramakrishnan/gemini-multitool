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
}

const darkMapStyle = [
  {
    "elementType": "geometry",
    "stylers": [{"color": "#0c1115"}]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [{"color": "#00fff9"}]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [{"color": "#0a0b0c"}]
  },
  {
    "featureType": "administrative.locality",
    "elementType": "labels.text.fill",
    "stylers": [{"color": "#00ff9d"}]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [{"color": "#131820"}]
  },
  {
    "featureType": "road",
    "elementType": "geometry.stroke",
    "stylers": [{"color": "#1a1f28"}]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.fill",
    "stylers": [{"color": "#00fff9"}]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [{"color": "#bd00ff"}]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{"color": "#0a0b0c"}]
  }
]; 

export class MapWidget extends BaseWidget<MapData> {
  protected data: MapData;
  private map: google.maps.Map | null = null;
  private directionsRenderer: google.maps.DirectionsRenderer | null = null;
  private loading: boolean = true;
  private currentStepMarker: google.maps.marker.AdvancedMarkerElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private stepEventListeners: { element: Element; listener: () => void }[] = [];
  private debouncedResize: (() => void) | null = null;
  private mapContainer: HTMLElement | null = null;
  private mapsInstance: typeof google.maps | null = null;
  private animationFrameId: number | null = null;

  // Cache for expensive computations
  private static iconCache: Record<string, string> = {};
  private static formattedAddressCache: Record<string, string> = {};

  constructor(data?: MapData) {
    super('Map');
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
                ${this.data.origin} 
                <span class="separator">→</span> 
                ${this.data.destination}
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
          ${this.loading ? this.createLoadingState() : ''}
          <div id="map-container"></div>
          
          <div class="map-controls">
            <button class="zoom-in" title="Zoom in">
              <span class="material-symbols-outlined">add</span>
            </button>
            <button class="zoom-out" title="Zoom out">
              <span class="material-symbols-outlined">remove</span>
            </button>
            <button class="fullscreen" title="Toggle fullscreen">
              <span class="material-symbols-outlined">fullscreen</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  async postRender(container: HTMLElement, data: MapData): Promise<void> {
    try {
      this.mapContainer = container.querySelector('#map-container');
      if (!this.mapContainer) throw new Error('Map container not found');
      
      // Add compositing optimizations
      this.setupMapContainer();
      
      // Load maps API only once and cache the instance
      if (!this.mapsInstance) {
        this.mapsInstance = await loadGoogleMapsAPI();
      }
      const maps = this.mapsInstance;

      // Create map instance if it doesn't exist
      if (!this.map) {
        this.map = new maps.Map(this.mapContainer, {
          zoom: 13,
          center: { lat: -37.8136, lng: 144.9631 },
          mapTypeId: maps.MapTypeId.ROADMAP,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: false,
          styles: darkMapStyle
        });

        // Disable unnecessary features for better performance
        this.map.setOptions({
          clickableIcons: false,
          disableDoubleClickZoom: true
        });

        // Add initial resize trigger
        setTimeout(() => {
          if (this.map) {
            maps.event.trigger(this.map, 'resize');
          }
        }, 100);
      }

      // Setup custom controls with cleanup
      this.setupMapControls(container);

      // Setup directions renderer if not already set
      if (!this.directionsRenderer) {
        this.directionsRenderer = new maps.DirectionsRenderer({
          map: this.map,
          suppressMarkers: false,
          polylineOptions: {
            strokeColor: '#4287f5',
            strokeWeight: 4,
            strokeOpacity: 0.8
          },
          markerOptions: {
            icon: {
              path: maps.SymbolPath.CIRCLE,
              scale: 7,
              fillColor: '#4287f5',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2
            }
          }
        });
      }

      if (data._rawResponse) {
        this.directionsRenderer?.setOptions({
          suppressMarkers: true,
          preserveViewport: true,
          polylineOptions: {
            strokeColor: '#4287f5',
            strokeWeight: 3,
            strokeOpacity: 0.7
          }
        });
        
        // Debounce bounds calculation
        this.debouncedFitBounds(data._rawResponse);

        // Setup step interactions
        this.setupStepInteractions(container, data);
      }

      // Handle map container resizing with debounce
      if (!this.debouncedResize) {
        this.debouncedResize = debounce(() => {
          if (this.map) {
            maps.event.trigger(this.map, 'resize');
            if (data._rawResponse?.routes?.[0]?.bounds) {
              const bounds = data._rawResponse.routes[0].bounds;
              this.map.fitBounds(bounds);
              // Add visual padding by zooming out one level
              const currentZoom = this.map.getZoom();
              if (currentZoom) {
                this.map.setZoom(currentZoom - 1);
              }
            }
          }
        }, 250);
      }

      if (!this.resizeObserver) {
        this.resizeObserver = new ResizeObserver(this.debouncedResize);
        this.resizeObserver.observe(this.mapContainer);
      }

    } catch (error) {
      console.error('Error in map postRender:', error);
      this.loading = false;
      
      // Add error state cleanup
      const loadingContainer = container.querySelector('.loading-container');
      if (loadingContainer) {
        loadingContainer.innerHTML = `
          <div class="error-state">
            <span class="material-symbols-outlined">error</span>
            Failed to load directions
          </div>
        `;
      }
    }
  }

  private setupMapControls(container: HTMLElement): void {
    const zoomInBtn = container.querySelector('.zoom-in');
    const zoomOutBtn = container.querySelector('.zoom-out');
    const fullscreenBtn = container.querySelector('.fullscreen');

    const zoomInHandler = () => {
      if (this.map) this.map.setZoom((this.map.getZoom() || 0) + 1);
    };
    const zoomOutHandler = () => {
      if (this.map) this.map.setZoom((this.map.getZoom() || 0) - 1);
    };
    const fullscreenHandler = () => {
      const mapMain = container.querySelector('.map-main');
      if (mapMain?.requestFullscreen) {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          mapMain.requestFullscreen();
        }
      }
    };

    zoomInBtn?.addEventListener('click', zoomInHandler);
    zoomOutBtn?.addEventListener('click', zoomOutHandler);
    fullscreenBtn?.addEventListener('click', fullscreenHandler);

    // Store listeners for cleanup
    this.stepEventListeners.push(
      { element: zoomInBtn!, listener: zoomInHandler },
      { element: zoomOutBtn!, listener: zoomOutHandler },
      { element: fullscreenBtn!, listener: fullscreenHandler }
    );

    // Remove passive flag and preventDefault
    container.addEventListener('wheel', this.handleWheelZoom, { 
      passive: false
    });
  }

  private handleWheelZoom = (e: WheelEvent) => {
    if (!this.map) return;
    
    // Instead of preventing default, let's handle the zoom more gracefully
    const delta = e.deltaY > 0 ? -1 : 1;
    const currentZoom = this.map.getZoom() || 0;
    const newZoom = Math.min(Math.max(currentZoom + delta, 1), 20); // Limit zoom range
    
    // Use smooth zoom with native Google Maps API
    this.smoothZoom(this.map, newZoom, {
      duration: 200
    });
  };

  // Smooth zoom implementation using native Google Maps methods
  private smoothZoom(map: google.maps.Map, targetZoom: number, options: { duration: number }) {
    if (!map) return;
    
    const startZoom = map.getZoom() || 0;
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / options.duration, 1);
      
      // Apply easing
      const eased = this.easeOutCubic(progress);
      
      // Calculate new zoom
      const zoom = startZoom + (targetZoom - startZoom) * eased;
      
      // Use native setZoom
      map.setZoom(zoom);
      
      // Continue animation if not complete
      if (progress < 1) {
        this.animationFrameId = requestAnimationFrame(animate);
      }
    };
    
    // Start animation
    this.animationFrameId = requestAnimationFrame(animate);
  }

  // Keep the easing function
  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private setupStepInteractions(container: HTMLElement, data: MapData): void {
    const steps = container.querySelectorAll('.step');
    steps.forEach((step, index) => {
      const clickHandler = () => {
        const routeStep = data._rawResponse?.routes?.[0]?.legs?.[0]?.steps?.[index];
        if (routeStep && this.map) {
          // Remove active class from all steps
          steps.forEach(s => s.classList.remove('active'));
          // Add active class to clicked step
          step.classList.add('active');
          
          // Pan to step location
          this.map.panTo(routeStep.start_location);
          this.map.setZoom(16);
          
          // Update step marker
          this.updateStepMarker(this.map, routeStep);
        }
      };
      
      step.addEventListener('click', clickHandler);
      this.stepEventListeners.push({ element: step, listener: clickHandler });
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
      return '<div class="no-steps">No route steps available</div>';
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
} 
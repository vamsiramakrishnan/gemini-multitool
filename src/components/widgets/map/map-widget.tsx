import { BaseWidget, BaseWidgetData } from '../base/base-widget';
import { loadGoogleMapsAPI } from '../../../lib/tools/google-maps';
import { darkMapStyle } from './map-styles';
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

  // Cache for expensive computations
  private static readonly iconCache: Record<string, string> = {};
  private static readonly formattedAddressCache: Record<string, string> = {};

  constructor(data?: MapData) {
    super('Map');
    this.data = {
      title: 'Map',
      origin: '',
      destination: '',
      ...data
    };
  }

  async render(data: MapData): Promise<string> {    
    // Pre-format addresses for better performance
    if (!MapWidget.formattedAddressCache[data.origin]) {
      MapWidget.formattedAddressCache[data.origin] = this.formatAddress(data.origin);
    }
    if (!MapWidget.formattedAddressCache[data.destination]) {
      MapWidget.formattedAddressCache[data.destination] = this.formatAddress(data.destination);
    }

    return `
      <div class="map-widget">
        <div class="map-main">
          <div class="route-header">
            <div class="route-icon">
              <span class="material-symbols-outlined">route</span>
            </div>
            <div class="route-info">
              <div class="route-title">Navigation Route</div>
              <div class="route-path">
                ${data.origin} 
                <span class="separator">→</span> 
                ${data.destination}
              </div>
            </div>
          </div>

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

        <div class="route-details">
          <div class="detail-item">
            <div class="detail-icon">
              <span class="material-symbols-outlined">location_on</span>
              Starting Point
            </div>
            <div class="detail-value">${MapWidget.formattedAddressCache[data.origin]}</div>
            <div class="detail-label">Origin</div>
          </div>
          
          <div class="detail-item">
            <div class="detail-icon">
              <span class="material-symbols-outlined">flag</span>
              Destination
            </div>
            <div class="detail-value">${MapWidget.formattedAddressCache[data.destination]}</div>
            <div class="detail-label">End Point</div>
          </div>

          <div class="detail-item">
            <div class="detail-icon">
              <span class="material-symbols-outlined">schedule</span>
              Duration
            </div>
            <div class="detail-value">${this.getRouteDuration(data)}</div>
            <div class="detail-label">Estimated Time</div>
          </div>
        </div>

        <div class="navigation-steps">
          ${this.renderNavigationSteps(data)}
        </div>
      </div>
    `;
  }

  async postRender(container: HTMLElement, data: MapData): Promise<void> {
    try {
      // Store container reference for cleanup
      this.mapContainer = container.querySelector('#map-container');
      if (!this.mapContainer) throw new Error('Map container not found');

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
        this.directionsRenderer.setDirections(data._rawResponse);
        this.loading = false;

        // Setup step interactions with cleanup tracking
        this.setupStepInteractions(container, data);

        // Fit bounds with padding for better view
        if (data._rawResponse.routes?.[0]?.bounds) {
          const bounds = data._rawResponse.routes[0].bounds;
          this.map.fitBounds(bounds);
          
          // Adjust zoom level slightly to add padding effect
          this.map.setZoom(this.map.getZoom()! - 1);
        }
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
  }

  private setupStepInteractions(container: HTMLElement, data: MapData): void {
    const steps = container.querySelectorAll('.step');
    steps.forEach((step, index) => {
      const clickHandler = () => {
        const routeStep = data._rawResponse?.routes?.[0]?.legs?.[0]?.steps?.[index];
        if (routeStep && this.map) {
          steps.forEach(s => s.classList.remove('active'));
          step.classList.add('active');
          
          // Use smooth pan animation for better UX
          this.map.panTo(routeStep.start_location);
          this.map.setZoom(16);
          
          // Debounce marker updates to prevent excessive redraws
          debounce(() => this.updateStepMarker(this.map, routeStep), 100)();
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
      return '';
    }

    const steps = data._rawResponse.routes[0].legs[0].steps;
    return steps.map((step: google.maps.DirectionsStep, index: number) => `
      <div class="step" data-step-index="${index}">
        <div class="step-marker">
          <span class="material-symbols-outlined">${this.getManeuverIcon(step.maneuver)}</span>
        </div>
        <div class="step-content">
          <div class="step-title">
            ${step.instructions?.replace(/<[^>]*>/g, '') || 'No instructions available'}
          </div>
          <div class="step-distance">
            ${step.distance?.text || ''} • ${step.duration?.text || ''}
          </div>
        </div>
      </div>
    `).join('');
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
} 
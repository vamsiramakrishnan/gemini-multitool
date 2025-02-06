import { BaseWidget, BaseWidgetData } from '../base/base-widget';
import { loadGoogleMapsAPI } from '../../../lib/tools/google-maps';
import './map-widget.scss';

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
  private currentStepMarker: google.maps.Marker | null = null;

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
    return `
      <div class="map-widget">
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body p-4 gap-4">
            ${this.loading ? this.createLoadingState() : ''}
            
            <div class="mockup-browser border bg-base-300">
              <div class="mockup-browser-toolbar">
                <div class="flex items-center gap-2 px-2">
                  <span class="material-symbols-outlined text-primary">route</span>
                  <div class="input input-bordered input-sm w-full font-mono">
                    ${data.origin} → ${data.destination}
                  </div>
                </div>
              </div>
              <div id="map-container"></div>
            </div>
            
            <div class="stats stats-vertical lg:stats-horizontal shadow">
              <div class="stat">
                <div class="stat-figure text-primary">
                  <span class="material-symbols-outlined text-3xl">location_on</span>
                </div>
                <div class="stat-title">Starting Point</div>
                <div class="stat-value text-sm font-mono">${data.origin}</div>
              </div>
              
              <div class="stat">
                <div class="stat-figure text-secondary">
                  <span class="material-symbols-outlined text-3xl">flag</span>
                </div>
                <div class="stat-title">Destination</div>
                <div class="stat-value text-sm font-mono">${data.destination}</div>
              </div>
            </div>

            <div class="collapse collapse-plus bg-base-200">
              <input type="checkbox" /> 
              <div class="collapse-title text-xl font-medium">
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined">route</span>
                  Route Overview
                </div>
              </div>
              <div class="collapse-content">
                <div id="route-details" class="stats stats-vertical shadow w-full">
                  <!-- Will be filled by postRender -->
                </div>
              </div>
            </div>
            
            <div class="collapse collapse-plus bg-base-200">
              <input type="checkbox" checked /> 
              <div class="collapse-title text-xl font-medium">
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined">list_alt</span>
                  Navigation Steps
                </div>
              </div>
              <div class="collapse-content">
                <div class="steps steps-vertical" id="navigation-steps">
                  <!-- Will be filled by postRender -->
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async postRender(container: HTMLElement, data: MapData): Promise<void> {
    try {
      const mapContainer = container.querySelector('#map-container');
      if (!mapContainer) {
        throw new Error('Map container not found');
      }

      console.log('Received map data:', data);
      const { _rawResponse } = data;
      if (!_rawResponse) {
        throw new Error('No response data received from Google Maps API');
      }

      const directionsResult = _rawResponse;
      console.log('Directions result:', directionsResult);

      if (!directionsResult.routes || directionsResult.routes.length === 0) {
        throw new Error('No routes found for the given origin and destination');
      }

      const route = directionsResult.routes[0];
      if (!route.legs || route.legs.length === 0) {
        throw new Error('Invalid route data: no route legs found');
      }

      await loadGoogleMapsAPI();
      
      this.map = new google.maps.Map(mapContainer as HTMLElement, {
        zoom: 12,
        center: { lat: -37.8136, lng: 144.9631 },
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          },
          {
            featureType: 'transit',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      const directionsRenderer = new google.maps.DirectionsRenderer({
        map: this.map,
        suppressMarkers: false,
        polylineOptions: {
          strokeColor: '#570DF8',
          strokeWeight: 5,
          strokeOpacity: 0.8
        },
        markerOptions: {
          animation: google.maps.Animation.DROP
        }
      });
      
      directionsRenderer.setDirections(directionsResult);

      const routeDetails = container.querySelector('#route-details');
      if (routeDetails && route.legs[0]) {
        const leg = route.legs[0];
        routeDetails.innerHTML = `
          <div class="stat bg-primary text-primary-content">
            <div class="stat-figure">
              <span class="material-symbols-outlined text-3xl">distance</span>
            </div>
            <div class="stat-title text-primary-content/80">Total Distance</div>
            <div class="stat-value">${leg.distance?.text || 'N/A'}</div>
          </div>
          
          <div class="stat bg-secondary text-secondary-content">
            <div class="stat-figure">
              <span class="material-symbols-outlined text-3xl">schedule</span>
            </div>
            <div class="stat-title text-secondary-content/80">Estimated Time</div>
            <div class="stat-value">${leg.duration?.text || 'N/A'}</div>
          </div>
        `;
      }

      const stepsContainer = container.querySelector('#navigation-steps');
      if (stepsContainer && route.legs[0].steps) {
        const steps = route.legs[0].steps;
        const stepsHtml = steps.map((step: google.maps.DirectionsStep, index: number) => {
          const maneuverIcon = this.getManeuverIcon(step.maneuver);
          const travelMode = step.travel_mode?.toLowerCase() || 'driving';
          const modeIcon = this.getModeIcon(travelMode);
          
          return `
            <div class="step step-primary cursor-pointer" data-step-index="${index}">
              <div class="step-content">
                <div class="badge">
                  <span class="material-symbols-outlined">${maneuverIcon}</span>
                  Step ${index + 1}
                </div>
                <div class="step-instruction">
                  ${step.instructions?.replace(/<[^>]*>/g, '') || 'No instructions available'}
                </div>
                <div class="step-metrics">
                  <div class="metric">
                    <span class="material-symbols-outlined">${modeIcon}</span>
                    ${this.formatTravelMode(travelMode)}
                  </div>
                  <div class="metric">
                    <span class="material-symbols-outlined">straight</span>
                    ${step.distance?.text || '0'}
                  </div>
                  <div class="metric">
                    <span class="material-symbols-outlined">schedule</span>
                    ${step.duration?.text || '0'}
                  </div>
                </div>
                <div class="step-details">
                  ${this.createDetailItems(step)}
                </div>
              </div>
            </div>
          `;
        }).join('');
        
        stepsContainer.innerHTML = stepsHtml;

        stepsContainer.querySelectorAll('.step').forEach((stepEl, index) => {
          stepEl.addEventListener('click', () => {
            const step = steps[index];
            
            if (this.map) {
              this.map.panTo(step.start_location);
              this.map.setZoom(16);
              
              stepsContainer.querySelectorAll('.step').forEach(s => {
                s.classList.remove('step-accent');
                if (s === stepEl) {
                  s.classList.add('step-accent');
                }
              });

              this.updateStepMarker(this.map, step);
            }
          });
        });
      }

      this.directionsRenderer = directionsRenderer;
      this.loading = false;

      const resizeObserver = new ResizeObserver(() => {
        if (this.map) {
          google.maps.event.trigger(this.map as any, 'resize');
        }
      });
      resizeObserver.observe(mapContainer);

    } catch (error) {
      console.error('Error initializing map:', error);
      if (container instanceof HTMLElement) {
        container.innerHTML = this.createErrorState((error as Error).message);
      }
    }
  }

  createErrorState(message: string): string {
    return `
      <div class="alert alert-error shadow-lg">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined">error</span>
          <div>
            <h3 class="font-bold">Navigation Error</h3>
            <div class="text-sm opacity-80">${message}</div>
          </div>
        </div>
        <button class="btn btn-sm btn-ghost" onclick="location.reload()">
          <span class="material-symbols-outlined">refresh</span>
          Retry
        </button>
      </div>
    `;
  }

  createLoadingState(): string {
    return `
      <div class="loading-container">
        <div class="loading loading-spinner loading-lg"></div>
        <div class="loading-text">
          <span class="material-symbols-outlined">map</span>
          Preparing your route...
        </div>
      </div>
    `;
  }

  destroy(): void {
    if (this.map) {
      if (this.directionsRenderer) {
        this.directionsRenderer.setMap(null);
      }
      this.map = null;
      this.directionsRenderer = null;
    }
  }

  getModeIcon(mode: string): string {
    const icons: Record<string, string> = {
      walking: 'directions_walk',
      bicycling: 'directions_bike',
      transit: 'directions_transit',
      driving: 'directions_car'
    };
    return icons[mode] || 'directions';
  }

  private getManeuverIcon(maneuver?: string): string {
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
    return icons[maneuver || ''] || 'navigation';
  }

  private formatTravelMode(mode: string): string {
    const modes: Record<string, string> = {
      'walking': 'Walking',
      'bicycling': 'Cycling',
      'transit': 'Transit',
      'driving': 'Driving'
    };
    return modes[mode] || 'Driving';
  }

  private createDetailItems(step: google.maps.DirectionsStep): string {
    const details: string[] = [];

    if (step.transit) {
      const transit = step.transit;
      details.push(`
        <div class="detail-item">
          <span class="material-symbols-outlined">directions_transit</span>
          Take ${transit.line?.name || 'transit'} from ${transit.departure_stop?.name || 'stop'}
        </div>
      `);
    }

    if (step.maneuver) {
      details.push(`
        <div class="detail-item">
          <span class="material-symbols-outlined">${this.getManeuverIcon(step.maneuver)}</span>
          ${this.formatManeuver(step.maneuver)}
        </div>
      `);
    }

    return details.join('');
  }

  private formatManeuver(maneuver: string): string {
    return maneuver
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private updateStepMarker(map: google.maps.Map | null, step: google.maps.DirectionsStep): void {
    if (!map) return;

    if (this.currentStepMarker) {
      this.currentStepMarker.setMap(null);
    }

    this.currentStepMarker = new google.maps.Marker({
      position: step.start_location,
      map: map,
      animation: google.maps.Animation.DROP,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#570DF8',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2
      }
    });
  }
} 
import { BaseWidget, BaseWidgetData } from '../base/base-widget';
import './nearby-places-widget.scss';

export interface Place {
  name: string;
  address: string;
  rating?: number;
  userRatings?: number;
  priceLevel?: number;
  photos?: string[];
  businessStatus: string;
  types?: string[];
  latitude: number;
  longitude: number;
}

export interface NearbyPlacesData extends BaseWidgetData {
  places?: Place[];
  error?: string;
}

export class NearbyPlacesWidget extends BaseWidget<NearbyPlacesData> {
  protected data: NearbyPlacesData;

  constructor(data?: NearbyPlacesData) {
    super('Nearby Places');
    this.data = {
      title: 'Nearby Places',
      places: [],
      ...data
    };
  }

  async render(data: NearbyPlacesData = this.data): Promise<string> {
    if (!data || data.error) {
      return this.createErrorState(data?.error || 'No data available');
    }

    if (!data.places || data.places.length === 0) {
      return this.renderEmptyState();
    }

    return `
      <div class="nearby-places-widget space-y-6 p-4">
        <!-- Map View -->
        <div class="card bg-base-200 shadow-lg">
          <div class="card-body p-4">
            <div id="map-${this.getMapId()}" class="w-full h-[300px] rounded-lg"></div>
          </div>
        </div>

        <!-- Places List -->
        <div class="grid grid-cols-1 gap-4">
          ${data.places.map((place, index) => this.renderPlaceCard(place, index)).join('')}
        </div>

        ${this.renderMapScript(data.places)}
      </div>
    `;
  }

  private getMapId(): string {
    return `map-${Math.random().toString(36).substr(2, 9)}`;
  }

  private renderPlaceCard(place: Place, index: number): string {
    const { name, address, rating, userRatings, priceLevel, photos, businessStatus, types } = place;
    const mainPhotoUrl = photos && photos.length > 0 ? photos[0] : null;
    
    return `
      <div class="place-card card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300">
        <div class="card-body p-4">
          <div class="flex items-start gap-4">
            ${mainPhotoUrl ? `
              <img src="${mainPhotoUrl}" 
                   class="place-photo w-32 h-32 object-cover rounded-lg flex-shrink-0" 
                   alt="${name}"
                   onerror="this.onerror=null; this.src='https://via.placeholder.com/400x300?text=No+Image';">
            ` : `
              <div class="place-photo w-32 h-32 rounded-lg bg-base-200 flex items-center justify-center flex-shrink-0">
                <span class="material-symbols-outlined text-4xl text-base-content/30">
                  image_not_supported
                </span>
              </div>
            `}
            
            <div class="place-details flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2">
                <h3 class="place-name text-lg font-semibold">${name}</h3>
                ${this.renderBusinessStatus(businessStatus)}
              </div>
              
              <p class="place-address text-sm text-base-content/70 mt-1">
                <span class="material-symbols-outlined text-sm align-middle">location_on</span>
                ${address}
              </p>
              ${this.renderRatingAndPrice(rating, userRatings, priceLevel)}
              <div class="place-types">
                ${types?.map(type => `<span class="place-type">${this.formatPlaceType(type)}</span>`).join('') || ''}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderMapScript(places: Place[]): string {
    const mapId = this.getMapId();
    return `
      <script>
        function initMap() {
          const map = new google.maps.Map(document.getElementById('${mapId}'), {
            center: { lat: ${places[0]?.latitude || 0}, lng: ${places[0]?.longitude || 0} },
            zoom: 14,
            disableDefaultUI: true,
            mapTypeControl: false,
            streetViewControl: false,
          });

          ${places.map(place => `
            new google.maps.Marker({
              position: { lat: ${place.latitude}, lng: ${place.longitude} },
              map: map,
              title: '${place.name}'
            });
          `).join('')}
        }
        
        if (window.google && window.google.maps) {
          initMap();
        } else {
          window.initMap = initMap;
        }
      </script>
    `;
  }

  private renderBusinessStatus(status: string): string {
    const statusConfig: Record<string, { class: string; text: string }> = {
      'OPERATIONAL': { class: 'badge-success', text: 'Open' },
      'CLOSED_TEMPORARILY': { class: 'badge-warning', text: 'Temporary Closed' },
      'CLOSED_PERMANENTLY': { class: 'badge-error', text: 'Permanently Closed' }
    };

    const config = statusConfig[status] || { class: 'badge-ghost', text: status };
    return `<div class="badge ${config.class} badge-sm">${config.text}</div>`;
  }

  private renderRatingAndPrice(rating?: number, userRatings?: number, priceLevel?: number): string {
    if (!rating && !priceLevel) return '';

    return `
      <div class="flex items-center gap-3 mt-2">
        ${rating ? `
          <div class="flex items-center gap-1">
            <div class="rating rating-sm">
              ${this.generateRatingStars(rating)}
            </div>
            <span class="text-sm font-medium">${rating.toFixed(1)}</span>
            ${userRatings ? `
              <span class="text-xs text-base-content/60">(${this.formatNumber(userRatings)})</span>
            ` : ''}
          </div>
        ` : ''}
        ${priceLevel ? `
          <div class="text-sm font-medium text-base-content/70">
            ${this.generatePriceLevel(priceLevel)}
          </div>
        ` : ''}
      </div>
    `;
  }

  private formatNumber(num: number): string {
    return new Intl.NumberFormat().format(num);
  }

  private generateRatingStars(rating: number): string {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    return `
      ${Array(fullStars).fill('<span class="text-warning">★</span>').join('')}
      ${hasHalfStar ? '<span class="text-warning">★</span>' : ''}
      ${Array(emptyStars).fill('<span class="text-base-content/20">★</span>').join('')}
    `;
  }

  private generatePriceLevel(level: number): string {
    return Array(level).fill('$').join('');
  }

  private formatPlaceType(type: string): string {
    return type.toLowerCase()
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  protected renderEmptyState(): string {
    return `
      <div class="hero min-h-[300px] bg-base-200/50 rounded-box backdrop-blur-sm">
        <div class="hero-content text-center">
          <div class="max-w-md">
            <div class="avatar placeholder mb-8 animate-float">
              <div class="w-24 h-24 rounded-full bg-base-300 ring-2 ring-base-content/10">
                <span class="material-symbols-outlined text-5xl text-base-content/50">
                  location_off
                </span>
              </div>
            </div>
            <h2 class="text-2xl font-bold mb-4">No Results Found</h2>
            <p class="text-base-content/70">
              No relevant results were found
            </p>
          </div>
        </div>
      </div>
    `;
  }
} 
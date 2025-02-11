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
  private mapInitialized = false;
  private readonly mapId: string;

  constructor(data?: NearbyPlacesData) {
    super('Nearby Places');
    this.data = {
      title: 'Nearby Places',
      places: [],
      ...data
    };
    this.mapId = `map-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async render(data: NearbyPlacesData = this.data): Promise<string> {
    if (!data || data.error) {
      return this.createErrorState(data?.error || 'No data available');
    }

    if (!data.places || data.places.length === 0) {
      return this.renderEmptyState();
    }

    setTimeout(() => this.initializeMap(), 0);

    return `
      <div class="nearby-places-widget">
        <div class="nearby-places-main">
          <div class="search-section">
            <div class="search-container">
              <span class="material-symbols-outlined search-icon">search</span>
              <input type="text" placeholder="Search nearby places..." />
            </div>
            <div class="filters">
              ${this.renderFilters()}
            </div>
          </div>

          <div class="map-section">
            <div id="${this.mapId}" class="map-container"></div>
          </div>

          <div class="places-grid">
            ${data.places.map(place => this.renderPlaceCard(place)).join('')}
          </div>

          <div class="places-stats">
            ${this.renderStats()}
          </div>
        </div>
      </div>
    `;
  }

  private renderFilters(): string {
    const filters = ['Restaurant', 'Cafe', 'Shopping', 'Entertainment', 'Services'];
    return `
      <div class="filter-tags">
        ${filters.map(filter => `
          <button class="filter-tag">
            <span class="material-symbols-outlined">${this.getFilterIcon(filter)}</span>
            ${filter}
          </button>
        `).join('')}
      </div>
    `;
  }

  private calculateAverageRating(): number {
    const places = this.data.places || [];
    const ratings = places
      .map(p => p.rating)
      .filter((r): r is number => r !== undefined && !isNaN(r));
    
    if (ratings.length === 0) return 0;
    
    const sum = ratings.reduce((acc, curr) => acc + curr, 0);
    return sum / ratings.length;
  }

  private renderStats(): string {
    const totalPlaces = this.data.places?.length || 0;
    const avgRating = this.calculateAverageRating();
    const openNow = this.data.places?.filter(p => p.businessStatus === 'OPERATIONAL').length || 0;
    
    return `
      <div class="stat-item">
        <div class="stat-icon">
          <span class="material-symbols-outlined">place</span>
          Total Places
        </div>
        <div class="stat-value">${totalPlaces}</div>
        <div class="stat-label">Found Nearby</div>
      </div>
      
      <div class="stat-item">
        <div class="stat-icon">
          <span class="material-symbols-outlined">star</span>
          Average Rating
        </div>
        <div class="stat-value">${avgRating.toFixed(1)}</div>
        <div class="stat-label">Out of 5.0</div>
      </div>

      <div class="stat-item">
        <div class="stat-icon">
          <span class="material-symbols-outlined">storefront</span>
          Open Now
        </div>
        <div class="stat-value">${openNow}</div>
        <div class="stat-label">Places</div>
      </div>
    `;
  }

  private getFilterIcon(filter: string): string {
    const icons: Record<string, string> = {
      'Restaurant': 'restaurant',
      'Cafe': 'coffee',
      'Shopping': 'shopping_bag',
      'Entertainment': 'movie',
      'Services': 'miscellaneous_services'
    };
    return icons[filter] || 'place';
  }

  private initializeMap(): void {
    if (this.mapInitialized || !window.google?.maps) return;

    const mapElement = document.getElementById(this.mapId);
    if (!mapElement) return;

    // Add retro styling
    const retroStyle = [
      { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
      { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
      { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
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
    ];

    const map = new google.maps.Map(mapElement, {
      center: { lat: this.data.places?.[0]?.latitude || 0, lng: this.data.places?.[0]?.longitude || 0 },
      zoom: 14,
      disableDefaultUI: true,
      mapTypeControl: false,
      streetViewControl: false,
      styles: retroStyle,
    });

    // Add custom styled markers for each place
    this.data.places?.forEach(place => {
      if (place.latitude && place.longitude) {
        const marker = new google.maps.Marker({
          position: { lat: place.latitude, lng: place.longitude },
          map: map,
          title: place.name,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#00f3ff', // retro blue
            fillOpacity: 0.8,
            strokeColor: '#00f3ff',
            strokeWeight: 2,
          }
        });

        // Add click listener to marker
        marker.addListener('click', () => {
          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div style="color: #000; padding: 8px;">
                <h3 style="margin: 0 0 4px;">${place.name}</h3>
                <p style="margin: 0;">${place.address}</p>
              </div>
            `
          });
          infoWindow.open(map, marker);
        });
      }
    });

    this.mapInitialized = true;
  }

  private renderPlaceCard(place: Place): string {
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

  destroy(): void {
    this.mapInitialized = false;
  }
} 
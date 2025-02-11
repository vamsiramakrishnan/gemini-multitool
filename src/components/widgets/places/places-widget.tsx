import { BaseWidget, BaseWidgetData } from '../base/base-widget';
import './places-widget.scss';

export interface Place {
  name: string;
  address: string;
  rating?: number;
  userRatings?: number;
  priceLevel?: number;
  photos?: string[];
  businessStatus: string;
  types?: string[];
  latitude?: number;
  longitude?: number;
}

export interface PlacesData extends BaseWidgetData {
  places: Array<{
    id: string;
    name: string;
    address: string;
    location: {
      latitude: number;
      longitude: number;
    };
    rating?: number;
    userRatings?: number;
    priceLevel?: number;
    photos?: string[];
    businessStatus: string;
    types?: string[];
    icon?: string;
  }>;
  query?: string;
  nextPageToken?: string;
}

interface PlaceFeature {
  icon: string;
  label: string;
}

export class PlacesWidget extends BaseWidget<PlacesData> {
  private mapInitialized = false;
  private readonly mapId: string;

  constructor(data?: PlacesData) {
    super('Places Search');
    this.data = {
      title: 'Places Search',
      places: [],
      ...data
    };
    this.mapId = `map-${Math.random().toString(36).substr(2, 9)}`;
  }

  async render(data: PlacesData = this.data): Promise<string> {
    this.data = { ...this.data, ...data };
    
    if (!this.data || this.data.error) {
      return this.createErrorState(this.data?.error || 'No data available');
    }

    if (!this.data.places || this.data.places.length === 0) {
      return this.renderEmptyState();
    }

    setTimeout(() => this.initializeMap(), 0);

    return `
      <div class="places-widget">
        <div class="places-main">
          <div class="search-section">
            <div class="search-container">
              <span class="material-symbols-outlined search-icon">search</span>
              <input type="text" placeholder="Explore nearby places..." />
            </div>
            <div class="filters">
              ${this.renderFilters()}
            </div>
          </div>

          <div class="map-section">
            <div id="${this.mapId}" class="map-container"></div>
            <div class="map-controls">
              <button class="control-button" title="Zoom in">
                <span class="material-symbols-outlined">add</span>
              </button>
              <button class="control-button" title="Zoom out">
                <span class="material-symbols-outlined">remove</span>
              </button>
              <button class="control-button" title="Center map">
                <span class="material-symbols-outlined">center_focus_strong</span>
              </button>
            </div>
          </div>

          <div class="places-grid">
            ${this.data.places.map(place => this.renderPlaceCard(place)).join('')}
          </div>

          <div class="places-stats">
            ${this.renderStats()}
          </div>
        </div>
      </div>
    `;
  }

  private renderStats(): string {
    const totalPlaces = this.data.places?.length || 0;
    const avgRating = this.calculateAverageRating();
    
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
    `;
  }

  private calculateAverageRating(): number {
    const places = this.data.places || [];
    const ratings = places.map(p => p.rating).filter(r => r !== undefined) as number[];
    return ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
  }

  private initializeMap(): void {
    if (this.mapInitialized || !window.google?.maps) return;

    const mapElement = document.getElementById(this.mapId);
    if (!mapElement) return;

    const map = new google.maps.Map(mapElement, {
      center: { lat: this.data.places?.[0]?.location.latitude || 0, lng: this.data.places?.[0]?.location.longitude || 0 },
      zoom: 14,
      disableDefaultUI: true,
      mapTypeControl: false,
      streetViewControl: false,
    });

    this.data.places?.forEach(place => {
      if (place.location.latitude && place.location.longitude) {
        new google.maps.Marker({
          position: { lat: place.location.latitude, lng: place.location.longitude },
          map: map,
          title: place.name
        });
      }
    });

    this.mapInitialized = true;
  }

  private renderError(error: string): string {
    return this.createErrorState(error);
  }

  private renderPlaceCard(place: PlacesData['places'][0]): string {
    const { name, address, rating, userRatings, photos, businessStatus, types } = place;
    const mainPhotoUrl = photos?.[0];
    const isOpen = businessStatus === 'OPERATIONAL';
    
    return `
      <div class="place-card">
        <div class="place-photo">
          ${mainPhotoUrl ? `
            <img src="${mainPhotoUrl}" alt="${name}" loading="lazy" />
          ` : `
            <div class="placeholder-image">
              <span class="material-symbols-outlined">image_not_supported</span>
            </div>
          `}
          ${rating ? `
            <div class="rating-badge">
              <span class="material-symbols-outlined">star</span>
              ${rating.toFixed(1)}
              ${userRatings ? `<span class="user-ratings">(${this.formatNumber(userRatings)})</span>` : ''}
            </div>
          ` : ''}
          <div class="status-badge ${isOpen ? 'open' : 'closed'}">
            <span class="material-symbols-outlined">${isOpen ? 'check_circle' : 'schedule'}</span>
            ${isOpen ? 'Open Now' : 'Closed'}
          </div>
        </div>
        
        <div class="place-details">
          <div class="place-header">
            <h3 class="place-name">${name}</h3>
            <div class="place-type">
              ${this.getPlaceTypeIcon(types?.[0] || 'place')}
            </div>
          </div>
          
          <div class="place-info">
            <div class="place-address">
              <span class="material-symbols-outlined">location_on</span>
              ${address}
            </div>
            
            <div class="place-categories">
              ${types?.slice(0, 3).map(type => `
                <span class="category-tag">
                  ${this.formatPlaceType(type)}
                </span>
              `).join('') || ''}
            </div>
          </div>

          <div class="place-actions">
            <button class="action-button directions">
              <span class="material-symbols-outlined">directions</span>
              Directions
            </button>
            <button class="action-button details">
              <span class="material-symbols-outlined">info</span>
              Details
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private getPlaceTypeIcon(type: string): string {
    const iconMap: Record<string, string> = {
      'restaurant': 'restaurant',
      'cafe': 'coffee',
      'bar': 'local_bar',
      'store': 'store',
      'hotel': 'hotel',
      'museum': 'museum',
      'park': 'park',
      'gym': 'fitness_center',
      'school': 'school',
      'hospital': 'local_hospital',
      'default': 'place'
    };

    const icon = iconMap[type.toLowerCase()] || iconMap.default;
    return `<span class="material-symbols-outlined">${icon}</span>`;
  }

  private formatNumber(num: number): string {
    return new Intl.NumberFormat('en-US', { 
      notation: 'compact',
      compactDisplay: 'short' 
    }).format(num);
  }

  private formatPlaceType(type: string): string {
    return type.toLowerCase()
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private getPlaceFeatures(place: Place): PlaceFeature[] {
    const features: PlaceFeature[] = [];
    
    if (place.types) {
      const typeToFeature: Record<string, PlaceFeature> = {
        restaurant: { icon: 'restaurant', label: 'Restaurant' },
        cafe: { icon: 'coffee', label: 'Café' },
        bar: { icon: 'local_bar', label: 'Bar' },
        lodging: { icon: 'hotel', label: 'Hotel' },
        shopping_mall: { icon: 'shopping_bag', label: 'Shopping' }
      };

      place.types.forEach(type => {
        const feature = typeToFeature[type];
        if (feature) {
          features.push(feature);
        }
      });
    }

    return features;
  }

  protected renderEmptyState(): string {
    return `
      <div class="places-empty">
        <span class="material-symbols-outlined">location_off</span>
        <h3>No Results Found</h3>
        <p>No relevant results were found</p>
      </div>
    `;
  }

  destroy(): void {
    this.mapInitialized = false;
  }

  private renderFilters(): string {
    const filters = [
      { icon: 'restaurant', label: 'Restaurants' },
      { icon: 'coffee', label: 'Cafes' },
      { icon: 'shopping_bag', label: 'Shopping' },
      { icon: 'local_bar', label: 'Bars' },
      { icon: 'hotel', label: 'Hotels' },
      { icon: 'attractions', label: 'Attractions' }
    ];

    return `
      <div class="filter-tags">
        ${filters.map(filter => `
          <button class="filter-tag">
            <span class="material-symbols-outlined">${filter.icon}</span>
            ${filter.label}
          </button>
        `).join('')}
      </div>
    `;
  }
}
import { BaseWidget, BaseWidgetData } from '../base/base-widget';
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
  icon?: string;
}

export interface PlacesData extends BaseWidgetData {
  places: Place[];
  query?: string;
  nextPageToken?: string;
  error?: string;
  isLoading?: boolean;
}

export class PlacesWidget extends BaseWidget<PlacesData> {
  private mapInitialized = false;
  private readonly mapId: string;

  constructor(data?: PlacesData) {
    super('Places');
    this.data = {
      title: 'Places',
      places: [],
      ...data
    };
    this.mapId = `map-${Math.random().toString(36).substr(2, 9)}`;
  }

  async render(data: PlacesData = this.data): Promise<string> {
    // Update internal data
    this.data = { ...this.data, ...data };
    
    // Reset map state when new data arrives
    this.mapInitialized = false;
    
    if (this.data.isLoading) {
      return this.renderLoadingState();
    }

    if (this.data.error) {
      return this.createErrorState(this.data.error);
    }

    if (!this.data.places || this.data.places.length === 0) {
      return this.renderEmptyState();
    }

    setTimeout(() => this.initializeMap(), 100);

    return `
      <div class="places-widget">
        <div class="search-section">
          <div class="search-container">
            <span class="material-symbols-outlined search-icon">search</span>
            <input type="text" placeholder="Search places..." value="${this.data.query || ''}" />
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

    // Center map on the first place
    const firstPlace = this.data.places[0];
    const center = firstPlace.location 
      ? { lat: firstPlace.location.latitude, lng: firstPlace.location.longitude }
      : { lat: 0, lng: 0 };

    // Map styling
    const mapOptions = {
      center,
      zoom: 14,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      fullscreenControl: false,
      streetViewControl: false,
      mapTypeControl: false,
      zoomControl: false,
      styles: [
        {
          featureType: 'all',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#746855' }]
        },
        {
          featureType: 'all',
          elementType: 'labels.text.stroke',
          stylers: [{ color: '#242f3e' }, { lightness: -80 }]
        },
        {
          featureType: 'administrative.locality',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#d59563' }]
        },
        {
          featureType: 'poi',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#d59563' }]
        },
        {
          featureType: 'poi.park',
          elementType: 'geometry',
          stylers: [{ color: '#263c3f' }]
        },
        {
          featureType: 'poi.park',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#6b9a76' }]
        },
        {
          featureType: 'road',
          elementType: 'geometry.fill',
          stylers: [{ color: '#2b3544' }]
        },
        {
          featureType: 'road',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#9ca5b3' }]
        },
        {
          featureType: 'road.arterial',
          elementType: 'geometry.fill',
          stylers: [{ color: '#38414e' }]
        },
        {
          featureType: 'road.highway',
          elementType: 'geometry.fill',
          stylers: [{ color: '#746855' }]
        },
        {
          featureType: 'road.highway',
          elementType: 'geometry.stroke',
          stylers: [{ color: '#1f2835' }]
        },
        {
          featureType: 'road.highway',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#f3d19c' }]
        },
        {
          featureType: 'water',
          elementType: 'geometry',
          stylers: [{ color: '#17263c' }]
        },
        {
          featureType: 'water',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#515c6d' }]
        },
        {
          featureType: 'water',
          elementType: 'labels.text.stroke',
          stylers: [{ lightness: -20 }]
        }
      ]
    };

    const map = new google.maps.Map(mapElement, mapOptions);

    // Add markers for all places
    this.data.places.forEach(place => {
      if (!place.location) return;
      
      const marker = new google.maps.Marker({
        position: { lat: place.location.latitude, lng: place.location.longitude },
        map,
        title: place.name,
        animation: google.maps.Animation.DROP,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#4285F4',
          fillOpacity: 0.8,
          strokeWeight: 2,
          strokeColor: '#ffffff'
        }
      });
      
      // Add click listener for marker
      marker.addListener('click', () => {
        // Find the card element and scroll to it
        const card = document.querySelector(`[data-place-id="${place.id}"]`);
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          card.classList.add('highlight');
          setTimeout(() => card.classList.remove('highlight'), 1500);
        }
      });
    });

    this.mapInitialized = true;

    // Add event listeners to control buttons
    document.querySelectorAll('.map-controls .control-button').forEach(button => {
      button.addEventListener('click', event => {
        const target = event.currentTarget as HTMLElement;
        const action = target.getAttribute('title');
        
        if (action === 'Zoom in') {
          map.setZoom(map.getZoom() + 1);
        } else if (action === 'Zoom out') {
          map.setZoom(map.getZoom() - 1);
        } else if (action === 'Center map') {
          map.setCenter(center);
          map.setZoom(14);
        }
      });
    });
  }

  private renderPlaceCard(place: Place): string {
    const {
      id,
      name,
      address,
      rating = 0,
      userRatings = 0,
      photos = [],
      businessStatus,
      types = []
    } = place;
    
    const isOpen = businessStatus?.toLowerCase() === 'operational';
    const mainPhotoUrl = photos.length > 0 ? photos[0] : '';

    return `
      <div class="place-card" data-place-id="${id}">
        <div class="place-photo">
          ${mainPhotoUrl ? `
            <img src="${mainPhotoUrl}" alt="${name}" loading="lazy" />
          ` : `
            <div class="placeholder-image">
              <span class="material-symbols-outlined">image_not_supported</span>
            </div>
          `}
          ${rating > 0 ? `
            <div class="rating-badge">
              <span class="material-symbols-outlined">star</span>
              ${rating.toFixed(1)}
              ${userRatings > 0 ? `<span class="user-ratings">(${this.formatNumber(userRatings)})</span>` : ''}
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
              ${this.getPlaceTypeIcon(types[0] || 'place')}
            </div>
          </div>
          
          <div class="place-info">
            <div class="place-address">
              <span class="material-symbols-outlined">location_on</span>
              ${address}
            </div>
            
            <div class="place-categories">
              ${types.slice(0, 3).map(type => `
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
        ${filters.map((filter, index) => `
          <button class="filter-tag ${index === 0 ? 'active' : ''}">
            <span class="material-symbols-outlined">${filter.icon}</span>
            ${filter.label}
          </button>
        `).join('')}
      </div>
    `;
  }

  private renderLoadingState(): string {
    return `
      <div class="places-widget loading">
        <div class="search-section">
          <div class="skeleton search"></div>
          <div class="filters">
            <div class="skeleton filter"></div>
            <div class="skeleton filter"></div>
            <div class="skeleton filter"></div>
          </div>
        </div>
        
        <div class="skeleton map"></div>
        
        <div class="places-grid">
          <div class="skeleton card"></div>
          <div class="skeleton card"></div>
        </div>
      </div>
    `;
  }

  private renderEmptyState(): string {
    return `
      <div class="places-widget">
        <div class="search-section">
          <div class="search-container">
            <span class="material-symbols-outlined search-icon">search</span>
            <input type="text" placeholder="Search places..." value="${this.data.query || ''}" />
          </div>
          <div class="filters">
            ${this.renderFilters()}
          </div>
        </div>
        
        <div class="places-empty">
          <span class="material-symbols-outlined">location_off</span>
          <h3>No Places Found</h3>
          <p>Try adjusting your search or filters to find places nearby.</p>
        </div>
      </div>
    `;
  }

  private createErrorState(message: string): string {
    return `
      <div class="places-widget error">
        <div class="error-icon">
          <span class="material-symbols-outlined">error_outline</span>
        </div>
        <div class="error-message">${message || 'Unable to load places data'}</div>
      </div>
    `;
  }

  destroy(): void {
    this.mapInitialized = false;
  }
}
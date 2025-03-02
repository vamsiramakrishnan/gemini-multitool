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
  isLoading?: boolean;
  query?: string;
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
      <div class="nearby-places-widget">
        <div class="search-section">
          <div class="search-container">
            <span class="material-symbols-outlined search-icon">search</span>
            <input type="text" placeholder="Find nearby places..." value="${this.data.query || ''}" />
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
        <div class="stat-label">Locations Found</div>
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
          <span class="material-symbols-outlined">category</span>
          Categories
        </div>
        <div class="stat-value">${this.getUniqueCategories().length}</div>
        <div class="stat-label">Different Types</div>
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

  private getUniqueCategories(): string[] {
    const places = this.data.places || [];
    const allTypes = places.flatMap(p => p.types || []);
    return [...new Set(allTypes)];
  }

  private renderPlaceCard(place: Place): string {
    const { name, address, rating, userRatings, priceLevel, photos, businessStatus, types } = place;
    const mainPhotoUrl = photos && photos.length > 0 ? photos[0] : '';
    const isOpen = businessStatus === 'OPERATIONAL';
    
    return `
      <div class="place-card">
        <div class="place-photo">
          ${mainPhotoUrl ? 
            `<img src="${mainPhotoUrl}" alt="${name}" onerror="this.src='https://via.placeholder.com/500x300?text=No+Image'">` : 
            `<div class="no-photo"><span class="material-symbols-outlined">image_not_supported</span></div>`
          }
          ${rating ? `
            <div class="rating-badge">
              <span class="material-symbols-outlined">star</span>
              ${rating.toFixed(1)}
            </div>` : ''
          }
          <div class="business-status ${isOpen ? 'open' : 'closed'}">
            <span class="material-symbols-outlined">${isOpen ? 'check_circle' : 'cancel'}</span>
            ${isOpen ? 'Open' : 'Closed'}
          </div>
        </div>
        
        <div class="place-details">
          <h3 class="place-name">${name}</h3>
          <div class="place-address">
            <span class="material-symbols-outlined">location_on</span>
            ${address}
          </div>
          
          ${priceLevel ? `
            <div class="place-price">
              <span class="material-symbols-outlined">payments</span>
              <span class="price-level">${'$'.repeat(priceLevel)}</span>
            </div>` : ''
          }
          
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
    `;
  }

  private getFilterIcon(filter: string): string {
    const iconMap: Record<string, string> = {
      'Restaurant': 'restaurant',
      'Cafe': 'coffee',
      'Shopping': 'shopping_bag',
      'Entertainment': 'local_activity',
      'Services': 'miscellaneous_services',
      'default': 'place'
    };

    return iconMap[filter] || iconMap.default;
  }

  private formatPlaceType(type: string): string {
    return type.toLowerCase()
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private initializeMap(): void {
    if (this.mapInitialized) return;
    
    const mapElement = document.getElementById(this.mapId);
    if (!mapElement || !window.google || !window.google.maps) return;
    
    // Get center coordinates from first place or default to a fallback
    const firstPlace = this.data.places?.[0];
    const center = firstPlace ? 
      { lat: firstPlace.latitude, lng: firstPlace.longitude } : 
      { lat: -37.8136, lng: 144.9631 }; // Default to Melbourne CBD
    
    // Enhanced map styling for dark theme
    const mapOptions: google.maps.MapOptions = {
      center,
      zoom: 14,
      disableDefaultUI: true,
      zoomControl: false,
      fullscreenControl: false,
      styles: [
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
      ]
    };
    
    const map = new google.maps.Map(mapElement, mapOptions);
    
    // Create map attribution
    const attribution = document.createElement('div');
    attribution.className = 'map-attribution';
    attribution.innerHTML = 'Map data ©2025 Google';
    mapElement.appendChild(attribution);
    
    // Add enhanced markers for each place
    const markers: google.maps.Marker[] = [];
    const infoWindows: google.maps.InfoWindow[] = [];
    
    this.data.places?.forEach((place, index) => {
      if (place.latitude && place.longitude) {
        const position = { lat: place.latitude, lng: place.longitude };
        
        // Get place type color
        const placeColor = this.getMarkerColorForPlaceType(place.types?.[0] || '');
        
        // Create custom icon with dynamic color
        const icon = {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: placeColor,
          fillOpacity: 0.9,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: 10,
        };
        
        const marker = new google.maps.Marker({
          position,
          map,
          title: place.name,
          animation: google.maps.Animation.DROP,
          icon,
          optimized: false, // Helps with marker animations
          zIndex: 1000 - index // Higher z-index for earlier places
        });
        
        markers.push(marker);
        
        // Create improved info window
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div class="place-info-window">
              <h4>${place.name}</h4>
              <p>${place.address}</p>
              ${place.rating ? `<p>Rating: ${place.rating} ★</p>` : ''}
            </div>
          `,
          maxWidth: 240,
          pixelOffset: new google.maps.Size(0, -10)
        });
        
        infoWindows.push(infoWindow);
        
        // Add marker click event
        marker.addListener('click', () => {
          // Close all other info windows
          infoWindows.forEach(iw => iw.close());
          
          // Open this info window
          infoWindow.open(map, marker);
          
          // Add bounce animation
          marker.setAnimation(google.maps.Animation.BOUNCE);
          setTimeout(() => marker.setAnimation(null), 750);
          
          // Center map on this marker
          map.panTo(position);
        });
      }
    });
    
    // Add map control event listeners
    const mapControls = mapElement.parentElement?.querySelector('.map-controls');
    if (mapControls) {
      const buttons = mapControls.querySelectorAll('.control-button');
      buttons.forEach(button => {
        button.addEventListener('click', (e) => {
          const target = e.currentTarget as HTMLElement;
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
    
    this.mapInitialized = true;
  }

  private getMarkerColorForPlaceType(type: string): string {
    const typeColors: Record<string, string> = {
      restaurant: '#FF5722',
      cafe: '#795548',
      bar: '#9C27B0',
      lodging: '#2196F3',
      shopping_mall: '#4CAF50',
      store: '#8BC34A',
      movie_theater: '#673AB7',
      museum: '#FFC107',
      parking: '#607D8B',
      subway_station: '#3F51B5',
      transit_station: '#03A9F4',
      default: '#E91E63'
    };
    
    // Find matching type or use default
    for (const key of Object.keys(typeColors)) {
      if (type.toLowerCase().includes(key)) {
        return typeColors[key];
      }
    }
    
    return typeColors.default;
  }

  private renderLoadingState(): string {
    return `
      <div class="nearby-places-widget loading">
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
      <div class="nearby-places-widget">
        <div class="search-section">
          <div class="search-container">
            <span class="material-symbols-outlined search-icon">search</span>
            <input type="text" placeholder="Find nearby places..." value="${this.data.query || ''}" />
          </div>
          <div class="filters">
            ${this.renderFilters()}
          </div>
        </div>
        
        <div class="places-empty">
          <span class="material-symbols-outlined">location_off</span>
          <h3>No Nearby Places Found</h3>
          <p>We couldn't find any places nearby. Try changing your location or filters.</p>
        </div>
      </div>
    `;
  }

  private createErrorState(message: string): string {
    return `
      <div class="nearby-places-widget error">
        <div class="error-icon">
          <span class="material-symbols-outlined">error_outline</span>
        </div>
        <div class="error-message">${message || 'Unable to load nearby places'}</div>
      </div>
    `;
  }

  destroy(): void {
    this.mapInitialized = false;
  }
} 
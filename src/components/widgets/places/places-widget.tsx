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
}

export interface PlacesData extends BaseWidgetData {
  places?: Place[];
  error?: string;
}

interface PlaceFeature {
  icon: string;
  label: string;
}

export class PlacesWidget extends BaseWidget<PlacesData> {
  protected data: PlacesData;

  constructor(data?: PlacesData) {
    super('Places');
    this.data = {
      title: 'Places',
      places: [],
      ...data
    };
  }

  async render(data: PlacesData): Promise<string> {
    if (!data || data.error) {
      return this.createErrorState(data?.error || 'No data available');
    }

    if (!data.places || data.places.length === 0) {
      return this.renderEmptyState();
    }

    return `
      <div class="places-widget container mx-auto p-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          ${data.places.map(place => this.renderPlaceCard(place)).join('')}
        </div>
      </div>
    `;
  }

  private renderError(error: string): string {
    return this.createErrorState(error);
  }

  private renderPlaceCard(place: Place): string {
    const { name, address, rating, userRatings, priceLevel, photos, businessStatus, types } = place;
    const mainPhotoUrl = photos && photos.length > 0 ? photos[0] : null;
    
    return `
      <div class="place-card card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300">
        <div class="card-body p-4">
          ${mainPhotoUrl ? `
            <img src="${mainPhotoUrl}" 
                 class="place-photo w-full h-48 object-cover rounded-lg" 
                 alt="${name}"
                 onerror="this.onerror=null; this.src='https://via.placeholder.com/400x300?text=No+Image';">
          ` : `
            <div class="place-photo w-full h-48 rounded-lg bg-base-200 flex items-center justify-center">
              <span class="material-symbols-outlined text-4xl text-base-content/30">
                image_not_supported
              </span>
            </div>
          `}
          
          <div class="place-details flex-1 min-w-0">
            <h3 class="place-name text-lg font-semibold">${name}</h3>
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
    `;
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

  private renderBusinessStatus(place: Place): string {
    const statusConfig: Record<string, { class: string; icon: string; text: string }> = {
      'OPERATIONAL': { 
        class: 'badge-success', 
        icon: 'check_circle',
        text: 'Open Now'
      },
      'CLOSED_TEMPORARILY': { 
        class: 'badge-warning', 
        icon: 'warning',
        text: 'Temporary Closed'
      },
      'CLOSED_PERMANENTLY': { 
        class: 'badge-error', 
        icon: 'cancel',
        text: 'Permanently Closed'
      }
    };

    const status = statusConfig[place.businessStatus] || 
                   { class: 'badge-neutral', icon: 'info', text: place.businessStatus };

    return `
      <div class="badge ${status.class} gap-1 shadow-sm">
        <span class="material-symbols-outlined text-sm">${status.icon}</span>
        ${status.text}
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
    // Clean up any subscriptions/timers if needed
  }
}
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

  async render(data: PlacesData = this.data): Promise<string> {
    // Update internal data
    this.data = { ...this.data, ...data };
    
    if (!this.data || this.data.error) {
      return this.createErrorState(this.data?.error || 'No data available');
    }

    if (!this.data.places || this.data.places.length === 0) {
      return this.renderEmptyState();
    }

    return `
      <div class="places-widget">
        <div class="places-content">
          <div class="place-grid">
            ${this.data.places.map(place => this.renderPlaceCard(place)).join('')}
          </div>
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
      <div class="place-card">
        <div class="place-photo">
          ${mainPhotoUrl ? `
            <img src="${mainPhotoUrl}" alt="${name}" />
          ` : `
            <div class="placeholder-image">
              <span class="material-symbols-outlined">image_not_supported</span>
            </div>
          `}
          ${rating ? `<div class="rating-badge">
            <span class="material-symbols-outlined">star</span>
            ${rating.toFixed(1)}
          </div>` : ''}
        </div>
        <div class="place-details">
          <h3 class="place-name">${name}</h3>
          <p class="place-address">
            <span class="material-symbols-outlined">location_on</span>
            ${address}
          </p>
          ${this.renderRatingAndPrice(rating, userRatings, priceLevel)}
          <div class="place-categories">
            ${types?.map(type => `<span class="category-tag">${this.formatPlaceType(type)}</span>`).join('') || ''}
          </div>
        </div>
      </div>
    `;
  }

  private renderRatingAndPrice(rating?: number, userRatings?: number, priceLevel?: number): string {
    if (!rating && !priceLevel) return '';

    const ratingStars = rating ? this.generateRatingStars(rating) : '';
    const priceSymbols = priceLevel ? this.generatePriceLevel(priceLevel) : '';

    return `
      <div class="rating-and-price">
        ${ratingStars}
        ${rating && userRatings ? `<span class="user-ratings">(${this.formatNumber(userRatings)})</span>` : ''}
        ${priceSymbols}
      </div>
    `;
  }

  private generateRatingStars(rating: number): string {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    return `
      ${Array(fullStars).fill('<span class="material-symbols-outlined text-warning">star</span>').join('')}
      ${hasHalfStar ? '<span class="material-symbols-outlined text-warning">star_half</span>' : ''}
      ${Array(emptyStars).fill('<span class="material-symbols-outlined text-base-content/20">star</span>').join('')}
    `;
  }

  private generatePriceLevel(level: number): string {
    return Array(level).fill('$').join('');
  }

  private formatNumber(num: number): string {
    return new Intl.NumberFormat().format(num);
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
    // Clean up any subscriptions/timers if needed
  }
}
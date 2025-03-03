import { BaseWidget, BaseWidgetData } from '../base/base-widget';
import { executeRouteSearch } from '../../../lib/tools/search-along-route-tool';

export interface SearchAlongRouteData extends BaseWidgetData {
  query: string;
  polyline: string;
  origin?: string;
  places?: Array<{
    name: string;
    address: string;
    rating?: number;
    userRatings?: number;
    priceLevel?: string;
    location?: {
      latitude: number;
      longitude: number;
    };
    types?: string[];
  }>;
  isLoading?: boolean;
  error?: string;
}

export class SearchAlongRouteWidget extends BaseWidget<SearchAlongRouteData> {
  constructor(data?: SearchAlongRouteData) {
    super(data || {
      title: 'Search Along Route',
      query: '',
      polyline: '',
      places: [],
      isLoading: true
    });
  }

  async render(data: SearchAlongRouteData = this.data): Promise<string> {
    // Update internal data
    this.data = { ...this.data, ...data };

    if (this.data.error) {
      return this.renderError(this.data.error);
    }

    if (this.data.isLoading || !this.data.places?.length) {
      return this.renderLoading();
    }

    return this.renderResults();
  }

  private renderLoading(): string {
    return `
      <div class="search-along-route-widget">
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <p>Searching for "${this.data.query}" along your route...</p>
        </div>
      </div>
    `;
  }

  private renderError(error: string): string {
    return `
      <div class="search-along-route-widget">
        <div class="error-state">
          <div class="error-icon">
            <span class="material-symbols-outlined">error_outline</span>
          </div>
          <h3>Search Error</h3>
          <p>${error}</p>
          <button class="retry-button">Try Again</button>
        </div>
      </div>
    `;
  }

  private renderResults(): string {
    const places = this.data.places || [];
    
    return `
      <div class="search-along-route-widget">
        <div class="results-header">
          <h3>Results for "${this.data.query}" along route</h3>
          <p>${places.length} places found</p>
        </div>
        <div class="results-list">
          ${places.map(place => `
            <div class="place-item">
              <div class="place-name">${place.name}</div>
              <div class="place-address">${place.address}</div>
              ${place.rating ? `
                <div class="place-rating">
                  <span class="rating-value">${place.rating}</span>
                  <span class="rating-count">(${place.userRatings || 0} reviews)</span>
                </div>
              ` : ''}
              ${place.types?.length ? `
                <div class="place-types">
                  ${place.types.slice(0, 3).map(type => `
                    <span class="type-tag">${type.replace('_', ' ')}</span>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  async postRender(element: HTMLElement): Promise<void> {
    super.postRender(element);

    // Handle retry button
    const retryButton = element.querySelector('.retry-button');
    if (retryButton) {
      retryButton.addEventListener('click', async () => {
        try {
          this.data.isLoading = true;
          this.data.error = undefined;
          
          // Re-render with loading state
          element.innerHTML = await this.render();
          
          // Perform the search
          const result = await executeRouteSearch({
            query: this.data.query,
            polyline: this.data.polyline,
            origin: this.data.origin
          });
          
          // Update data with results
          this.data.places = result.places;
          this.data.isLoading = false;
          
          // Re-render with results
          element.innerHTML = await this.render();
        } catch (error: any) {
          this.data.error = error.message || 'Search failed';
          this.data.isLoading = false;
          element.innerHTML = await this.render();
        }
      });
    }

    // If we're in loading state and have search parameters, perform the search
    if (this.data.isLoading && this.data.query && this.data.polyline) {
      try {
        const result = await executeRouteSearch({
          query: this.data.query,
          polyline: this.data.polyline,
          origin: this.data.origin
        });
        
        this.data.places = result.places;
        this.data.isLoading = false;
        
        // Re-render with results
        element.innerHTML = await this.render();
        this.postRender(element); // Call postRender again to handle potential retry button
      } catch (error: any) {
        this.data.error = error.message || 'Search failed';
        this.data.isLoading = false;
        element.innerHTML = await this.render();
        this.postRender(element); // Call postRender again to handle potential retry button
      }
    }
  }
} 
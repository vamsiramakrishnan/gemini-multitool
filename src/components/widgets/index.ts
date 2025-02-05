export { WeatherWidget } from './WeatherWidget';
export { StockWidget } from './StockWidget';
export { MapWidget } from './MapWidget';
export { PlacesWidget } from './PlacesWidget';
export { NearbyPlacesWidget } from './NearbyPlacesWidget';
export { SearchWidget } from './SearchWidget';
export { ChatWidget } from './ChatWidget';

export const ImageWidget = {
  render: (data: any) => `
    <div class="image-widget">
      <!-- Image widget template -->
    </div>
  `
};

export const DocumentWidget = {
  render: (data: any) => `
    <div class="document-widget">
      <!-- Document widget template -->
    </div>
  `
}; 
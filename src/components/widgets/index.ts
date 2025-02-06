export { WeatherWidget } from './weather/WeatherWidget';
export { StockWidget } from './stock/StockWidget';
export { MapWidget } from './map/MapWidget';
export { PlacesWidget } from './places/PlacesWidget';
export { NearbyPlacesWidget } from './nearby-places/NearbyPlacesWidget';
export { SearchWidget } from './search/SearchWidget';
export { ChatWidget } from './chat/ChatWidget';
export { AltairWidget } from './altair/Altair';
export { CodeExecutionWidget } from './code-execution/CodeExecutionWidget';

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
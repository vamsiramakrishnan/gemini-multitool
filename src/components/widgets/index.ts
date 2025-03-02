export * from './registry';
export * from './weather/WeatherWidget';
export * from './stock/StockWidget';
export * from './map/MapWidget';
export * from './places/PlacesWidget';
export * from './search/SearchWidget';
export * from '../chat/ChatWidgetComponent';
export * from './altair/Altair';
export * from './code-execution/CodeExecutionWidget';
export * from './nearby-places/NearbyPlacesWidget';
export * from './table/TableWidget';
export * from './explainer/ExplainerWidget';

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
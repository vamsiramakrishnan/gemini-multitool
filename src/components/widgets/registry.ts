import { WeatherWidget } from './weather/weather-widget';
import { StockWidget } from './stock/stock-widget';
import { MapWidget } from './map/map-widget';
import { PlacesWidget } from './places/places-widget';
import { NearbyPlacesWidget } from './nearby-places/nearby-places-widget';
import { SearchWidgetComponent } from './search/search-widget';
import { AltairWidget } from './altair/Altair';
import { CodeExecutionWidget } from './code-execution/CodeExecutionWidget';
import { TableWidget } from './table/TableWidget';
import { ExplainerWidget, ExplainerWidgetComponent } from './explainer/ExplainerWidget';
import { WidgetType } from '../../types/widget-types';
import { SearchAlongRouteWidget } from './search-along-route/search-along-route-widget';

// Import React component versions - using the correct import syntax based on how they're exported
import { WeatherWidget as WeatherWidgetComponent } from './weather/WeatherWidget';
import { StockWidget as StockWidgetComponent } from './stock/StockWidget';
import { MapWidget as MapWidgetComponent } from './map/MapWidget';
import { PlacesWidget as PlacesWidgetComponent } from './places/PlacesWidget';
import { NearbyPlacesWidget as NearbyPlacesWidgetComponent } from './nearby-places/NearbyPlacesWidget';
import { AltairWidget as AltairWidgetComponent } from './altair/Altair';
import { CodeExecutionWidget as CodeExecutionWidgetComponent } from './code-execution/CodeExecutionWidget';
import { TableWidget as TableWidgetComponent } from './table/TableWidget';
import { SearchAlongRouteWidget as SearchAlongRouteWidgetComponent } from './search-along-route/SearchAlongRouteWidget';

export const WidgetRegistry: Record<WidgetType, React.ComponentType<any>> = {
  weather: WeatherWidgetComponent,
  stock: StockWidgetComponent,
  map: MapWidgetComponent,
  places: PlacesWidgetComponent,
  nearby_places: NearbyPlacesWidgetComponent,
  google_search: SearchWidgetComponent,
  altair: AltairWidgetComponent,
  code_execution: CodeExecutionWidgetComponent,
  table: TableWidgetComponent,
  explainer: ExplainerWidgetComponent,
  search: SearchWidgetComponent,
  search_along_route: SearchAlongRouteWidgetComponent,
};

// Add type for chart types
export type ChartType = 'line' | 'bar' | 'scatter' | 'area' | 'pie'; 
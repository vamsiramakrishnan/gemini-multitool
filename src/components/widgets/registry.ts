import { WeatherWidget } from './weather/WeatherWidget';
import { StockWidget } from './stock/StockWidget';
import { MapWidget } from './map/MapWidget';
import { PlacesWidget } from './places/PlacesWidget';
import { SearchWidget } from './search/SearchWidget';
import { ChatWidgetComponent } from './chat/ChatWidgetComponent';
import { AltairWidget } from './altair/Altair';
import { CodeExecutionWidget } from './code-execution/CodeExecutionWidget';
import { NearbyPlacesWidget } from './nearby-places/NearbyPlacesWidget';
import { TableWidget } from './table/TableWidget';

export type WidgetType = 
  | 'weather'
  | 'stock'
  | 'map'
  | 'places'
  | 'nearby_places'
  | 'google_search'
  | 'chat'
  | 'altair'
  | 'code_execution'
  | 'table';

export const WidgetRegistry: Record<WidgetType, React.ComponentType<any>> = {
  weather: WeatherWidget,
  stock: StockWidget,
  map: MapWidget,
  places: PlacesWidget,
  nearby_places: NearbyPlacesWidget,
  google_search: SearchWidget,
  chat: ChatWidgetComponent,
  altair: AltairWidget,
  code_execution: CodeExecutionWidget,
  table: TableWidget
};

// Add type for chart types
export type ChartType = 'line' | 'bar' | 'scatter' | 'area' | 'pie'; 
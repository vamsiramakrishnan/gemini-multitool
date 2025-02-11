import { WeatherWidget } from './weather/WeatherWidget';
import { StockWidget } from './stock/StockWidget';
import { MapWidget } from './map/MapWidget';
import { PlacesWidget } from './places/PlacesWidget';
import { SearchWidget } from './search/SearchWidget';
import { ChatWidgetComponent } from './chat/ChatWidgetComponent';
import { AltairWidget } from './altair/Altair';
import { CodeExecutionWidget } from './code-execution/CodeExecutionWidget';
import { NearbyPlacesWidget } from './nearby-places/NearbyPlacesWidget';

export const WidgetRegistry = {
  weather: WeatherWidget,
  stock: StockWidget,
  map: MapWidget,
  places: PlacesWidget,
  nearby_places: NearbyPlacesWidget,
  google_search: SearchWidget,
  chat: ChatWidgetComponent,
  altair: AltairWidget,
  code_execution: CodeExecutionWidget
} as const;

export type WidgetType = keyof typeof WidgetRegistry; 
import { WeatherWidget } from './weather/WeatherWidget';
import { StockWidget } from './stock/StockWidget';
import { MapWidget } from './map/MapWidget';
import { PlacesWidget } from './places/PlacesWidget';
import { SearchWidget } from './search/SearchWidget';
import { AltairWidget } from './altair/Altair';
import { CodeExecutionWidget } from './code-execution/CodeExecutionWidget';
import { NearbyPlacesWidget } from './nearby-places/NearbyPlacesWidget';
import { TableWidget } from './table/TableWidget';
import { ExplainerWidget } from './explainer/ExplainerWidget';
import { EnvatoGalleryWidget } from './envato-gallery/EnvatoGalleryWidget';
import React from 'react';

export type WidgetType = 
  | 'weather'
  | 'stock'
  | 'map'
  | 'places'
  | 'nearby_places'
  | 'google_search'
  | 'altair'
  | 'code_execution'
  | 'table'
  | 'explainer'
  | 'envato_gallery';

export const WidgetRegistry: Record<WidgetType, React.ComponentType<any>> = {
  weather: WeatherWidget,
  stock: StockWidget,
  map: MapWidget,
  places: PlacesWidget,
  nearby_places: NearbyPlacesWidget,
  google_search: SearchWidget,
  altair: AltairWidget,
  code_execution: CodeExecutionWidget,
  table: TableWidget,
  explainer: ExplainerWidget,
  envato_gallery: EnvatoGalleryWidget
};

// Add type for chart types
export type ChartType = 'line' | 'bar' | 'scatter' | 'area' | 'pie'; 
import { withWidget } from './withWidget';
import { MapWidget as MapWidgetClass } from './map-widget';
import type { MapData } from './map-widget';

export type MapWidgetProps = MapData;

export const MapWidget = withWidget<MapWidgetProps>(
  MapWidgetClass,
  'MapWidget'
); 
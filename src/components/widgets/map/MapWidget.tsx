import React from 'react';
import { withWidget } from '../withWidget';
import { MapWidget as MapWidgetClass } from './map-widget';
import type { MapData } from './map-widget';

export type MapWidgetProps = MapData;

// Create a class wrapper that instantiates the widget
class MapWidgetWrapper extends MapWidgetClass {
  constructor(props?: MapData) {
    super(props);
  }
}

export const MapWidget = withWidget<MapWidgetProps>(
  MapWidgetWrapper,
  'MapWidget'
); 
import { withWidget } from '../withWidget';
import { PlacesWidget as PlacesWidgetClass } from './places-widget';
import type { PlacesData } from './places-widget';

export interface Place {
  name: string;
  address: string;
  rating?: number;
  userRatings?: number;
  priceLevel?: number;
  photos?: string[];
  businessStatus: string;
  types?: string[];
}

export interface PlacesWidgetProps extends PlacesData {}

export const PlacesWidget = withWidget<PlacesWidgetProps>(
  PlacesWidgetClass,
  'PlacesWidget'
);

// Make sure to export the component as default as well
export default PlacesWidget; 
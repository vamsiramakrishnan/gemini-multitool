import { withWidget } from './withWidget';
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

export type PlacesWidgetProps = PlacesData;

export const PlacesWidget = withWidget<PlacesWidgetProps>(
  PlacesWidgetClass,
  'PlacesWidget'
); 
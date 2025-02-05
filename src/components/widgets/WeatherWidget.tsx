import { withWidget } from './withWidget';
import { WeatherWidget as WeatherWidgetClass } from './weather-widget';
import type { WeatherData } from './weather-widget';

export type WeatherWidgetProps = WeatherData;

export const WeatherWidget = withWidget<WeatherWidgetProps>(
  WeatherWidgetClass,
  'WeatherWidget'
); 
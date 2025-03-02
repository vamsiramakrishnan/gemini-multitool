import { withWidget } from '../withWidget';
import { WeatherWidget as WeatherWidgetClass } from './weather-widget';
import { getWeather } from '../../../lib/tools/weather-api';

// Import the WeatherData type from the API file
import type { WeatherData } from '../../../lib/tools/weather-api';

export type WeatherWidgetProps = WeatherData;

export const WeatherWidget = withWidget<WeatherWidgetProps>(
  WeatherWidgetClass,
  'WeatherWidget'
); 
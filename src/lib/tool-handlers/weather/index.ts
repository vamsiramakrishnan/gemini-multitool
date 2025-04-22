/**
 * Weather tool handler
 */

import { BaseToolHandler } from '../types';
import { getWeather } from '../../tools/weather-api';
import { WidgetManager } from '../../widget-manager';

export class WeatherHandler extends BaseToolHandler {
  constructor(widgetManager: WidgetManager, activeTabId: string = 'default') {
    super(widgetManager, activeTabId);
  }

  async handleRequest(args: any): Promise<any> {
    return this.handleWithStatus<any>(
      'get_weather',
      args,
      'weather',
      (result) => `Weather - ${result.city}`,
      () => getWeather(args.city)
    );
  }
} 
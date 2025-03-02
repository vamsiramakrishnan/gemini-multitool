import { BaseWidgetData } from '../components/widgets/base/base-widget';

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
  | 'table'
  | 'explainer';

export type ToolName =
  | 'get_weather'
  | 'get_stock_price'
  | 'get_directions'
  | 'search_places'
  | 'search_nearby'
  | 'render_altair'
  | 'render_table'
  | 'explain_topic';

export interface ToolToWidgetMapping {
  widgetType: WidgetType;
  dataTransformer?: (toolResponse: any) => BaseWidgetData;
}

export const TOOL_WIDGET_MAPPING: Record<ToolName, ToolToWidgetMapping> = {
  get_weather: { widgetType: 'weather' },
  get_stock_price: { widgetType: 'stock' },
  get_directions: { widgetType: 'map' },
  search_places: { widgetType: 'places' },
  search_nearby: { widgetType: 'nearby_places' },
  render_altair: { widgetType: 'altair' },
  render_table: { widgetType: 'table' },
  explain_topic: { widgetType: 'explainer' }
};

export type WidgetState = {
    isMinimized: boolean;
    isMaximized: boolean;
}

export type Item = {
    id: string;
    type: WidgetType;
    title: string;
};

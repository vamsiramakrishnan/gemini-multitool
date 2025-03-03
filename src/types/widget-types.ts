import { BaseWidgetData } from '../components/widgets/base/base-widget';

export enum WidgetType {
  WEATHER = 'weather',
  STOCK = 'stock',
  MAP = 'map',
  PLACES = 'places',
  NEARBY_PLACES = 'nearby_places',
  GOOGLE_SEARCH = 'google_search',
  CHAT = 'chat',
  ALTAIR = 'altair',
  CODE_EXECUTION = 'code_execution',
  TABLE = 'table',
  EXPLAINER = 'explainer',
  SEARCH = 'search',
}

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
  get_weather: { widgetType: WidgetType.WEATHER },
  get_stock_price: { widgetType: WidgetType.STOCK },
  get_directions: { widgetType: WidgetType.MAP },
  search_places: { widgetType: WidgetType.PLACES },
  search_nearby: { widgetType: WidgetType.NEARBY_PLACES },
  render_altair: { widgetType: WidgetType.ALTAIR },
  render_table: { widgetType: WidgetType.TABLE },
  explain_topic: { widgetType: WidgetType.EXPLAINER }
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

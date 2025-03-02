import { BaseWidget, BaseWidgetData } from '../components/widgets/base/base-widget';
import { WeatherWidget } from '../components/widgets/weather/weather-widget';
import { StockWidget } from '../components/widgets/stock/stock-widget';
import { MapWidget } from '../components/widgets/map/map-widget';
import { PlacesWidget } from '../components/widgets/places/places-widget';
import { NearbyPlacesWidget } from '../components/widgets/nearby-places/nearby-places-widget';
import { SearchWidget } from '../components/widgets/search/search-widget';
import { EventEmitter } from 'eventemitter3';
import { AltairWidget } from '../components/widgets/altair/altair-widget';
import { CodeExecutionWidget } from '../components/widgets/code-execution/code-execution-widget';
import { TableWidget } from '../components/widgets/table/table-widget';
import { ExplainerWidget } from '../components/widgets/explainer/explainer-widget';

export type WidgetType =
  | 'weather'
  | 'stock'
  | 'map'
  | 'places'
  | 'nearby_places'
  | 'google_search'
  | 'altair'
  | 'get_directions'
  | 'get_weather'
  | 'get_stock_price'
  | 'search_places'
  | 'search_nearby'
  | 'code_execution'
  | 'table'
  | 'explainer';

// Define a type that allows both sync and async render methods
interface WidgetBase<T extends BaseWidgetData = BaseWidgetData> extends BaseWidget<T> {
  render(data?: T): Promise<string>;
  postRender(element: HTMLElement): Promise<void>;
  destroy(): void;
}

type WidgetConstructor<T extends BaseWidgetData = BaseWidgetData> = {
  new (...args: any[]): BaseWidget<T>;
};

export interface WidgetEvent {
  id: string;
  type: string;
  data: any;
}

// Add type definition for widget entries
interface WidgetEntry {
  widget: BaseWidget<any>;
  container: HTMLElement | null;
  id: string;
  tabId: string;
  title: string;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
}

export class WidgetManager extends EventEmitter {
  private widgetRegistry: Record<WidgetType, WidgetConstructor> = {
    weather: WeatherWidget,
    stock: StockWidget,
    map: MapWidget,
    places: PlacesWidget,
    nearby_places: NearbyPlacesWidget,
    google_search: SearchWidget,
    altair: AltairWidget,
    get_directions: MapWidget,
    get_weather: WeatherWidget,
    get_stock_price: StockWidget,
    search_places: PlacesWidget,
    search_nearby: NearbyPlacesWidget,
    code_execution: CodeExecutionWidget,
    table: TableWidget,
    explainer: ExplainerWidget
  } as unknown as Record<WidgetType, WidgetConstructor>;
  
  private activeWidgets: Map<string, WidgetEntry> = new Map();
  private widgetStates: Map<string, { isMaximized: boolean; isMinimized: boolean }> = new Map();
  private defaultTabId: string = 'default';
  private currentTabId: string = 'default';
  private widgetCache: Map<string, {
    content: string;
    timestamp: number;
  }> = new Map();

  constructor() {
    super();
    this.on('newListener', (event) => {
      console.log('New listener added for event:', event);
      console.log('Current listeners:', this.listeners(event).length);
    });
  }

  setCurrentTab(tabId: string) {
    console.log('Setting current tab:', tabId);
    this.currentTabId = tabId;
  }

  getCurrentTab(): string {
    return this.currentTabId;
  }

  async createWidget<T extends BaseWidgetData>(
    type: WidgetType, 
    data: T, 
    tabId?: string
  ): Promise<string> {
    const targetTabId = tabId || this.currentTabId || this.defaultTabId;
    
    // Get widget class
    const WidgetClass = this.widgetRegistry[type];
    if (!WidgetClass) {
      throw new Error(`No widget registered for type: ${type}`);
    }

    // Create new widget instance with proper title
    const title = data.title || this.getWidgetTitle(type);
    const widget = new WidgetClass({ ...data, title });
    const id = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Pre-render content
    const content = await widget.render({ ...data, title });
    
    // Emit creation event first
    this.emit('widgetCreated', {
      id,
      type,
      data: { ...data, title },
      tabId: targetTabId,
      content
    });

    // Store widget entry with position and size
    const widgetEntry: WidgetEntry = {
      widget,
      container: null,
      id,
      tabId: targetTabId,
      title,
      position: { x: 0, y: 0 },
      size: { width: 400, height: 300 }
    };
    this.activeWidgets.set(id, widgetEntry);

    // Cache content for later use
    this.cacheWidgetContent(id, content);

    return id;
  }

  private cacheWidgetContent(id: string, content: string) {
    this.widgetCache.set(id, {
      content,
      timestamp: Date.now()
    });
  }

  async renderWidget<T extends BaseWidgetData>(id: string, data: T): Promise<void> {
    const activeWidget = this.activeWidgets.get(id);
    if (!activeWidget?.widget) return;

    // Merge new data with existing data
    const mergedData = {
      ...activeWidget.widget.getData(),
      ...data
    };

    try {
      const container = document.querySelector(`[data-widget-id="${id}"]`);
      if (!container) {
        const content = await activeWidget.widget.render(mergedData);
        this.cacheWidgetContent(id, content);
        return;
      }

      activeWidget.container = container as HTMLElement;
      const content = await activeWidget.widget.render(mergedData);
      container.innerHTML = content;
      
      // Set up event listeners for widget destruction
      container.addEventListener('widget:destroy', (event: Event) => {
        const customEvent = event as CustomEvent;
        const widgetId = customEvent.detail?.id;
        if (widgetId) {
          this.destroyWidget(widgetId);
        }
      });

      await activeWidget.widget.postRender(container as HTMLElement);

    } catch (error) {
      console.error(`Error rendering widget ${id}:`, error);
    }
  }

  getWidgetData(): Record<string, any> {
    const data: Record<string, any> = {};
    this.activeWidgets.forEach((entry, id) => {
      data[id] = entry.widget.getData();
    });
    return data;
  }

  destroyWidget(widgetId: string) {
    const activeWidget = this.activeWidgets.get(widgetId);
    if (!activeWidget) return;

    // Call widget's destroy method for cleanup
    activeWidget.widget.destroy();
    
    // Remove the widget's container element if it exists
    if (activeWidget.container) {
      activeWidget.container.remove();
    }
    
    // Clear widget from active widgets map
    this.activeWidgets.delete(widgetId);
    
    // Clear widget state
    this.widgetStates.delete(widgetId);
    
    // Clear widget cache
    this.widgetCache.delete(widgetId);

    // Emit widget destroyed event
    this.emit('widgetDestroyed', {
      id: widgetId,
      tabId: activeWidget.tabId
    });
  }

  destroyAllWidgets() {
    this.activeWidgets.forEach(({ widget, container }, id) => {
      widget.destroy();
      if (container) {
        container.remove();
      }
      this.emit('widgetDestroyed', { id });
    });
    
    this.activeWidgets.clear();
    this.widgetStates.clear();
  }

  getWidgetState(widgetId: string) {
    return this.widgetStates.get(widgetId) || { isMaximized: false, isMinimized: false };
  }

  setWidgetState(widgetId: string, newState: { isMaximized: boolean; isMinimized: boolean }) {
    this.widgetStates.set(widgetId, newState);
  }

  getWidgets(): Map<string, WidgetEntry> {
    return this.activeWidgets;
  }

  getWidgetsByTab(tabId: string): Map<string, WidgetEntry> {
    console.log('Getting widgets for tab:', tabId);
    const tabWidgets = new Map();
    this.activeWidgets.forEach((entry, id) => {
      if (entry.tabId === tabId) {
        tabWidgets.set(id, entry);
      }
    });
    console.log('Found widgets:', Array.from(tabWidgets.keys()));
    return tabWidgets;
  }

  moveWidgetToTab(widgetId: string, newTabId: string) {
    console.log('Moving widget to tab:', { widgetId, newTabId });
    const widget = this.activeWidgets.get(widgetId);
    if (widget) {
      widget.tabId = newTabId;
      this.activeWidgets.set(widgetId, widget);
      
      this.emit('widgetMoved', {
        id: widgetId,
        tabId: newTabId
      });
    }
  }

  destroyTabWidgets(tabId: string) {
    this.activeWidgets.forEach((entry, id) => {
      if (entry.tabId === tabId) {
        this.destroyWidget(id);
      }
    });
  }

  private getWidgetTitle(type: WidgetType): string {
    const titles: Record<WidgetType, string> = {
      weather: 'Weather',
      stock: 'Stock Price',
      map: 'Map',
      places: 'Places',
      nearby_places: 'Nearby Places',
      google_search: 'Search Results',
      altair: 'Visualization',
      get_directions: 'Directions',
      get_weather: 'Weather',
      get_stock_price: 'Stock Price',
      search_places: 'Places',
      search_nearby: 'Nearby Places',
      code_execution: 'Code Execution',
      table: 'Table',
      explainer: 'Explanation'
    };
    return titles[type] || 'Widget';
  }

  // Add helper method for chart creation
  async createChart(spec: any, config: any = {}) {
    return this.createWidget('altair', {
      title: spec.title || 'Visualization',
      spec: JSON.stringify(spec),
      config: {
        theme: config.theme || 'default',
        interactive: true,
        ...config
      }
    });
  }

  updateWidgetPosition(widgetId: string, position: { x: number; y: number }) {
    const widget = this.activeWidgets.get(widgetId);
    if (widget) {
      widget.position = position;
      this.activeWidgets.set(widgetId, widget);
      this.emit('widgetMoved', { id: widgetId, position });
    }
  }

  updateWidgetSize(widgetId: string, size: { width: number; height: number }) {
    const widget = this.activeWidgets.get(widgetId);
    if (widget) {
      widget.size = size;
      this.activeWidgets.set(widgetId, widget);
      this.emit('widgetResized', { id: widgetId, size });
    }
  }
}

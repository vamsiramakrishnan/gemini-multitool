import { BaseWidget, BaseWidgetData } from '../components/widgets/base/base-widget';
import { WeatherWidget } from '../components/widgets/weather/weather-widget';
import { StockWidget } from '../components/widgets/stock/stock-widget';
import { MapWidget } from '../components/widgets/map/map-widget';
import { PlacesWidget } from '../components/widgets/places/places-widget';
import { NearbyPlacesWidget } from '../components/widgets/nearby-places/nearby-places-widget';
import { SearchWidget } from '../components/widgets/search/search-widget';
import { ChatWidget } from '../components/widgets/chat/chat-widget';
import { EventEmitter } from 'eventemitter3';
import { AltairWidget } from '../components/widgets/altair/altair-widget';
import { CodeExecutionWidget } from '../components/widgets/code-execution/code-execution-widget';

export type WidgetType =
  | 'weather'
  | 'stock'
  | 'map'
  | 'places'
  | 'nearby_places'
  | 'google_search'
  | 'chat'
  | 'altair'
  | 'get_directions'
  | 'get_weather'
  | 'get_stock_price'
  | 'search_places'
  | 'search_nearby'
  | 'code_execution';

// Define a type that allows both sync and async render methods
interface WidgetBase<T extends BaseWidgetData = BaseWidgetData> extends BaseWidget {
  render(data?: T): Promise<string>;
  createLoadingState(): string;
  destroy(): void;
  postRender(element: HTMLElement, data: T): Promise<void>;
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
}

export class WidgetManager extends EventEmitter {
  private widgetRegistry: Record<WidgetType, WidgetConstructor> = {
    weather: WeatherWidget,
    stock: StockWidget,
    map: MapWidget,
    places: PlacesWidget,
    nearby_places: NearbyPlacesWidget,
    google_search: SearchWidget,
    chat: ChatWidget,
    altair: AltairWidget,
    get_directions: MapWidget,
    get_weather: WeatherWidget,
    get_stock_price: StockWidget,
    search_places: PlacesWidget,
    search_nearby: NearbyPlacesWidget,
    code_execution: CodeExecutionWidget
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
    
    // Check for existing widget
    const existingWidget = Array.from(this.activeWidgets.entries())
      .find(([_, entry]) => 
        entry.widget.constructor.name === this.widgetRegistry[type].name &&
        entry.tabId === targetTabId
      );

    if (existingWidget) {
      await this.renderWidget(existingWidget[0], data);
      return existingWidget[0];
    }

    // Get widget class
    const WidgetClass = this.widgetRegistry[type];
    if (!WidgetClass) {
      throw new Error(`No widget registered for type: ${type}`);
    }

    // Create new widget instance
    const widget = new WidgetClass(data);
    const id = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Pre-render content
    const content = await widget.render(data);
    
    // Emit creation event first
    this.emit('widgetCreated', {
      id,
      type,
      data,
      tabId: targetTabId,
      content // Pass rendered content
    });

    // Store widget entry
    const widgetEntry: WidgetEntry = {
      widget,
      container: null,
      id,
      tabId: targetTabId
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

    try {
      // Get container
      const container = document.querySelector(`[data-widget-id="${id}"]`);
      if (!container) {
        // Store rendered content in cache if container not ready
        const content = await activeWidget.widget.render(data);
        this.cacheWidgetContent(id, content);
        return;
      }

      activeWidget.container = container as HTMLElement;
      const content = await activeWidget.widget.render(data);
      container.innerHTML = content;
      await activeWidget.widget.postRender(container as HTMLElement, data);

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

    activeWidget.widget.destroy();
    
    if (activeWidget.container) {
      activeWidget.container.remove();
    }
    
    this.activeWidgets.delete(widgetId);
    this.widgetStates.delete(widgetId);

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
      chat: 'Chat',
      altair: 'Visualization',
      get_directions: 'Directions',
      get_weather: 'Weather',
      get_stock_price: 'Stock Price',
      search_places: 'Places',
      search_nearby: 'Nearby Places',
      code_execution: 'Code Execution'
    };
    return titles[type] || 'Widget';
  }
}

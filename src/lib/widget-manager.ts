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

// Add type definition for widget entries (if not already present)
interface WidgetEntry {
  widget: BaseWidget<any>;
  container: HTMLElement | null;
  id: string;
  tabId: string;
}

export class WidgetManager extends EventEmitter {
  constructor() {
    super();
    // Add listeners count logging
    this.on('newListener', (event) => {
      console.log('New listener added for event:', event);
      console.log('Current listeners:', this.listeners(event).length);
    });
  }

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

  async createWidget<T extends BaseWidgetData>(type: WidgetType, data: T, tabId: string = this.defaultTabId): Promise<string> {
    const WidgetClass = this.widgetRegistry[type];
    if (!WidgetClass) {
      console.error(`Widget type "${type}" not found.`);
      return '';
    }

    try {
      const widget = new WidgetClass(data) as BaseWidget<T>;
      const widgetId = `${type}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      
      const container = document.createElement('div');
      container.classList.add('widget-container');
      
      this.activeWidgets.set(widgetId, { 
        widget,
        container,
        id: widgetId,
        tabId
      });
      
      this.widgetStates.set(widgetId, { 
        isMaximized: false, 
        isMinimized: false 
      });

      const normalizedType = type.replace(/^(get_|search_)/, '');
      
      const eventData = {
        id: widgetId,
        type: normalizedType,
        data: {
          ...data,
          title: this.getWidgetTitle(type)
        },
        tabId
      };

      console.log('Emitting widgetCreated event:', eventData);
      console.log('Current listeners for widgetCreated:', this.listeners('widgetCreated').length);
      const emitted = this.emit('widgetCreated', eventData);
      console.log('Event emission result:', emitted);

      console.log('Widget created successfully:', { widgetId, type: normalizedType, tabId });
      return widgetId;
    } catch (error) {
      console.error(`Error creating widget of type ${type}:`, error);
      return '';
    }
  }

  async renderWidget<T extends BaseWidgetData>(id: string, data: T): Promise<void> {
    console.log('Rendering widget:', { id, data });
    
    const activeWidget = this.activeWidgets.get(id);
    if (!activeWidget?.widget) {
      console.error(`Widget ${id} not found`);
      return;
    }

    try {
      // Get the container from the active widget
      const container = activeWidget.container;
      if (!container) {
        throw new Error('Widget container not found');
      }

      // Clear the container
      container.innerHTML = '';

      // Render the widget content
      const content = await activeWidget.widget.render(data);
      container.innerHTML = content;

      // Call postRender to handle any additional setup
      await activeWidget.widget.postRender(container, data);
      
      console.log('Widget rendered successfully:', id);
    } catch (error) {
      console.error(`Error rendering widget ${id}:`, error);
      if (activeWidget.container) {
        activeWidget.container.innerHTML = `
          <div class="error-state">
            <span class="material-symbols-outlined">error</span>
            <div class="error-message">Error rendering widget: ${error instanceof Error ? error.message : 'Unknown error'}</div>
          </div>
        `;
      }
    }
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
      // Destroy widget instance
      widget.destroy();
      
      // Remove container if it exists
      if (container) {
        container.remove();
      }
      
      // Emit widget destroyed event for each widget
      this.emit('widgetDestroyed', {
        id
      });
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
    const tabWidgets = new Map();
    this.activeWidgets.forEach((entry, id) => {
      if (entry.tabId === tabId) {
        tabWidgets.set(id, entry);
      }
    });
    return tabWidgets;
  }

  moveWidgetToTab(widgetId: string, newTabId: string) {
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

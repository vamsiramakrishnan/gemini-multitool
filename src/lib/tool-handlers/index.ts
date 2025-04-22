/**
 * Tool handlers export
 */

import { WeatherHandler } from './weather';
import { StocksHandler } from './stocks';
import { EnvatoHandler } from './envato';
import { MapsHandler } from './maps';
import { PlacesHandler } from './places';
import { VisualizationHandler } from './visualization';
import { ExplanationHandler } from './explanation';
import { CoreHandler } from './core';
import { WidgetManager } from '../widget-manager';
import { ToolHandlerInterface, BaseToolHandler } from './types';

export class ToolHandler {
  private handlers: Map<string, ToolHandlerInterface> = new Map();
  private widgetManager: WidgetManager;
  private activeTabId: string = 'default';
  private coreHandler: CoreHandler;

  constructor(widgetManager: WidgetManager) {
    this.widgetManager = widgetManager;
    this.coreHandler = new CoreHandler(widgetManager);
    this.initializeHandlers();
  }

  private initializeHandlers() {
    // Weather tools
    const weatherHandler = new WeatherHandler(this.widgetManager, this.activeTabId);
    this.handlers.set('get_weather', weatherHandler);
    this.coreHandler.registerHandler('get_weather', weatherHandler);

    // Stocks tools
    const stocksHandler = new StocksHandler(this.widgetManager, this.activeTabId);
    this.handlers.set('get_stock_price', stocksHandler);
    this.coreHandler.registerHandler('get_stock_price', stocksHandler);

    // Maps tools
    const mapsHandler = new MapsHandler(this.widgetManager, this.activeTabId);
    this.handlers.set('get_directions', mapsHandler);
    this.coreHandler.registerHandler('get_directions', mapsHandler);

    // Places tools
    const placesHandler = new PlacesHandler(this.widgetManager, this.activeTabId);
    this.handlers.set('search_places', placesHandler);
    this.handlers.set('search_nearby', placesHandler);
    this.coreHandler.registerHandler('search_places', placesHandler);
    this.coreHandler.registerHandler('search_nearby', placesHandler);

    // Visualization tools
    const visualizationHandler = new VisualizationHandler(this.widgetManager, this.activeTabId);
    this.handlers.set('render_altair', visualizationHandler);
    this.handlers.set('render_table', visualizationHandler);
    this.handlers.set('code_execution', visualizationHandler);
    this.coreHandler.registerHandler('render_altair', visualizationHandler);
    this.coreHandler.registerHandler('render_table', visualizationHandler);
    this.coreHandler.registerHandler('code_execution', visualizationHandler);

    // Explanation tools
    const explanationHandler = new ExplanationHandler(this.widgetManager, this.activeTabId);
    this.handlers.set('explain_topic', explanationHandler);
    this.coreHandler.registerHandler('explain_topic', explanationHandler);

    // Envato tools
    const envatoHandler = new EnvatoHandler(this.widgetManager, this.activeTabId);
    const envatoTools = [
      'envato_fonts_search',
      'envato_video_templates_search',
      'envato_graphic_templates_search',
      'envato_3d_templates_search',
      'envato_audio_search',
      'search_envato_photos',
      'search_envato_stock_videos',
      'search_envato_audio',
      'search_envato_graphics',
      'search_envato_3d',
      'search_envato_fonts',
      'search_envato_video_templates',
      'search_envato_graphic_templates'
    ];
    
    for (const tool of envatoTools) {
      this.handlers.set(tool, envatoHandler);
      this.coreHandler.registerHandler(tool, envatoHandler);
    }
  }

  setActiveTabId(tabId: string) {
    this.activeTabId = tabId;
    // Update active tab for all handlers via the core handler
    this.coreHandler.setActiveTab(tabId);
  }

  async handleRequest(args: any): Promise<any> {
    const { tool } = args;
    
    const handler = this.handlers.get(tool);
    if (!handler) {
      throw new Error(`No handler found for tool: ${tool}`);
    }

    return handler.handleRequest(args);
  }

  async handleToolCall(toolCall: { functionCalls: Array<{ id: string; name: string; args: any }> }) {
    return this.coreHandler.handleToolCall(toolCall);
  }

  handleGroundingChunks(groundingMetadata: any) {
    return this.coreHandler.handleGroundingChunks(groundingMetadata);
  }

  initializeWidgets() {
    this.coreHandler.initializeWidgets();
  }

  destroyWidgets() {
    this.coreHandler.destroyWidgets();
  }

  handleToolCancellation(toolCallId: string) {
    this.coreHandler.handleToolCancellation(toolCallId);
  }

  handleInterruption() {
    this.coreHandler.handleInterruption();
  }
}

// Export individual handlers for direct use if needed
export { 
  WeatherHandler, 
  StocksHandler, 
  EnvatoHandler,
  MapsHandler,
  PlacesHandler,
  VisualizationHandler,
  ExplanationHandler,
  CoreHandler
};
export * from './types';
import { WidgetManager } from './widget-manager';
import { ToolHandler as ModularToolHandler } from './tool-handlers';
import { 
  GroundingMetadata, 
  ToolCall as GeminiToolCall, 
  ToolResponse as GeminiToolResponse,
  LiveFunctionResponse
} from '../multimodal-live-types';

import { getWeather } from './tools/weather-api';
import { getStockPrice } from './tools/stock-api';
import { getDirections } from './tools/google-maps';
import { searchPlaces, searchNearby } from './tools/places-api';
import { 
  searchPhotos,
  searchStockVideos,
  searchAudio,
  searchGraphics,
  search3D,
  searchFonts,
  searchVideoTemplates,
  searchDesignTemplates
} from './tools/envato-api';
import { toolDeclarations } from './tool-declarations';
import { BaseWidget } from '../components/widgets/base/base-widget';
import { AltairWidget } from '../components/widgets/altair/altair-widget';
import { BaseWidgetData } from '../components/widgets/base/base-widget';
import type { AltairData } from '../components/widgets/altair/altair-widget';
import { WidgetRegistry, WidgetType } from '../components/widgets/registry';
import { TableWidget } from '../components/widgets/table/table-widget';
import { generateExplanation } from './tools/explainer-api';
import { NearbyPlacesWidget } from '../components/widgets/nearby-places/nearby-places-widget';
import { ExplainerWidget } from '../components/widgets/explainer/ExplainerWidget';

// Import modular handlers
import {
  WeatherHandler,
  StocksHandler,
  EnvatoHandler,
  MapsHandler,
  PlacesHandler,
  VisualizationHandler,
  ExplanationHandler
} from './tool-handlers';

interface SearchWidgetData extends BaseWidgetData {
  groundingMetadata: GroundingMetadata;
  timestamp: string;
}

interface MapWidgetData extends BaseWidgetData {
  origin: string;
  destination: string;
  mode?: string;
  routes: Array<{
    duration: string;
    distance: string;
    summary: string;
    steps: Array<{
      instructions: string;
      distance: string;
      duration: string;
    }>;
  }>;
  _rawResponse?: any;
}

interface ToolCall {
  id: string;
  name: string;
  args: any;
}

interface ToolResponse {
  id: string;
  name: string;
  response: any;
}

interface ActiveToolCall {
  name: string;
  startTime: number;
  status: 'running' | 'cancelled';
}

export type ToolName = 
  | 'get_weather'
  | 'get_stock_price'
  | 'get_directions'
  | 'search_places'
  | 'search_nearby'
  | 'render_altair'
  | 'render_table'
  | 'code_execution'
  | 'explain_topic'
  | 'search_envato_photos'
  | 'search_envato_stock_videos'
  | 'search_envato_audio'
  | 'search_envato_graphics'
  | 'search_envato_3d'
  | 'search_envato_fonts'
  | 'search_envato_video_templates'
  | 'search_envato_graphic_templates';

/**
 * ToolHandler class that delegates to modular tool handlers
 */
export class ToolHandler {
  private toolHandlerInstance: ModularToolHandler;
  widgetManager: WidgetManager;
  private activeTabId: string = 'default';

  constructor(widgetManager: WidgetManager) {
    this.widgetManager = widgetManager;
    this.toolHandlerInstance = new ModularToolHandler(widgetManager);
  }

  setActiveTab(tabId: string) {
    console.log('ToolHandler: Setting active tab to:', tabId);
    this.activeTabId = tabId;
    this.toolHandlerInstance.setActiveTabId(tabId);
  }

  /**
   * Initialize all widgets when client connects
   */
  initializeWidgets() {
    this.toolHandlerInstance.initializeWidgets();
  }

  /**
   * Destroy all widgets when client disconnects
   */
  destroyWidgets() {
    this.toolHandlerInstance.destroyWidgets();
  }

  async handleToolCall(toolCall: { functionCalls: Array<{ id: string; name: string; args: any }> }): Promise<any> {
    return this.toolHandlerInstance.handleToolCall(toolCall);
  }

  handleToolCancellation(toolCallId: string) {
    this.toolHandlerInstance.handleToolCancellation(toolCallId);
  }

  handleInterruption() {
    this.toolHandlerInstance.handleInterruption();
  }

  async handleGroundingChunks(groundingMetadata: GroundingMetadata): Promise<void> {
    return this.toolHandlerInstance.handleGroundingChunks(groundingMetadata);
  }

  // Generic handler for all tool requests
  async handleRequest(args: any): Promise<any> {
    return this.toolHandlerInstance.handleRequest(args);
  }

  // Legacy method handlers that delegate to the modular implementation
  async handleWeather(args: any) {
    args.tool = 'get_weather';
    return this.handleRequest(args);
  }

  async handleStockPrice(args: any) {
    args.tool = 'get_stock_price';
    return this.handleRequest(args);
  }

  async handleDirections(args: any) {
    args.tool = 'get_directions';
    return this.handleRequest(args);
  }

  async handlePlacesSearch(args: any) {
    args.tool = 'search_places';
    return this.handleRequest(args);
  }

  async handleNearbySearch(args: any) {
    args.tool = 'search_nearby';
    return this.handleRequest(args);
  }

  async handleAltair(args: any) {
    args.tool = 'render_altair';
    return this.handleRequest(args);
  }

  async handleTable(args: any) {
    args.tool = 'render_table';
    return this.handleRequest(args);
  }

  async handleCodeExecution(args: any) {
    args.tool = 'code_execution';
    return this.handleRequest(args);
  }

  async handleExplainTopic(args: any) {
    args.tool = 'explain_topic';
    return this.handleRequest(args);
  }

  async handleEnvatoPhotos(args: any) {
    args.tool = 'search_envato_photos';
    return this.handleRequest(args);
  }

  async handleEnvatoStockVideos(args: any) {
    args.tool = 'search_envato_stock_videos';
    return this.handleRequest(args);
  }

  async handleEnvatoAudio(args: any) {
    args.tool = 'search_envato_audio';
    return this.handleRequest(args);
  }

  async handleEnvatoGraphics(args: any) {
    args.tool = 'search_envato_graphics';
    return this.handleRequest(args);
  }

  async handleEnvato3D(args: any) {
    args.tool = 'search_envato_3d';
    return this.handleRequest(args);
  }

  async handleEnvatoFonts(args: any) {
    args.tool = 'search_envato_fonts';
    return this.handleRequest(args);
  }

  async handleEnvatoVideoTemplates(args: any) {
    args.tool = 'search_envato_video_templates';
    return this.handleRequest(args);
  }

  async handleEnvatoGraphicTemplates(args: any) {
    args.tool = 'search_envato_graphic_templates';
    return this.handleRequest(args);
  }

  async handleEnvatoGallery(toolName: string, args: any) {
    args.tool = toolName;
    return this.handleRequest(args);
  }
}
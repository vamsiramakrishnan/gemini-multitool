import { getWeather } from './tools/weather-api';
import { getStockPrice } from './tools/stock-api';
import { getDirections } from './tools/google-maps';
import { searchPlaces, searchNearby } from './tools/places-api';
import { toolDeclarations } from './tool-declarations';
import { BaseWidget } from '../components/widgets/base/base-widget';
import { WidgetManager } from './widget-manager';
import { AltairWidget } from '../components/widgets/altair/altair-widget';
import { 
  GroundingMetadata, 
  ToolCall as GeminiToolCall, 
  ToolResponse as GeminiToolResponse,
  LiveFunctionResponse
} from '../multimodal-live-types';
import { BaseWidgetData } from '../components/widgets/base/base-widget';
import type { AltairData } from '../components/widgets/altair/altair-widget';
import { WidgetRegistry, WidgetType } from '../components/widgets/registry';
import { TableWidget } from '../components/widgets/table/table-widget';

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
  | 'render_table';

export class ToolHandler {
  widgetManager: WidgetManager;
  activeToolCalls: Map<string, ActiveToolCall>;
  toolHandlers: Record<string, (args: any) => Promise<any>>;
  private altairWidget: AltairWidget | null = null;
  private activeTabId: string = 'default';

  constructor(widgetManager: WidgetManager) {
    this.widgetManager = widgetManager;
    this.activeToolCalls = new Map();
    this.toolHandlers = {
      get_weather: this.handleWeather.bind(this),
      get_stock_price: this.handleStockPrice.bind(this),
      get_directions: this.handleDirections.bind(this),
      search_places: this.handlePlacesSearch.bind(this),
      search_nearby: this.handleNearbySearch.bind(this),
      render_altair: this.handleAltair.bind(this),
      render_table: this.handleTable.bind(this),
    };
  }

  setActiveTab(tabId: string) {
    console.log('ToolHandler: Setting active tab to:', tabId);
    this.activeTabId = tabId;
  }

  /**
   * Initialize all widgets when client connects
   */
  initializeWidgets() {
    console.log('Initializing widgets');
    // Initialize Altair widget if needed
    if (!this.altairWidget) {
      this.altairWidget = new AltairWidget();
    }
    // Add any other widget initialization logic here
  }

  /**
   * Destroy all widgets when client disconnects
   */
  destroyWidgets() {
    console.log('Destroying widgets');
    // Clean up Altair widget
    if (this.altairWidget) {
      this.altairWidget = null;
    }
    // Clean up any active tool calls
    this.handleInterruption();
    // Clean up any widgets via widget manager
    this.widgetManager.destroyAllWidgets();
  }

  async handleToolCall(toolCall: { functionCalls: Array<{ id: string; name: string; args: any }> }) {
    return Promise.all(toolCall.functionCalls.map(async (call) => {
      try {
        const widgetType = this.mapToolToWidgetType(call.name);
        
        // Process the tool call with the correct widget type
        const result = await this.processToolCall(call, widgetType);
        return this.formatToolResponse(call.id, call.name, result);
      } catch (error) {
        console.error(`Error handling tool call ${call.name}:`, error);
        return this.formatToolError(call.id, call.name, error as Error);
      }
    }));
  }

  private async processToolCall(call: { name: string; args: any }, widgetType: WidgetType) {
    // Handle the specific tool call based on widget type
    switch (widgetType) {
      case 'weather':
        return this.handleWeather(call.args);
      case 'stock':
        return this.handleStockPrice(call.args);
      case 'map':
        return this.handleDirections(call.args);
      case 'places':
        return this.handlePlacesSearch(call.args);
      case 'nearby_places':
        return this.handleNearbySearch(call.args);
      case 'altair':
        return this.handleAltair(call.args);
      case 'table':
        return this.handleTable(call.args);
      default:
        throw new Error(`Unhandled widget type: ${widgetType}`);
    }
  }

  formatToolResponse(id: string, name: string, result: any): ToolResponse {
    return {
      id,
      name,
      response: {
        result: {
          object_value: result
        }
      }
    };
  }

  formatToolError(id: string, name: string, error: Error): ToolResponse {
    return {
      id,
      name,
      response: {
        error: error.message
      }
    };
  }

  handleToolCancellation(toolCallId: string) {
    console.log('Tool call cancelled:', { toolCallId });
    const activeCall = this.activeToolCalls.get(toolCallId);
    if (activeCall) {
      activeCall.status = 'cancelled';
      // Clean up any pending operations
      this.cleanupToolCall(toolCallId);
      this.activeToolCalls.delete(toolCallId);
    }
  }

  handleInterruption() {
    // Clean up all active tool calls
    for (const [id, call] of this.activeToolCalls) {
      this.handleToolCancellation(id);
    }
    this.activeToolCalls.clear();
  }

  cleanupToolCall(toolCallId: string) {
    const activeCall = this.activeToolCalls.get(toolCallId);
    if (!activeCall) return;

    // Cleanup based on tool type
    switch (activeCall.name) {
      case 'get_directions':
        // Cancel any pending navigation requests
        break;
      case 'search_places':
      case 'search_nearby':
        // Cancel pending place searches
        break;
      // Add other tool-specific cleanup
    }
  }

  async handleGroundingChunks(groundingMetadata: GroundingMetadata) {
    try {
        // Index the chunks for reference in supports
        const indexedChunks = groundingMetadata.groundingChunks.map((chunk, index) => {
            return {
                ...chunk,
                index,
                source: chunk.source || 'web',
                metadata: {
                    ...chunk.metadata,
                    timestamp: chunk.metadata?.timestamp || new Date().toISOString()
                }
            };
        });

        // Process grounding supports if present
        if (groundingMetadata.groundingSupports?.length) {
            for (const support of groundingMetadata.groundingSupports) {
                let relevantChunks = []; // Initialize relevantChunks
                // Check if support has segments before trying to access them
                if (support.segments?.length) {
                    relevantChunks = support.segments.flatMap(segment =>
                        segment.supportingChunkIndexes?.map((idx: number) => indexedChunks[idx]) || []
                    ).filter(Boolean);
                } else if (support.groundingChunkIndices?.length) {
                    // Handle the case where we have groundingChunkIndices directly
                    relevantChunks = support.groundingChunkIndices
                        .map((idx: number) => indexedChunks[idx])
                        .filter(Boolean);
                } else {
                    console.warn('Support missing both segments and groundingChunkIndices:', support);
                }
            }
        }
    } catch (error: any) {
        console.error('Error handling grounding chunks:', error);
        throw error;
    }
  }

  async handleWithStatus(toolName: ToolName, args: any, apiCall: () => Promise<any>) {
    console.log(`Handling ${toolName} with args:`, args);
    try {
      const result = await apiCall();
      console.log(`${toolName} result:`, result);

      // Create widget with the current active tab ID
      const widgetType = this.mapToolToWidgetType(toolName);
      const widgetId = await this.widgetManager.createWidget(
        widgetType,
        {
          ...result,
          title: this.getWidgetTitle(toolName, result)
        },
        this.activeTabId // Explicitly pass the active tab ID
      );

      console.log(`Created widget ${widgetId} in tab ${this.activeTabId}`);
      return result;
    } catch (error: any) {
      console.error(`Error in ${toolName}:`, error);
      throw error;
    }
  }

  private mapToolToWidgetType(toolName: string): WidgetType {
    const mapping: Record<string, WidgetType> = {
      'get_weather': 'weather',
      'get_stock_price': 'stock',
      'get_directions': 'map',
      'search_places': 'places',
      'search_nearby': 'nearby_places',
      'render_altair': 'altair',
      'render_table': 'table'
    };

    const widgetType = mapping[toolName];
    if (!widgetType) {
      throw new Error(`Unknown tool name: ${toolName}`);
    }

    return widgetType;
  }

  private getWidgetTitle(toolName: ToolName, result: any): string {
    switch (toolName) {
      case 'get_weather':
        return `Weather - ${result.city}`;
      case 'get_stock_price':
        return `Stock - ${result.symbol}`;
      case 'get_directions':
        return 'Directions';
      case 'search_places':
        return 'Places Search';
      case 'search_nearby':
        return 'Nearby Places';
      case 'render_altair':
        return 'Visualization';
      case 'render_table':
        return 'Data Table';
      default:
        return 'Widget';
    }
  }

  handleToolError(toolName: ToolName, toolCallId: string, error: Error) {
    console.error(`Error in ${toolName}:`, error);
    const errorData = {
      error: error.message,
      status: 'error'
    };

    const widgetType = this.mapToolToWidgetType(toolName);
    console.log('Creating error widget:', { widgetType, error: error.message });
    
    this.widgetManager.createWidget(widgetType, {
      title: 'Error',
      description: error.message,
      error: error.message
    });
    
    return errorData;
  }

  async handleWeather(args: any) {
    return this.handleWithStatus('get_weather', args, 
      () => getWeather(args.city)
    );
  }

  async handleStockPrice(args: any) {
    return this.handleWithStatus('get_stock_price', args,
      () => getStockPrice(args.symbol)
    );
  }

  async handleDirections(args: any) {
    try {
      console.log('Handling directions request:', args);
      
      const response = await getDirections(args.origin, args.destination, {
        mode: args.mode,
        alternatives: args.alternatives,
        departureTime: args.departureTime,
        arrivalTime: args.arrivalTime,
        avoid: args.avoid,
        transitMode: args.transitMode
      });
      
      if (response.error) {
        return this.handleToolError('get_directions', args.toolCallId, new Error(response.error));
      }

      // Create widget with full data
      await this.widgetManager.createWidget('map', {
        title: 'Navigation',
        ...response.widgetData,
        mode: args.mode
      });

      // Return simplified response for Gemini
      return response.llmResponse;

    } catch (error: any) {
      return this.handleToolError('get_directions', args.toolCallId, error);
    }
  }

  async handlePlacesSearch(args: any) {
    return this.handleWithStatus('search_places', args,
      async () => {
        try {
          const response = await searchPlaces(args.query, {
            maxResults: args.maxResults,
            language: args.languageCode
          });

          if (response.error) {
            throw new Error(response.error);
          }

          // Return the widgetData directly since it already has the correct structure
          return response.widgetData;

        } catch (error) {
          console.error('Error in places search:', error);
          throw error; // Let handleWithStatus handle the error
        }
      }
    );
  }

  async handleNearbySearch(args: any) {
    return this.handleWithStatus('search_nearby', args,
      async () => {
        // Check if widget already exists for this search
        const existingWidget = Array.from(this.widgetManager.getWidgets().values())
          .find(entry => 
            entry.widget instanceof NearbyPlacesWidget && 
            entry.tabId === this.activeTabId
          );

        const response = await searchNearby(args.location, {
          radius: args.radius,
          type: args.type,
          maxResults: args.maxResults,
          language: args.languageCode
        });

        if (response.error) {
          throw new Error(response.error);
        }

        // Update existing widget or create new one
        if (existingWidget) {
          await this.widgetManager.renderWidget(existingWidget.id, {
            title: 'Nearby Places',
            ...response.widgetData
          });
        } else {
          await this.widgetManager.createWidget('nearby_places', {
            title: 'Nearby Places',
            ...response.widgetData
          }, this.activeTabId);
        }

        return response.llmResponse;
      }
    );
  }

  private async handleAltair(args: any) {
    try {
      const { altair_json, theme = 'dark', width, height, background, interactive } = args;
      
      // Create widget data with proper typing
      const widgetData: AltairData = {
        title: 'Data Visualization',
        spec: altair_json,
        config: {
          theme,
          width,
          height,
          background,
          interactive
        }
      };

      // Create widget through widget manager
      const widgetId = await this.widgetManager.createWidget('altair', widgetData);
      
      return { 
        success: true, 
        widgetId,
        message: 'Visualization created successfully'
      };
    } catch (error) {
      console.error('Error handling Altair visualization:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async handleCodeExecution(args: any) {
    try {
      const { language, code } = args;
      
      // Execute code and get result
      const result = await this.handleWithStatus('code_execution', args,
        async () => {
          console.log('Executing code:', { language, code });
          const executionResult = await executeCode(language, code);
          
          // Create code execution widget to display result
          await this.widgetManager.createWidget('code_execution', {
            language,
            code,
            output: executionResult.output || '',
            outcome: executionResult.success ? 'success' : 'error'
          });

          return executionResult;
        }
      );

      return {
        success: true,
        result: result,
        message: 'Code execution completed successfully'
      };
    } catch (error: any) {
      console.error('Error in handleCodeExecution:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async handleTable(args: any) {
    return this.handleWithStatus('render_table', args,
      async () => {
        const { markdown, title, description } = args;
        
        // Create widget data
        const widgetData = {
          markdown,
          title: title || 'Data Table',
          description: description || ''
        };

        // Create widget through widget manager
        await this.widgetManager.createWidget('table', widgetData);

        return {
          success: true,
          message: 'Table rendered successfully'
        };
      }
    );
  }
} 
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
import type { WidgetType } from './widget-manager';
import { CodeExecutionWidget } from '../components/widgets/code-execution/code-execution-widget';

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
  | 'google_search'
  | 'render_altair'
  | 'code_execution';

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
      google_search: this.handleSearch.bind(this),
      render_altair: this.handleAltair.bind(this),
      code_execution: this.handleCodeExecution.bind(this),
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

  async handleToolCall(toolCall: { functionCalls: ToolCall[] }): Promise<ToolResponse[]> {
    console.log('ToolHandler: Handling tool call with active tab:', this.activeTabId);
    const functionCalls = toolCall.functionCalls;
    
    // Process all calls concurrently
    const functionResponses = await Promise.all(functionCalls.map(async (call) => {
      try {
        this.activeToolCalls.set(call.id, {
          name: call.name,
          startTime: Date.now(),
          status: 'running'
        });

        const handler = this.toolHandlers[call.name];
        if (!handler) {
          console.warn('No handler found for tool', call.name);
          return this.formatToolError(call.id, call.name, new Error('Tool handler not found'));
        }

        // Pass the active tab ID to the handler
        console.log(`ToolHandler: Calling handler for ${call.name} with tabId:`, this.activeTabId);
        const result = await handler({ 
          ...call.args, 
          _targetTabId: this.activeTabId // Use a distinct property name
        });
        return this.formatToolResponse(call.id, call.name, result);
      } catch (error: any) {
        return this.formatToolError(call.id, call.name, error);
      } finally {
        this.activeToolCalls.delete(call.id);
      }
    }));

    // Handle code execution widget updates
    const codeExecCalls = functionCalls.filter(call => call.name === 'code_execution');
    for (const call of codeExecCalls) {
      const response = functionResponses.find(r => r.id === call.id);
      if (response) {
        const widgetData = {
          language: call.args.language || 'python',
          code: call.args.code,
          output: response.response.error || 
                 response.response.result?.object_value?.output || 
                 response.response.result?.object_value?.result || '',
          outcome: response.response.error ? 'error' : 'success'
        };

        // Create widget with active tab ID
        const existingWidget = Array.from(this.widgetManager.getWidgets().values())
          .find((w: { id: string }) => w.id === call.id);
        if (existingWidget) {
          this.widgetManager.renderWidget(existingWidget.id, widgetData);
        } else {
          this.widgetManager.createWidget('code_execution', {
            ...widgetData,
            title: `Code Execution ${call.id.slice(0, 6)}`
          }, this.activeTabId);
        }
      }
    }

    return functionResponses;
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

        // Create search widget with grounding data
        const searchData: SearchWidgetData = {
            title: 'Search Results',
            groundingMetadata: {
                ...groundingMetadata,
                groundingChunks: indexedChunks
            },
            timestamp: new Date().toISOString()
        };
        await this.widgetManager.createWidget('google_search', searchData);

        // If there are grounding supports, process them
        if (groundingMetadata.groundingSupports?.length) {
            for (const support of groundingMetadata.groundingSupports) {
                // Check if support has segments before trying to access them
                if (support.segments?.length) {
                    const relevantChunks = support.segments.flatMap(segment => 
                        segment.supportingChunkIndexes?.map((idx: number) => indexedChunks[idx]) || []
                    ).filter(Boolean);

                } else if (support.groundingChunkIndices?.length) {
                    // Handle the case where we have groundingChunkIndices directly
                    const relevantChunks = support.groundingChunkIndices
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

  async handleSearch(args: any) {
    console.log('Search request:', args);
    return this.handleWithStatus('google_search', args,
      async () => {
        console.log('Initiating search for:', args.query);
        // This is a placeholder since actual search is handled by Gemini
        // and comes through grounding chunks
        const searchRequest = {
          query: args.query,
          status: 'searching'
        };
        console.log('Search request initialized:', searchRequest);
        return searchRequest;
      }
    );
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

  private mapToolToWidgetType(toolName: ToolName): WidgetType {
    const mapping: Record<ToolName, WidgetType> = {
      get_weather: 'weather',
      get_stock_price: 'stock',
      get_directions: 'map',
      search_places: 'places',
      search_nearby: 'nearby_places',
      google_search: 'google_search',
      render_altair: 'altair',
      code_execution: 'code_execution'
    };
    return mapping[toolName];
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
      case 'google_search':
        return 'Search Results';
      case 'render_altair':
        return 'Visualization';
      case 'code_execution':
        return 'Code Execution';
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
        const response = await searchPlaces(args.query, {
          location: args.location,
          radius: args.radius,
          pageToken: args.pageToken
        });

        if (response.error) {
          throw new Error(response.error);
        }

        // Create widget with full data
        await this.widgetManager.createWidget('places', {
          title: 'Search Results',
          ...response.widgetData
        });

        // Return simplified response for Gemini
        return response.llmResponse;
      }
    );
  }

  async handleNearbySearch(args: any) {
    return this.handleWithStatus('search_nearby', args,
      () => searchNearby(args.location, {
        radius: args.radius,
        type: args.type,
        maxResults: args.maxResults,
        language: args.languageCode
      })
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
      
      const result = await this.handleWithStatus('code_execution', args,
        async () => {
          console.log('Executing code:', { language, code });
          // This is a placeholder since actual execution is handled by Gemini
          // and comes through grounding chunks
          const executionRequest = {
            language,
            code,
            status: 'executing'
          };
          console.log('Execution request initialized:', executionRequest);
          return executionRequest;
        }
      );

      return {
        success: true,
        result: result.result,
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
} 
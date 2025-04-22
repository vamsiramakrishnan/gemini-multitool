/**
 * Core tool handler functionality
 */

import { GroundingMetadata } from '../../../multimodal-live-types';
import { WidgetManager } from '../../widget-manager';
import { BaseToolHandler } from '../types';
import { WidgetType } from '../../../components/widgets/registry';

interface ActiveToolCall {
  name: string;
  startTime: number;
  status: 'running' | 'cancelled';
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

export class CoreHandler {
  private widgetManager: WidgetManager;
  private activeToolCalls: Map<string, ActiveToolCall> = new Map();
  private activeTabId: string = 'default';
  private handlers: Map<string, BaseToolHandler> = new Map();

  constructor(widgetManager: WidgetManager) {
    this.widgetManager = widgetManager;
  }

  setActiveTab(tabId: string) {
    this.activeTabId = tabId;
    // Update active tab in all handlers
    this.handlers.forEach(handler => {
      handler.setActiveTab(tabId);
    });
  }

  registerHandler(toolName: string, handler: BaseToolHandler) {
    this.handlers.set(toolName, handler);
  }

  /**
   * Initialize all widgets when client connects
   */
  initializeWidgets() {
    console.log('Initializing widgets');
    // Add widget initialization logic here
  }

  /**
   * Destroy all widgets when client disconnects
   */
  destroyWidgets() {
    console.log('Destroying widgets');
    // Clean up any active tool calls
    this.handleInterruption();
    // Clean up any widgets via widget manager
    this.widgetManager.destroyAllWidgets();
  }

  async handleToolCall(toolCall: { functionCalls: Array<{ id: string; name: string; args: any }> }) {
    return Promise.all(toolCall.functionCalls.map(async (call) => {
      try {
        // Add tool name to args for modular handlers
        const args = { ...call.args, tool: call.name };
        
        // Get the appropriate handler
        const handler = this.handlers.get(call.name);
        if (!handler) {
          throw new Error(`No handler found for tool: ${call.name}`);
        }
        
        // Track the active tool call
        this.activeToolCalls.set(call.id, {
          name: call.name,
          startTime: Date.now(),
          status: 'running'
        });
        
        // Process the tool call
        const result = await handler.handleRequest(args);
        
        // Clean up the active tool call
        this.activeToolCalls.delete(call.id);
        
        return this.formatToolResponse(call.id, call.name, result);
      } catch (error) {
        console.error(`Error handling tool call ${call.name}:`, error);
        // Clean up the active tool call
        this.activeToolCalls.delete(call.id);
        return this.formatToolError(call.id, call.name, error as Error);
      }
    }));
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

  mapToolToWidgetType(toolName: string): WidgetType {
    const mapping: Record<string, WidgetType> = {
      'get_weather': 'weather',
      'get_stock_price': 'stock',
      'get_directions': 'map',
      'search_places': 'places',
      'search_nearby': 'nearby_places',
      'render_altair': 'altair',
      'render_table': 'table',
      'code_execution': 'code_execution',
      'explain_topic': 'explainer',
      'search_envato_photos': 'envato_gallery',
      'search_envato_stock_videos': 'envato_gallery',
      'search_envato_audio': 'envato_gallery',
      'search_envato_graphics': 'envato_gallery',
      'search_envato_3d': 'envato_gallery',
      'search_envato_fonts': 'envato_gallery',
      'search_envato_video_templates': 'envato_gallery',
      'search_envato_graphic_templates': 'envato_gallery'
    };

    const widgetType = mapping[toolName];
    if (!widgetType) {
      throw new Error(`Unknown tool name: ${toolName}`);
    }

    return widgetType;
  }

  getWidgetTitle(toolName: string, result: any): string {
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
      case 'code_execution':
        return 'Code Execution';
      case 'explain_topic':
        return `Explanation - ${result.topic}`;
      case 'search_envato_photos':
        return 'Envato Photos';
      case 'search_envato_stock_videos':
        return 'Envato Stock Videos';
      case 'search_envato_audio':
        return 'Envato Audio';
      case 'search_envato_graphics':
        return 'Envato Graphics';
      case 'search_envato_3d':
        return 'Envato 3D';
      case 'search_envato_fonts':
        return 'Envato Fonts';
      case 'search_envato_video_templates':
        return 'Envato Video Templates';
      case 'search_envato_graphic_templates':
        return 'Envato Graphic Templates';
      default:
        return 'Widget';
    }
  }
} 
/**
 * Maps tool handler
 */

import { BaseToolHandler } from '../types';
import { getDirections } from '../../tools/google-maps';
import { WidgetManager } from '../../widget-manager';

export class MapsHandler extends BaseToolHandler {
  constructor(widgetManager: WidgetManager, activeTabId: string = 'default') {
    super(widgetManager, activeTabId);
  }

  async handleRequest(args: any): Promise<any> {
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
        this.handleError('get_directions', new Error(response.error));
        return { error: response.error };
      }

      // Create widget with full data
      await this.widgetManager.createWidget('map', {
        title: 'Navigation',
        ...response.widgetData,
        mode: args.mode
      }, this.activeTabId);

      // Return simplified response
      return response.llmResponse;
    } catch (error: any) {
      return this.handleError('get_directions', error);
    }
  }

  private handleError(toolName: string, error: Error) {
    console.error(`Error in ${toolName}:`, error);
    
    this.widgetManager.createWidget('map', {
      title: 'Error',
      description: error.message,
      error: error.message
    }, this.activeTabId);
    
    return {
      error: error.message,
      status: 'error'
    };
  }
} 
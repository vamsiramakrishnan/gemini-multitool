/**
 * Places tool handler
 */

import { BaseToolHandler } from '../types';
import { searchPlaces, searchNearby } from '../../tools/places-api';
import { WidgetManager } from '../../widget-manager';

export class PlacesHandler extends BaseToolHandler {
  constructor(widgetManager: WidgetManager, activeTabId: string = 'default') {
    super(widgetManager, activeTabId);
  }

  async handleRequest(args: any): Promise<any> {
    // Determine which type of place search to perform
    const tool = args.tool;
    if (tool === 'search_places') {
      return this.handlePlacesSearch(args);
    } else if (tool === 'search_nearby') {
      return this.handleNearbySearch(args);
    } else {
      throw new Error(`Unknown places tool: ${tool}`);
    }
  }

  async handlePlacesSearch(args: any): Promise<any> {
    try {
      const response = await searchPlaces(args.query, {
        maxResults: args.maxResults,
        languageCode: args.languageCode
      });

      if (response.error) {
        throw new Error(response.error);
      }

      // Create widget
      await this.widgetManager.createWidget('places', {
        title: 'Places Search',
        ...response.widgetData
      }, this.activeTabId);

      return response.widgetData;
    } catch (error) {
      console.error('Error in places search:', error);
      
      // Create error widget
      await this.widgetManager.createWidget('places', {
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, this.activeTabId);
      
      throw error;
    }
  }

  async handleNearbySearch(args: any): Promise<any> {
    try {
      // Check if widget already exists for this search
      const existingWidget = Array.from(this.widgetManager.getWidgets().values())
        .find(entry => 
          entry.widget.constructor.name === 'NearbyPlacesWidget' && 
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
    } catch (error) {
      console.error('Error in nearby search:', error);
      
      // Create error widget
      await this.widgetManager.createWidget('nearby_places', {
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, this.activeTabId);
      
      throw error;
    }
  }
} 
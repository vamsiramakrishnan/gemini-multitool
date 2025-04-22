/**
 * Shared types for tool handlers
 */

import { BaseWidgetData } from '../../components/widgets/base/base-widget';
import { WidgetType } from '../../components/widgets/registry';
import { WidgetManager } from '../widget-manager';

/**
 * Interface for common handler methods
 */
export interface ToolHandlerInterface {
  handleRequest(args: any): Promise<any>;
}

/**
 * Base class for all tool handlers
 */
export abstract class BaseToolHandler implements ToolHandlerInterface {
  protected widgetManager: WidgetManager;
  protected activeTabId: string;

  constructor(widgetManager: WidgetManager, activeTabId: string = 'default') {
    this.widgetManager = widgetManager;
    this.activeTabId = activeTabId;
  }

  abstract handleRequest(args: any): Promise<any>;

  /**
   * Set the active tab ID
   */
  setActiveTab(tabId: string): void {
    this.activeTabId = tabId;
  }

  /**
   * Create a widget with appropriate data
   */
  protected async createWidget(
    widgetType: WidgetType, 
    data: any, 
    title: string
  ): Promise<string> {
    const widgetId = await this.widgetManager.createWidget(
      widgetType,
      {
        ...data,
        title
      },
      this.activeTabId
    );
    
    console.log(`Created widget ${widgetId} in tab ${this.activeTabId}`);
    return widgetId;
  }

  /**
   * Handle API processing with status reporting
   */
  protected async handleWithStatus<T>(
    toolName: string,
    args: any,
    widgetType: WidgetType,
    getTitle: (result: T) => string,
    apiCall: () => Promise<T>
  ): Promise<T> {
    console.log(`Handling ${toolName} with args:`, args);
    try {
      const result = await apiCall();
      console.log(`${toolName} result:`, result);

      await this.createWidget(widgetType, result, getTitle(result));
      return result;
    } catch (error: any) {
      console.error(`Error in ${toolName}:`, error);
      
      // Create error widget
      await this.widgetManager.createWidget(widgetType, {
        title: 'Error',
        description: error.message,
        error: error.message
      });
      
      throw error;
    }
  }
}

/**
 * Common tool name types from all modules
 */
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
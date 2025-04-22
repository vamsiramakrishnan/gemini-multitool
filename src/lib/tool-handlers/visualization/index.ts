/**
 * Visualization tool handler
 */

import { BaseToolHandler } from '../types';
import { WidgetManager } from '../../widget-manager';
import type { AltairData } from '../../../components/widgets/altair/altair-widget';

export class VisualizationHandler extends BaseToolHandler {
  constructor(widgetManager: WidgetManager, activeTabId: string = 'default') {
    super(widgetManager, activeTabId);
  }

  async handleRequest(args: any): Promise<any> {
    // Determine which type of visualization to create
    const tool = args.tool;
    if (tool === 'render_altair') {
      return this.handleAltair(args);
    } else if (tool === 'render_table') {
      return this.handleTable(args);
    } else if (tool === 'code_execution') {
      return this.handleCodeExecution(args);
    } else {
      throw new Error(`Unknown visualization tool: ${tool}`);
    }
  }

  async handleAltair(args: any): Promise<any> {
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
      const widgetId = await this.widgetManager.createWidget('altair', widgetData, this.activeTabId);
      
      return { 
        success: true, 
        widgetId,
        message: 'Visualization created successfully'
      };
    } catch (error) {
      console.error('Error handling Altair visualization:', error);
      
      // Create error widget
      await this.widgetManager.createWidget('altair', {
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, this.activeTabId);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async handleTable(args: any): Promise<any> {
    try {
      const { markdown, title, description } = args;
      
      // Create widget data
      const widgetData = {
        markdown,
        title: title || 'Data Table',
        description: description || ''
      };

      // Create widget through widget manager
      await this.widgetManager.createWidget('table', widgetData, this.activeTabId);

      return {
        success: true,
        message: 'Table rendered successfully'
      };
    } catch (error) {
      console.error('Error handling table visualization:', error);
      
      // Create error widget
      await this.widgetManager.createWidget('table', {
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, this.activeTabId);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async handleCodeExecution(args: any): Promise<any> {
    try {
      const { language, code } = args;
      
      console.log('Executing code:', { language, code });
      // Mock execution result
      const executionResult = {
        output: `[Mock output for ${language} code]`,
        success: true
      };
      
      // Create code execution widget to display result
      await this.widgetManager.createWidget('code_execution', {
        language,
        code,
        output: executionResult.output || '',
        outcome: executionResult.success ? 'success' : 'error'
      }, this.activeTabId);

      return {
        success: true,
        result: executionResult,
        message: 'Code execution completed successfully'
      };
    } catch (error: any) {
      console.error('Error in handleCodeExecution:', error);
      
      // Create error widget
      await this.widgetManager.createWidget('code_execution', {
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, this.activeTabId);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
} 
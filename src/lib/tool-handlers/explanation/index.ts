/**
 * Explanation tool handler
 */

import { BaseToolHandler } from '../types';
import { generateExplanation } from '../../tools/explainer-api';
import { WidgetManager } from '../../widget-manager';

export class ExplanationHandler extends BaseToolHandler {
  constructor(widgetManager: WidgetManager, activeTabId: string = 'default') {
    super(widgetManager, activeTabId);
  }

  async handleRequest(args: any): Promise<any> {
    console.log('Generating explanation for:', args);
    
    try {
      // Create a loading widget first
      const widgetId = await this.widgetManager.createWidget('explainer', {
        title: `Explanation: ${args.topic}`,
        topic: args.topic,
        style: args.style || 'conversational',
        format: args.format || 'detailed',
        level: 'loading...',
        sections: [],
        metadata: {
          word_count: 0,
          difficulty_progression: '',
          key_points_covered: 0
        },
        loading: true
      }, this.activeTabId);
      
      // Generate the explanation
      const explanation = await generateExplanation({
        topic: args.topic,
        style: args.style || 'conversational',
        format: args.format || 'detailed',
        context: args.context
      });
      
      // Update the widget with the explanation
      await this.widgetManager.renderWidget(widgetId, {
        title: `Explanation: ${args.topic}`,
        ...explanation,
        loading: false
      });
      
      return explanation;
    } catch (error) {
      console.error('Error generating explanation:', error);
      
      // Create an error widget
      await this.widgetManager.createWidget('explainer', {
        title: `Explanation Error`,
        topic: args.topic,
        style: args.style || 'conversational',
        format: args.format || 'detailed',
        level: 'error',
        sections: [],
        metadata: {
          word_count: 0,
          difficulty_progression: '',
          key_points_covered: 0
        },
        error: error instanceof Error ? error.message : 'Unknown error generating explanation'
      }, this.activeTabId);
      
      throw error;
    }
  }
} 
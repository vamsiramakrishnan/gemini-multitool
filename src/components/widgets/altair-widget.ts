import { BaseWidget } from './base-widget';
import vegaEmbed from "vega-embed";

export class AltairWidget extends BaseWidget {
  private container: HTMLDivElement | null = null;

  constructor() {
    super('altair');
  }

  async renderGraph(jsonString: string) {
    try {
      // Find the existing container created by React
      this.container = document.getElementById('altair-container') as HTMLDivElement;
      if (!this.container) {
        throw new Error('Altair container not found');
      }
      
      await vegaEmbed(this.container, JSON.parse(jsonString));
    } catch (error) {
      console.error('Failed to render Altair graph:', error);
    }
  }

  destroy() {
    // No need to remove the container since React manages it
    this.container = null;
  }
} 
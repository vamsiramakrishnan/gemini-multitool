import { BaseWidget, BaseWidgetData } from '../base/base-widget';
import vegaEmbed, { EmbedOptions } from "vega-embed";

// Define valid themes based on Vega-Embed's actual theme options
type VegaTheme = 
  | 'dark' 
  | 'ggplot2' 
  | 'quartz' 
  | 'vox' 
  | 'latimes' 
  | 'urbaninstitute' 
  | 'fivethirtyeight'
  | 'excel'
  | 'googlecharts'
  | 'powerbi'
  | 'carbonwhite'
  | 'carbong10'
  | 'carbong90'
  | 'carbong100';

export interface AltairConfig {
  theme?: VegaTheme;
  width?: number;
  height?: number;
  background?: string;
  interactive?: boolean;
}

export interface AltairData extends BaseWidgetData {
  spec: string;
  config?: AltairConfig;
}

export class AltairWidget extends BaseWidget<AltairData> {
  private container: HTMLDivElement | null = null;
  private readonly widgetId: string;

  constructor(data?: AltairData) {
    super('Visualization');
    this.widgetId = `altair-${Math.random().toString(36).substring(2, 9)}`;
    this.data = {
      title: 'Data Visualization',
      spec: '{}', // Initialize with empty object JSON string
      config: {
        theme: 'dark'
      },
      ...data
    };
  }

  async render(data: AltairData): Promise<string> {
    return `
      <div class="altair-widget">
        <div class="visualization-container">
          <div id="${this.widgetId}" class="vega-embed"></div>
        </div>
      </div>
    `;
  }

  async postRender(element: HTMLElement, data: AltairData): Promise<void> {
    try {
      const container = element.querySelector(`#${this.widgetId}`) as HTMLElement;
      if (!container) {
        throw new Error('Visualization container not found');
      }

      // Handle empty or invalid spec
      if (!data.spec) {
        container.innerHTML = this.createLoadingState();
        return;
      }

      let spec;
      try {
        spec = JSON.parse(data.spec);
      } catch (parseError) {
        console.error('Failed to parse Altair spec:', parseError);
        container.innerHTML = this.createErrorState('Invalid visualization specification');
        return;
      }

      const config = data.config || {};

      await vegaEmbed(container, spec, {
        theme: (config.theme || 'dark') as EmbedOptions['theme'],
        actions: true,
        renderer: 'svg',
        width: config.width,
        height: config.height,
        config: {
          background: config.background,
          view: {
            continuousWidth: 400,
            continuousHeight: 300
          }
        },
        defaultStyle: true,
        downloadFileName: 'visualization',
        logLevel: 2
      });

    } catch (error) {
      console.error('Failed to render Altair visualization:', error);
      element.innerHTML = this.createErrorState(
        error instanceof Error ? error.message : 'Failed to render visualization'
      );
    }
  }

  // Add a loading state method
  createLoadingState(): string {
    return `
      <div class="loading-state">
        <span class="material-symbols-outlined animate-spin">refresh</span>
        <div class="loading-message">Preparing visualization...</div>
      </div>
    `;
  }

  // Add a more detailed error state method
  createErrorState(message: string): string {
    return `
      <div class="error-state">
        <span class="material-symbols-outlined">error</span>
        <div class="error-message">
          <h4>Visualization Error</h4>
          <p>${message}</p>
        </div>
      </div>
    `;
  }

  destroy(): void {
    if (this.container) {
      this.container.innerHTML = '';
      this.container = null;
    }
  }
} 
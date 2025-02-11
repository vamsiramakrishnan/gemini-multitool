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
  | 'carbong100'
  | 'default';

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
      spec: '{}', // Default empty spec
      ...data,
    };
  }

  async render(data: AltairData = this.data): Promise<string> {
    return `
      <div class="altair-widget" id="${this.widgetId}">
        ${this.createLoadingState()}
      </div>
    `;
  }

  async postRender(element: HTMLElement, data: AltairData = this.data): Promise<void> {
    this.container = element.querySelector(`#${this.widgetId}`);
    if (!this.container) {
      console.error('Altair container not found');
      return;
    }

    try {
      const spec = JSON.parse(data.spec);
      const embedOptions: EmbedOptions = {
        actions: true,
        ...(data.config || {}), // Apply user-provided config
      };

      const result = await vegaEmbed(this.container, spec, embedOptions);
      // Remove loading state
      if (this.container) {
          this.container.innerHTML = ''; // Clear loading state
          this.container.appendChild(result.view.container()); // Add the Vega chart
      }

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

  createErrorState(message: string): string {
    return `
      <div class="error-state">
        <span class="material-symbols-outlined">error</span>
        <div class="error-message">${message}</div>
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
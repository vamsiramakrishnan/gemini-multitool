import { BaseWidget, BaseWidgetData } from '../base/base-widget';
import vegaEmbed, { EmbedOptions, isValidSpec } from "vega-embed";
import './altair.scss';

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

export type AltairWidgetProps = AltairData;

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
    if (data) {
      this.validateAndLogSpec(data);
    }
    this.data = {
      title: 'Data Visualization',
      spec: '{}', // Default empty spec
      ...data,
    };
  }

  private validateAndLogSpec(data: AltairData): void {
    console.group('[AltairWidget] Data Validation');
    try {
      const spec = JSON.parse(data.spec);

      // Check if it's a valid Vega-Lite spec
      if (spec.$schema) {
      } else {
      }
  
      // Basic structure validation
      if (!spec.mark) console.warn('No mark type specified');
      if (!spec.encoding) console.warn('No encodings specified');
      if (!spec.data) console.warn('No data specified');

    } catch (error) {
      console.error('Invalid JSON spec:', error);
      console.log('Raw spec:', data.spec);
    }
    console.groupEnd();
  }

  async render(data: AltairData = this.data): Promise<string> {
    return `
      <div class="altair-widget" id="${this.widgetId}">
        <div class="chart-container">
          ${this.createLoadingState()}
        </div>
      </div>
    `;
  }

  async postRender(element: HTMLElement, data: AltairData = this.data): Promise<void> {
    console.group('[AltairWidget] Post-render');
    this.validateAndLogSpec(data);

    this.container = element.querySelector(`#${this.widgetId}`);
    if (!this.container) {
      console.error('Container not found');
      console.groupEnd();
      return;
    }

    try {
      const spec = JSON.parse(data.spec);
      const embedOptions: EmbedOptions = {
        actions: true,
        ...(data.config || {}),
      };

      const result = await vegaEmbed(this.container, spec, embedOptions);

      if (this.container) {
        this.container.innerHTML = '';
        const viewContainer = result.view.container();
        if (viewContainer) {
          this.container.appendChild(viewContainer);
        }
      }

    } catch (error) {
      console.error('Render error:', error);
      if (this.container) {
        this.container.innerHTML = this.createErrorState(
          error instanceof Error ? error.message : 'Failed to render visualization'
        );
      }
    }
    console.groupEnd();
  }

  // Add a loading state method
  createLoadingState(): string {
    return `
      <div class="loading-state">
        <span class="material-symbols-outlined">sync</span>
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
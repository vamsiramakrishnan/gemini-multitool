import { BaseWidget, BaseWidgetData } from '../base/base-widget';
import './explainer-widget.scss';

interface ExplanationSection {
  title: string;
  content: string;
  key_points?: string[];
  type?: string;
  language?: string;
}

interface VisualContent {
  type: 'diagram' | 'chart';
  title: string;
  description: string;
  data?: any;
  style: 'simple' | 'detailed' | 'technical' | 'artistic';
}

interface InteractiveElement {
  type: 'quiz' | 'exercise' | 'simulation' | 'explorable_example' | 'practice_problem';
  title: string;
  content: any;
}

// Simplified ExplainerData to match our schema
export interface ExplainerData extends BaseWidgetData {
  topic: string;
  style: string;
  level: string;
  format: string;
  sections: ExplanationSection[];
  metadata: {
    word_count: number;
    difficulty_progression: string;
    key_points_covered: number;
  };
  error?: string;
  loading?: boolean;
}

export class ExplainerWidget extends BaseWidget<ExplainerData> {
  constructor(data: ExplainerData) {
    super(data);
  }

  private renderSections(sections: ExplanationSection[]): string {
    return sections.map(section => `
      <div class="section">
        <h3 class="section-title">${section.title}</h3>
        <div class="section-content">${section.content}</div>
        ${section.key_points ? `
          <div class="key-points">
            <h4 class="key-points-title">Key Points</h4>
            <ul>
              ${section.key_points.map(point => `<li>${point}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `).join('');
  }

  private renderVisuals(visuals: VisualContent[] = []): string {
    return visuals.map(visual => `
      <div class="visual ${visual.type}" data-style="${visual.style}">
        <h4>${visual.title}</h4>
        <p>${visual.description}</p>
        ${visual.type === 'chart' && visual.data ? `
          <div class="chart-container" data-chart='${JSON.stringify(visual.data)}'></div>
        ` : ''}
      </div>
    `).join('');
  }

  private renderInteractiveElements(elements: InteractiveElement[] = []): string {
    return elements.map(element => `
      <div class="interactive-element ${element.type}">
        <h4>${element.title}</h4>
        <div class="interactive-content" data-content='${JSON.stringify(element.content)}'></div>
      </div>
    `).join('');
  }

  private renderMetadata(metadata: ExplainerData['metadata']): string {
    return `
      <div class="metadata-section">
        <div class="metadata-item">
          <span class="label">Word Count:</span>
          <span class="value">${metadata.word_count}</span>
        </div>
        <div class="metadata-item">
          <span class="label">Difficulty:</span>
          <span class="value">${metadata.difficulty_progression}</span>
        </div>
        <div class="metadata-item">
          <span class="label">Key Points:</span>
          <span class="value">${metadata.key_points_covered}</span>
        </div>
      </div>
    `;
  }

  async render(data: ExplainerData = this.data): Promise<string> {
    // Update internal data
    this.data = { ...this.data, ...data };

    if (this.data.error) {
      return `
        <div class="explainer-widget error">
          <div class="error-icon">
            <span class="material-symbols-outlined">error</span>
          </div>
          <h3 class="error-title">Error</h3>
          <div class="error-message">${this.data.error}</div>
        </div>
      `;
    }

    if (this.data.loading) {
      return `
        <div class="explainer-widget loading">
          <div class="loading-spinner"></div>
          <div class="loading-message">Generating explanation...</div>
        </div>
      `;
    }

    const {
      topic,
      style,
      level,
      format,
      sections,
      visuals,
      interactive_elements,
      metadata
    } = data || this.data;

    return `
      <div class="explainer-widget">
        <div class="explainer-header">
          <h2 class="title">Explanation</h2>
        </div>
        
        <div class="explainer-content">
          <div class="topic-header">
            <h2 class="topic-title">${topic}</h2>
            <div class="meta-info">
              <span class="badge style">${style}</span>
              <span class="badge level">${level}</span>
              <span class="badge format">${format}</span>
            </div>
          </div>
          
          <div class="sections">
            ${this.renderSections(sections)}
          </div>
          
          ${visuals && visuals.length > 0 ? `
            <div class="visuals">
              ${this.renderVisuals(visuals)}
            </div>
          ` : ''}
          
          ${interactive_elements && interactive_elements.length > 0 ? `
            <div class="interactive-elements">
              ${this.renderInteractiveElements(interactive_elements)}
            </div>
          ` : ''}
          
          ${this.renderMetadata(metadata)}
        </div>
      </div>
    `;
  }

  async postRender(element: HTMLElement): Promise<void> {
    // Add syntax highlighting for code blocks if any
    const codeBlocks = element.querySelectorAll('pre code');
    if (codeBlocks.length > 0) {
      try {
        const hljs = await import('highlight.js');
        codeBlocks.forEach(block => {
          hljs.default.highlightElement(block as HTMLElement);
        });
      } catch (error) {
        console.error('Failed to load highlight.js:', error);
      }
    }
  }

  destroy(): void {
    // Cleanup any resources if needed
  }
} 
import { BaseWidget, BaseWidgetData } from '../base/base-widget';
import './table.scss';

export interface TableData extends BaseWidgetData {
  markdown: string;
  title?: string;
  description?: string;
  isLoading?: boolean;
  error?: string;
}

export class TableWidget extends BaseWidget<TableData> {
  constructor(data?: TableData) {
    super('Table View');
    this.data = {
      title: 'Table View',
      markdown: '',
      ...data
    };
  }

  private parseMarkdownTable(markdown: string = ''): { headers: string[], rows: string[][] } {
    const lines = (markdown || '').trim().split('\n');
    if (lines.length < 3) return { headers: [], rows: [] };

    // Parse headers
    const headers = lines[0]
      .trim()
      .split('|')
      .filter(cell => cell.trim())
      .map(cell => cell.trim());

    // Skip separator line
    const rows = lines.slice(2)
      .map(line => line
        .trim()
        .split('|')
        .filter(cell => cell.trim())
        .map(cell => cell.trim())
      );

    return { headers, rows };
  }

  async render(data: TableData = this.data): Promise<string> {
    // Update internal data
    this.data = { ...this.data, ...data };
    
    if (this.data.isLoading) {
      return this.createLoadingState();
    }
    
    if (this.data.error) {
      return this.createErrorState(this.data.error);
    }
    
    const markdown = this.data?.markdown || '';
    const { headers, rows } = this.parseMarkdownTable(markdown);

    if (headers.length === 0) {
      return this.createErrorState('Invalid table data');
    }

    return `
      <div class="table-widget">
        ${this.data.title ? `<h3 class="table-title">${this.data.title}</h3>` : ''}
        ${this.data.description ? `<p class="table-description">${this.data.description}</p>` : ''}
        <div class="table-container">
          <table>
            <thead>
              <tr>
                ${headers.map(header => `<th>${header}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${rows.map(row => `
                <tr>
                  ${row.map(cell => `<td>${cell}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
  
  private createLoadingState(): string {
    return `
      <div class="table-widget loading">
        <div class="skeleton title"></div>
        <div class="skeleton description"></div>
        <div class="skeleton table"></div>
      </div>
    `;
  }
  
  private createErrorState(message: string): string {
    return `
      <div class="table-widget error">
        <div class="error-icon">
          <span class="material-symbols-outlined">error_outline</span>
        </div>
        <div class="error-message">${message || 'Unable to load table data'}</div>
      </div>
    `;
  }
} 
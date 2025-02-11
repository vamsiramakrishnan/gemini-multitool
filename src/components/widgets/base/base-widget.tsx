import './base-widget.scss';
import { useState } from 'react';

export interface BaseWidgetData {
  title?: string;
  description?: string;
  [key: string]: any;  // Allow additional properties
}

export abstract class BaseWidget<T extends BaseWidgetData = BaseWidgetData> {
  protected data: T;
  protected element: HTMLElement | null = null;
  protected currentState: 'maximize' | 'minimize' | 'restore' = 'maximize';
  protected contentHeight: number = 0;
  private isTransitioning = false;

  constructor(title = 'Widget') {
    this.data = { title } as T;
  }

  // Public method to access widget data
  getData(): T {
    return { ...this.data };
  }

  async render(data: T = this.data): Promise<string> {
    this.data = { ...this.data, ...data };
    return `
      <div class="widget-base">
        <div class="widget-header">
          <h2 class="widget-title">${this.data.title}</h2>
          ${this.renderControls()}
        </div>
        <div class="widget-content">
          <div class="widget-scroll-container">
            ${await this.renderContent()}
          </div>
        </div>
      </div>
    `;
  }

  protected async renderContent(): Promise<string> {
    return this.createLoadingState();
  }

  protected createLoadingState(): string {
    return `
      <div class="widget-loading">
        <div class="loading-indicator">
          <div class="loading-spinner"></div>
          <span class="loading-text">Loading...</span>
        </div>
      </div>
    `;
  }

  createErrorState(error: string): string {
    return `
      <div class="p-4">
        <div class="alert alert-error shadow-lg backdrop-blur-sm">
          <div class="flex items-center gap-2">
            <div class="avatar placeholder animate-pulse">
              <div class="w-8 h-8 rounded-full bg-error-content/10">
                <span class="material-symbols-outlined text-error-content">error</span>
              </div>
            </div>
            <div>
              <h3 class="font-bold text-error-content">Error</h3>
              <div class="text-sm text-error-content/80">${error}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  protected renderEmptyState(): string {
    return `
      <div class="hero min-h-[300px] bg-base-200/50 rounded-box backdrop-blur-sm">
        <div class="hero-content text-center">
          <div class="max-w-md">
            <div class="avatar placeholder mb-8 animate-float">
              <div class="w-24 h-24 rounded-full bg-base-300 ring-2 ring-base-content/10">
                <span class="material-symbols-outlined text-5xl text-base-content/50">
                  location_off
                </span>
              </div>
            </div>
            <h2 class="text-2xl font-bold mb-4">No Results Found</h2>
            <p class="text-base-content/70">
              No relevant results were found
            </p>
          </div>
        </div>
      </div>
    `;
  }

  async postRender(element: HTMLElement): Promise<void> {
    this.element = element;
    
    // Bind control events
    const minimizeBtn = element.querySelector('.minimize-btn');
    const maximizeBtn = element.querySelector('.maximize-btn');
    
    minimizeBtn?.addEventListener('click', () => this.handleStateChange('minimize'));
    maximizeBtn?.addEventListener('click', () => {
      this.handleStateChange(this.isMaximized ? 'restore' : 'maximize');
    });
  }

  destroy(): void {
    if (this.element) {
      this.element.innerHTML = '';
      this.element = null;
    }
    // Clear internal data on destroy
    this.data = { title: 'Widget' } as T;
  }

  protected createResponsiveColumns(columns: string[]): string {
    return `
      <div class="flex flex-col md:flex-row gap-4">
        ${columns.map(column => `
          <div class="flex-1">${column}</div>
        `).join('')}
      </div>
    `;
  }

  createInfoCard(icon: string, title: string, value: string, color = 'primary'): string {
    return `
      <div class="card bg-${color}/5 hover:bg-${color}/10 transition-all duration-300 backdrop-blur-sm">
        <div class="card-body p-4">
          <div class="flex items-center gap-4">
            <div class="avatar placeholder animate-pulse">
              <div class="w-12 h-12 rounded-xl bg-${color}/10 text-${color} ring-2 ring-${color}/20">
                <span class="material-symbols-outlined text-2xl">${icon}</span>
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-base-content/70 text-sm font-medium truncate">${title}</p>
              <p class="text-base-content font-bold text-lg truncate">${value}</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  createStatCard(title: string, value: string, description: string, trend: number | null = null, color = 'primary'): string {
    const trendIcon = trend ? (trend > 0 ? 'trending_up' : 'trending_down') : '';
    const trendColor = trend ? (trend > 0 ? 'success' : 'error') : color;
    
    return `
      <div class="card bg-base-200/50 hover:bg-base-200 transition-all duration-300 backdrop-blur-sm">
        <div class="card-body p-4">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-base-content/70 text-sm font-medium">${title}</h3>
            ${trend !== null ? `
              <div class="badge badge-${trendColor} badge-sm gap-1">
                <span class="material-symbols-outlined text-sm">${trendIcon}</span>
                ${Math.abs(trend)}%
              </div>
            ` : ''}
          </div>
          <p class="text-2xl font-bold text-base-content">${value}</p>
          <p class="text-base-content/70 text-sm mt-1">${description}</p>
        </div>
      </div>
    `;
  }

  createBadge(text: string, color = 'primary', icon: string | null = null): string {
    return `
      <div class="badge badge-${color} gap-2 p-3 font-medium">
        ${icon ? `<span class="material-symbols-outlined text-sm">${icon}</span>` : ''}
        ${text}
      </div>
    `;
  }

  createDivider(text = ''): string {
    return `
      <div class="divider text-base-content/50 text-sm font-medium">${text}</div>
    `;
  }

  createEmptyState(message: string, action: { icon: string, text: string } | null = null): string {
    return `
      <div class="flex flex-col items-center justify-center p-8 text-base-content/70">
        <div class="avatar placeholder mb-4 animate-float">
          <div class="w-16 h-16 rounded-full bg-base-300 ring-2 ring-base-content/10">
            <span class="material-symbols-outlined text-3xl">inbox</span>
          </div>
        </div>
        <p class="text-sm font-medium text-center">${message}</p>
        ${action ? `
          <button class="btn btn-primary btn-sm mt-4 gap-2 animate-pulse">
            <span class="material-symbols-outlined">${action.icon}</span>
            ${action.text}
          </button>
        ` : ''}
      </div>
    `;
  }

  createDataGrid(data: any[], columns: { label: string, key: string, type?: string }[]): string {
    return `
      <div class="overflow-x-auto -mx-4 sm:mx-0">
        <div class="inline-block min-w-full align-middle">
          <table class="table table-zebra w-full">
            <thead>
              <tr>
                ${columns.map(col => `
                  <th class="bg-base-200/50 whitespace-nowrap px-4 py-3 text-sm font-medium">
                    ${col.label}
                  </th>
                `).join('')}
              </tr>
            </thead>
            <tbody class="divide-y divide-base-200/50">
              ${data.map(row => `
                <tr class="hover:bg-base-200/50 transition-colors">
                  ${columns.map(col => `
                    <td class="px-4 py-3 text-sm">
                      ${this.formatCellContent(row[col.key], col.type)}
                    </td>
                  `).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  formatCellContent(content: any, type = 'text'): string {
    switch (type) {
      case 'number':
        return Number(content).toLocaleString();
      case 'currency':
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(content);
      case 'percentage':
        return `${Number(content).toFixed(2)}%`;
      case 'date':
        return new Date(content).toLocaleDateString();
      default:
        return content;
    }
  }

  createChart(config: any): string {
    const chartId = `chart-${Math.random().toString(36).substr(2, 9)}`;
    return `
      <div class="w-full h-64 bg-base-200/50 rounded-box p-4">
        <canvas id="${chartId}"></canvas>
      </div>
      <script>
        new Chart(document.getElementById('${chartId}'), ${JSON.stringify(config)});
      </script>
    `;
  }

  createTabs(tabs: { label: string, content: string }[]): string {
    const tabId = `tabs-${Math.random().toString(36).substr(2, 9)}`;
    return `
      <div class="tabs tabs-boxed bg-base-200/50 p-1 mb-4">
        ${tabs.map((tab, i) => `
          <button class="tab ${i === 0 ? 'tab-active' : ''}" 
                  onclick="this.closest('.widget-content').querySelector('.tab-content-${tabId}').dataset.activeTab = '${i}'">
            ${tab.label}
          </button>
        `).join('')}
      </div>
      <div class="tab-content-${tabId}" data-active-tab="0">
        ${tabs.map((tab, i) => `
          <div class="tab-pane ${i === 0 ? '' : 'hidden'}" data-tab="${i}">
            ${tab.content}
          </div>
        `).join('')}
      </div>
    `;
  }

  createAccordion(items: { title: string, content: string }[]): string {
    return `
      <div class="space-y-2">
        ${items.map((item, i) => `
          <div class="collapse collapse-arrow bg-base-200/50">
            <input type="radio" name="accordion-${Math.random().toString(36).substr(2, 9)}" ${i === 0 ? 'checked' : ''} /> 
            <div class="collapse-title text-base font-medium">
              ${item.title}
            </div>
            <div class="collapse-content">
              ${item.content}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  createTimeline(events: { time: string, icon: string, title: string, description: string }[]): string {
    return `
      <ul class="timeline timeline-vertical">
        ${events.map((event, i) => `
          <li>
            <div class="timeline-start text-sm">${event.time}</div>
            <div class="timeline-middle">
              <div class="avatar placeholder">
                <div class="w-8 h-8 rounded-full bg-primary/10 text-primary">
                  <span class="material-symbols-outlined text-sm">${event.icon}</span>
                </div>
              </div>
            </div>
            <div class="timeline-end timeline-box bg-base-200/50">
              <h3 class="font-medium">${event.title}</h3>
              <p class="text-sm text-base-content/70">${event.description}</p>
            </div>
            ${i !== events.length - 1 ? '<hr/>' : ''}
          </li>
        `).join('')}
      </ul>
    `;
  }

  createResponsiveGrid(items: string[], minWidth = '300px'): string {
    return `
      <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(min(100%, ${minWidth}), 1fr));">
        ${items.join('')}
      </div>
    `;
  }

  protected createScrollableContent(content: string): string {
    return `
      <div class="widget-content-scrollable">
        ${content}
      </div>
    `;
  }

  // Add responsive text helpers
  protected createResponsiveText(text: string, size: 'sm' | 'base' | 'lg' = 'base'): string {
    const sizes = {
      sm: 'clamp(0.75rem, 1.5vw, 0.875rem)',
      base: 'clamp(0.875rem, 2vw, 1rem)',
      lg: 'clamp(1rem, 2.5vw, 1.25rem)'
    };

    return `<span style="font-size: ${sizes[size]}">${text}</span>`;
  }

  protected handleStateChange(state: 'maximize' | 'minimize' | 'restore'): void {
    if (!this.element) return;

    const widget = this.element.closest('.widget-base');
    if (!widget) return;

    // Prevent multiple rapid state changes
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    // Add transition class
    widget.classList.add(state === 'minimize' ? 'collapsing' : 'expanding');

    // Update state classes
    requestAnimationFrame(() => {
      if (state === 'minimize') {
        widget.classList.add('minimized');
        widget.classList.remove('maximized');
      } else if (state === 'maximize') {
        widget.classList.add('maximized');
        widget.classList.remove('minimized');
      } else {
        widget.classList.remove('maximized', 'minimized');
      }

      // Remove transition class after animation
      setTimeout(() => {
        widget.classList.remove('collapsing', 'expanding');
        this.isTransitioning = false;
      }, 300);
    });
  }

  // Add getter for state
  get isMinimized(): boolean {
    return this.currentState === 'minimize';
  }

  get isMaximized(): boolean {
    return this.currentState === 'maximize';
  }

  protected renderControls(): string {
    return `
      <div class="widget-controls">
        <button class="minimize-btn" onclick="this.closest('.widget-base').querySelector('.widget-content').classList.toggle('minimized')">
          <span class="material-symbols-outlined">
            ${this.isMinimized ? 'expand_more' : 'expand_less'}
          </span>
        </button>
        <button class="maximize-btn" onclick="this.closest('.widget-base').classList.toggle('maximized')">
          <span class="material-symbols-outlined">
            ${this.isMaximized ? 'close_fullscreen' : 'open_in_full'}
          </span>
        </button>
      </div>
    `;
  }
}

// Extend BaseWidget to include state and controls
export abstract class StatefulBaseWidget<T extends BaseWidgetData = BaseWidgetData> extends BaseWidget<T> {
  async render(data: T = this.data): Promise<string> {
    return `
      <div class="widget-card">
        <div class="widget-header">
          <h2 class="widget-title text-xl font-bold">${data.title}</h2>
          <div class="widget-header-controls">
            <button class="widget-header-control" onclick="(window as any).app.toggleMinimizeWidget(this.closest('.widget-card'))">
              <span class="material-symbols-outlined">${this.isMinimized ? 'expand_less' : 'expand_more'}</span>
            </button>
            <button class="widget-header-control" onclick="(window as any).app.toggleMaximizeWidget(this.closest('.widget-card'))">
              <span class="material-symbols-outlined">${this.isMaximized ? 'close_fullscreen' : 'open_in_full'}</span>
            </button>
          </div>
        </div>
        <div class="widget-content ${this.isMinimized ? 'hidden' : ''}">
          ${this.createLoadingState()}
        </div>
      </div>
    `;
  }
} 
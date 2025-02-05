import { BaseWidget, BaseWidgetData } from './base-widget';
import './search-widget.scss'; // Import SCSS for styling

export interface SearchSupport {
  groundingChunkIndices: number[];
  segment: {
    text: string;
  };
}

export interface SearchChunk {
  index: number;
  web?: {
    title?: string;
    uri?: string;
  };
  score?: number;
}

export interface SearchEntryPoint {
  renderedContent?: string;
}

export interface GroundingMetadata {
  groundingChunks: SearchChunk[];
  groundingSupports: SearchSupport[];
  searchEntryPoint?: SearchEntryPoint;
  webSearchQueries?: string[];
}

export interface SearchData extends BaseWidgetData {
  groundingMetadata?: GroundingMetadata;
  error?: string;
}

export class SearchWidget extends BaseWidget<SearchData> {
  protected data: SearchData;
  private highlightedSupportText: Record<number, string> = {}; // Cache highlighted text

  constructor(data?: SearchData) {
    super('Search');
    this.data = {
      title: 'Search',
      groundingMetadata: {
        groundingChunks: [],
        groundingSupports: [],
        webSearchQueries: []
      },
      ...data
    };
  }

  async render(data: SearchData): Promise<string> {
    if (!data || data.error) {
      return this.createErrorState(data?.error || 'No search results available');
    }

    const { groundingMetadata } = data;
    if (!groundingMetadata || !groundingMetadata.groundingChunks ||
      groundingMetadata.groundingChunks.length === 0) {
      return this.renderEmptyState();
    }

    return `
      <div class="search-widget">
        <div class="search-container">
          ${this.renderSearchEntryPoint(groundingMetadata.searchEntryPoint)}
          ${this.renderSearchQueries(groundingMetadata.webSearchQueries)}
          ${this.renderResultsCount(groundingMetadata.groundingChunks)}
          ${this.renderSearchResults(groundingMetadata)}
        </div>
      </div>
    `;
  }

  private renderSearchEntryPoint(entryPoint?: SearchEntryPoint): string {
    if (!entryPoint?.renderedContent) return '';
    return `
      <div class="search-entry-point">
        ${entryPoint.renderedContent}
      </div>
    `;
  }

  private renderSearchQueries(queries?: string[]): string {
    if (!queries?.length) return '';
    return `
      <div class="search-queries">
        ${queries.map(query => `
          <span class="query-badge">
            <span class="material-symbols-outlined query-icon">search</span>
            ${query}
          </span>
        `).join('')}
      </div>
    `;
  }

  private renderResultsCount(chunks: SearchChunk[]): string {
    return `
      <div class="results-counter">
        <span class="material-symbols-outlined counter-icon">format_list_bulleted</span>
        Found ${chunks.length} relevant results
      </div>
    `;
  }

  private renderSearchResults(metadata: GroundingMetadata): string {
    return `
      <div class="results-grid">
        <div class="answer-container">
          <div class="answer-summary">
            <h2 class="answer-title">Key Points about India's Budget 2025-26</h2>
            
            <div class="main-content">
              ${this.renderMainPoints(metadata.groundingSupports)}
            </div>

            <div class="bibliography-section">
              <h3 class="bibliography-title">Sources</h3>
              ${this.renderBibliography(metadata.groundingChunks)}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderMainPoints(supports: SearchSupport[]): string {
    if (!supports.length) return '';

    return `
      <div class="key-points">
        <ul class="points-list">
          ${supports.map((support, idx) => `
            <li class="point-item">
              <div class="point-content">
                ${this.highlightRelevantText(support.segment.text, idx)}
                ${this.renderInlineCitations(support.groundingChunkIndices)}
              </div>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }

  private renderInlineCitations(indices: number[]): string {
    return `<sup class="citations">[${indices.map(i => i + 1).join(', ')}]</sup>`;
  }

  private renderBibliography(chunks: SearchChunk[]): string {
    return `
      <div class="bibliography-list">
        ${chunks.map((chunk, idx) => `
          <div class="bibliography-item" id="ref-${idx + 1}">
            <div class="ref-number">[${idx + 1}]</div>
            <div class="ref-content">
              <a href="${chunk.web?.uri}" 
                 class="ref-title" 
                 target="_blank" 
                 rel="noopener noreferrer"
              >
                ${chunk.web?.title || 'Untitled'}
              </a>
              <span class="ref-url">${chunk.web?.uri}</span>
              ${chunk.score ? `
                <span class="ref-relevance">
                  Relevance: ${(chunk.score * 100).toFixed(0)}%
                </span>
              ` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  private highlightRelevantText(text: string, chunkIndex: number): string {
    if (this.highlightedSupportText[chunkIndex]) {
      return this.highlightedSupportText[chunkIndex]; // Return cached if available
    }

    // Simple keyword highlighting (replace with more sophisticated logic if needed)
    const keywords = this.data.groundingMetadata?.webSearchQueries || [];
    let highlighted = text;
    keywords.forEach(keyword => {
      const regex = new RegExp(`(${keyword})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark>$1</mark>');
    });

    this.highlightedSupportText[chunkIndex] = highlighted; // Cache highlighted text
    return highlighted;
  }

  private renderResultActions(url: string, title: string): string {
    return `
      <div class="result-actions">
        <a href="${url}"
          target="_blank"
          rel="noopener noreferrer"
          class="btn">
          <span class="material-symbols-outlined action-icon">open_in_new</span>
          Visit
        </a>
        ${this.renderShareButton(url, title)}
      </div>
    `;
  }

  private renderShareButton(url: string, title: string): string {
    return `
      <div class="dropdown dropdown-end share-dropdown">
        <button tabindex="0" class="btn btn-ghost btn-md gap-3">
          <span class="material-symbols-outlined share-icon">share</span>
          Share
        </button>
        <ul tabindex="0" class="dropdown-content menu p-3 shadow-xl bg-base-200 rounded-box w-60 share-menu">
          <li>
            <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}"
              target="_blank" rel="noopener noreferrer">
              <span class="material-symbols-outlined share-icon">share</span>
              Twitter
            </a>
          </li>
          <li>
            <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}"
              target="_blank" rel="noopener noreferrer">
              <span class="material-symbols-outlined share-icon">facebook</span>
              Facebook
            </a>
          </li>
          <li>
            <a href="https://www.linkedin.com/shareArticle?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}"
              target="_blank" rel="noopener noreferrer">
              <span class="material-symbols-outlined share-icon">work</span>
              LinkedIn
            </a>
          </li>
          <li>
            <button onclick="navigator.clipboard.writeText('${url}').then(() => alert('URL copied to clipboard!'))">
              <span class="material-symbols-outlined share-icon">content_copy</span>
              Copy Link
            </button>
          </li>
        </ul>
      </div>
    `;
  }

  protected renderEmptyState(): string {
    return `
      <div class="empty-state">
        <div class="empty-content">
          <span class="material-symbols-outlined empty-icon">search_off</span>
          <h2>No Results Found</h2>
          <p>No relevant search results were found for your query</p>
        </div>
      </div>
    `;
  }

  destroy(): void {
    // Clean up any subscriptions/timers if needed
  }
} 
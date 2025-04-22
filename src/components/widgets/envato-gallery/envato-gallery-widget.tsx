import React, { useState, useEffect, useRef } from 'react';
import './envato-gallery-widget.scss';
import { BaseWidget, BaseWidgetData } from '../base/base-widget';
import { debounce } from 'lodash';
import { 
  EnvatoCategory, 
  EnvatoBaseItem,
  EnvatoPhotoItem,
  EnvatoVideoItem,
  EnvatoAudioItem,
  EnvatoGraphicsItem,
  searchEnvatoElements,
  EnvatoItem,
} from '../../../lib/tools/envato-api';

// Widget-specific item interface with display properties
export interface EnvatoGalleryItem extends EnvatoBaseItem {
  displayProperties: {
    thumbnailUrl: string;
    previewUrl?: string | null;
    mediaType: 'image' | 'video' | 'audio' | 'generic';
    aspectRatio: number;
  };
  fullDetails?: any;
  downloads?: number;
  likes?: number;
}

export interface EnvatoSearchResult {
  items: EnvatoGalleryItem[];
  query: string;
  category: EnvatoCategory;
  filters?: Record<string, any>;
  pagination?: {
    nextPageUrl?: string;
    currentPage?: number;
    totalPages?: number;
  } | null;
  timestamp?: string;
  isLoadingMore?: boolean;
}

export interface EnvatoGalleryData extends BaseWidgetData {
  originalQuery?: string;
  searchResults: EnvatoSearchResult[];
  lastUpdated?: string;
  previewItem?: EnvatoGalleryItem | null;
  isPreviewLoading?: boolean;
}

// Helper to check item type - **REVISED**
const isPhoto = (item: EnvatoItem): item is EnvatoPhotoItem => item.itemType === 'photo';
const isVideo = (item: EnvatoItem): item is EnvatoVideoItem => item.itemType === 'video_motion_graphics'; // Assuming this is the type string for videos, adjust if needed
const isAudio = (item: EnvatoItem): item is EnvatoAudioItem => item.itemType === 'audio_music_track'; // Assuming this is the type string for audio, adjust if needed
const isGraphic = (item: EnvatoItem): item is EnvatoGraphicsItem => item.itemType === 'graphic'; // Assuming this is the type string for graphics, adjust if needed

// --- Add guards for other types if/when supported ---
// const is3d = (item: EnvatoItem): item is Envato3dItem => item.itemType === '3d'; 
// const isFont = (item: EnvatoItem): item is EnvatoFontItem => item.itemType === 'font'; 
// const isVideoTemplate = (item: EnvatoItem): item is EnvatoVideoTemplateItem => item.itemType === 'video_template'; // Example
// const isGraphicTemplate = (item: EnvatoItem): item is EnvatoGraphicTemplateItem => item.itemType === 'graphic_template'; // Example

export class EnvatoGalleryWidget extends BaseWidget<EnvatoGalleryData> {
  private previousResultCount: number = 0;
  private animationTimeoutIds: number[] = [];
  private widgetElementRef: HTMLElement | null = null;

  constructor(data?: EnvatoGalleryData) {
    // Initialize with default values first, then spread in any provided data
    super({
      title: 'Envato Gallery',
      searchResults: [],
      previewItem: null,
      isPreviewLoading: false,
      ...data
    });
    
    this.handleItemClick = this.handleItemClick.bind(this);
    this.handleLoadMoreClick = this.handleLoadMoreClick.bind(this);
    this.closePreviewModal = this.closePreviewModal.bind(this);
  }

  private updateState(newState: Partial<EnvatoGalleryData>) {
    this.data = { ...this.data, ...newState };
    if (this.widgetElementRef) {
      this.renderContent().then(content => {
        if (this.widgetElementRef) {
          this.widgetElementRef.innerHTML = content;
          this.postRender(this.widgetElementRef);
        }
      }).catch(error => {
        console.error("Error re-rendering widget:", error);
        if (this.widgetElementRef) {
           this.widgetElementRef.innerHTML = `<div class="widget-error">Error updating widget: ${error.message}</div>`;
        }
      });
    } else {
       console.warn("Widget element ref not available for state update.");
    }
  }

  async renderContent(): Promise<string> {
    // Store a reference to this.data.searchResults to prevent it from being reset
    const originalSearchResults = this.data.searchResults;
    
    // Ensure searchResults is always an array
    if (!Array.isArray(this.data.searchResults)) {
      console.error('searchResults is not an array in renderContent!');
      
      // Initialize with empty array but don't reset if it was lost during rendering
      if (originalSearchResults === undefined || originalSearchResults === null) {
        this.data.searchResults = [];
      }
    }
    
    this.previousResultCount = this.data.searchResults.length || 0;

    const {
      title = 'Envato Gallery',
      description,
      originalQuery = '',
      lastUpdated,
      previewItem,
      isPreviewLoading
    } = this.data;

    // Important: Don't destructure searchResults as it loses the array reference
    const searchResults = this.data.searchResults;

    // Debug: Log what data we're receiving
    console.log(`EnvatoGalleryWidget rendering content with ${searchResults.length} search results, originalQuery: "${originalQuery}"`);

    if (!searchResults || searchResults.length === 0) {
      console.log('EnvatoGalleryWidget rendering empty state - no search results');
      return this.renderEmptyState();
    }

    const groupedResults = searchResults.reduce<Record<EnvatoCategory, EnvatoSearchResult[]>>(
      (acc, result) => {
        if (!acc[result.category]) {
          acc[result.category] = [];
        }
        if (result && Array.isArray(result.items)) {
           acc[result.category].push(result);
        } else {
           console.warn(`Skipping invalid search result for category ${result?.category}`);
        }
        return acc;
      },
      {} as Record<EnvatoCategory, EnvatoSearchResult[]>
    );

    const categories = Object.keys(groupedResults).sort() as EnvatoCategory[];
    const totalItems = searchResults.reduce((count, result) => count + (result?.items?.length || 0), 0);
    const totalSearches = searchResults.length;

    console.log(`EnvatoGalleryWidget rendering ${totalItems} items in ${categories.length} categories`);

    return `
      <div class="envato-gallery-widget">
        ${this.renderPreviewModal(previewItem ?? null, isPreviewLoading ?? false)} 
        <div class="gallery-header">
          <div class="header-top">
            <h2>${title}</h2>
            ${lastUpdated ? `
              <div class="last-updated" title="Last updated: ${new Date(lastUpdated).toLocaleString()}">
                <span class="material-symbols-outlined">update</span>
                <span class="update-time">${this.formatTimeAgo(lastUpdated)}</span>
              </div>
            ` : ''}
          </div>
          ${description ? `<p class="gallery-description">${description}</p>` : ''}
          ${originalQuery ? `
            <div class="original-query">
              <span class="query-label">Original Query:</span>
              <span class="query-text">${originalQuery}</span>
            </div>
          ` : ''}
          <div class="stats-bar">
            <div class="stat-item">
              <span class="stat-value">${totalItems}</span>
              <span class="stat-label">Total Items</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">${totalSearches}</span>
              <span class="stat-label">Searches</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">${categories.length}</span>
              <span class="stat-label">Categories</span>
            </div>
          </div>
        </div>
        
        <div class="categories-tabs">
          <div class="category-tab active" data-category="all">
            <span class="category-icon">
              <span class="material-symbols-outlined">apps</span>
            </span>
            <span class="category-name">All</span>
            <span class="category-count">${totalSearches}</span>
          </div>
          ${categories.map(category => this.renderCategoryTab(category, groupedResults[category].length)).join('')}
        </div>
        
        <div class="gallery-content">
          ${categories.map(category => this.renderCategorySection(category, groupedResults[category])).join('')}
        </div>
      </div>
    `;
  }

  private formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'just now';
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  }

  protected renderEmptyState(message?: string): string {
    return `
      <div class="envato-gallery-widget empty">
        <div class="empty-state">
          <span class="material-symbols-outlined empty-icon">image_search</span>
          <h3>No results yet</h3>
          <p>${message || 'Search for content across Envato categories to populate this gallery.'}</p>
        </div>
      </div>
    `;
  }

  private renderCategoryTab(category: EnvatoCategory, count: number): string {
    const displayName = this.getCategoryDisplayName(category);
    return `
      <div class="category-tab" data-category="${category}">
        <span class="category-icon">${this.getCategoryIcon(category)}</span>
        <span class="category-name">${displayName}</span>
        <span class="category-count">${count}</span>
      </div>
    `;
  }

  private renderFilters(filters: Record<string, any> = {}): string {
    if (!filters) return '';
    
    return Object.entries(filters)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => {
        const displayKey = key.replace(/([A-Z])/g, ' $1').toLowerCase();
        const displayValue = Array.isArray(value) 
          ? value.join(', ') 
          : typeof value === 'object' 
            ? Object.entries(value)
                .filter(([_, v]) => v)
                .map(([k]) => k)
                .join(', ')
            : value;
            
        if (!displayValue || (Array.isArray(displayValue) && displayValue.length === 0)) {
          return '';
        }
        
        return `
          <div class="filter-badge">
            <span class="filter-key">${displayKey}</span>
            <span class="filter-value">${displayValue}</span>
          </div>
        `;
      })
      .join('');
  }

  private renderQueryGroup(result: EnvatoSearchResult, category: EnvatoCategory, queryIndex: number): string {
    if (!result.items || result.items.length === 0) {
      console.log(`Query group ${result.query} has no items`);
      return '';
    }
    
    console.log(`Rendering query group for "${result.query}" with ${result.items.length} items`);

    const timestamp = result.timestamp 
      ? `<span class="query-timestamp" title="${new Date(result.timestamp).toLocaleString()}">${this.formatTimeAgo(result.timestamp)}</span>` 
      : '';
      
    const canLoadMore = result.pagination?.nextPageUrl || (result.pagination?.currentPage && result.pagination?.totalPages && result.pagination.currentPage < result.pagination.totalPages);
    const currentPage = result.pagination?.currentPage || 1;

    return `
      <div class="query-group" data-category="${category}" data-query-index="${queryIndex}">
        <div class="query-header">
          <div class="query-info">
            <h4 class="query-text">${result.query}</h4>
            ${timestamp}
          </div>
          <div class="filter-badges">
            ${this.renderFilters(result.filters)}
          </div>
        </div>
        <div class="items-grid">
          ${result.items.map((item) => this.renderItem(item, category)).join('')}
        </div>
        ${canLoadMore ? `
          <div class="pagination-controls">
            <button 
              class="load-more-button" 
              data-action="load-more" 
              data-category="${category}" 
              data-query-index="${queryIndex}"
              data-current-page="${currentPage}"
              ${result.isLoadingMore ? 'disabled' : ''}
            >
              ${result.isLoadingMore ? 'Loading...' : 'Load More'}
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }

  private renderItem(item: EnvatoGalleryItem, category: EnvatoCategory): string {
    const mediaType = item.displayProperties.mediaType;
    const thumbnailUrl = item.displayProperties.thumbnailUrl || 'placeholder.jpg';
    
    // Use a more elegant approach for handling aspect ratio
    const aspectRatio = item.displayProperties.aspectRatio || 16/9;
    
    let thumbnailContent = '';
    
    if (mediaType === 'video') {
      thumbnailContent = `
        <div class="play-button">
          <span class="material-symbols-outlined">play_circle</span>
        </div>
        <img src="${thumbnailUrl}" alt="${item.title}" loading="lazy" />
      `;
    } else if (mediaType === 'audio') {
      thumbnailContent = `
        <div class="play-button audio">
          <span class="material-symbols-outlined">music_note</span>
        </div>
        <img src="${thumbnailUrl}" alt="${item.title}" loading="lazy" />
      `;
    } else {
      thumbnailContent = `
        <img src="${thumbnailUrl}" alt="${item.title}" loading="lazy" />
      `;
    }
    
    return `
      <div class="gallery-item" 
           data-item-id="${item.id}" 
           data-category="${category}" 
           data-media-type="${mediaType}"
           data-action="preview-item" 
           role="button" 
           tabindex="0" 
           aria-label="Preview ${item.title}">
        <div class="item-badge ${category}">${this.getCategoryDisplayName(category)}</div>
        <div class="item-thumbnail">
          ${thumbnailContent}
        </div>
        <div class="item-content">
          <h4 class="item-title">${item.title}</h4>
          <div class="item-meta">
            <span class="item-author">by ${item.author}</span>
            <div class="item-stats">
              ${item.downloads ? `<span class="downloads"><span class="material-symbols-outlined">download</span>${item.downloads}</span>` : ''}
              ${item.likes ? `<span class="likes"><span class="material-symbols-outlined">favorite</span>${item.likes}</span>` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderCategorySection(category: EnvatoCategory, results: EnvatoSearchResult[]): string {
    if (!results || results.length === 0) return '';

    const totalItems = results.reduce((count, result) => count + (result?.items?.length || 0), 0);
    
    console.log(`Rendering category section for ${category} with ${totalItems} items`);

    return `
      <div class="category-section" data-category="${category}">
        <h3 class="category-title ${category}">
          <span class="category-icon">${this.getCategoryIcon(category)}</span>
          ${this.getCategoryDisplayName(category)}
          <span class="item-count">${totalItems} item${totalItems !== 1 ? 's' : ''}</span>
        </h3>
        
        <div class="gallery-grid">
          ${results.flatMap(result => result.items || []).map(item => this.renderItem(item, category)).join('')}
        </div>
        
        ${results.length > 1 ? 
          `<div class="query-groups">
            ${results.map((result, index) => this.renderQueryGroup(result, category, index)).join('')}
          </div>` : ''
        }
      </div>
    `;
  }

  private renderPreviewModal(item: EnvatoGalleryItem | null, isLoading: boolean = false): string {
    if (!item && !isLoading) return '<div class="preview-modal-backdrop hidden"></div>';

    const backdropClass = item || isLoading ? '' : 'hidden';
    
    let content = '';
    if (isLoading) {
      content = '<div class="modal-loading">Loading details...</div>';
    } else if (item) {
      const mediaType = item.displayProperties.mediaType;
      const previewUrl = item.displayProperties.previewUrl || item.displayProperties.thumbnailUrl;
      
      let mediaElement = '';
      if (mediaType === 'video' && previewUrl) {
        const videoSrc = item.fullDetails?.video?.standard || previewUrl;
        mediaElement = `<video controls src="${videoSrc}" preload="metadata"></video>`;
      } else if (mediaType === 'audio' && previewUrl) {
        const audioSrc = item.fullDetails?.audioSourceUrl || item.fullDetails?.musicVariants?.mainTrack?.audioSourceUrl?.mp3 || previewUrl;
        mediaElement = `<audio controls src="${audioSrc}" preload="metadata"></audio>`;
      } else if (previewUrl) {
        mediaElement = `<img src="${previewUrl}" alt="${item.title}" />`;
      }

      content = `
        <div class="modal-header">
          <h2>${item.title}</h2>
          <button class="modal-close-button" data-action="close-modal" aria-label="Close preview">&times;</button>
        </div>
        <div class="modal-body">
          <div class="modal-media">${mediaElement}</div>
          <div class="modal-details">
            <p><strong>Author:</strong> <a href="${item.authorUrl}" target="_blank" rel="noopener noreferrer">${item.author}</a></p>
            <p><strong>Category:</strong> ${this.getCategoryDisplayName(item.itemType as EnvatoCategory)}</p>
            ${item.fullDetails?.bpm ? `<p><strong>BPM:</strong> ${item.fullDetails.bpm}</p>` : ''}
            ${item.fullDetails?.trackDurations ? `<p><strong>Duration(s):</strong> ${item.fullDetails.trackDurations.map((d: number) => `${Math.floor(d/60)}:${String(d%60).padStart(2,'0')}`).join(', ')}</p>` : ''}
            <a href="${item.itemUrl}" target="_blank" rel="noopener noreferrer" class="envato-link-button">
              View on Envato Elements <span class="material-symbols-outlined">open_in_new</span>
            </a>
          </div>
        </div>
      `;
    }

    return `
      <div class="preview-modal-backdrop ${backdropClass}" data-action="close-modal-backdrop">
        <div class="preview-modal">
          ${content}
        </div>
      </div>
    `;
  }

  private async handleItemClick(event: Event) {
    const target = event.currentTarget as HTMLElement;
    const itemId = target.dataset.itemId;
    const category = target.dataset.category as EnvatoCategory;

    if (!itemId || !category) return;

    console.log(`Item clicked: ${itemId}, Category: ${category}`);
    this.updateState({ isPreviewLoading: true, previewItem: null });

    try {
      let itemToShow: EnvatoGalleryItem | undefined;
      for (const result of this.data.searchResults || []) {
         if (result.category === category) {
            itemToShow = result.items.find(i => i.id === itemId);
            if (itemToShow) break;
         }
      }

      if (itemToShow) {
         this.updateState({ previewItem: itemToShow, isPreviewLoading: false });
      } else {
         console.error(`Item ${itemId} not found in widget data.`);
         this.updateState({ isPreviewLoading: false });
      }

    } catch (error) {
      console.error(`Error fetching/showing item details for ${itemId}:`, error);
      this.updateState({ isPreviewLoading: false });
    }
  }

  private async handleLoadMoreClick(event: Event) {
    const button = event.currentTarget as HTMLButtonElement;
    const category = button.dataset.category as EnvatoCategory;
    const queryIndex = parseInt(button.dataset.queryIndex || '-1', 10);
    const currentPage = parseInt(button.dataset.currentPage || '1', 10);

    if (!category || queryIndex < 0) return;

    const searchResults = this.data.searchResults || [];
    const targetResult = searchResults.find(res => res.category === category && searchResults.indexOf(res) === queryIndex);
    
    let resultIndex = -1;
    let countInCategory = 0;
    for(let i = 0; i < searchResults.length; i++) {
        if (searchResults[i].category === category) {
            if (countInCategory === queryIndex) {
                resultIndex = i;
                break;
            }
            countInCategory++;
        }
    }

    if (resultIndex === -1) {
        console.error(`Could not find search result for category ${category} at index ${queryIndex}`);
        return;
    }
    
    const targetResultRef = searchResults[resultIndex];

    if (!targetResultRef) {
       console.error(`Target search result not found for category ${category}, index ${queryIndex}`);
       return;
    }

    const nextPage = currentPage + 1;
    console.log(`Loading more for: ${category} - ${targetResultRef.query} (Page ${nextPage})`);

    targetResultRef.isLoadingMore = true;
    this.updateState({ searchResults: [...searchResults] });

    try {
      const searchOptions = {
        ...targetResultRef.filters,
        query: targetResultRef.query,
        category: category,
        page: nextPage
      };
      
      const apiResult = await searchEnvatoElements(searchOptions);

      if ('error' in apiResult) {
        throw new Error(apiResult.error);
      }

      const newItems = (apiResult.items || []).map(item => ({
        ...item,
        displayProperties: {
          thumbnailUrl: this.getThumbnailUrl(item),
          previewUrl: this.getPreviewUrl(item),
          mediaType: this.getMediaType(item),
          aspectRatio: (item as any).aspectRatio || 1.77
        }
      }));

      targetResultRef.items.push(...newItems);
      targetResultRef.pagination = apiResult.pagination ? { ...apiResult.pagination, currentPage: nextPage } : null;
      targetResultRef.isLoadingMore = false;

      this.updateState({ searchResults: [...searchResults] });

    } catch (error) {
      console.error(`Error loading more items for ${category} - ${targetResultRef.query}:`, error);
      targetResultRef.isLoadingMore = false;
      this.updateState({ searchResults: [...searchResults] });
    }
  }

  private closePreviewModal(event?: Event) {
     if (event && (event.target as HTMLElement).closest('.preview-modal')) {
        return;
     }
     console.log("Closing modal");
     this.updateState({ previewItem: null, isPreviewLoading: false });
  }

  async postRender(element: HTMLElement): Promise<void> {
    this.widgetElementRef = element;
    
    // Attach event listeners to gallery items
    const galleryItems = element.querySelectorAll('.gallery-item[data-action="preview-item"]');
    galleryItems.forEach(item => {
      item.addEventListener('click', this.handleItemClick);
      item.addEventListener('keydown', this.handleItemKeydown as EventListener);
    });
    
    // Attach event listeners to load more buttons
    const loadMoreButtons = element.querySelectorAll('button.load-more-button[data-action="load-more"]');
    loadMoreButtons.forEach(button => {
      button.addEventListener('click', this.handleLoadMoreClick);
    });
    
    // Close modal when clicking the close button or outside the modal content
    const closeModalButton = element.querySelector('.modal-close');
    if (closeModalButton) {
      closeModalButton.addEventListener('click', this.closePreviewModal);
    }
    
    const previewModal = element.querySelector('.preview-modal');
    if (previewModal) {
      previewModal.addEventListener('click', (e) => {
        if (e.target === previewModal) {
          this.closePreviewModal();
        }
      });
    }
    
    // Handle Esc key for modal
    document.addEventListener('keydown', this.handleEscapeKey.bind(this));
    
    // Set up category tabs
    const categoryTabs = element.querySelectorAll('.category-tab');
    categoryTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const categoryId = (e.currentTarget as HTMLElement).dataset.category;
        if (!categoryId) return;
        
        // Update active tab
        const allTabs = element.querySelectorAll('.category-tab');
        allTabs.forEach(t => t.classList.remove('active'));
        (e.currentTarget as HTMLElement).classList.add('active');
        
        // Show/hide sections based on category
        const showAll = categoryId === 'all';
        const sections = element.querySelectorAll('.category-section');
        
        sections.forEach(section => {
          const sectionCategory = (section as HTMLElement).dataset.category;
          if (showAll || sectionCategory === categoryId) {
            (section as HTMLElement).style.display = '';
          } else {
            (section as HTMLElement).style.display = 'none';
          }
        });
      });
    });
    
    // Animate items in view with staggered animation
    const animateItemsInView = () => {
      const itemsToAnimate = element.querySelectorAll('.gallery-item:not(.animate-in)');
      let delay = 0;
      
      itemsToAnimate.forEach((item, index) => {
        const rect = item.getBoundingClientRect();
        const isInView = rect.top < window.innerHeight && rect.bottom > 0;
        
        if (isInView) {
          delay = index % 12 * 50; // Stagger animation in groups of 12 items
          setTimeout(() => {
            item.classList.add('animate-in');
          }, delay);
        }
      });
    };
    
    // Initial animation
    setTimeout(animateItemsInView, 100);
    
    // Set up scroll listener for animation
    const scrollHandler = debounce(animateItemsInView, 100);
    const galleryContent = element.querySelector('.gallery-content');
    if (galleryContent) {
      galleryContent.addEventListener('scroll', scrollHandler);
    }
    
    // Clean up previous animation timeouts
    this.animationTimeoutIds.forEach(id => window.clearTimeout(id));
    this.animationTimeoutIds = [];
  }

  private handleEscapeKey(event: KeyboardEvent) {
     if (event.key === 'Escape' && (this.data.previewItem || this.data.isPreviewLoading)) {
        this.closePreviewModal();
     }
  }

  private handleItemKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      this.handleItemClick(event);
    }
  }

  destroy(): void {
     super.destroy();
     if (this.widgetElementRef) {
        this.widgetElementRef.ownerDocument.removeEventListener('keydown', this.handleEscapeKey);
     }
     this.animationTimeoutIds.forEach(id => window.clearTimeout(id));
     this.animationTimeoutIds = [];
     this.widgetElementRef = null;
  }

  private getCategoryDisplayName(category: EnvatoCategory): string {
    switch (category) {
      case 'photos': return 'Photos';
      case 'stock-video': return 'Stock Videos';
      case 'audio': return 'Audio';
      case 'graphics': return 'Graphics';
      case '3d': return '3D';
      case 'fonts': return 'Fonts';
      case 'video-templates': return 'Video Templates';
      case 'graphic-templates': return 'Graphic Templates';
      default: 
        const catStr = category as string; 
        return catStr ? catStr.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : 'Unknown';
    }
  }

  private getCategoryIcon(category: EnvatoCategory): string {
    let iconName = '';
    
    switch (category) {
      case 'photos': iconName = 'photo_camera'; break;
      case 'stock-video': iconName = 'videocam'; break;
      case 'audio': iconName = 'music_note'; break;
      case 'graphics': iconName = 'brush'; break;
      case '3d': iconName = 'view_in_ar'; break;
      case 'fonts': iconName = 'text_format'; break;
      case 'video-templates': iconName = 'movie'; break;
      case 'graphic-templates': iconName = 'palette'; break;
      default: iconName = 'category';
    }
    
    return `<span class="material-symbols-outlined">${iconName}</span>`;
  }

  private getThumbnailUrl(item: any): string {
    if (!item) return 'placeholder.jpg';
    if (item.fallbackSrc) return item.fallbackSrc;
    if (item.imageSrcSet) {
      const firstUrl = item.imageSrcSet.split(' ')[0];
      return firstUrl;
    }
    if (item.itemType === 'audio' || item.audioSourceUrl) return 'https://elements-cover-images-0.imgix.net/default_item_type_covers/music.jpg';
    if (item.itemType === 'fonts') return 'https://elements-cover-images-0.imgix.net/default_item_type_covers/font.jpg';
    return 'https://elements-cover-images-0.imgix.net/default_item_type_covers/photo.jpg';
  }
  
  private getPreviewUrl(item: any): string | null {
    if (!item) return null;
    if (item.video?.standard) return item.video.standard;
    if (item.audioSourceUrl) return item.audioSourceUrl;
    if (item.musicVariants?.mainTrack?.audioSourceUrl?.mp3) return item.musicVariants.mainTrack.audioSourceUrl.mp3;
    return null;
  }
  
  private getMediaType(item: any): 'image' | 'video' | 'audio' | 'generic' {
    if (!item) return 'generic';
    if (item.video) return 'video';
    if (item.audioSourceUrl || item.musicVariants) return 'audio';
    if (item.itemType === 'photos' || item.imageSrcSet || item.fallbackSrc) return 'image';
    return 'generic';
  }
}

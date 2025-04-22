import { WidgetManager } from '../../widget-manager';
import { EnvatoCategory } from '../../tools/envato-api';
import { WidgetType } from '../../../components/widgets/registry';

// Define proper Envato item types based on schema analysis
interface EnvatoBaseItem {
  id: string;
  itemUuid: string;
  title: string;
  author: string;
  authorUrl: string;
  authorId: string | null;
  displayType: string;
  itemUrl: string;
  isNew: boolean;
  itemType: string;
  itemTypeName: string;
  itemTypeNameEn: string;
  similarItemsUrl: string;
}

interface EnvatoPhotoItem extends EnvatoBaseItem {
  imageSrcSet: string;
  aspectRatio: number;
  fallbackSrc: string;
  editItemUrl: string;
  blurredBackgroundSrc: null;
  categories: null;
  categoryNames: null;
}

interface EnvatoVideoItem extends EnvatoBaseItem {
  imageSrcSet: string;
  aspectRatio: number;
  video: {
    standard: string;
  };
}

interface EnvatoAudioItem extends EnvatoBaseItem {
  bpm: number;
  trackDurations: number[];
  audioSourceUrl: string;
  waveformUrl: string;
  musicVariants?: {
    mainTrack: {
      id: string;
      title: string;
      duration: number;
      waveformUrl: string;
      audioSourceUrl: {
        mp3: string;
        m4a: string;
      }
    };
    variantTracks: Array<{
      id: string;
      title: string;
      duration: number;
      waveformUrl: string;
      audioSourceUrl: {
        mp3: string;
        m4a: string;
      }
    }>;
  };
}

interface EnvatoGraphicsItem extends EnvatoBaseItem {
  imageSrcSet: string;
  aspectRatio: number;
  fallbackSrc: string;
  categories: string[];
  categoryNames: string[];
}

// Union type for all possible Envato items
export type EnvatoItem = EnvatoPhotoItem | EnvatoVideoItem | EnvatoAudioItem | EnvatoGraphicsItem;

interface EnvatoWidgetData {
  items: EnvatoItem[];
  category: EnvatoCategory;
  query: string;
  filters?: Record<string, any>;
  pagination?: any;
}

interface GeminiEnvatoData {
  data: EnvatoWidgetData;
  originalQuery?: string;
}

/**
 * Base class for Envato handlers with common functionality
 */
export class EnvatoBaseHandler {
  protected widgetManager: WidgetManager;
  
  constructor(widgetManager: WidgetManager) {
    this.widgetManager = widgetManager;
  }
  
  /**
   * Get or create gallery widget for displaying Envato search results
   */
  protected async getOrCreateGalleryWidget(query: string): Promise<string> {
    try {
      // Try to find existing gallery widget
      const widgets = this.widgetManager.getWidgets();
      
      // Look for an existing gallery widget
      for (const [id, widget] of widgets.entries()) {
        if (widget.widget && widget.widget.constructor.name === 'EnvatoGalleryWidget') {
          console.log(`Found existing gallery widget with ID: ${id}`);
          return id;
        }
      }
      
      // If no gallery widget exists, create a new one
      console.log('Creating new gallery widget');
      
      const galleryData = {
        title: `Envato Gallery: ${query}`,
        originalQuery: query,
        searchResults: [], // Explicitly initialize as empty array
        lastUpdated: new Date().toISOString()
      };
      
      const widgetId = await this.widgetManager.createWidget('envato_gallery', galleryData);
      console.log(`Created new gallery widget with ID: ${widgetId}`);
      
      return widgetId;
    } catch (error) {
      console.error('Error getting or creating gallery widget:', error);
      throw error;
    }
  }
  
  /**
   * Add search results to the gallery widget
   */
  protected async addResultsToGallery(
    originalQuery: string, 
    category: EnvatoCategory, 
    query: string, 
    items: EnvatoItem[], 
    filters: Record<string, any>,
    pagination: any
  ): Promise<void> {
    console.log(`Adding ${items?.length || 0} items to gallery for ${category}, query: "${query}"`);
    try {
      // Skip if no items
      if (!items || items.length === 0) {
        console.log(`No items to add to gallery for ${category}. Skipping.`);
        return;
      }
      
      // Get or create gallery widget
      const widgetId = await this.getOrCreateGalleryWidget(originalQuery);
      
      // Get current widget data
      const widgets = this.widgetManager.getWidgets();
      const widget = widgets.get(widgetId);
      
      if (!widget) {
        console.error(`CRITICAL: Widget ${widgetId} not found after getOrCreateGalleryWidget.`);
        throw new Error(`Widget ${widgetId} not found`);
      }
      
      const currentData = widget.widget.getData();
      const searchResults = Array.isArray(currentData.searchResults) ? [...currentData.searchResults] : [];
      
      // Process items to ensure they have all expected properties
      const processedItems = items.map((item: EnvatoItem) => {
        // Add display properties based on item type
        const thumbnailUrl = this.getThumbnailUrl(item);
        const previewUrl = this.getPreviewUrl(item);
        const mediaType = this.getMediaType(item);
        const aspectRatio = this.hasImageSrcSet(item) ? item.aspectRatio || 1.77 : 1.77;
        
        const baseItem = {
          ...item,
          displayProperties: {
            thumbnailUrl,
            previewUrl,
            mediaType,
            aspectRatio
          }
        };
        return baseItem;
      });
      
      // Check if we already have a search result for this category and query
      const existingResultIndex = searchResults.findIndex(
        (result: { category: EnvatoCategory; query: string }) => result.category === category && result.query === query
      );
      
      const timestamp = new Date().toISOString();
      
      if (existingResultIndex >= 0) {
        // Update existing result
        console.log(`Updating existing search result for ${category}, query "${query}"`);
        const existingItems = searchResults[existingResultIndex].items || [];
        const newItemIds = new Set(processedItems.map(item => item.id));
        const combinedItems = [
          ...existingItems.filter((item: EnvatoItem) => !newItemIds.has(item.id)),
          ...processedItems
        ];

        searchResults[existingResultIndex] = {
          ...searchResults[existingResultIndex],
          items: combinedItems,
          filters,
          pagination,
          timestamp
        };
      } else {
        // Add new result
        console.log(`Adding new search result for ${category}, query "${query}"`);
        searchResults.push({
          category,
          query,
          items: processedItems,
          filters,
          pagination,
          timestamp
        });
      }
      
      // Prepare data for widget update
      const updateData = {
        ...currentData,
        originalQuery: currentData.originalQuery || originalQuery,
        searchResults,
        lastUpdated: timestamp
      };

      // Update widget data
      await this.widgetManager.renderWidget(widgetId, updateData);
      
      console.log(`Successfully updated gallery widget ${widgetId} with ${processedItems.length} new items for ${category} - "${query}"`);
    } catch (error) {
      console.error(`Error in addResultsToGallery (Category: ${category}, Query: "${query}"):`, error);
      throw error;
    }
  }
  
  /**
   * Process Envato gallery data coming directly from Gemini
   * This transforms data from Gemini's response into the format expected by the EnvatoGalleryWidget
   */
  async processGeminiEnvatoData(id: string, widgetData: GeminiEnvatoData): Promise<void> {
    try {
      // Handle case when no data is provided or data structure is invalid
      if (!widgetData || !widgetData.data || !widgetData.data.items || !widgetData.data.category || !widgetData.data.query) {
        console.error('Invalid or missing data structure in Gemini response for Envato gallery');
        return;
      }
      
      const data = widgetData.data;
      
      // Get current widget if it exists
      const widgets = this.widgetManager.getWidgets();
      const widget = widgets.get(id);
      
      if (!widget) {
        console.error(`Widget ${id} not found during Gemini data processing.`);
        return;
      }
      
      const currentData = widget.widget.getData() || {};
      // Ensure searchResults is always an array
      const searchResults = Array.isArray(currentData.searchResults) ? [...currentData.searchResults] : [];
      
      // Extract items and metadata from Gemini response
      const { items = [], query, category, filters = {}, pagination } = data;
      const originalQuery = widgetData.originalQuery || query; // Use originalQuery if provided, else fallback to query
      
      if (!items || items.length === 0) {
        console.log('No items to process in Gemini response');
        return;
      }
      
      console.log(`Processing ${items.length} items from Gemini response for category ${category} and query "${query}"`);
      
      // Process items to add required properties for the gallery widget
      const processedItems = items.map((item: any) => {
        // Ensure item is an object
        if (typeof item !== 'object' || item === null) {
          console.warn('Skipping invalid item in Gemini response:', item);
          return null; // Skip invalid items
        }
        
        // Add minimal required properties if they seem missing (basic check)
        const isSimplified = !item.itemUuid && item.id;
        const baseItem = isSimplified ? {
          ...item,
          itemUuid: item.id,
          author: item.author || 'Envato Author',
          authorUrl: item.authorUrl || `https://elements.envato.com/user`,
          authorId: item.authorId || null,
          displayType: item.displayType || category,
          itemUrl: item.itemUrl || `https://elements.envato.com/${category}/${item.id}`,
          isNew: item.isNew || false,
          itemType: item.itemType || category,
          itemTypeName: item.itemTypeName || category,
          itemTypeNameEn: item.itemTypeNameEn || category,
          similarItemsUrl: item.similarItemsUrl || '',
          // Add fallbackSrc for simplified items to ensure they have valid thumbnails
          fallbackSrc: item.fallbackSrc || `https://elements-cover-images-0.imgix.net/default_item_type_covers/${
            category === 'stock-video' ? 'video' : 
            category === 'graphic-templates' ? 'graphics' : 
            category === 'video-templates' ? 'video' : 
            category
          }.jpg`
        } : item;

        // Ensure imageSrcSet exists if we have a fallbackSrc
        if (!baseItem.imageSrcSet && baseItem.fallbackSrc) {
          baseItem.imageSrcSet = baseItem.fallbackSrc;
        }

        // Ensure displayProperties exist
        if (!baseItem.displayProperties) {
          // Get the thumbnail URL with our improved method
          const thumbnailUrl = this.getThumbnailUrl(baseItem);
          const previewUrl = this.getPreviewUrl(baseItem);
          
          // Explicitly determine media type based on category
          let mediaType: 'image' | 'video' | 'audio' | 'generic';
          
          if (category === 'stock-video' || category === 'video-templates') {
            mediaType = 'video';
          } else if (category === 'audio') {
            mediaType = 'audio';
          } else {
            // photos, graphics, 3d, fonts, etc.
            mediaType = 'image';
          }
          
          baseItem.displayProperties = {
            thumbnailUrl,
            previewUrl,
            mediaType,
            aspectRatio: baseItem.aspectRatio || 1.77 // Default 16:9
          };
        }
        
        // Ensure essential fields are present
        if (!baseItem.id || !baseItem.title) {
           console.warn('Skipping item with missing id or title:', baseItem);
           return null;
        }

        return baseItem;
      }).filter((item: EnvatoItem | null): item is EnvatoItem => item !== null); // Filter out any skipped invalid items
      
      if (processedItems.length === 0) {
        console.log('No valid items processed from Gemini response.');
        return;
      }

      // Check if we already have a search result for this category and query
      const existingResultIndex = searchResults.findIndex(
        (result: { category: string; query: string }) => 
          result.category === category && result.query === query
      );
      
      const timestamp = new Date().toISOString();
      
      if (existingResultIndex >= 0) {
        // Update existing result: Append new items, update filters/pagination/timestamp
        console.log(`Updating existing search result at index ${existingResultIndex}`);
        const existingItems = searchResults[existingResultIndex].items || [];
        // Avoid duplicates based on item ID
        const newItemIds = new Set(processedItems.map((item: EnvatoItem) => item.id));
        const combinedItems = [
          ...existingItems.filter((item: EnvatoItem) => !newItemIds.has(item.id)),
          ...processedItems
        ];

        searchResults[existingResultIndex] = {
          ...searchResults[existingResultIndex],
          items: combinedItems,
          filters, // Overwrite filters with the latest ones for this query
          pagination, // Overwrite pagination
          timestamp // Update timestamp
        };
      } else {
        // Add new result
        console.log(`Adding new search result for ${category} - ${query}`);
        searchResults.push({
          category,
          query,
          items: processedItems,
          filters,
          pagination,
          timestamp
        });
      }
      
      // Update widget data
      // Make sure the searchResults is not undefined before updating
      let validSearchResults = searchResults;
      if (!Array.isArray(validSearchResults)) {
        console.error('searchResults is not an array!');
        // Initialize as empty array instead of keeping undefined
        validSearchResults = [];
      }
      
      const updateData = {
        ...(currentData || {}),
        originalQuery: (currentData && currentData.originalQuery) || originalQuery,
        searchResults: validSearchResults,
        lastUpdated: new Date().toISOString()
      };
      
      await this.widgetManager.renderWidget(id, updateData);
      
      console.log(`Successfully updated gallery widget ${id} with ${processedItems.length} processed items from Gemini`);
    } catch (error) {
      console.error(`Error processing Gemini Envato data for widget ${id}:`, error);
    }
  }
  
  /**
   * Get thumbnail URL based on item type
   */
  protected getThumbnailUrl(item: EnvatoItem): string {
    if (!item) return 'placeholder.jpg';

    // Check for fallbackSrc first (most reliable direct URL)
    if ('fallbackSrc' in item && item.fallbackSrc) {
      return item.fallbackSrc;
    }

    // For items with imageSrcSet, extract the first URL
    if (this.hasImageSrcSet(item)) {
      const imageSrcSet = item.imageSrcSet;
      if (imageSrcSet) {
        // Extract the first URL from srcset format
        // Format is typically "url 200w, url 300w, ..." so we take the part before the first space
        const firstUrl = imageSrcSet.split(' ')[0];
        if (firstUrl && firstUrl.startsWith('http')) {
          return firstUrl;
        }
      }
    }

    // Default thumbnails based on type
    if (item.itemType === 'graphics') {
      return 'https://elements-cover-images-0.imgix.net/default_item_type_covers/graphics.jpg';
    }
    
    if (this.isAudioItem(item)) {
      return 'https://elements-cover-images-0.imgix.net/default_item_type_covers/music.jpg';
    }

    if (item.itemType === 'fonts') {
      return 'https://elements-cover-images-0.imgix.net/default_item_type_covers/font.jpg';
    }
    
    if (item.itemType === '3d') {
      return 'https://elements-cover-images-0.imgix.net/default_item_type_covers/3d.jpg';
    }

    // General fallback
    return 'https://elements-cover-images-0.imgix.net/default_item_type_covers/photo.jpg';
  }
  
  /**
   * Check if an item is a video based on item type and properties
   * This properly checks both the item type and presence of video property
   */
  private isVideoItem(item: EnvatoItem): item is EnvatoVideoItem {
    if (!item) return false;
    return item.itemType === 'stock-video' || 
           item.itemType === 'video_motion_graphics' ||
           item.itemType === 'video-templates';
  }

  /**
   * Check if an item is an audio track
   */
  private isAudioItem(item: EnvatoItem): item is EnvatoAudioItem {
    if (!item) return false;
    return item.itemType === 'audio' || 
           item.itemType === 'audio_music_track' ||
           'audioSourceUrl' in item ||
           'musicVariants' in item;
  }

  /**
   * Check if an item has image source properties
   */
  private hasImageSrcSet(item: EnvatoItem): item is EnvatoPhotoItem | EnvatoVideoItem | EnvatoGraphicsItem {
    return 'imageSrcSet' in item;
  }
  
  /**
   * Get preview URL based on item type
   */
  protected getPreviewUrl(item: EnvatoItem): string | null {
    if (!item) return null;

    // Handle different item types
    if (this.isVideoItem(item) && 'video' in item) {
      return item.video?.standard || null;
    }

    if (this.isAudioItem(item)) {
      if ('audioSourceUrl' in item && item.audioSourceUrl) {
        return item.audioSourceUrl;
      }
      if ('musicVariants' in item && item.musicVariants?.mainTrack?.audioSourceUrl?.mp3) {
        return item.musicVariants.mainTrack.audioSourceUrl.mp3;
      }
      return null;
    }

    // For images, return imageSrcSet or fallbackSrc
    if (this.hasImageSrcSet(item)) {
      if (item.imageSrcSet) {
        const firstUrl = item.imageSrcSet.split(' ')[0];
        if (firstUrl) return firstUrl;
      }
      return 'fallbackSrc' in item ? item.fallbackSrc : null;
    }

    return null;
  }
  
  /**
   * Determine media type for the gallery display
   */
  protected getMediaType(item: EnvatoItem): 'image' | 'video' | 'audio' | 'generic' {
    if (!item) return 'generic';

    // Category-based determination - most reliable
    // Photos, graphics, fonts and 3D should be images
    if (item.itemType === 'photos' || 
        item.itemType === 'graphics' || 
        item.itemType === 'graphic-templates' ||
        item.itemType === '3d' ||
        item.itemType === 'fonts') {
      return 'image';
    }
    
    // Videos should be videos
    if (item.itemType === 'stock-video' || 
        item.itemType === 'video_motion_graphics' ||
        item.itemType === 'video-templates') {
      return 'video';
    }
    
    // Audio should be audio
    if (item.itemType === 'audio' || 
        item.itemType === 'audio_music_track') {
      return 'audio';
    }

    // Fallback to property-based checks for unusual item types
    if ('audioSourceUrl' in item || 'musicVariants' in item) {
      return 'audio';
    }
    
    // Check for image properties as a fallback
    if (this.hasImageSrcSet(item) || 'fallbackSrc' in item) {
      return 'image';
    }

    return 'generic';
  }
  
  /**
   * Generic handler with status reporting
   */
  protected async handleWithStatus<T>(
    toolName: string,
    args: any,
    widgetType: string,
    getTitle: () => string,
    handler: () => Promise<T>
  ): Promise<T> {
    try {
      console.log(`Starting ${toolName} with args:`, JSON.stringify(args, null, 2));
      const result = await handler();
      console.log(`Completed ${toolName}`);
      return result;
    } catch (error) {
      console.error(`Error in ${toolName}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      throw new Error(`Error in ${toolName}: ${errorMessage}`);
    }
  }
}

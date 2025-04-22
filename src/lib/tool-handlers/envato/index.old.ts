/**
 * Envato tool handler
 */

import { BaseToolHandler } from '../types';
import { WidgetManager } from '../../widget-manager';
import { 
  searchFonts, 
  searchVideoTemplates,
  searchDesignTemplates,
  search3D,
  searchAudio,
  searchPhotos,
  searchStockVideos,
  searchGraphics,
  EnvatoCategory
} from '../../tools/envato-api';

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
  fallbackSrc: string;
  blurredBackgroundSrc: string;
  categories: string[];
  categoryNames: string[];
}

interface EnvatoAudioItem extends EnvatoBaseItem {
  bpm: number;
  trackDurations: number[];
  audioSourceUrl: string;
  waveformUrl: string;
  musicVariants: {
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
type EnvatoItem = EnvatoPhotoItem | EnvatoVideoItem | EnvatoAudioItem | EnvatoGraphicsItem;

// Gallery result type
interface GalleryResult {
  category: EnvatoCategory;
  query: string;
  items: EnvatoItem[];
  filters: Record<string, any>;
  pagination: any;
}

// Widget creation result type
interface WidgetCreationResult {
  widgetId: string;
  [key: string]: any;
}

export class EnvatoHandler extends BaseToolHandler {
  constructor(widgetManager: WidgetManager, activeTabId: string = 'default') {
    super(widgetManager, activeTabId);
  }

  /**
   * Find a widget by its title or partial title
   */
  private findGalleryWidgetByQuery(query: string): string | null {
    const widgets = this.widgetManager.getWidgets();
    const searchTitle = `Envato Gallery: ${query}`;
    
    for (const [id, widget] of widgets.entries()) {
      if (widget.title.includes(searchTitle)) {
        return id;
      }
    }
    
    return null;
  }

  /**
   * Create a new gallery widget or get an existing one
   */
  private async getOrCreateGalleryWidget(query: string): Promise<string> {
    // Check if widget already exists
    const existingWidgetId = this.findGalleryWidgetByQuery(query);
    if (existingWidgetId) {
      return existingWidgetId;
    }
    
    // Create a new gallery widget with proper typing
    interface WidgetResult {
      widgetId: string;
      [key: string]: any;
    }
    
    const result = await this.widgetManager.createWidget(
      'envato_gallery',
      {
        title: `Envato Gallery: ${query}`,
        description: `Search results for "${query}" across Envato categories`,
        originalQuery: query,
        searchResults: []
      },
      this.activeTabId
    ) as unknown as WidgetResult;
    
    if (!result || !result.widgetId) {
      throw new Error('Failed to create widget: Invalid result from createWidget');
    }
    
    return result.widgetId;
  }

  /**
   * Add search results to the gallery widget
   */
  private async addResultsToGallery(
    originalQuery: string, 
    category: EnvatoCategory, 
    query: string, 
    items: EnvatoItem[], 
    filters: Record<string, any>,
    pagination: any
  ): Promise<void> {
    try {
      console.log(`Adding ${items?.length || 0} ${category} items to gallery for query "${query}"`);
      
      // Skip if no items
      if (!items || items.length === 0) {
        console.log(`No items to add to gallery for ${category}`);
        return;
      }
      
      // Get or create gallery widget
      const widgetId = await this.getOrCreateGalleryWidget(originalQuery);
      console.log(`Using gallery widget with ID: ${widgetId}`);
      
      // Get current widget data
      const widgets = this.widgetManager.getWidgets();
      const widget = widgets.get(widgetId);
      
      if (!widget) {
        throw new Error(`Widget ${widgetId} not found`);
      }
      
      const currentData = widget.widget.getData();
      const searchResults = currentData.searchResults || [];
      
      // Process items based on category to ensure they have all expected properties
      // This ensures the gallery can properly display each type of content
      const processedItems = items.map(item => {
        // Check if this is a simplified item (only has id, title, category)
        // If so, we need to add the missing display properties
        if (!('displayProperties' in item) && 
            Object.keys(item).length <= 3 && 
            'id' in item && 
            'title' in item) {
          console.log(`Processing simplified item: ${item.id}`);
          return {
            ...item,
            // Add minimal required properties for the gallery to work
            itemUuid: item.id,
            author: 'Envato Author',
            authorUrl: `https://elements.envato.com/user`,
            authorId: null,
            displayType: category,
            itemUrl: `https://elements.envato.com/${category}/${item.id}`,
            isNew: false,
            itemType: category,
            itemTypeName: category,
            itemTypeNameEn: category,
            similarItemsUrl: '',
            // Add required display properties
            displayProperties: {
              thumbnailUrl: `https://elements-cover-images-0.imgix.net/default_item_type_covers/${category === 'stock-video' ? 'video' : category === 'graphic-templates' ? 'graphics' : category === 'video-templates' ? 'video' : category}.jpg`,
              previewUrl: null,
              mediaType: category === 'stock-video' || category === 'video-templates' ? 'video' : 
                         category === 'audio' ? 'audio' : 'image',
              aspectRatio: 1.77 // Default 16:9 aspect ratio
            }
          };
        }
        
        // For regular items, add display properties if they don't exist
        if (!('displayProperties' in item)) {
          return {
            ...item,
            displayProperties: {
              thumbnailUrl: this.getThumbnailUrl(item),
              previewUrl: this.getPreviewUrl(item),
              mediaType: this.getMediaType(item),
              aspectRatio: item.aspectRatio || 1
            }
          };
        }
        
        return item;
      });
      
      console.log(`Processed ${processedItems.length} items with display properties`);
      
      // Check if we already have a search result for this category and query
      const existingResultIndex = searchResults.findIndex(
        (result: { category: EnvatoCategory; query: string }) => result.category === category && result.query === query
      );
      
      const timestamp = new Date().toISOString();
      
      if (existingResultIndex >= 0) {
        // Update existing result
        console.log(`Updating existing search result at index ${existingResultIndex}`);
        searchResults[existingResultIndex] = {
          ...searchResults[existingResultIndex],
          items: [...searchResults[existingResultIndex].items, ...processedItems],
          filters,
          pagination,
          timestamp
        };
      } else {
        // Add new result
        console.log(`Adding new search result for ${category}`);
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
      await this.widgetManager.renderWidget(
        widgetId,
        {
          ...currentData,
          searchResults,
          lastUpdated: timestamp
        }
      );
      
      console.log(`Successfully updated gallery widget with ${processedItems.length} new items`);
    } catch (error) {
      console.error('Error adding results to gallery:', error);
      throw error;
    }
  }

  /**
   * Get thumbnail URL based on item type
   */
  private getThumbnailUrl(item: any): string {
    console.log('Getting thumbnail URL for item:', {
      id: item?.id,
      hasImageSrcSet: Boolean(item?.imageSrcSet),
      hasFallbackSrc: Boolean(item?.fallbackSrc),
      itemKeys: item ? Object.keys(item) : []
    });
    
    if (!item) {
      console.error('Item is undefined in getThumbnailUrl');
      return 'https://elements-cover-images-0.imgix.net/default_item_type_covers/photo.jpg';
    }
    
    if (item.fallbackSrc) {
      return item.fallbackSrc;
    }
    
    if (item.imageSrcSet) {
      // Extract the first URL from srcset
      const firstUrl = item.imageSrcSet.split(' ')[0];
      return firstUrl;
    }
    
    // Default placeholder for audio or other types without images
    return 'https://elements-cover-images-0.imgix.net/default_item_type_covers/music.jpg';
  }
  
  /**
   * Get preview URL based on item type
   */
  private getPreviewUrl(item: any): string | null {
    console.log('Getting preview URL for item:', {
      id: item?.id,
      hasVideo: Boolean(item?.video),
      hasStandardVideo: Boolean(item?.video?.standard),
      hasAudioSourceUrl: Boolean(item?.audioSourceUrl),
      itemKeys: item ? Object.keys(item) : []
    });
    
    if (!item) {
      console.error('Item is undefined in getPreviewUrl');
      return null;
    }
    
    if (item.video && item.video.standard) {
      return item.video.standard;
    }
    
    if (item.audioSourceUrl) {
      return item.audioSourceUrl;
    }
    
    return null;
  }
  
  /**
   * Determine media type for the gallery display
   */
  private getMediaType(item: any): string {
    console.log('Getting media type for item:', {
      id: item?.id,
      hasVideo: Boolean(item?.video),
      hasAudioSourceUrl: Boolean(item?.audioSourceUrl),
      displayType: item?.displayType,
      itemType: item?.itemType,
      itemKeys: item ? Object.keys(item) : []
    });
    
    if (!item) {
      console.error('Item is undefined in getMediaType');
      return 'image';
    }
    
    if (item.video) {
      return 'video';
    }
    
    if (item.audioSourceUrl) {
      return 'audio';
    }
    
    return 'image';
  }

  async handleFontsSearch(args: any): Promise<any> {
    const { 
      query, 
      categories = [], 
      spacing = [], 
      optimumSize = [],
      properties = {},
      page = 1,
      addToGallery = false
    } = args;
    
    return this.handleWithStatus<any>(
      'envato_fonts_search',
      args,
      'envato_gallery',
      () => `Envato Fonts Search`,
      async () => {
        const result = await searchFonts(query, {
          categories: categories.length > 0 ? categories : undefined,
          spacing: spacing.length > 0 ? spacing : undefined,
          optimumSize: optimumSize.length > 0 ? optimumSize : undefined,
          properties: {
            isWebfont: properties.isWebfont || false
          },
          page
        });
        
        if ('error' in result) {
          throw new Error(result.error);
        }
        
        // Ensure items is always an array even if API returns undefined
        const fullItems = Array.isArray(result.items) ? result.items : [];
        
        // If addToGallery is true, add results to the gallery widget
        // We'll display up to 10 items in the gallery
        if (addToGallery && fullItems.length > 0) {
          // Use up to 10 items for display in the gallery - use the FULL item data
          const displayItems = fullItems.slice(0, 10);
          await this.addResultsToGallery(
            query, // originalQuery
            'fonts', // category
            query, // query (same as original in this case)
            displayItems, // Pass the full items with all properties
            {
              categories: categories.length > 0 ? categories : undefined,
              spacing: spacing.length > 0 ? spacing : undefined,
              optimumSize: optimumSize.length > 0 ? optimumSize : undefined,
              properties
            },
            result.pagination
          );
          console.log(`Added ${displayItems.length} items to gallery widget`);
        } else if (addToGallery) {
          console.log('No items to add to gallery widget');
        }
        
        // For the response to Gemini, limit to 5 items and simplify each item
        const simplifiedItems = fullItems.slice(0, 5).map(item => ({
          category: 'fonts',
          id: item.id,
          title: item.title
        }));
        
        console.log(`Returning ${simplifiedItems.length} simplified items to Gemini`);
        
        const response = {
          items: simplifiedItems,
          query,
          category: 'fonts' as EnvatoCategory,
          filters: {
            categories: categories.length > 0 ? categories : undefined,
            spacing: spacing.length > 0 ? spacing : undefined,
            optimumSize: optimumSize.length > 0 ? optimumSize : undefined,
            properties
          },
          pagination: result.pagination
        };
        
        return response;
      }
    );
  }

  async handleVideoTemplatesSearch(args: any): Promise<any> {
    const { 
      query, 
      categories = [], 
      resolution = [], 
      applicationsSupported = [],
      requiredPlugins = [],
      page = 1,
      addToGallery = false
    } = args;
    
    return this.handleWithStatus<any>(
      'envato_video_templates_search',
      args,
      'envato_gallery',
      () => `Envato Video Templates Search`,
      async () => {
        const result = await searchVideoTemplates(query, {
          categories: categories.length > 0 ? categories : undefined,
          resolution: resolution.length > 0 ? resolution : undefined,
          applicationsSupported: applicationsSupported.length > 0 ? applicationsSupported : undefined,
          requiredPlugins: requiredPlugins.length > 0 ? requiredPlugins : undefined,
          page
        });
        
        if ('error' in result) {
          throw new Error(result.error);
        }
        
        // Ensure items is always an array even if API returns undefined
        const fullItems = Array.isArray(result.items) ? result.items : [];
        
        // If addToGallery is true, add results to the gallery widget
        // We'll display up to 10 items in the gallery
        if (addToGallery && fullItems.length > 0) {
          // Use up to 10 items for display in the gallery - use the FULL item data
          const displayItems = fullItems.slice(0, 10);
          await this.addResultsToGallery(
            query, // originalQuery
            'video-templates', // category
            query, // query (same as original in this case)
            displayItems, // Pass the full items with all properties
            {
              categories: categories.length > 0 ? categories : undefined,
              resolution: resolution.length > 0 ? resolution : undefined,
              applicationsSupported: applicationsSupported.length > 0 ? applicationsSupported : undefined,
              requiredPlugins: requiredPlugins.length > 0 ? requiredPlugins : undefined
            },
            result.pagination
          );
          console.log(`Added ${displayItems.length} items to gallery widget`);
        } else if (addToGallery) {
          console.log('No items to add to gallery widget');
        }
        
        // For the response to Gemini, limit to 5 items and simplify each item
        const simplifiedItems = fullItems.slice(0, 5).map(item => ({
          category: 'video-templates',
          id: item.id,
          title: item.title
        }));
        
        console.log(`Returning ${simplifiedItems.length} simplified items to Gemini`);
        
        const response = {
          items: simplifiedItems,
          query,
          category: 'video-templates' as EnvatoCategory,
          filters: {
            categories: categories.length > 0 ? categories : undefined,
            resolution: resolution.length > 0 ? resolution : undefined,
            applicationsSupported: applicationsSupported.length > 0 ? applicationsSupported : undefined,
            requiredPlugins: requiredPlugins.length > 0 ? requiredPlugins : undefined
          },
          pagination: result.pagination
        };
        
        return response;
      }
    );
  }

  async handleGraphicTemplatesSearch(args: any): Promise<any> {
    const { 
      query, 
      categories = [], 
      applicationsSupported = [], 
      orientation = [],
      colorSpace = [],
      properties = {},
      page = 1,
      addToGallery = false
    } = args;
    
    const mappedOrientation = orientation.length > 0 ? orientation[0].toLowerCase() : undefined;
    
    return this.handleWithStatus<any>(
      'envato_graphic_templates_search',
      args,
      'envato_gallery',
      () => `Envato Graphic Templates Search`,
      async () => {
        const result = await searchDesignTemplates(query, {
          categories: categories.length > 0 ? categories : undefined,
          applicationsSupported: applicationsSupported.length > 0 ? applicationsSupported : undefined,
          orientation: mappedOrientation as any,
          colorSpace: colorSpace.length > 0 ? colorSpace : undefined,
          properties: {
            isVector: properties.isVector || false,
            isLayered: properties.isLayered || false
          },
          page
        });
        
        if ('error' in result) {
          throw new Error(result.error);
        }
        
        const fullItems = Array.isArray(result.items) ? result.items : [];
        
        // If addToGallery is true, add results to the gallery widget
        // We'll display up to 10 items in the gallery
        if (addToGallery && fullItems.length > 0) {
          // Use up to 10 items for display in the gallery - use the FULL item data
          const displayItems = fullItems.slice(0, 10);
          await this.addResultsToGallery(
            query, // originalQuery
            'graphic-templates', // category
            query, // query (same as original in this case)
            displayItems, // Pass the full items with all properties
            {
              categories: categories.length > 0 ? categories : undefined,
              applicationsSupported: applicationsSupported.length > 0 ? applicationsSupported : undefined,
              orientation: orientation.length > 0 ? orientation : undefined,
              colorSpace: colorSpace.length > 0 ? colorSpace : undefined,
              properties
            },
            result.pagination
          );
          console.log(`Added ${displayItems.length} items to gallery widget`);
        } else if (addToGallery) {
          console.log('No items to add to gallery widget');
        }
        
        // For the response to Gemini, limit to 5 items and simplify each item
        const simplifiedItems = fullItems.slice(0, 5).map(item => ({
          category: 'graphic-templates',
          id: item.id,
          title: item.title
        }));
        
        console.log(`Returning ${simplifiedItems.length} simplified items to Gemini`);
        
        const response = {
          items: simplifiedItems,
          query,
          category: 'graphic-templates' as EnvatoCategory,
          filters: {
            categories: categories.length > 0 ? categories : undefined,
            applicationsSupported: applicationsSupported.length > 0 ? applicationsSupported : undefined,
            orientation: orientation.length > 0 ? orientation : undefined,
            colorSpace: colorSpace.length > 0 ? colorSpace : undefined,
            properties
          },
          pagination: result.pagination
        };
        
        return response;
      }
    );
  }

  async handle3DSearch(args: any): Promise<any> {
    const { 
      query, 
      categories = [], 
      fileType = [], 
      applicationsSupported = [],
      properties = {},
      style = [],
      colors = [],
      page = 1,
      addToGallery = false
    } = args;
    
    return this.handleWithStatus<any>(
      'envato_3d_search',
      args,
      'envato_gallery',
      () => `Envato 3D Search`,
      async () => {
        const result = await search3D(query, {
          categories: categories.length > 0 ? categories : undefined,
          fileType: fileType.length > 0 ? fileType : undefined,
          applicationsSupported: applicationsSupported.length > 0 ? applicationsSupported : undefined,
          properties: {
            isVector: properties.isVector || false,
            isLayered: properties.isLayered || false,
            isTileable: properties.isTileable || false
          },
          style: style.length > 0 ? style : undefined,
          colors: colors.length > 0 ? colors : undefined,
          page
        });
        
        if ('error' in result) {
          throw new Error(result.error);
        }
        
        // Ensure items is always an array even if API returns undefined
        const fullItems = Array.isArray(result.items) ? result.items : [];
        
        // If addToGallery is true, add results to the gallery widget
        // We'll display up to 10 items in the gallery
        if (addToGallery && fullItems.length > 0) {
          // Use up to 10 items for display in the gallery - use the FULL item data
          const displayItems = fullItems.slice(0, 10);
          await this.addResultsToGallery(
            query, // originalQuery
            '3d', // category
            query, // query (same as original in this case)
            displayItems, // Pass the full items with all properties
            {
              categories: categories.length > 0 ? categories : undefined,
              fileType: fileType.length > 0 ? fileType : undefined,
              applicationsSupported: applicationsSupported.length > 0 ? applicationsSupported : undefined,
              properties,
              style: style.length > 0 ? style : undefined,
              colors: colors.length > 0 ? colors : undefined
            },
            result.pagination
          );
          console.log(`Added ${displayItems.length} items to gallery widget`);
        } else if (addToGallery) {
          console.log('No items to add to gallery widget');
        }
        
        // For the response to Gemini, limit to 5 items and simplify each item
        const simplifiedItems = fullItems.slice(0, 5).map(item => ({
          category: '3d',
          id: item.id,
          title: item.title
        }));
        
        console.log(`Returning ${simplifiedItems.length} simplified items to Gemini`);
        
        const response = {
          items: simplifiedItems,
          query,
          category: '3d' as EnvatoCategory,
          filters: {
            categories: categories.length > 0 ? categories : undefined,
            fileType: fileType.length > 0 ? fileType : undefined,
            applicationsSupported: applicationsSupported.length > 0 ? applicationsSupported : undefined,
            properties,
            style: style.length > 0 ? style : undefined,
            colors: colors.length > 0 ? colors : undefined
          },
          pagination: result.pagination
        };
        
        return response;
      }
    );
  }

  async handleAudioSearch(args: any): Promise<any> {
    const { 
      query, 
      duration = [], 
      tempo = [], 
      loops = false,
      mood = [],
      genre = [],
      page = 1,
      addToGallery = false
    } = args;
    
    return this.handleWithStatus<any>(
      'envato_audio_search',
      args,
      'envato_gallery',
      () => `Envato Audio Search`,
      async () => {
        const result = await searchAudio(query, {
          duration: duration.length > 0 ? duration : undefined,
          tempo: tempo.length > 0 ? tempo : undefined,
          loops,
          mood: mood.length > 0 ? mood : undefined,
          genre: genre.length > 0 ? genre : undefined,
          page
        });
        
        if ('error' in result) {
          throw new Error(result.error);
        }
        
        // Ensure items is always an array even if API returns undefined
        const fullItems = Array.isArray(result.items) ? result.items : [];
        
        // If addToGallery is true, add results to the gallery widget
        // We'll display up to 10 items in the gallery
        if (addToGallery && fullItems.length > 0) {
          // Use up to 10 items for display in the gallery - use the FULL item data
          const displayItems = fullItems.slice(0, 10);
          await this.addResultsToGallery(
            query, // originalQuery
            'audio', // category
            query, // query (same as original in this case)
            displayItems, // Pass the full items with all properties
            {
              duration: duration.length > 0 ? duration : undefined,
              tempo: tempo.length > 0 ? tempo : undefined,
              loops,
              mood: mood.length > 0 ? mood : undefined,
              genre: genre.length > 0 ? genre : undefined
            },
            result.pagination
          );
          console.log(`Added ${displayItems.length} items to gallery widget`);
        } else if (addToGallery) {
          console.log('No items to add to gallery widget');
        }
        
        // For the response to Gemini, limit to 5 items and simplify each item
        const simplifiedItems = fullItems.slice(0, 5).map(item => ({
          category: 'audio',
          id: item.id,
          title: item.title
        }));
        
        console.log(`Returning ${simplifiedItems.length} simplified items to Gemini`);
        
        const response = {
          items: simplifiedItems,
          query,
          category: 'audio' as EnvatoCategory,
          filters: {
            duration: duration.length > 0 ? duration : undefined,
            tempo: tempo.length > 0 ? tempo : undefined,
            loops,
            mood: mood.length > 0 ? mood : undefined,
            genre: genre.length > 0 ? genre : undefined
          },
          pagination: result.pagination
        };
        
        return response;
      }
    );
  }

  async handlePhotosSearch(args: any): Promise<any> {
    const { 
      query, 
      orientation = [], 
      background = [], 
      numberOfPeople = [],
      colors = [],
      page = 1,
      addToGallery = false
    } = args;
    
    const mappedOrientation = orientation.length > 0 ? orientation[0].toLowerCase() : undefined;
    const mappedBackground = background.length > 0 ? background[0].toLowerCase() : undefined;
    
    return this.handleWithStatus<any>(
      'envato_photos_search',
      args,
      'envato_gallery',
      () => `Envato Photos Search`,
      async () => {
        const result = await searchPhotos(
          query,
          mappedOrientation as any, 
          { 
            numberOfPeople: numberOfPeople.length > 0 ? numberOfPeople : undefined,
            colors: colors.length > 0 ? colors : undefined,
            background: mappedBackground as any,
            page
          }
        );
        
        if ('error' in result) {
          throw new Error(result.error);
        }
        
        // Ensure items is always an array even if API returns undefined
        const fullItems = Array.isArray(result.items) ? result.items : [];
        
        // If addToGallery is true, add results to the gallery widget
        // We'll display up to 10 items in the gallery
        if (addToGallery && fullItems.length > 0) {
          // Use up to 10 items for display in the gallery - use the FULL item data
          const displayItems = fullItems.slice(0, 10);
          await this.addResultsToGallery(
            query, // originalQuery
            'photos', // category
            query, // query (same as original in this case)
            displayItems, // Pass the full items with all properties
            {
              orientation: orientation.length > 0 ? orientation : undefined,
              background: background.length > 0 ? background : undefined,
              numberOfPeople: numberOfPeople.length > 0 ? numberOfPeople : undefined,
              colors: colors.length > 0 ? colors : undefined
            },
            result.pagination
          );
          console.log(`Added ${displayItems.length} items to gallery widget`);
        } else if (addToGallery) {
          console.log('No items to add to gallery widget');
        }
        
        // For the response to Gemini, limit to 5 items and simplify each item
        const simplifiedItems = fullItems.slice(0, 5).map(item => ({
          category: 'photos',
          id: item.id,
          title: item.title
        }));
        
        console.log(`Returning ${simplifiedItems.length} simplified items to Gemini`);
        
        const response = {
          items: simplifiedItems,
          query,
          category: 'photos' as EnvatoCategory,
          filters: {
            orientation: orientation.length > 0 ? orientation : undefined,
            background: background.length > 0 ? background : undefined,
            numberOfPeople: numberOfPeople.length > 0 ? numberOfPeople : undefined,
            colors: colors.length > 0 ? colors : undefined
          },
          pagination: result.pagination
        };
        
        return response;
      }
    );
  }

  async handleStockVideosSearch(args: any): Promise<any> {
    const { 
      query, 
      resolution = [], 
      frameRate = [], 
      videoLength,
      orientation = [],
      categories = [],
      properties = {},
      page = 1,
      addToGallery = false
    } = args;
    
    // Map array values to parameters
    const mappedOrientation = orientation.length > 0 ? orientation[0].toLowerCase() : undefined;
    
    return this.handleWithStatus<any>(
      'envato_stock_videos_search',
      args,
      'envato_gallery',
      () => `Envato Stock Videos Search`,
      async () => {
        const result = await searchStockVideos(query, {
          orientation: mappedOrientation as any,
          resolution: resolution.length > 0 ? resolution : undefined,
          frameRate: frameRate.length > 0 ? frameRate : undefined,
          videoLength,
          categories: categories.length > 0 ? categories : undefined,
          properties: {
            hasAlphaChannel: properties.hasAlphaChannel || false,
            isLooped: properties.isLooped || false
          },
          page
        });
        
        if ('error' in result) {
          throw new Error(result.error);
        }
        
        // Ensure items is always an array even if API returns undefined
        const fullItems = Array.isArray(result.items) ? result.items : [];
        
        // If addToGallery is true, add results to the gallery widget
        // We'll display up to 10 items in the gallery
        if (addToGallery && fullItems.length > 0) {
          // Use up to 10 items for display in the gallery - use the FULL item data
          const displayItems = fullItems.slice(0, 10);
          await this.addResultsToGallery(
            query, // originalQuery
            'stock-video', // category
            query, // query (same as original in this case)
            displayItems, // Pass the full items with all properties
            {
              orientation: orientation.length > 0 ? orientation : undefined,
              resolution: resolution.length > 0 ? resolution : undefined,
              frameRate: frameRate.length > 0 ? frameRate : undefined,
              videoLength,
              categories: categories.length > 0 ? categories : undefined,
              properties
            },
            result.pagination
          );
          console.log(`Added ${displayItems.length} items to gallery widget`);
        } else if (addToGallery) {
          console.log('No items to add to gallery widget');
        }
        
        // For the response to Gemini, limit to 5 items and simplify each item
        const simplifiedItems = fullItems.slice(0, 5).map(item => ({
          category: 'stock-video',
          id: item.id,
          title: item.title
        }));
        
        console.log(`Returning ${simplifiedItems.length} simplified items to Gemini`);
        
        const response = {
          items: simplifiedItems,
          query,
          category: 'stock-video' as EnvatoCategory,
          filters: {
            orientation: orientation.length > 0 ? orientation : undefined,
            resolution: resolution.length > 0 ? resolution : undefined,
            frameRate: frameRate.length > 0 ? frameRate : undefined,
            videoLength,
            categories: categories.length > 0 ? categories : undefined,
            properties
          },
          pagination: result.pagination
        };
        
        return response;
      }
    );
  }

  async handleGraphicsSearch(args: any): Promise<any> {
    const { 
      query, 
      fileType = [], 
      style = [], 
      colors = [],
      categories = [],
      applicationsSupported = [],
      properties = {},
      page = 1,
      addToGallery = false
    } = args;
    
    return this.handleWithStatus<any>(
      'envato_graphics_search',
      args,
      'envato_gallery',
      () => `Envato Graphics Search`,
      async () => {
        const result = await searchGraphics(
          query,
          {
            fileType: fileType.length > 0 ? fileType : undefined,
            style: style.length > 0 ? style : undefined,
            colors: colors.length > 0 ? colors : undefined,
            categories: categories.length > 0 ? categories : undefined,
            applicationsSupported: applicationsSupported.length > 0 ? applicationsSupported : undefined,
            properties: {
              isVector: properties.isVector || false,
              isLayered: properties.isLayered || false,
              isTileable: properties.isTileable || false
            },
            page
          }
        );
        
        if ('error' in result) {
          throw new Error(result.error);
        }
        
        // Ensure items is always an array even if API returns undefined
        const fullItems = Array.isArray(result.items) ? result.items : [];
        
        // If addToGallery is true, add results to the gallery widget
        // We'll display up to 10 items in the gallery
        if (addToGallery && fullItems.length > 0) {
          // Use up to 10 items for display in the gallery - use the FULL item data
          const displayItems = fullItems.slice(0, 10);
          await this.addResultsToGallery(
            query, // originalQuery
            'graphics', // category
            query, // query (same as original in this case)
            displayItems, // Pass the full items with all properties
            {
              fileType: fileType.length > 0 ? fileType : undefined,
              style: style.length > 0 ? style : undefined,
              colors: colors.length > 0 ? colors : undefined,
              categories: categories.length > 0 ? categories : undefined,
              applicationsSupported: applicationsSupported.length > 0 ? applicationsSupported : undefined,
              properties
            },
            result.pagination
          );
          console.log(`Added ${displayItems.length} items to gallery widget`);
        } else if (addToGallery) {
          console.log('No items to add to gallery widget');
        }
        
        // For the response to Gemini, limit to 5 items and simplify each item
        const simplifiedItems = fullItems.slice(0, 5).map(item => ({
          category: 'graphics',
          id: item.id,
          title: item.title
        }));
        
        console.log(`Returning ${simplifiedItems.length} simplified items to Gemini`);
        
        const response = {
          items: simplifiedItems,
          query,
          category: 'graphics' as EnvatoCategory,
          filters: {
            fileType: fileType.length > 0 ? fileType : undefined,
            style: style.length > 0 ? style : undefined,
            colors: colors.length > 0 ? colors : undefined,
            categories: categories.length > 0 ? categories : undefined,
            applicationsSupported: applicationsSupported.length > 0 ? applicationsSupported : undefined,
            properties
          },
          pagination: result.pagination
        };
        
        return response;
      }
    );
  }
  
  /**
   * Process Envato gallery data coming directly from Gemini
   * This transforms data from Gemini's response into the format expected by the EnvatoGalleryWidget
   */
  async processGeminiEnvatoData(id: string, widgetData: any): Promise<void> {
    try {
      console.log('Processing Gemini Envato data for widget:', id, widgetData);
      
      // Handle case when no data is provided
      if (!widgetData || !widgetData.data) {
        console.error('Invalid or missing data in Gemini response');
        return;
      }
      
      const data = widgetData.data;
      
      // Get current widget if it exists
      const widgets = this.widgetManager.getWidgets();
      const widget = widgets.get(id);
      
      if (!widget) {
        console.error(`Widget ${id} not found`);
        return;
      }
      
      const currentData = widget.widget.getData() || {};
      const searchResults = currentData.searchResults || [];
      
      // Extract items and metadata from Gemini response
      const { items = [], query, category, filters = {}, pagination } = data;
      
      if (!items || items.length === 0) {
        console.log('No items to process in Gemini response');
        return;
      }
      
      console.log(`Processing ${items.length} items from Gemini response`);
      
      // Process items to add required properties for the gallery widget
      const processedItems = items.map((item: { id: string; title: string; category: string }) => {
        // Check if this is a simplified item (only has id, title, category)
        return {
          ...item,
          // Add minimal required properties for the gallery to work
          itemUuid: item.id,
          author: 'Envato Author',
          authorUrl: `https://elements.envato.com/user`,
          authorId: null,
          displayType: category,
          itemUrl: `https://elements.envato.com/${category}/${item.id}`,
          isNew: false,
          itemType: category,
          itemTypeName: category,
          itemTypeNameEn: category,
          similarItemsUrl: '',
          // Add required display properties
          displayProperties: {
            thumbnailUrl: `https://elements-cover-images-0.imgix.net/default_item_type_covers/${category === 'stock-video' ? 'video' : category === 'graphic-templates' ? 'graphics' : category === 'video-templates' ? 'video' : category}.jpg`,
            previewUrl: null,
            mediaType: (category === 'stock-video' || category === 'video-templates' ? 'video' : 
                      category === 'audio' ? 'audio' : 
                      category === 'photos' ? 'image' : 'generic') as 'image' | 'video' | 'audio' | 'generic',
            aspectRatio: 1.77 // Default 16:9 aspect ratio
          }
        };
      });
      
      // Check if we already have a search result for this category and query
      const existingResultIndex = searchResults.findIndex(
        (result: { category: string; query: string }) => 
          result.category === category && result.query === query
      );
      
      const timestamp = new Date().toISOString();
      
      if (existingResultIndex >= 0) {
        // Update existing result
        console.log(`Updating existing search result at index ${existingResultIndex}`);
        searchResults[existingResultIndex] = {
          ...searchResults[existingResultIndex],
          items: [...searchResults[existingResultIndex].items, ...processedItems],
          filters,
          pagination,
          timestamp
        };
      } else {
        // Add new result
        console.log(`Adding new search result for ${category}`);
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
      await this.widgetManager.renderWidget(
        id,
        {
          ...currentData,
          originalQuery: query,
          searchResults,
          lastUpdated: timestamp
        }
      );
      
      console.log(`Successfully updated gallery widget with ${processedItems.length} processed items`);
    } catch (error) {
      console.error('Error processing Gemini Envato data:', error);
    }
  }
  
  /**
   * Handle a request to search across all Envato categories
   * This is a special method that performs multiple searches and combines results
   */
  async handleGallerySearch(args: any): Promise<any> {
    const { 
      query,
      categories = ["photos", "stock-video", "audio", "graphics", "3d", "fonts", "video-templates", "graphic-templates"],
      page = 1
    } = args;
    
    // Create the gallery widget
    const widgetId = await this.getOrCreateGalleryWidget(query);
    
    // Start searches for each requested category
    const searchPromises = categories.map(async (category: EnvatoCategory) => {
      try {
        // Create category-specific search parameters
        const searchArgs = {
          query,
          page,
          addToGallery: true
        };
        
        // Call the appropriate search method based on category
        switch (category) {
          case 'photos':
            await this.handlePhotosSearch(searchArgs);
            break;
          case 'stock-video':
            await this.handleStockVideosSearch(searchArgs);
            break;
          case 'audio':
            await this.handleAudioSearch(searchArgs);
            break;
          case 'graphics':
            await this.handleGraphicsSearch(searchArgs);
            break;
          case '3d':
            await this.handle3DSearch(searchArgs);
            break;
          case 'fonts':
            await this.handleFontsSearch(searchArgs);
            break;
          case 'video-templates':
            await this.handleVideoTemplatesSearch(searchArgs);
            break;
          case 'graphic-templates':
            await this.handleGraphicTemplatesSearch(searchArgs);
            break;
        }
        
        return category;
      } catch (error) {
        console.error(`Error searching ${category}:`, error);
        return null;
      }
    });
    
    // Wait for all searches to complete
    await Promise.all(searchPromises);
    
    // Return the widget ID for reference
    return {
      widgetId,
      message: `Created gallery with search results for "${query}" across ${categories.length} categories`
    };
  }
  
  /**
   * Handle legacy request method (for backward compatibility)
   */
  async handleRequest(args: any): Promise<any> {
    const tool = args.tool;
    
    switch (tool) {
      case 'envato_fonts_search':
        return this.handleFontsSearch(args);
      case 'envato_video_templates_search':
        return this.handleVideoTemplatesSearch(args);
      case 'envato_graphic_templates_search':
        return this.handleGraphicTemplatesSearch(args);
      case 'envato_3d_templates_search':
        return this.handle3DSearch(args);
      case 'envato_audio_search':
        return this.handleAudioSearch(args);
      case 'envato_photos_search':
      case 'search_envato_photos':
        return this.handlePhotosSearch(args);
      case 'envato_stock_videos_search':
      case 'search_envato_stock_videos':
        return this.handleStockVideosSearch(args);
      case 'envato_graphics_search':
      case 'search_envato_graphics':
        return this.handleGraphicsSearch(args);
      case 'envato_3d_search':
      case 'search_envato_3d':
        return this.handle3DSearch(args);
      case 'envato_gallery_search':
      case 'search_envato_gallery':
        return this.handleGallerySearch(args);
      case 'create_envato_gallery':
        return this.getOrCreateGalleryWidget(args.query);
      default:
        throw new Error(`Unknown tool: ${tool}`);
    }
  }
}
import { BaseToolHandler } from '../types';
import { WidgetManager } from '../../widget-manager';
import { EnvatoCategory } from '../../tools/envato-api';
import { EnvatoPhotosHandler } from './handlers/photos-handler';
import { EnvatoVideosHandler } from './handlers/videos-handler';
import { EnvatoAudioHandler } from './handlers/audio-handler';
import { EnvatoGraphicsHandler } from './handlers/graphics-handler';
import { Envato3DHandler } from './handlers/3d-handler';
import { EnvatoFontsHandler } from './handlers/fonts-handler';
import { EnvatoTemplatesHandler } from './handlers/templates-handler';
import { EnvatoBaseHandler } from './base-handler';

/**
 * Handler for Envato API tools
 * Delegates to specialized handlers for each content type
 */
export class EnvatoHandler extends BaseToolHandler {
  private photosHandler: EnvatoPhotosHandler;
  private videosHandler: EnvatoVideosHandler;
  private audioHandler: EnvatoAudioHandler;
  private graphicsHandler: EnvatoGraphicsHandler;
  private threeDHandler: Envato3DHandler;
  private fontsHandler: EnvatoFontsHandler;
  private templatesHandler: EnvatoTemplatesHandler;
  private baseHandler: EnvatoBaseHandler;

  constructor(widgetManager: WidgetManager, activeTabId: string = 'default') {
    super(widgetManager, activeTabId);
    
    // Initialize specialized handlers
    this.photosHandler = new EnvatoPhotosHandler(widgetManager);
    this.videosHandler = new EnvatoVideosHandler(widgetManager);
    this.audioHandler = new EnvatoAudioHandler(widgetManager);
    this.graphicsHandler = new EnvatoGraphicsHandler(widgetManager);
    this.threeDHandler = new Envato3DHandler(widgetManager);
    this.fontsHandler = new EnvatoFontsHandler(widgetManager);
    this.templatesHandler = new EnvatoTemplatesHandler(widgetManager);
    this.baseHandler = new EnvatoBaseHandler(widgetManager);
  }

  /**
   * Handle photos search requests
   */
  async handlePhotosSearch(args: any): Promise<any> {
    return this.photosHandler.handlePhotosSearch(args);
  }

  /**
   * Handle stock videos search requests
   */
  async handleStockVideosSearch(args: any): Promise<any> {
    return this.videosHandler.handleStockVideosSearch(args);
  }

  /**
   * Handle graphics search requests
   */
  async handleGraphicsSearch(args: any): Promise<any> {
    return this.graphicsHandler.handleGraphicsSearch(args);
  }

  /**
   * Handle audio search requests
   */
  async handleAudioSearch(args: any): Promise<any> {
    return this.audioHandler.handleAudioSearch(args);
  }

  /**
   * Handle 3D search requests
   */
  async handle3DSearch(args: any): Promise<any> {
    return this.threeDHandler.handle3DSearch(args);
  }

  /**
   * Handle fonts search requests
   */
  async handleFontsSearch(args: any): Promise<any> {
    return this.fontsHandler.handleFontsSearch(args);
  }

  /**
   * Handle video templates search requests
   */
  async handleVideoTemplatesSearch(args: any): Promise<any> {
    return this.templatesHandler.handleVideoTemplatesSearch(args);
  }

  /**
   * Handle graphic templates search requests
   */
  async handleGraphicTemplatesSearch(args: any): Promise<any> {
    return this.templatesHandler.handleGraphicTemplatesSearch(args);
  }
  
  /**
   * Process Envato gallery data coming directly from Gemini
   * This delegates to the base handler's implementation
   */
  async processGeminiEnvatoData(id: string, widgetData: any): Promise<void> {
    return this.baseHandler.processGeminiEnvatoData(id, widgetData);
  }
  
  /**
   * Handle a request to search across all Envato categories
   * This is a special method that performs multiple searches and combines results
   */
  async handleGallerySearch(args: any): Promise<any> {
    const { query, addToGallery = true } = args;
    
    if (!query) {
      throw new Error('Query is required for gallery search');
    }
    
    try {
      console.log(`Starting gallery search for query: ${query}`);
      
      // Execute searches for each category in parallel
      const promises = [
        this.handlePhotosSearch({ query, addToGallery }),
        this.handleStockVideosSearch({ query, addToGallery }),
        this.handleGraphicsSearch({ query, addToGallery }),
        this.handleAudioSearch({ query, addToGallery }),
        this.handle3DSearch({ query, addToGallery }),
        this.handleFontsSearch({ query, addToGallery }),
        this.handleVideoTemplatesSearch({ query, addToGallery }),
        this.handleGraphicTemplatesSearch({ query, addToGallery })
      ];
      
      // Wait for all searches to complete
      const results = await Promise.allSettled(promises);
      
      console.log(`Gallery search completed with ${results.length} results`);
      
      // Process results, including any errors
      const successResults = results
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value);
      
      const errorResults = results
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .map(result => result.reason);
      
      if (errorResults.length > 0) {
        console.error(`${errorResults.length} errors occurred during gallery search:`, errorResults);
      }
      
      // Combine all items from successful results
      const allItems = successResults.flatMap(result => result.items || []);
      
      return {
        query,
        items: allItems,
        categories: successResults.map(result => result.category),
        totalResults: allItems.length,
        errors: errorResults.length > 0 ? errorResults.map(e => e.message || String(e)) : undefined
      };
    } catch (error) {
      console.error('Error in handleGallerySearch:', error);
      throw error;
    }
  }
  
  /**
   * Handle legacy request method (for backward compatibility)
   */
  async handleRequest(args: any): Promise<any> {
    // Extract action from either 'action' or 'tool' parameter
    const { action, tool, ...otherArgs } = args;
    
    // Map external tool names to internal action names
    const toolToActionMap: Record<string, string> = {
      'search_envato_photos': 'photos_search',
      'search_envato_stock_videos': 'stock_videos_search',
      'search_envato_graphics': 'graphics_search',
      'search_envato_audio': 'audio_search',
      'search_envato_3d': '3d_search',
      'search_envato_fonts': 'fonts_search',
      'search_envato_video_templates': 'video_templates_search',
      'search_envato_graphic_templates': 'graphic_templates_search',
      'envato_fonts_search': 'fonts_search',
      'envato_video_templates_search': 'video_templates_search',
      'envato_graphic_templates_search': 'graphic_templates_search',
      'envato_3d_templates_search': '3d_search',
      'envato_audio_search': 'audio_search'
    };
    
    // Determine which action to use
    let actionToUse = action;
    
    // If no action but tool is specified, try to map it
    if (!actionToUse && tool) {
      actionToUse = toolToActionMap[tool];
    }
    
    switch (actionToUse) {
      case 'photos_search':
        return this.handlePhotosSearch(otherArgs);
      case 'stock_videos_search':
        return this.handleStockVideosSearch(otherArgs);
      case 'graphics_search':
        return this.handleGraphicsSearch(otherArgs);
      case 'audio_search':
        return this.handleAudioSearch(otherArgs);
      case '3d_search':
        return this.handle3DSearch(otherArgs);
      case 'fonts_search':
        return this.handleFontsSearch(otherArgs);
      case 'video_templates_search':
        return this.handleVideoTemplatesSearch(otherArgs);
      case 'graphic_templates_search':
        return this.handleGraphicTemplatesSearch(otherArgs);
      case 'gallery_search':
        return this.handleGallerySearch(otherArgs);
      default:
        throw new Error(`Unknown action: ${actionToUse}`);
    }
  }
}

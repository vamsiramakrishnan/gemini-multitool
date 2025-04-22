import { EnvatoCategory } from '../../../tools/envato-api';
import { searchStockVideos } from '../../../tools/envato-api';
import { EnvatoBaseHandler } from '../base-handler';

/**
 * Handler for Envato Stock Videos API
 */
export class EnvatoVideosHandler extends EnvatoBaseHandler {
  /**
   * Handle stock videos search requests
   */
  async handleStockVideosSearch(args: any): Promise<any> {
    const { 
      query, 
      orientation = [], 
      resolution = [], 
      frameRate = [],
      videoLength = [0, 0],
      categories = [],
      properties = {},
      page = 1,
      addToGallery = true
    } = args;
    
    const mappedOrientation = orientation.length > 0 ? orientation[0].toLowerCase() : undefined;
    
    return this.handleWithStatus<any>(
      'envato_stock_videos_search',
      args,
      'envato_gallery',
      () => `Envato Stock Videos Search`,
      async () => {
        try {
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
            console.error('Error from Envato API:', result.error);
            throw new Error(result.error);
          }
          
          const fullItems = Array.isArray(result.items) ? result.items : [];
          
          if (addToGallery && fullItems.length > 0) {
            try {
              const displayItems = fullItems.slice(0, 10);
              await this.addResultsToGallery(
                query,
                'stock-video',
                query,
                displayItems,
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
            } catch (galleryError) {
              console.error('Failed to add items to gallery:', galleryError);
              // Continue execution even if gallery update fails
            }
          } else if (addToGallery) {
            console.log('No items to add to gallery widget');
          }
          
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
        } catch (error) {
          console.error('Error in handleStockVideosSearch:', error);
          throw new Error(`Error fetching Envato Elements data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    );
  }
}

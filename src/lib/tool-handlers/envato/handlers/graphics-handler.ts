import { EnvatoCategory } from '../../../tools/envato-api';
import { searchGraphics } from '../../../tools/envato-api';
import { EnvatoBaseHandler } from '../base-handler';

/**
 * Handler for Envato Graphics API
 */
export class EnvatoGraphicsHandler extends EnvatoBaseHandler {
  /**
   * Handle graphics search requests
   */
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
      addToGallery = true
    } = args;
    
    return this.handleWithStatus<any>(
      'envato_graphics_search',
      args,
      'envato_gallery',
      () => `Envato Graphics Search`,
      async () => {
        const result = await searchGraphics(query, {
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
        });
        
        if ('error' in result) {
          throw new Error(result.error);
        }
        
        const fullItems = Array.isArray(result.items) ? result.items : [];
        
        if (addToGallery && fullItems.length > 0) {
          const displayItems = fullItems.slice(0, 10);
          await this.addResultsToGallery(
            query,
            'graphics',
            query,
            displayItems,
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
}

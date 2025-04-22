import { EnvatoCategory } from '../../../tools/envato-api';
import { search3D } from '../../../tools/envato-api';
import { EnvatoBaseHandler } from '../base-handler';

/**
 * Handler for Envato 3D API
 */
export class Envato3DHandler extends EnvatoBaseHandler {
  /**
   * Handle 3D search requests
   */
  async handle3DSearch(args: any): Promise<any> {
    const { 
      query, 
      fileType = [], 
      categories = [], 
      page = 1,
      addToGallery = true
    } = args;
    
    return this.handleWithStatus<any>(
      'envato_3d_search',
      args,
      'envato_gallery',
      () => `Envato 3D Search`,
      async () => {
        const result = await search3D(query, {
          fileType: fileType.length > 0 ? fileType : undefined,
          categories: categories.length > 0 ? categories : undefined,
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
            '3d',
            query,
            displayItems,
            {
              fileType: fileType.length > 0 ? fileType : undefined,
              categories: categories.length > 0 ? categories : undefined
            },
            result.pagination
          );
          console.log(`Added ${displayItems.length} items to gallery widget`);
        } else if (addToGallery) {
          console.log('No items to add to gallery widget');
        }
        
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
            fileType: fileType.length > 0 ? fileType : undefined,
            categories: categories.length > 0 ? categories : undefined
          },
          pagination: result.pagination
        };
        
        return response;
      }
    );
  }
}

import { EnvatoCategory } from '../../../tools/envato-api';
import { searchPhotos } from '../../../tools/envato-api';
import { EnvatoBaseHandler } from '../base-handler';

/**
 * Handler for Envato Photos API
 */
export class EnvatoPhotosHandler extends EnvatoBaseHandler {
  /**
   * Handle photos search requests
   */
  async handlePhotosSearch(args: any): Promise<any> {
    const { 
      query, 
      orientation = [], 
      background = [], 
      numberOfPeople = [],
      colors = [],
      page = 1,
      addToGallery = true
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
}

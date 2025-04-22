import { EnvatoCategory } from '../../../tools/envato-api';
import { searchFonts } from '../../../tools/envato-api';
import { EnvatoBaseHandler } from '../base-handler';

/**
 * Handler for Envato Fonts API
 */
export class EnvatoFontsHandler extends EnvatoBaseHandler {
  /**
   * Handle fonts search requests
   */
  async handleFontsSearch(args: any): Promise<any> {
    const { 
      query, 
      categories = [], 
      spacing = [], 
      optimumSize = [],
      properties = {},
      page = 1,
      addToGallery = true
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
            hasAlternates: properties.hasAlternates || false,
            hasLigatures: properties.hasLigatures || false,
            isVariable: properties.isVariable || false
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
            'fonts',
            query,
            displayItems,
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
}

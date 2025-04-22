import { EnvatoCategory } from '../../../tools/envato-api';
import { searchVideoTemplates, searchDesignTemplates } from '../../../tools/envato-api';
import { EnvatoBaseHandler } from '../base-handler';

/**
 * Handler for Envato Templates API (Video and Graphic)
 */
export class EnvatoTemplatesHandler extends EnvatoBaseHandler {
  /**
   * Handle video templates search requests
   */
  async handleVideoTemplatesSearch(args: any): Promise<any> {
    const { 
      query, 
      categories = [], 
      resolution = [], 
      applicationsSupported = [],
      requiredPlugins = [],
      page = 1,
      addToGallery = true
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

  /**
   * Handle graphic templates search requests
   */
  async handleGraphicTemplatesSearch(args: any): Promise<any> {
    const { 
      query, 
      categories = [], 
      applicationsSupported = [],
      orientation = [],
      page = 1,
      addToGallery = true
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
            'graphic-templates', // category
            query, // query (same as original in this case)
            displayItems, // Pass the full items with all properties
            {
              categories: categories.length > 0 ? categories : undefined,
              applicationsSupported: applicationsSupported.length > 0 ? applicationsSupported : undefined,
              orientation: orientation.length > 0 ? orientation : undefined
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
            orientation: orientation.length > 0 ? orientation : undefined
          },
          pagination: result.pagination
        };
        
        return response;
      }
    );
  }
}

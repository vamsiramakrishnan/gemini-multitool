import { EnvatoCategory } from '../../../tools/envato-api';
import { searchAudio } from '../../../tools/envato-api';
import { EnvatoBaseHandler } from '../base-handler';

/**
 * Handler for Envato Audio API
 */
export class EnvatoAudioHandler extends EnvatoBaseHandler {
  /**
   * Handle audio search requests
   */
  async handleAudioSearch(args: any): Promise<any> {
    const { 
      query, 
      duration = [], 
      tempo = [], 
      loops = false,
      mood = [],
      genre = [],
      page = 1,
      addToGallery = true
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
        
        const fullItems = Array.isArray(result.items) ? result.items : [];
        
        if (addToGallery && fullItems.length > 0) {
          const displayItems = fullItems.slice(0, 10);
          await this.addResultsToGallery(
            query,
            'audio',
            query,
            displayItems,
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
}

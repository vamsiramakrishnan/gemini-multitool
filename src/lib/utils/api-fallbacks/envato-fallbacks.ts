import { ApiFallbackProvider } from './types';
import {
  EnvatoItem,
  EnvatoResponse,
  SearchOptions,
  EnvatoCategory,
  EnvatoPhotoItem,
  EnvatoVideoItem,
  EnvatoAudioItem,
  EnvatoGraphicsItem
} from '../../tools/envato-api';

/**
 * Creates mock items based on category and query
 */
function createMockEnvatoItem(
  category: EnvatoCategory,
  query: string = 'mock',
  itemIndex: number = 1
): EnvatoItem {
  // Common base properties for all item types
  const baseItem = {
    id: `mock-${category}-${itemIndex}`,
    itemUuid: `mock-${category}-${itemIndex}-uuid`,
    title: `Mock ${category} item for "${query || 'search'}"`,
    author: 'Mock Author',
    authorUrl: 'https://example.com/author',
    authorId: null,
    displayType: category,
    itemUrl: `https://example.com/${category}/mock-item-${itemIndex}`,
    isNew: false,
    itemType: category,
    itemTypeName: category.charAt(0).toUpperCase() + category.slice(1),
    itemTypeNameEn: category.charAt(0).toUpperCase() + category.slice(1),
    similarItemsUrl: ''
  };
  
  // Create type-specific properties
  switch(category) {
    case 'audio':
      return {
        ...baseItem,
        bpm: 120,
        trackDurations: [180],
        audioSourceUrl: 'https://example.com/audio.mp3',
        waveformUrl: 'https://example.com/waveform.png',
        musicVariants: {
          mainTrack: {
            id: 'main-track',
            title: 'Main Track',
            duration: 180,
            waveformUrl: 'https://example.com/waveform.png',
            audioSourceUrl: {
              mp3: 'https://example.com/audio.mp3',
              m4a: 'https://example.com/audio.m4a'
            }
          },
          variantTracks: []
        }
      } as EnvatoAudioItem;
      
    case 'stock-video':
      return {
        ...baseItem,
        imageSrcSet: 'https://via.placeholder.com/640x360?text=Mock+Video+Thumbnail',
        aspectRatio: 1.77,
        video: {
          standard: 'https://example.com/video.mp4'
        },
        fallbackSrc: 'https://via.placeholder.com/640x360?text=Mock+Video+Fallback',
        blurredBackgroundSrc: 'https://via.placeholder.com/640x360?text=Mock+Video+Blurred',
        categories: ['mock-video-category'],
        categoryNames: ['Mock Video Category']
      } as EnvatoVideoItem;
      
    case '3d':
      return {
        ...baseItem,
        imageSrcSet: 'https://via.placeholder.com/640x360?text=Mock+3D+Model',
        aspectRatio: 1.77,
        fallbackSrc: 'https://via.placeholder.com/640x360?text=Mock+3D+Model',
        categories: ['mock-3d-category'],
        categoryNames: ['Mock 3D Category']
      } as EnvatoGraphicsItem;
      
    case 'fonts':
      return {
        ...baseItem,
        imageSrcSet: 'https://via.placeholder.com/640x360?text=Mock+Font',
        aspectRatio: 1.77,
        fallbackSrc: 'https://via.placeholder.com/640x360?text=Mock+Font',
        categories: ['mock-font-category'],
        categoryNames: ['Mock Font Category']
      } as EnvatoGraphicsItem;
      
    case 'video-templates':
      return {
        ...baseItem,
        imageSrcSet: 'https://via.placeholder.com/640x360?text=Mock+Video+Template',
        aspectRatio: 1.77,
        video: {
          standard: 'https://example.com/video-template.mp4'
        },
        fallbackSrc: 'https://via.placeholder.com/640x360?text=Mock+Video+Template',
        blurredBackgroundSrc: 'https://via.placeholder.com/640x360?text=Mock+Video+Template+Blurred',
        categories: ['mock-template-category'],
        categoryNames: ['Mock Template Category']
      } as EnvatoVideoItem;
      
    case 'graphic-templates':
    case 'graphics':
      return {
        ...baseItem,
        imageSrcSet: 'https://via.placeholder.com/640x360?text=Mock+Graphic',
        aspectRatio: 1.77,
        fallbackSrc: 'https://via.placeholder.com/640x360?text=Mock+Graphic',
        categories: ['mock-category'],
        categoryNames: ['Mock Category']
      } as EnvatoGraphicsItem;
      
    case 'photos':
    default:
      return {
        ...baseItem,
        imageSrcSet: 'https://via.placeholder.com/640x360?text=Mock+Photo',
        aspectRatio: 1.77,
        fallbackSrc: 'https://via.placeholder.com/640x360?text=Mock+Photo',
        editItemUrl: 'https://example.com/edit',
        blurredBackgroundSrc: null,
        categories: null,
        categoryNames: null
      } as EnvatoPhotoItem;
  }
}

/**
 * Provides fallback data for Envato API calls
 */
export class EnvatoFallbackProvider implements ApiFallbackProvider<EnvatoResponse, SearchOptions> {
  private connectionError: boolean = false;
  
  /**
   * Determine if we should use fallback based on the error
   */
  shouldProvideFallback(error: unknown): boolean {
    // Always provide fallback for network errors
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      
      // Detect connection errors
      this.connectionError = (
        errorMessage.includes('failed to fetch') ||
        errorMessage.includes('network') ||
        errorMessage.includes('connection') ||
        errorMessage.includes('econnrefused')
      );
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Generate fallback data mimicking the Envato API response
   */
  getFallbackData(options: SearchOptions): EnvatoResponse {
    const { category, query = "", page = 1 } = options;
    
    // Generate 5-10 items based on the page number
    const itemCount = Math.min(10, 5 + (page - 1) * 5);
    const items: EnvatoItem[] = [];
    
    for (let i = 1; i <= itemCount; i++) {
      items.push(createMockEnvatoItem(category, query, i));
    }
    
    // Return a mock response that mimics the structure of an actual API response
    return {
      items,
      pagination: {
        nextPageUrl: itemCount === 10 ? `/mock/${category}/${query}/page/${page + 1}` : undefined
      }
    };
  }
  
  /**
   * Provide context about why fallback data is being used
   */
  getFallbackContext() {
    return {
      message: this.connectionError
        ? 'The Envato API server is not available. Using mock data instead.'
        : 'Error fetching data from Envato API. Using mock data instead.',
      severity: 'warning' as const,
      isMock: true
    };
  }
}

/**
 * Factory function to create a fallback provider for Envato
 */
export function createEnvatoFallbackProvider(): ApiFallbackProvider<EnvatoResponse, SearchOptions> {
  return new EnvatoFallbackProvider();
} 
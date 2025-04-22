/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { withFallback, createEnvatoFallbackProvider } from '../utils/api-fallbacks';

const CLIENT_VERSION = "1dcc980a08791f2463cc52a984191b15f33cacb";
// Use our proxy server instead of direct calls to Envato
const BASE_URL = "http://localhost:3001/envato-api";

// Create a single instance of the fallback provider
const envatoFallbackProvider = createEnvatoFallbackProvider();

export type EnvatoCategory = 
  | "photos" 
  | "stock-video" 
  | "audio" 
  | "graphics" 
  | "3d"
  | "fonts"
  | "video-templates"
  | "graphic-templates";

// Common filter types
export type Orientation = "portrait" | "landscape" | "square" | "horizontal" | "vertical";
export type Background = "isolated" | "blurred";
export type NumberOfPeople = "no people" | "1 person" | "2 people" | "3+ people";
export type Resolution = "720p (HD)" | "1080p (Full HD)" | "2K" | "4K (UHD)";
export type FrameRate = "23.98 fps" | "24 fps" | "25 fps" | "29.97 fps" | "30 fps" | "50 fps" | "60 fps" | "More than 60 fps";

// Base item interface with common properties across all Envato items
export interface EnvatoBaseItem {
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

// Photo-specific item interface
export interface EnvatoPhotoItem extends EnvatoBaseItem {
  imageSrcSet: string;
  aspectRatio: number;
  fallbackSrc: string;
  editItemUrl: string;
  blurredBackgroundSrc: null;
  categories: null;
  categoryNames: null;
}

// Video-specific item interface
export interface EnvatoVideoItem extends EnvatoBaseItem {
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

// Audio-specific item interface
export interface EnvatoAudioItem extends EnvatoBaseItem {
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

// Graphics-specific item interface
export interface EnvatoGraphicsItem extends EnvatoBaseItem {
  imageSrcSet: string;
  aspectRatio: number;
  fallbackSrc: string;
  categories: string[];
  categoryNames: string[];
}

// Union type for all possible Envato items
export type EnvatoItem = EnvatoPhotoItem | EnvatoVideoItem | EnvatoAudioItem | EnvatoGraphicsItem;

// Response interface for Envato API responses
export interface EnvatoResponse {
  items: EnvatoItem[];
  pagination?: {
    nextPageUrl?: string;
  } | null;
}

interface BaseSearchOptions {
  category: EnvatoCategory;
  query?: string;
  subcategory?: string;
  page?: number;
  languageCode?: string;
}

interface PhotosSearchOptions extends BaseSearchOptions {
  orientation?: Orientation;
  background?: Background;
  numberOfPeople?: NumberOfPeople[];
  colors?: string[];
}

interface VideoSearchOptions extends BaseSearchOptions {
  orientation?: "horizontal" | "vertical";
  resolution?: Resolution[];
  frameRate?: FrameRate[];
  videoLength?: [number, number]; // Min and max in seconds
  categories?: string[];
  properties?: {
    hasAlphaChannel?: boolean;
    isLooped?: boolean;
  };
}

interface AudioSearchOptions extends BaseSearchOptions {
  duration?: [number, number]; // Min and max in seconds
  tempo?: string[];
  loops?: boolean;
  mood?: string[];
  genre?: string[];
}

interface GraphicsSearchOptions extends BaseSearchOptions {
  fileType?: string[];
  style?: string[];
  colors?: string[];
  categories?: string[];
  applicationsSupported?: string[];
  properties?: {
    isVector?: boolean;
    isLayered?: boolean;
    isTileable?: boolean;
  };
}

interface FontsSearchOptions extends BaseSearchOptions {
  categories?: string[];
  spacing?: string[];
  optimumSize?: string[];
  properties?: {
    isWebfont?: boolean;
  };
}

interface VideoTemplatesSearchOptions extends BaseSearchOptions {
  categories?: string[];
  applicationsSupported?: string[];
  resolution?: string[];
  requiredPlugins?: string[];
}

interface GraphicTemplatesSearchOptions extends BaseSearchOptions {
  categories?: string[];
  applicationsSupported?: string[];
  orientation?: Orientation;
  colorSpace?: string[];
  properties?: {
    isVector?: boolean;
    isLayered?: boolean;
  };
}

export type SearchOptions = 
  | BaseSearchOptions 
  | PhotosSearchOptions 
  | VideoSearchOptions 
  | AudioSearchOptions 
  | GraphicsSearchOptions 
  | FontsSearchOptions 
  | VideoTemplatesSearchOptions
  | GraphicTemplatesSearchOptions;

/**
 * Actual implementation of the Envato API call without fallback handling
 */
async function _searchEnvatoElements(options: SearchOptions): Promise<EnvatoResponse> {
  const {
    category,
    query = "",
    subcategory = "",
    page = 1,
    languageCode = "en"
  } = options;

  // Start constructing the path
  let path = `/${category}`;
  
  // Add query if provided
  if (query) {
    // Replace spaces with hyphens and remove special characters
    const sanitizedQuery = query.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
    
    path += `/${sanitizedQuery}`;
  }
  
  // Add subcategory if provided
  if (subcategory) {
    path += `/${subcategory}`;
  }
  
  // Handle category-specific filters
  const filtersPath = constructFiltersPath(category, options);
  if (filtersPath) {
    path += filtersPath;
  }

  const params = new URLSearchParams({
    path: path,
    languageCode: languageCode,
    clientVersion: CLIENT_VERSION,
    page: page.toString()
  });

  const url = `${BASE_URL}?${params.toString()}`;
  console.log('Fetching Envato Elements data from:', url);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Envato Elements API failed with status: ${response.status}`);
  }

  const rawData = await response.json();
  console.log('Raw API response structure:', JSON.stringify({
    version: rawData.version,
    status: rawData.data?.status,
    hasItems: Boolean(rawData.data?.data?.items),
    itemsCount: rawData.data?.data?.items?.length || 0,
    hasPagination: Boolean(rawData.data?.data?.pagination),
    dataKeys: Object.keys(rawData.data || {}),
    dataDataKeys: Object.keys(rawData.data?.data || {})
  }, null, 2));

  // Extract the actual data from the nested structure
  if (rawData.data?.status === 'success' && rawData.data?.data?.items) {
    const items = rawData.data.data.items;
    const pagination = rawData.data.data.pagination;
    
    console.log(`Successfully extracted ${items.length} items from Envato API response`);
    
    return {
      items,
      pagination
    };
  } else {
    console.error('Unexpected API response structure:', rawData);
    throw new Error('Invalid API response from Envato API');
  }
}

/**
 * Public API function that uses the fallback system
 */
export async function searchEnvatoElements(options: SearchOptions): Promise<EnvatoResponse | { error: string }> {
  try {
    // Use the withFallback utility to handle API failures
    const result = await withFallback(
      _searchEnvatoElements,
      envatoFallbackProvider,
      options
    );
    
    return result;
  } catch (error: any) {
    console.error('Detailed error:', {
      message: error.message,
      stack: error.stack,
      type: error.name
    });
    return {
      error: `Error fetching Envato Elements data: ${error.message}`
    };
  }
}

/**
 * Constructs filter path segments based on category and options
 */
function constructFiltersPath(category: EnvatoCategory, options: SearchOptions): string {
  let filtersPath = '';
  
  switch (category) {
    case "photos":
      const photoOptions = options as PhotosSearchOptions;
      
      // Add orientation filter
      if (photoOptions.orientation) {
        filtersPath += `/orientation-${photoOptions.orientation.toLowerCase()}`;
      }
      
      // Add background filter
      if (photoOptions.background) {
        filtersPath += `/background-${photoOptions.background.toLowerCase()}`;
      }
      
      // Add number of people filter
      if (photoOptions.numberOfPeople && photoOptions.numberOfPeople.length > 0) {
        // For simplicity, just use the first selection
        const peopleFilter = photoOptions.numberOfPeople[0].toLowerCase().replace(/\s+/g, '-');
        filtersPath += `/number-of-people-${peopleFilter}`;
      }
      
      // Add color filter
      if (photoOptions.colors && photoOptions.colors.length > 0) {
        // For simplicity, just use the first color
        filtersPath += `/color-${photoOptions.colors[0].toLowerCase()}`;
      }
      break;
      
    case "stock-video":
      const videoOptions = options as VideoSearchOptions;
      
      // Add categories filter
      if (videoOptions.categories && videoOptions.categories.length > 0) {
        const category = videoOptions.categories[0].toLowerCase().replace(/\s+/g, '-');
        filtersPath += `/${category}`;
      }
      
      // Add orientation filter
      if (videoOptions.orientation) {
        filtersPath += `/orientation-${videoOptions.orientation.toLowerCase()}`;
      }
      
      // Add resolution filter
      if (videoOptions.resolution && videoOptions.resolution.length > 0) {
        // Format: resolution-4k-(uhd)
        const resolutionStr = videoOptions.resolution[0].toLowerCase()
          .replace(/[\s()]/g, '-')
          .replace(/--/g, '-');
        filtersPath += `/resolution-${resolutionStr}`;
      }
      
      // Add frame rate filter
      if (videoOptions.frameRate && videoOptions.frameRate.length > 0) {
        // Format: frame-rate-30-fps
        const frameRateStr = videoOptions.frameRate[0].toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/\./g, '');
        filtersPath += `/frame-rate-${frameRateStr}`;
      }
      
      // Add properties filters
      if (videoOptions.properties) {
        if (videoOptions.properties.hasAlphaChannel) {
          filtersPath += `/properties-alpha-channel`;
        }
        
        if (videoOptions.properties.isLooped) {
          filtersPath += `/properties-looped`;
        }
      }
      
      // Add video length filter (handled by the frontend as a range)
      if (videoOptions.videoLength && videoOptions.videoLength.length === 2) {
        filtersPath += `/length-${videoOptions.videoLength[0]}-${videoOptions.videoLength[1]}s`;
      }
      break;
      
    case "audio":
      const audioOptions = options as AudioSearchOptions;
      
      // Add mood filter
      if (audioOptions.mood && audioOptions.mood.length > 0) {
        // For example: "Happy/Cheerful" => "mood-happy"
        const mood = audioOptions.mood[0].split('/')[0].trim().toLowerCase();
        filtersPath += `/mood-${mood}`;
      }
      
      // Add genre filter
      if (audioOptions.genre && audioOptions.genre.length > 0) {
        // For example: "Hip hop/Rap" => "genre-hip-hop"
        const genre = audioOptions.genre[0].split('/')[0].trim().toLowerCase().replace(/\s+/g, '-');
        filtersPath += `/genre-${genre}`;
      }
      
      // Add duration filter
      if (audioOptions.duration && audioOptions.duration.length === 2) {
        filtersPath += `/duration-${audioOptions.duration[0]}-${audioOptions.duration[1]}s`;
      }
      
      // Add tempo filter
      if (audioOptions.tempo && audioOptions.tempo.length > 0) {
        filtersPath += `/tempo-${audioOptions.tempo[0].toLowerCase()}`;
      }
      
      // Add loops filter
      if (audioOptions.loops) {
        filtersPath += '/loops-only';
      }
      break;
      
    case "graphics":
      const graphicsOptions = options as GraphicsSearchOptions;
      
      // Add categories filter
      if (graphicsOptions.categories && graphicsOptions.categories.length > 0) {
        // Use lowercase category name as path
        const categoryName = graphicsOptions.categories[0].toLowerCase();
        filtersPath += `/${categoryName}`;
      }
      
      // Add applications supported filter
      if (graphicsOptions.applicationsSupported && graphicsOptions.applicationsSupported.length > 0) {
        const app = graphicsOptions.applicationsSupported[0].toLowerCase().replace(/\s+/g, '-');
        filtersPath += `/compatible-with-${app}`;
      }
      
      // Add file type filter
      if (graphicsOptions.fileType && graphicsOptions.fileType.length > 0) {
        filtersPath += `/file-types-${graphicsOptions.fileType[0].toLowerCase()}`;
      }
      
      // Add properties filters
      if (graphicsOptions.properties) {
        if (graphicsOptions.properties.isVector) {
          filtersPath += `/properties-vector`;
        }
        
        if (graphicsOptions.properties.isLayered) {
          filtersPath += `/properties-layered`;
        }
        
        if (graphicsOptions.properties.isTileable) {
          filtersPath += `/properties-tileable`;
        }
      }
      
      // Add style filter
      if (graphicsOptions.style && graphicsOptions.style.length > 0) {
        filtersPath += `/style-${graphicsOptions.style[0].toLowerCase().replace(/\s+/g, '-')}`;
      }
      
      // Add color filter
      if (graphicsOptions.colors && graphicsOptions.colors.length > 0) {
        filtersPath += `/color-${graphicsOptions.colors[0].toLowerCase()}`;
      }
      break;
      
    case "3d":
      const threeDOptions = options as GraphicsSearchOptions;
      
      // Add categories filter
      if (threeDOptions.categories && threeDOptions.categories.length > 0) {
        // Use lowercase category name as path
        const categoryName = threeDOptions.categories[0].toLowerCase();
        filtersPath += `/${categoryName}`;
      }
      
      // Add applications supported filter
      if (threeDOptions.applicationsSupported && threeDOptions.applicationsSupported.length > 0) {
        const app = threeDOptions.applicationsSupported[0].toLowerCase().replace(/\s+/g, '-');
        filtersPath += `/compatible-with-${app}`;
      }
      
      // Add file type filter
      if (threeDOptions.fileType && threeDOptions.fileType.length > 0) {
        filtersPath += `/file-types-${threeDOptions.fileType[0].toLowerCase()}`;
      }
      
      // Add properties filters
      if (threeDOptions.properties) {
        if (threeDOptions.properties.isVector) {
          filtersPath += `/properties-vector`;
        }
        
        if (threeDOptions.properties.isLayered) {
          filtersPath += `/properties-layered`;
        }
        
        if (threeDOptions.properties.isTileable) {
          filtersPath += `/properties-tileable`;
        }
      }
      
      // Add style filter
      if (threeDOptions.style && threeDOptions.style.length > 0) {
        filtersPath += `/style-${threeDOptions.style[0].toLowerCase().replace(/\s+/g, '-')}`;
      }
      
      // Add color filter
      if (threeDOptions.colors && threeDOptions.colors.length > 0) {
        filtersPath += `/color-${threeDOptions.colors[0].toLowerCase()}`;
      }
      break;
      
    case "fonts":
      const fontsOptions = options as FontsSearchOptions;
      
      // Add categories filter
      if (fontsOptions.categories && fontsOptions.categories.length > 0) {
        const category = fontsOptions.categories[0].toLowerCase().replace(/\s+/g, '-');
        filtersPath += `/${category}`;
      }
      
      // Add spacing filter
      if (fontsOptions.spacing && fontsOptions.spacing.length > 0) {
        const spacing = fontsOptions.spacing[0].toLowerCase();
        filtersPath += `/spacing-${spacing}`;
      }
      
      // Add optimum size filter
      if (fontsOptions.optimumSize && fontsOptions.optimumSize.length > 0) {
        // Format: "Large (Display / Poster)" => "optimum-size-large-(display-poster)"
        const size = fontsOptions.optimumSize[0].toLowerCase()
          .replace(/[\s\/]+/g, '-')
          .replace(/[()]/g, '')
          .replace(/--/g, '-');
        filtersPath += `/optimum-size-${size}`;
      }
      
      // Add properties filters
      if (fontsOptions.properties) {
        if (fontsOptions.properties.isWebfont) {
          filtersPath += `/properties-web-font`;
        }
      }
      break;
      
    case "video-templates":
      const videoTemplateOptions = options as VideoTemplatesSearchOptions;
      
      // Add categories filter
      if (videoTemplateOptions.categories && videoTemplateOptions.categories.length > 0) {
        // Convert "Broadcast Packages" to "broadcast-packages"
        const categoryName = videoTemplateOptions.categories[0].toLowerCase().replace(/\s+/g, '-');
        filtersPath += `/${categoryName}`;
      }
      
      // Add applications supported filter
      if (videoTemplateOptions.applicationsSupported && videoTemplateOptions.applicationsSupported.length > 0) {
        // Convert "After Effects" to "compatible-with-after-effects"
        const app = videoTemplateOptions.applicationsSupported[0].toLowerCase().replace(/\s+/g, '-');
        filtersPath += `/compatible-with-${app}`;
      }
      
      // Add resolution filter
      if (videoTemplateOptions.resolution && videoTemplateOptions.resolution.length > 0) {
        // Format: "1080p (Full HD)" => "resolution-1080p-(full-hd)"
        const resolutionStr = videoTemplateOptions.resolution[0].toLowerCase()
          .replace(/[\s()]/g, '-')
          .replace(/--/g, '-');
        filtersPath += `/resolution-${resolutionStr}`;
      }
      
      // Add plugins filter
      if (videoTemplateOptions.requiredPlugins && videoTemplateOptions.requiredPlugins.length > 0) {
        if (videoTemplateOptions.requiredPlugins[0] === "None required") {
          filtersPath += `/plugins-none-required`;
        } else {
          const plugin = videoTemplateOptions.requiredPlugins[0].toLowerCase().replace(/\s+/g, '-');
          filtersPath += `/plugins-${plugin}`;
        }
      }
      break;
      
    case "graphic-templates":
      const graphicTemplateOptions = options as GraphicTemplatesSearchOptions;
      
      // Add categories filter
      if (graphicTemplateOptions.categories && graphicTemplateOptions.categories.length > 0) {
        // Convert "Print Templates" to "print-templates"
        const categoryName = graphicTemplateOptions.categories[0].toLowerCase().replace(/\s+/g, '-');
        filtersPath += `/${categoryName}`;
      }
      
      // Add applications supported filter
      if (graphicTemplateOptions.applicationsSupported && graphicTemplateOptions.applicationsSupported.length > 0) {
        // Convert "Adobe Photoshop" to "compatible-with-adobe-photoshop"
        const app = graphicTemplateOptions.applicationsSupported[0].toLowerCase().replace(/\s+/g, '-');
        filtersPath += `/compatible-with-${app}`;
      }
      
      // Add orientation filter
      if (graphicTemplateOptions.orientation) {
        filtersPath += `/orientation-${graphicTemplateOptions.orientation.toLowerCase()}`;
      }
      
      // Add color space filter
      if (graphicTemplateOptions.colorSpace && graphicTemplateOptions.colorSpace.length > 0) {
        const colorSpace = graphicTemplateOptions.colorSpace[0].toLowerCase();
        filtersPath += `/color-space-${colorSpace}`;
      }
      
      // Add properties filters
      if (graphicTemplateOptions.properties) {
        if (graphicTemplateOptions.properties.isVector) {
          filtersPath += `/properties-vector`;
        }
        
        if (graphicTemplateOptions.properties.isLayered) {
          filtersPath += `/properties-layered`;
        }
      }
      break;
  }
  
  return filtersPath;
}

// Convenience functions for specific categories
export async function searchPhotos(
  query?: string, 
  orientation?: Orientation,
  options: Partial<PhotosSearchOptions> = {}
) {
  return searchEnvatoElements({
    category: "photos",
    query,
    orientation,
    ...options
  });
}

export async function searchStockVideos(
  query?: string,
  options: Partial<VideoSearchOptions> = {}
) {
  return searchEnvatoElements({
    category: "stock-video",
    query,
    ...options
  });
}

export async function searchAudio(
  query?: string,
  options: Partial<AudioSearchOptions> = {}
) {
  return searchEnvatoElements({
    category: "audio",
    query,
    ...options
  });
}

export async function searchGraphics(
  query?: string,
  options: Partial<GraphicsSearchOptions> = {}
) {
  return searchEnvatoElements({
    category: "graphics",
    query,
    ...options
  });
}

export async function search3D(
  query?: string,
  options: Partial<GraphicsSearchOptions> = {}
) {
  return searchEnvatoElements({
    category: "3d",
    query,
    ...options
  });
}

export async function searchFonts(
  query?: string,
  options: Partial<FontsSearchOptions> = {}
) {
  return searchEnvatoElements({
    category: "fonts",
    query,
    ...options
  });
}

export async function searchVideoTemplates(
  query?: string,
  options: Partial<VideoTemplatesSearchOptions> = {}
) {
  return searchEnvatoElements({
    category: "video-templates",
    query,
    ...options
  });
}

export async function searchDesignTemplates(
  query?: string,
  options: Partial<GraphicTemplatesSearchOptions> = {}
) {
  return searchEnvatoElements({
    category: "graphic-templates",
    query,
    ...options
  });
}

// Placeholder function - Implementation depends on your Envato API proxy
export async function getEnvatoItemDetails(itemId: string): Promise<any | { error: string }> {
  console.warn(`getEnvatoItemDetails(${itemId}) is not implemented. Returning placeholder data.`);
  // In a real scenario, you would fetch from your proxy:
  // const url = `${BASE_URL}/item/${itemId}?clientVersion=${CLIENT_VERSION}`;
  // const response = await fetch(url);
  // if (!response.ok) return { error: `Failed to fetch item details: ${response.status}` };
  // const data = await response.json();
  // return data; // Assuming data structure matches EnvatoItem or has more details
  
  // Placeholder response:
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
  return { 
     id: itemId,
     title: `Detailed Title for ${itemId}`,
     author: 'Detailed Author',
     authorUrl: 'https://example.com/author',
     itemUrl: `https://example.com/item/${itemId}`,
     // Add more detailed fields based on what your API provides
     description: 'This is a more detailed description of the item.',
     tags: ['detail', 'example', 'placeholder'],
     // Example for audio
     bpm: 125,
     trackDurations: [185, 62, 31],
     // Example for video
     video: { standard: 'https://example.com/preview.mp4', hd: '...' },
     resolution: '1080p (Full HD)',
     frameRate: '30 fps',
  };
} 
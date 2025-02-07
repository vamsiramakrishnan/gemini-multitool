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

import { loadGoogleMapsAPI } from './google-maps';

const DEFAULT_PAGE_SIZE = 5;

// Field mask groups based on SKU pricing
const FIELD_MASKS: { [key: string]: string[] } = {
  // Basic fields (minimal cost)
  basic: [
    'places.id',
    'places.displayName',
    'places.formattedAddress',
    'places.businessStatus',
    'places.location',
    'places.photos',
    'places.types'
  ],
  
  // Additional fields for restaurants/food
  food: [
    'places.priceLevel',
    'places.rating',
    'places.userRatingCount',
    'places.currentOpeningHours',
    'places.websiteUri',
    'places.internationalPhoneNumber',
    'places.delivery',
    'places.dineIn',
    'places.takeout',
    'places.servesBeer',
    'places.servesWine',
    'places.servesCocktails',
    'places.outdoorSeating',
    'places.reservable'
  ],

  // Additional fields for shopping/businesses
  business: [
    'places.priceLevel',
    'places.rating',
    'places.userRatingCount',
    'places.currentOpeningHours',
    'places.websiteUri',
    'places.internationalPhoneNumber',
    'places.curbsidePickup',
    'places.paymentOptions'
  ],

  // Additional fields for attractions/entertainment
  attraction: [
    'places.rating',
    'places.userRatingCount',
    'places.currentOpeningHours',
    'places.websiteUri',
    'places.goodForGroups',
    'places.goodForChildren',
    'places.parkingOptions',
    'places.restroom'
  ]
};

function getFieldMaskForQuery(query: string, type: string | null = null): string[] {
  console.log('Getting field mask for query:', { query, type });
  
  let fields = [...FIELD_MASKS.basic];
  const queryLower = query.toLowerCase();
  
  if (type && FIELD_MASKS[type]) {
    fields = [...fields, ...FIELD_MASKS[type]];
  } else {
    if (queryLower.includes('restaurant') || 
        queryLower.includes('food') || 
        queryLower.includes('cafe') || 
        queryLower.includes('bar')) {
      fields = [...fields, ...FIELD_MASKS.food];
    }
    
    if (queryLower.includes('shop') || 
        queryLower.includes('store') || 
        queryLower.includes('market')) {
      fields = [...fields, ...FIELD_MASKS.business];
    }
    
    if (queryLower.includes('attraction') || 
        queryLower.includes('museum') || 
        queryLower.includes('park') ||
        queryLower.includes('entertainment')) {
      fields = [...fields, ...FIELD_MASKS.attraction];
    }
  }
  
  return fields;
}

interface SearchPlacesOptions {
  languageCode?: string;
  maxResults?: number;
  location?: {
    latitude: number;
    longitude: number;
  };
  radius?: number;
  pageToken?: string;
}

interface LLMPlaceResponse {
  id: string;
  name: string;
  rating: number;
  priceLevel: number;
  type: string;
  isOpen: boolean;
}

interface WidgetPlaceResponse extends LLMPlaceResponse {
  address: string;
  location: {
    latitude: number;
    longitude: number;
  };
  userRatings: number;
  photos: string[];
  businessStatus: string;
  types: string[];
  icon: string;
  vicinity?: string;
}

export async function searchPlaces(query: string, options: SearchPlacesOptions = {}): Promise<{
  llmResponse: { places: LLMPlaceResponse[]; totalResults?: number };
  widgetData: { places: WidgetPlaceResponse[]; nextPageToken?: string };
  error?: string;
}> {
  try {
    await loadGoogleMapsAPI();
    const service = new google.maps.places.PlacesService(document.createElement('div'));

    const request: google.maps.places.TextSearchRequest = {
      query: query,
      language: options.languageCode || 'en',
    };

    if (options.location) {
      request.location = new google.maps.LatLng(options.location.latitude, options.location.longitude);
      request.radius = options.radius || 5000;
    }

    return new Promise((resolve, reject) => {
      service.textSearch(request, (results, status, pagination) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          const places = results.slice(0, options.maxResults || DEFAULT_PAGE_SIZE);
          
          // Create separate responses for LLM and widget
          const llmResponse = {
            places: places.map(place => ({
              id: place.place_id || '',
              name: place.name || '',
              rating: place.rating || 0,
              priceLevel: place.price_level || 0,
              type: place.types?.[0] || 'place',
              isOpen: place.opening_hours?.isOpen() || false
            })),
            totalResults: results.length
          };

          const widgetData = {
            places: places.map(place => ({
              ...llmResponse.places[0],
              address: place.formatted_address || '',
              location: {
                latitude: place.geometry?.location?.lat() || 0,
                longitude: place.geometry?.location?.lng() || 0
              },
              userRatings: place.user_ratings_total || 0,
              photos: place.photos?.map(photo => photo.getUrl({ maxWidth: 800 })) || [],
              businessStatus: place.business_status || '',
              types: place.types || [],
              icon: place.icon || ''
            })),
            nextPageToken: pagination?.hasNextPage ? 'has_more' : undefined
          };

          resolve({ llmResponse, widgetData });
        } else {
          reject(new Error(`Places API error: ${status}`));
        }
      });
    });
  } catch (error: any) {
    return { 
      error: error.message,
      llmResponse: { places: [] },
      widgetData: { places: [] }
    };
  }
}

interface SearchNearbyOptions {
  radius?: number;
  keyword?: string;
  language?: string;
  minprice?: number;
  maxprice?: number;
  opennow?: boolean;
  type?: string;
  rankby?: 'prominence' | 'distance';
  pagetoken?: string;
  maxResults?: number;
  name?: string;
}

export async function searchNearby(
  location: {latitude: number, longitude: number}, 
  options: SearchNearbyOptions = {}
): Promise<{
  llmResponse: { places: LLMPlaceResponse[]; totalResults?: number };
  widgetData: { places: WidgetPlaceResponse[]; nextPageToken?: string };
  error?: string;
}> {
  
  try {
    await loadGoogleMapsAPI();
    const service = new google.maps.places.PlacesService(document.createElement('div'));

    const request: google.maps.places.PlaceSearchRequest = {
      location: new google.maps.LatLng(location.latitude, location.longitude),
      radius: options.radius || 500,
      keyword: options.keyword,
      language: options.language || 'en',
      minPriceLevel: options.minprice,
      maxPriceLevel: options.maxprice,
      openNow: options.opennow,
      type: options.type as string,
      rankBy: options.rankby === 'distance' ? google.maps.places.RankBy.DISTANCE : google.maps.places.RankBy.PROMINENCE,
    };

    if (options.rankby === 'distance') {
      delete request.radius;
      if (!options.keyword && !options.name && !options.type) {
        throw new Error('When rankby=distance, one of keyword, name, or type is required');
      }
    }

    return new Promise((resolve, reject) => {
      service.nearbySearch(request, (results, status, pagination) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          const places = results.slice(0, options.maxResults || DEFAULT_PAGE_SIZE);
          
          // Create separate responses for LLM and widget
          const llmResponse = {
            places: places.map(place => ({
              id: place.place_id || '',
              name: place.name || '',
              rating: place.rating || 0,
              priceLevel: place.price_level || 0,
              type: place.types?.[0] || 'place',
              isOpen: place.opening_hours?.isOpen() || false
            })),
            totalResults: results.length
          };

          const widgetData = {
            places: places.map(place => ({
              ...llmResponse.places[0],
              address: place.vicinity || '',
              location: {
                latitude: place.geometry?.location?.lat() || 0,
                longitude: place.geometry?.location?.lng() || 0
              },
              userRatings: place.user_ratings_total || 0,
              photos: place.photos?.map(photo => photo.getUrl({ maxWidth: 800 })) || [],
              businessStatus: place.business_status || '',
              types: place.types || [],
              icon: place.icon || '',
              vicinity: place.vicinity || ''
            })),
            nextPageToken: pagination?.hasNextPage ? 'has_more' : undefined
          };

          resolve({ llmResponse, widgetData });
        } else {
          reject(new Error(`Places API error: ${status}`));
        }
      });
    });
  } catch (error: any) {
    return { 
      error: error.message,
      llmResponse: { places: [] },
      widgetData: { places: [] }
    };
  }
} 
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

import { Loader } from '@googlemaps/js-api-loader';

declare global {
  interface Window {
    google: typeof google;
  }
}

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
if (typeof GOOGLE_MAPS_API_KEY !== "string") {
  throw new Error("set REACT_APP_GOOGLE_MAPS_API_KEY in .env");
}

// Create a singleton loader instance
const loader = new Loader({
  apiKey: GOOGLE_MAPS_API_KEY,
  version: "weekly",
  libraries: ["places", "geometry", "drawing", "marker"]
});

// Cache the loading promise
let mapsLoadingPromise: Promise<typeof google.maps> | null = null;

export async function loadGoogleMapsAPI(): Promise<typeof google.maps> {
  // Return cached maps instance if available
  if (window.google?.maps) return window.google.maps;
  
  // Return existing loading promise if one is in progress
  if (mapsLoadingPromise) return mapsLoadingPromise;
  
  // Create new loading promise
  mapsLoadingPromise = loader.load().then(() => {
    return window.google.maps;
  });

  try {
    return await mapsLoadingPromise;
  } catch (error) {
    mapsLoadingPromise = null; // Clear failed loading promise
    throw error;
  }
}

interface DirectionsOptions {
  mode?: google.maps.TravelMode;
  alternatives?: boolean;
  departureTime?: Date | 'now' | string;
  arrivalTime?: Date | string;
  avoid?: Array<'tolls' | 'highways' | 'ferries'>;
  transitMode?: google.maps.TransitMode[];
}

interface LLMDirectionsResponse {
  origin: string;
  destination: string;
  routes: {
    duration: string;
    distance: string;
    summary: string;
    // Removed detailed steps for LLM
  }[];
}

interface WidgetDirectionsResponse extends LLMDirectionsResponse {
  routes: {
    duration: string;
    distance: string;
    summary: string;
    steps: google.maps.DirectionsStep[];
  }[];
  _rawResponse?: google.maps.DirectionsResult;
}

export async function getDirections(
  origin: string, 
  destination: string, 
  options: DirectionsOptions = {}
): Promise<{
  llmResponse: LLMDirectionsResponse;
  widgetData: WidgetDirectionsResponse;
  error?: string;
}> {
  try {
    const maps = await loadGoogleMapsAPI();
    const directionsService = new maps.DirectionsService();
    
    const request: google.maps.DirectionsRequest = {
      origin,
      destination,
      travelMode: options.mode || maps.TravelMode.DRIVING,
      provideRouteAlternatives: options.alternatives || false,
      
      // Handle departure/arrival times
      ...(options.departureTime && {
        departureTime: options.departureTime === 'now' ? 
          new Date() : 
          new Date(options.departureTime)
      }),
      ...(options.arrivalTime && {
        arrivalTime: new Date(options.arrivalTime)
      }),
      
      // Handle avoidance preferences
      ...(options.avoid?.length && {
        avoidHighways: options.avoid.includes('highways'),
        avoidTolls: options.avoid.includes('tolls'),
        avoidFerries: options.avoid.includes('ferries')
      }),
      
      // Transit options
      ...(options.mode === maps.TravelMode.TRANSIT && options.transitMode && {
        transitOptions: {
          modes: options.transitMode,
          routingPreference: maps.TransitRoutePreference.FEWER_TRANSFERS
        }
      })
    };

    const result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
      directionsService.route(request, (
        response: google.maps.DirectionsResult | null,
        status: google.maps.DirectionsStatus
      ) => {
        console.log('Google Maps Directions API Response:', { response, status });
        switch(status) {
          case maps.DirectionsStatus.OK:
            if (response) resolve(response);
            else reject(new Error('No response received'));
            break;
          case maps.DirectionsStatus.ZERO_RESULTS:
            reject(new Error('No routes found between these locations'));
            break;
          case maps.DirectionsStatus.MAX_WAYPOINTS_EXCEEDED:
            reject(new Error('Too many waypoints provided'));
            break;
          case maps.DirectionsStatus.INVALID_REQUEST:
            reject(new Error('Invalid request parameters'));
            break;
          default:
            reject(new Error(`Directions request failed: ${status}`));
        }
      });
    });

    const baseResponse = {
      origin: result.routes[0].legs[0].start_address,
      destination: result.routes[0].legs[0].end_address,
    };

    // Create separate responses for LLM and widget
    const llmResponse: LLMDirectionsResponse = {
      ...baseResponse,
      routes: result.routes.map(route => ({
        duration: route.legs?.[0]?.duration?.text || 'N/A',
        distance: route.legs?.[0]?.distance?.text || 'N/A',
        summary: route.summary || 'Via main roads',
      }))
    };

    const widgetData: WidgetDirectionsResponse = {
      ...baseResponse,
      routes: result.routes.map(route => ({
        duration: route.legs?.[0]?.duration?.text || 'N/A',
        distance: route.legs?.[0]?.distance?.text || 'N/A',
        summary: route.summary || 'Via main roads',
        steps: route.legs?.[0]?.steps || []
      })),
      _rawResponse: result
    };

    return {
      llmResponse,
      widgetData,
      error: undefined
    };

  } catch (error: any) {
    console.error('Directions error:', error);
    return {
      error: `Error fetching directions: ${error.message}`,
      llmResponse: {
        origin: '',
        destination: '',
        routes: []
      },
      widgetData: {
        origin: '',
        destination: '',
        routes: []
      }
    };
  }
} 
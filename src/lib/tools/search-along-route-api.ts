import axios from 'axios';

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
if (typeof GOOGLE_MAPS_API_KEY !== "string") {
  throw new Error("set REACT_APP_GOOGLE_MAPS_API_KEY in .env");
}

const PLACE_FIELDS = [
  'places.displayName',
  'places.formattedAddress',
  'places.priceLevel',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.types'
];

export interface SearchAlongRouteParams {
  textQuery: string;
  polyline: string;
  routingOrigin?: {
    latitude: number;
    longitude: number;
  };
}

interface Place {
  formattedAddress: string;
  priceLevel?: string;
  displayName: {
    text: string;
    languageCode: string;
  };
  location?: {
    latitude: number;
    longitude: number;
  };
  rating?: number;
  userRatingCount?: number;
  types?: string[];
}

interface PlacesResponse {
  places: Place[];
}

export async function searchAlongRoute(params: SearchAlongRouteParams): Promise<PlacesResponse> {
  const requestBody: any = {
    textQuery: params.textQuery,
    searchAlongRouteParameters: {
      polyline: {
        encodedPolyline: params.polyline
      }
    }
  };

  if (params.routingOrigin) {
    requestBody.routingParameters = {
      origin: params.routingOrigin
    };
  }

  const response = await axios.post(
    'https://places.googleapis.com/v1/places:searchText',
    requestBody,
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': PLACE_FIELDS.join(',')
      }
    }
  );

  return response.data;
}

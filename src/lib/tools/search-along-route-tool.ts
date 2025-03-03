import { searchAlongRoute } from './search-along-route-api';

export interface RouteSearchArgs {
  query: string;
  polyline: string;
  origin?: string;
}

export async function executeRouteSearch(args: RouteSearchArgs) {
  try {
    const routingOrigin = args.origin
      ? {
          latitude: parseFloat(args.origin.split(',')[0]),
          longitude: parseFloat(args.origin.split(',')[1])
        }
      : undefined;

    const result = await searchAlongRoute({
      textQuery: args.query,
      polyline: args.polyline,
      routingOrigin
    });

    return {
      places: result.places.map(place => ({
        name: place.displayName.text,
        address: place.formattedAddress,
        rating: place.rating,
        userRatings: place.userRatingCount,
        priceLevel: place.priceLevel,
        location: place.location,
        types: place.types
      }))
    };
  } catch (error) {
    console.error('Route search error:', error);
    throw new Error(`Route search failed: ${error}`);
  }
} 
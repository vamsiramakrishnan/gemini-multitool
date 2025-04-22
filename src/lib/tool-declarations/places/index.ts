/**
 * Tool declarations for places-related functionality
 */

import { SchemaType } from "@google/generative-ai";
import type { ToolDeclaration } from "../types";

export const searchPlacesToolDeclaration: ToolDeclaration = {
  name: "search_places",
  description: "Search for places using text query and get their photos",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: {
        type: SchemaType.STRING,
        description: "The text query to search for places (e.g., 'restaurants in New York')"
      },
      maxResults: {
        type: SchemaType.NUMBER,
        description: "Optional number of results to return (default: 5, max: 20)"
      }
    },
    required: ["query"]
  }
};

export const searchNearbyToolDeclaration: ToolDeclaration = {
  name: "search_nearby",
  description: "Search for places near a specific location using Google Places API",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      location: {
        type: SchemaType.OBJECT,
        description: "The geographical coordinates of the location to search around",
        properties: {
          latitude: { 
            type: SchemaType.NUMBER,
            description: "The latitude coordinate of the location"
          },
          longitude: { 
            type: SchemaType.NUMBER,
            description: "The longitude coordinate of the location"
          }
        },
        required: ["latitude", "longitude"]
      },
      radius: {
        type: SchemaType.NUMBER,
        description: "Search radius in meters (default: 500, max: 50000)"
      },
      keyword: {
        type: SchemaType.STRING,
        description: "A term to be matched against all content that Google has indexed for this place"
      },
      type: {
        type: SchemaType.STRING,
        description: "Restricts results to places matching the specified type (e.g., restaurant, cafe, park)"
      },
      minprice: {
        type: SchemaType.NUMBER,
        description: "Restricts results to places within the specified price level (0-4)"
      },
      maxprice: {
        type: SchemaType.NUMBER,
        description: "Restricts results to places within the specified price level (0-4)"
      },
      opennow: {
        type: SchemaType.BOOLEAN,
        description: "Returns only places that are open at the time of the request"
      },
      rankby: {
        type: SchemaType.STRING,
        description: "Specifies the order in which results are listed: 'prominence' (default) or 'distance'",
        enum: ["prominence", "distance"]
      },
      language: {
        type: SchemaType.STRING,
        description: "The language code for the language in which to return results"
      },
      maxResults: {
        type: SchemaType.NUMBER,
        description: "Maximum number of results to return (default: 5, max: 20)"
      }
    },
    required: ["location"]
  }
}; 
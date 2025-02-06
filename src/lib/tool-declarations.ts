/**
 * Tool declarations for the Gemini API
 */

import { type FunctionDeclaration, SchemaType } from "@google/generative-ai";

export interface ParameterProperty {
  type: SchemaType;
  description: string;
  enum?: string[];
  items?: {
    type: SchemaType;
    enum?: string[];
  };
  properties?: Record<string, ParameterProperty>;
  required?: string[];
}

export const toolDeclarations: FunctionDeclaration[] = [
  {
    name: "get_weather",
    description: "Get current weather information for a city",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        city: {
          type: SchemaType.STRING,
          description: "The name of the city to get weather for"
        }
      },
      required: ["city"]
    }
  },
  {
    name: "get_stock_price",
    description: "Get current stock price and related information",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        symbol: {
          type: SchemaType.STRING,
          description: "The stock symbol to get price information for (e.g., AAPL, GOOGL)"
        }
      },
      required: ["symbol"]
    }
  },
  {
    name: "get_directions",
    description: "Get directions between two locations with various transportation and routing options",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        origin: {
          type: SchemaType.STRING,
          description: "The starting location"
        },
        destination: {
          type: SchemaType.STRING,
          description: "The destination location"
        },
        mode: {
          type: SchemaType.STRING,
          description: "Travel mode: 'driving', 'walking', 'bicycling', or 'transit'",
          enum: ["DRIVING", "WALKING", "BICYCLING", "TRANSIT"]
        },
        alternatives: {
          type: SchemaType.BOOLEAN,
          description: "If true, provides alternative routes when possible"
        },
        departureTime: {
          type: SchemaType.STRING,
          description: "Desired departure time in ISO format. Use 'now' for current time"
        },
        arrivalTime: {
          type: SchemaType.STRING,
          description: "Desired arrival time in ISO format (only for transit)"
        },
        avoid: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.STRING,
            enum: ["tolls", "highways", "ferries", "indoor"]
          },
          description: "Features to avoid: tolls, highways, ferries, indoor"
        },
        transitMode: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.STRING,
            enum: ["bus", "subway", "train", "tram", "rail"]
          },
          description: "Preferred transit modes (only for transit mode)"
        }
      },
      required: ["origin", "destination"]
    }
  },
  {
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
  },
  {
    name: "search_nearby",
    description: "Search for places near a specific location using Google Places API",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        location: {
          type: SchemaType.OBJECT,
          properties: {
            latitude: { type: SchemaType.NUMBER },
            longitude: { type: SchemaType.NUMBER }
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
  },
  {
    name: "render_altair",
    description: "Displays an Altair chart in JSON format.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        altair_json: {
          type: SchemaType.STRING,
          description: "JSON STRING representation of the Altair chart to render. Must be a string, not a json object"
        },
        theme: {
          type: SchemaType.STRING,
          description: "Altair theme. Choose from one of 'dark', 'ggplot2', 'default', 'opaque'.",
          enum: ["dark", "ggplot2", "default", "opaque"]
        }
      },
      required: ["altair_json"]
    }
  }
]; 
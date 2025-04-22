/**
 * Tool declarations for maps-related functionality
 */

import { SchemaType } from "@google/generative-ai";
import type { ToolDeclaration } from "../types";

export const getDirectionsToolDeclaration: ToolDeclaration = {
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
}; 
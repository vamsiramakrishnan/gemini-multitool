/**
 * Tool declarations for Envato Photos
 */

import { SchemaType } from "@google/generative-ai";
import type { EnvatoToolDeclaration } from "./types";

export const photosToolDeclaration: EnvatoToolDeclaration = {
  name: "search_envato_photos",
  description: "Search for photos on Envato Elements with various filters",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: {
        type: SchemaType.STRING,
        description: "The search query for photos"
      },
      numberOfPeople: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.STRING,
          enum: ["No people", "1 person", "2 people", "3+ people"]
        },
        description: "Filter by number of people in the photo"
      },
      colors: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.STRING,
          enum: ["Pink", "Red", "Orange", "Yellow", "Green", "Teal", "Blue", "Purple", "Brown", "Black", "Grey", "White"]
        },
        description: "Filter by dominant colors in the photo"
      },
      orientation: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.STRING,
          enum: ["Landscape", "Portrait", "Square"]
        },
        description: "Filter by photo orientation"
      },
      background: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.STRING,
          enum: ["Isolated", "Blurred"]
        },
        description: "Filter by background type"
      },
      page: {
        type: SchemaType.NUMBER,
        description: "Page number for pagination (default: 1)"
      }
    },
    required: ["query"]
  }
}; 
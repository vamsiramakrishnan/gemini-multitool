/**
 * Tool declarations for Envato Stock Videos
 */

import { SchemaType } from "@google/generative-ai";
import type { EnvatoToolDeclaration } from "./types";

export const stockVideosToolDeclaration: EnvatoToolDeclaration = {
  name: "search_envato_stock_videos",
  description: "Search for stock videos on Envato Elements with various filters",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: {
        type: SchemaType.STRING,
        description: "The search query for stock videos"
      },
      categories: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.STRING,
          enum: ["Stock Footage", "Motion Graphics"]
        },
        description: "Filter by video category"
      },
      orientation: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.STRING,
          enum: ["Horizontal", "Vertical"]
        },
        description: "Filter by video orientation"
      },
      resolution: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.STRING,
          enum: ["720p (HD)", "1080p (Full HD)", "2K", "4K (UHD)"]
        },
        description: "Filter by video resolution"
      },
      frameRate: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.STRING,
          enum: ["23.98 fps", "24 fps", "25 fps", "29.97 fps", "30 fps", "50 fps", "60 fps", "More than 60 fps"]
        },
        description: "Filter by video frame rate"
      },
      videoLength: {
        type: SchemaType.OBJECT,
        properties: {
          min: {
            type: SchemaType.NUMBER,
            description: "Minimum video length in seconds"
          },
          max: {
            type: SchemaType.NUMBER,
            description: "Maximum video length in seconds"
          }
        },
        description: "Filter by video length range"
      },
      properties: {
        type: SchemaType.OBJECT,
        properties: {
          hasAlphaChannel: {
            type: SchemaType.BOOLEAN,
            description: "Filter for videos with alpha channel"
          },
          isLooped: {
            type: SchemaType.BOOLEAN,
            description: "Filter for looped videos"
          }
        },
        description: "Filter by video properties"
      },
      page: {
        type: SchemaType.NUMBER,
        description: "Page number for pagination (default: 1)"
      }
    },
    required: ["query"]
  }
}; 
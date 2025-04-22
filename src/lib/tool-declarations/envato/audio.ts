/**
 * Tool declarations for Envato Audio
 */

import { SchemaType } from "@google/generative-ai";
import type { EnvatoToolDeclaration } from "./types";

export const audioToolDeclaration: EnvatoToolDeclaration = {
  name: "search_envato_audio",
  description: "Search for audio tracks on Envato Elements with various filters",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: {
        type: SchemaType.STRING,
        description: "The search query for audio tracks"
      },
      mood: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.STRING,
          enum: [
            "Upbeat/Energetic",
            "Happy/Cheerful",
            "Inspiring/Uplifting",
            "Epic/Powerful",
            "Dramatic/Emotional",
            "Chill/Mellow",
            "Funny/Quirky",
            "Angry/Aggressive",
            "Dark/Suspenseful",
            "Relaxing/Peaceful",
            "Romantic/Sentimental",
            "Sad/Somber"
          ]
        },
        description: "Filter by audio mood"
      },
      genre: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.STRING,
          enum: [
            "Cinematic",
            "Corporate",
            "Hip hop/Rap",
            "Rock",
            "Electronic",
            "Ambient",
            "Funk",
            "Classical",
            "Blues",
            "Children/Kids",
            "Chiptune",
            "Country",
            "Dance/EDM",
            "Dubstep",
            "Folk",
            "Future bass",
            "House"
          ]
        },
        description: "Filter by audio genre"
      },
      page: {
        type: SchemaType.NUMBER,
        description: "Page number for pagination (default: 1)"
      }
    },
    required: ["query"]
  }
}; 
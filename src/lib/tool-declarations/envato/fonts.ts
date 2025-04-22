/**
 * Tool declarations for Envato Fonts
 */

import { SchemaType } from "@google/generative-ai";
import type { EnvatoToolDeclaration } from "./types";

export const fontsToolDeclaration: EnvatoToolDeclaration = {
  name: "search_envato_fonts",
  description: "Search for fonts on Envato Elements with various filters",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: {
        type: SchemaType.STRING,
        description: "The search query for fonts"
      },
      categories: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.STRING,
          enum: ["Serif", "Sans Serif", "Script", "Display", "Handwriting"]
        },
        description: "Filter by font category"
      },
      spacing: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.STRING,
          enum: ["Monospaced", "Proportional"]
        },
        description: "Filter by font spacing"
      },
      optimumSize: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.STRING,
          enum: ["Display", "Text", "Small Text"]
        },
        description: "Filter by optimum font size"
      },
      properties: {
        type: SchemaType.OBJECT,
        properties: {
          isVariable: {
            type: SchemaType.BOOLEAN,
            description: "Filter for variable fonts"
          },
          hasAlternates: {
            type: SchemaType.BOOLEAN,
            description: "Filter for fonts with alternate characters"
          },
          hasLigatures: {
            type: SchemaType.BOOLEAN,
            description: "Filter for fonts with ligatures"
          },
          hasFractions: {
            type: SchemaType.BOOLEAN,
            description: "Filter for fonts with fraction support"
          }
        },
        description: "Filter by font properties"
      },
      page: {
        type: SchemaType.NUMBER,
        description: "Page number for pagination (default: 1)"
      }
    },
    required: ["query"]
  }
}; 
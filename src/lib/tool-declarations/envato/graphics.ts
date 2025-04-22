/**
 * Tool declarations for Envato Graphics
 */

import { SchemaType } from "@google/generative-ai";
import type { EnvatoToolDeclaration } from "./types";

export const graphicsToolDeclaration: EnvatoToolDeclaration = {
  name: "search_envato_graphics",
  description: "Search for graphics on Envato Elements with various filters",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: {
        type: SchemaType.STRING,
        description: "The search query for graphics"
      },
      categories: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.STRING,
          enum: [
            "Backgrounds",
            "Textures",
            "Social",
            "Patterns",
            "Icons",
            "Objects",
            "Illustrations"
          ]
        },
        description: "Filter by graphics category"
      },
      applicationsSupported: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.STRING,
          enum: [
            "Adobe Photoshop",
            "Adobe Illustrator",
            "Figma",
            "Sketch",
            "Affinity Designer"
          ]
        },
        description: "Filter by supported design applications"
      },
      fileTypes: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.STRING,
          enum: ["JPG", "PNG"]
        },
        description: "Filter by file type"
      },
      properties: {
        type: SchemaType.OBJECT,
        properties: {
          isVector: {
            type: SchemaType.BOOLEAN,
            description: "Filter for vector graphics"
          },
          isLayered: {
            type: SchemaType.BOOLEAN,
            description: "Filter for layered graphics"
          },
          isTileable: {
            type: SchemaType.BOOLEAN,
            description: "Filter for tileable graphics"
          }
        },
        description: "Filter by graphic properties"
      },
      page: {
        type: SchemaType.NUMBER,
        description: "Page number for pagination (default: 1)"
      }
    },
    required: ["query"]
  }
}; 
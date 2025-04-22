/**
 * Tool declarations for Envato 3D
 */

import { type FunctionDeclaration, SchemaType } from "@google/generative-ai";
import type { EnvatoToolDeclaration } from "./types";

export const threeDToolDeclaration: EnvatoToolDeclaration = {
  name: "search_envato_3d",
  description: "Search for 3D assets on Envato Elements with various filters",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: {
        type: SchemaType.STRING,
        description: "The search query for 3D assets"
      },
      categories: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.STRING,
          enum: ["Models", "Templates", "Renders"]
        },
        description: "Filter by 3D asset category"
      },
      fileFormats: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.STRING,
          enum: [
            "Blender (BLEND)",
            "Spline (SPLINE)",
            "OBJ",
            "FBX",
            "GLTF",
            "GLB"
          ]
        },
        description: "Filter by 3D file format"
      },
      polyCount: {
        type: SchemaType.OBJECT,
        properties: {
          min: {
            type: SchemaType.NUMBER,
            description: "Minimum polygon count"
          },
          max: {
            type: SchemaType.NUMBER,
            description: "Maximum polygon count"
          }
        },
        description: "Filter by polygon count range"
      },
      properties: {
        type: SchemaType.OBJECT,
        properties: {
          isAnimated: {
            type: SchemaType.BOOLEAN,
            description: "Filter for animated 3D assets"
          },
          isRigged: {
            type: SchemaType.BOOLEAN,
            description: "Filter for rigged 3D assets"
          },
          hasTextures: {
            type: SchemaType.BOOLEAN,
            description: "Filter for textured 3D assets"
          },
          isInteractive: {
            type: SchemaType.BOOLEAN,
            description: "Filter for interactive 3D assets"
          }
        },
        description: "Filter by 3D asset properties"
      },
      themes: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.STRING,
          enum: [
            "Technology",
            "Characters",
            "Architecture",
            "Animals",
            "Design"
          ]
        },
        description: "Filter by 3D asset theme"
      },
      page: {
        type: SchemaType.NUMBER,
        description: "Page number for pagination (default: 1)"
      }
    },
    required: ["query"]
  }
}; 
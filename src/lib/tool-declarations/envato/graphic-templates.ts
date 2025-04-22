/**
 * Tool declarations for Envato Graphic Templates
 */

import { SchemaType } from "@google/generative-ai";
import type { EnvatoToolDeclaration } from "./types";

export const graphicTemplatesToolDeclaration: EnvatoToolDeclaration = {
  name: "search_envato_graphic_templates",
  description: "Search for graphic templates on Envato Elements with various filters",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: {
        type: SchemaType.STRING,
        description: "The search query for graphic templates"
      },
      categories: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.STRING,
          enum: [
            "Print Templates",
            "Product Mockups",
            "Websites",
            "Social Media",
            "Presentations",
            "Resumes",
            "Business Cards",
            "Brochures",
            "Flyers",
            "Posters",
            "Banners",
            "Logos"
          ]
        },
        description: "Filter by graphic template category"
      },
      colorSpace: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.STRING,
          enum: ["RGB", "CMYK"]
        },
        description: "Filter by color space"
      },
      orientation: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.STRING,
          enum: ["Landscape", "Portrait", "Square"]
        },
        description: "Filter by template orientation"
      },
      applicationsSupported: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.STRING,
          enum: [
            "Adobe Photoshop",
            "Adobe Illustrator",
            "Adobe InDesign",
            "Figma",
            "Sketch",
            "Canva",
            "Microsoft PowerPoint",
            "Microsoft Word",
            "Google Slides",
            "Google Docs"
          ]
        },
        description: "Filter by supported design applications"
      },
      properties: {
        type: SchemaType.OBJECT,
        properties: {
          isVector: {
            type: SchemaType.BOOLEAN,
            description: "Filter for vector-based templates"
          },
          isLayered: {
            type: SchemaType.BOOLEAN,
            description: "Filter for layered templates"
          }
        },
        description: "Filter by template properties"
      },
      page: {
        type: SchemaType.NUMBER,
        description: "Page number for pagination (default: 1)"
      }
    },
    required: ["query"]
  }
}; 
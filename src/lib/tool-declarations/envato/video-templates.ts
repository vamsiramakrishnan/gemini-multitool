/**
 * Tool declarations for Envato Video Templates
 */

import { SchemaType } from "@google/generative-ai";
import type { EnvatoToolDeclaration } from "./types";

export const videoTemplatesToolDeclaration: EnvatoToolDeclaration = {
  name: "search_envato_video_templates",
  description: "Search for video templates on Envato Elements with various filters",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: {
        type: SchemaType.STRING,
        description: "The search query for video templates"
      },
      categories: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.STRING,
          enum: [
            "After Effects",
            "Premiere Pro",
            "Motion Graphics",
            "Social Media",
            "Corporate",
            "Wedding",
            "YouTube",
            "Instagram",
            "TikTok",
            "Facebook",
            "Twitter",
            "LinkedIn"
          ]
        },
        description: "Filter by video template category"
      },
      applicationsSupported: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.STRING,
          enum: [
            "Adobe After Effects",
            "Adobe Premiere Pro",
            "DaVinci Resolve",
            "Final Cut Pro",
            "Motion",
            "Vegas Pro"
          ]
        },
        description: "Filter by supported video editing applications"
      },
      requiredPlugins: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.STRING,
          enum: [
            "Element 3D",
            "Optical Flares",
            "Particular",
            "Trapcode Suite",
            "Video Copilot",
            "Red Giant"
          ]
        },
        description: "Filter by required plugins"
      },
      resolution: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.STRING,
          enum: ["1920x1080", "3840x2160", "1080x1920", "2160x3840"]
        },
        description: "Filter by video resolution"
      },
      page: {
        type: SchemaType.NUMBER,
        description: "Page number for pagination (default: 1)"
      }
    },
    required: ["query"]
  }
}; 
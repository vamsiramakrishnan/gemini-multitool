/**
 * Tool declarations for visualization-related functionality
 */

import { SchemaType } from "@google/generative-ai";
import type { ToolDeclaration } from "../types";

export const renderAltairToolDeclaration: ToolDeclaration = {
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
};

export const renderTableToolDeclaration: ToolDeclaration = {
  name: "render_table",
  description: "Renders a markdown table with the provided data",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      markdown: {
        type: SchemaType.STRING,
        description: "The markdown table content to render (must be valid markdown table format)"
      },
      title: {
        type: SchemaType.STRING,
        description: "Optional title for the table"
      },
      description: {
        type: SchemaType.STRING,
        description: "Optional description for the table"
      }
    },
    required: ["markdown"]
  }
}; 
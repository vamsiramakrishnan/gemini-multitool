/**
 * Tool declarations for weather-related functionality
 */

import { SchemaType } from "@google/generative-ai";
import type { ToolDeclaration } from "../types";

export const weatherToolDeclaration: ToolDeclaration = {
  name: "get_weather",
  description: "Get current weather information for a city",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      city: {
        type: SchemaType.STRING,
        description: "The name of the city to get weather for"
      }
    },
    required: ["city"]
  }
};
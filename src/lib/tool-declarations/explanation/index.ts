/**
 * Tool declarations for explanation-related functionality
 */

import { SchemaType } from "@google/generative-ai";
import type { ToolDeclaration } from "../types";

export const explainTopicToolDeclaration: ToolDeclaration = {
  name: "explain_topic",
  description: "Generate comprehensive explanations on any topic with customizable style and format",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      topic: {
        type: SchemaType.STRING,
        description: "The topic to explain (e.g., 'quantum computing', 'climate change', 'blockchain')"
      },
      style: {
        type: SchemaType.STRING,
        description: "The style of explanation",
        enum: ["academic", "conversational", "technical", "simple"]
      },
      format: {
        type: SchemaType.STRING,
        description: "The format of the explanation",
        enum: ["detailed", "summary", "step-by-step", "qa"]
      },
      context: {
        type: SchemaType.STRING,
        description: "Additional context or specific aspects to focus on"
      }
    },
    required: ["topic"]
  }
}; 
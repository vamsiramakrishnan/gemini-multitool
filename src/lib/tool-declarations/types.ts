/**
 * Shared types for tool declarations
 */

import { SchemaType } from "@google/generative-ai";

export interface ParameterProperty {
  type: SchemaType;
  description: string;
  enum?: string[];
  items?: {
    type: SchemaType;
    enum?: string[];
  };
  properties?: Record<string, ParameterProperty>;
  required?: string[];
}

export interface ToolDeclaration {
  name: string;
  description: string;
  parameters: {
    type: SchemaType;
    properties: Record<string, ParameterProperty>;
    required: string[];
  };
}

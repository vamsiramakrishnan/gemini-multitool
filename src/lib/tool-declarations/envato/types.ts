/**
 * Shared types for Envato tool declarations
 */

import type { ToolDeclaration } from "../types";

export interface BaseEnvatoTool {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

export type EnvatoToolDeclaration = ToolDeclaration; 
/**
 * Tool declarations for stock-related functionality
 */

import { SchemaType } from "@google/generative-ai";
import type { ToolDeclaration } from "../types";

export const stocksToolDeclaration: ToolDeclaration = {
  name: "get_stock_price",
  description: "Get current stock price and related information",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      symbol: {
        type: SchemaType.STRING,
        description: "The stock symbol to get price information for (e.g., AAPL, GOOGL)"
      }
    },
    required: ["symbol"]
  }
}; 
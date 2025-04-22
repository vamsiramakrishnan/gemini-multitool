/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type {
  Content,
  FunctionCall,
  FunctionResponse,
  GenerationConfig,
  Part,
  Tool,
  LiveServerMessage,
  Modality,
  Blob,
} from "@google/genai";

/**
 * this module contains type-definitions and Type-Guards
 */

// Type-definitions

// Configuration for initiating the session (may be simplified later)
export type LiveConfig = {
  model: string;
  systemInstruction?: { parts: Part[] };
  generationConfig?: Partial<GenerationConfig>; // Keep for now, might adjust
  tools?: Array<Tool | { googleSearch: {} } | { codeExecution: {} }>;
  // Add responseModalities for SDK compatibility
  responseModalities?: Modality[];
};

// Keep GenerationConfig specifics if needed by the app, align with SDK if possible
export type LiveGenerationConfig = GenerationConfig & {
  responseModalities?: Modality[]; // Now using SDK's Modality enum
  speechConfig?: {
    voiceConfig?: {
      prebuiltVoiceConfig?: {
        voiceName: "Puck" | "Charon" | "Kore" | "Fenrir" | "Aoede" | string;
      };
    };
  };
};

// Export SDK message types for direct use in the app
export type { LiveServerMessage };

// Keep LiveFunctionResponse if custom structure is needed, otherwise use SDK's FunctionResponse
export type LiveFunctionResponse = FunctionResponse & {
  // Potentially add custom fields if necessary, or just use FunctionResponse
  id: string; // ID might be handled differently by the SDK, verify usage
};

// Keep LiveFunctionCall if custom structure is needed, otherwise use SDK's FunctionCall
export type LiveFunctionCall = FunctionCall & {
  id: string; // ID might be handled differently by the SDK, verify usage
};

/**
 * Represents a tool call within the live session context.
 * Might be replaceable by FunctionCallPart from the SDK if no custom ID is needed.
 */
export type ToolCall = {
  functionCalls: LiveFunctionCall[];
};

/** log types */
export type StreamingLog = {
  date: Date;
  type: string; // e.g., 'request', 'response', 'error', 'info'
  count?: number;
  message: string | object | { error: any }; // Use generic object for now, refine later
  error?: any;
};

// Keep Grounding and Search types as they represent data structures within responses
export interface GroundingMetadata {
  groundingChunks: GroundingChunk[];
  groundingSupports?: GroundingSupport[];
  searchEntryPoint?: SearchEntryPoint;
  webSearchQueries?: string[];
}

export interface GroundingChunk {
  text: string;
  source: 'web' | 'user' | 'assistant';
  metadata?: {
    url?: string;
    title?: string;
    snippet?: string;
    timestamp?: string;
  };
}

export interface GroundingSupport {
  content?: string;
  segments?: GroundingSupportSegment[];
  groundingChunkIndices?: number[];
}

export interface GroundingSupportSegment {
  startIndex: number;
  endIndex: number;
  supportingChunkIndexes: number[]; // SDK might use different naming
  text: string;
}

export interface SearchEntryPoint {
  query: string;
  context?: string;
}

export interface SearchChunk {
  index: number;
  text: string;
  source: 'web' | 'user' | 'assistant';
  metadata?: {
    url?: string;
    title?: string;
    snippet?: string;
    timestamp?: string;
  };
}

// Type guards for relevant SDK types
export function isContent(value: unknown): value is Content {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Content;
  return typeof candidate.role === "string" && Array.isArray(candidate.parts);
}

export function isPart(value: unknown): value is Part {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Part;
  return (
    ("text" in candidate && typeof candidate.text === "string") ||
    ("inlineData" in candidate && 
      typeof candidate.inlineData === "object" &&
      candidate.inlineData &&
      "mimeType" in candidate.inlineData &&
      "data" in candidate.inlineData) ||
    ("functionCall" in candidate && typeof candidate.functionCall === "object")
  );
}

// isFunctionCall is likely available in the SDK, but keep if custom checks needed
export function isFunctionCall(value: unknown): value is FunctionCall {
  if (!value || typeof value !== "object") return false;
  const candidate = value as FunctionCall;
  return (
    typeof candidate.name === "string" && 
    (!candidate.args || typeof candidate.args === "object")
  );
}

// Keep custom LiveFunctionCall guard if needed
export function isLiveFunctionCall(value: unknown): value is LiveFunctionCall {
  if (!isFunctionCall(value)) return false;
  const candidate = value as LiveFunctionCall;
  return typeof candidate.id === "string"; // Check if ID is still relevant
}

// isFunctionResponse is likely available in the SDK, but keep if custom checks needed
export function isFunctionResponse(value: unknown): value is FunctionResponse {
  if (!value || typeof value !== "object") return false;
  const candidate = value as FunctionResponse;
  return (
    typeof candidate.name === "string" && typeof candidate.response === "object"
  );
}

// Keep custom LiveFunctionResponse guard if needed
export function isLiveFunctionResponse(
  value: unknown,
): value is LiveFunctionResponse {
  if (!isFunctionResponse(value)) return false;
  const candidate = value as LiveFunctionResponse;
  return typeof candidate.id === "string"; // Check if ID is still relevant
}

// Helper function to check LiveServerMessage content
export function hasModelTurn(msg: LiveServerMessage): boolean {
  return !!msg.serverContent?.modelTurn;
}

export function hasFunctionCalls(msg: LiveServerMessage): boolean {
  // Check for function calls in the modelTurn parts
  if (!msg.serverContent?.modelTurn?.parts) return false;
  return msg.serverContent.modelTurn.parts.some(part => part.functionCall);
}

export function hasFunctionResponses(msg: LiveServerMessage): boolean {
  // Based on SDK samples, the LiveServerMessage might not directly have
  // a field for function responses. Instead, it might be structured differently.
  // Let's check if the message has any parts with functionResponse field
  if (msg.serverContent?.modelTurn?.parts) {
    return msg.serverContent.modelTurn.parts.some(
      (part: any) => part.functionResponse
    );
  }
  return false;
}

export function isTurnComplete(msg: LiveServerMessage): boolean {
  return !!msg.serverContent?.turnComplete;
}

/**
 * Processes an array of GroundingChunk objects.
 * Adds a timestamp to the metadata if one doesn't exist and sets a default source.
 * @param chunks An array of GroundingChunk objects.
 * @returns A promise that resolves to an array of processed GroundingChunk objects.
 */
export async function processGroundingChunks(chunks?: GroundingChunk[]): Promise<GroundingChunk[]> {
  if (!chunks) {
    return [];
  }
  return Promise.all(chunks.map(async (chunk) => ({
    ...chunk,
    metadata: {
      ...chunk.metadata,
      timestamp: chunk.metadata?.timestamp || new Date().toISOString(),
      source: chunk.source || 'web'
    }
  })));
}

/**
 * Processes an array of GroundingSupport objects.
 * Trims the content, validates segment start and end indices.
 * @param supports - An array of GroundingSupport objects.
 * @returns - A promise resolving to an array of processed, valid GroundingSupport objects, or null if an error occurs.
 */
export async function processGroundingSupports(supports?: GroundingSupport[]): Promise<GroundingSupport[]> {
  if (!supports) {
    return [];
  }
  const supportPromises = supports.map(async (support) => {
    try {
      return {
        ...support,
        content: support?.content?.trim() ?? '',
        segments: support?.segments?.map((segment: GroundingSupportSegment) => ({
          ...segment,
          startIndex: Math.max(0, segment?.startIndex ?? 0),
          endIndex: Math.max((segment?.startIndex ?? 0) + 1, segment?.endIndex ?? 1)
        })) ?? []
      };
    } catch (error) {
      console.error('Error processing support:', error);
      return null; // Return null for individual errors
    }
  });
  // Filter out any null values (failed supports)
  return (await Promise.all(supportPromises)).filter((s): s is GroundingSupport => s !== null);
}

// Define the grounding metadata interface separately
export interface WithGroundingMetadata {
  groundingMetadata?: {
    searchEntryPoint?: SearchEntryPoint;
    groundingChunks: SearchChunk[];
    groundingSupports: GroundingSupport[];
    webSearchQueries?: string[];
  };
}

// Use type intersection instead of interface extension
export type ServerContentWithGrounding = Content & WithGroundingMetadata;

// Strengthen type validation with type predicates
export function isGroundingMetadata(value: unknown): value is GroundingMetadata {
  const candidate = value as GroundingMetadata;
  return (
    Array.isArray(candidate.groundingChunks) &&
    candidate.groundingChunks.every(chunk =>
      typeof chunk.text === 'string' &&
      (chunk.source === 'web' || chunk.source === 'user' || chunk.source === 'assistant')
    ) &&
    (!candidate.groundingSupports || (
      Array.isArray(candidate.groundingSupports) &&
      candidate.groundingSupports.every(support =>
        (!support.content || typeof support.content === 'string') &&
        (!support.segments || support.segments.every(segment =>
          typeof segment.startIndex === 'number' &&
          typeof segment.endIndex === 'number'
        ))
      )
    ))
  );
}

// Add validation for tool calls - Use the custom LiveFunctionCall if needed
export function isValidToolCall(value: unknown): value is ToolCall {
  if (typeof value !== "object" || value === null || !("functionCalls" in value) || !Array.isArray((value as any).functionCalls))
    return false;
  return (value as ToolCall).functionCalls.every((call) => isLiveFunctionCall(call)); // Use custom guard if LiveFunctionCall is kept
}

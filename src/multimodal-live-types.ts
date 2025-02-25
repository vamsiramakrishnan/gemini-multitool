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
  GenerationConfig,
  GenerativeContentBlob,
  Part,
  Tool,
} from "@google/generative-ai";

/**
 * this module contains type-definitions and Type-Guards
 */

// Type-definitions

/* outgoing types */

/**
 * the config to initiate the session
 */
export type LiveConfig = {
  model: string;
  systemInstruction?: { parts: Part[] };
  generationConfig?: Partial<LiveGenerationConfig>;
  tools?: Array<Tool | { googleSearch: {} } | { codeExecution: {} }>;
};

export type LiveGenerationConfig = GenerationConfig & {
  responseModalities: "text" | "audio" | "image";
  speechConfig?: {
    voiceConfig?: {
      prebuiltVoiceConfig?: {
        voiceName: "Puck" | "Charon" | "Kore" | "Fenrir" | "Aoede" | string;
      };
    };
  };
};

export type LiveOutgoingMessage =
  | SetupMessage
  | ClientContentMessage
  | RealtimeInputMessage
  | ToolResponseMessage;

export type SetupMessage = {
  setup: LiveConfig;
};

export type ClientContentMessage = {
  clientContent: {
    turns: Content[];
    turnComplete: boolean;
  };
};

export type RealtimeInputMessage = {
  realtimeInput: {
    mediaChunks: GenerativeContentBlob[];
  };
};

export type ToolResponseMessage = {
  toolResponse: {
    functionResponses: LiveFunctionResponse[];
  };
};

export type ToolResponse = ToolResponseMessage["toolResponse"];

export type LiveFunctionResponse = {
  response: object;
  id: string;
};

/** Incoming types */

export type LiveIncomingMessage =
  | ToolCallCancellationMessage
  | ToolCallMessage
  | ServerContentMessage
  | SetupCompleteMessage;

export type SetupCompleteMessage = { setupComplete: {} };

export type ServerContentMessage = {
  serverContent: ServerContent;
};

export type ServerContent = ModelTurn | TurnComplete | Interrupted;

export type ModelTurn = {
  modelTurn: {
    parts: Part[];
  };
};

export type TurnComplete = { turnComplete: boolean };

export type Interrupted = { interrupted: true };

export type ToolCallCancellationMessage = {
  toolCallCancellation: {
    ids: string[];
  };
};

export type ToolCallCancellation =
  ToolCallCancellationMessage["toolCallCancellation"];

export type ToolCallMessage = {
  toolCall: ToolCall;
};

export type LiveFunctionCall = FunctionCall & {
  id: string;
};

/**
 * A `toolCall` message
 */
export type ToolCall = {
  functionCalls: LiveFunctionCall[];
};

/** log types */
export type StreamingLog = {
  date: Date;
  type: string;
  count?: number;
  message: string | LiveOutgoingMessage | LiveIncomingMessage;
};

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
  supportingChunkIndexes: number[];
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

// Type-Guards

const prop = (a: any, prop: string, kind: string = "object") =>
  typeof a === "object" && typeof a[prop] === "object";

// outgoing messages
export const isSetupMessage = (a: unknown): a is SetupMessage =>
  prop(a, "setup");

export const isClientContentMessage = (a: unknown): a is ClientContentMessage =>
  prop(a, "clientContent");

export const isRealtimeInputMessage = (a: unknown): a is RealtimeInputMessage =>
  prop(a, "realtimeInput");

export const isToolResponseMessage = (a: unknown): a is ToolResponseMessage =>
  prop(a, "toolResponse");

// incoming messages
export const isSetupCompleteMessage = (a: unknown): a is SetupCompleteMessage =>
  prop(a, "setupComplete");

export const isServerContentMessage = (a: any): a is ServerContentMessage =>
  prop(a, "serverContent");

export const isToolCallMessage = (a: any): a is ToolCallMessage =>
  prop(a, "toolCall");

export const isToolCallCancellationMessage = (
  a: unknown,
): a is ToolCallCancellationMessage =>
  prop(a, "toolCallCancellation") &&
  isToolCallCancellation((a as any).toolCallCancellation);

export const isModelTurn = (a: any): a is ModelTurn =>
  typeof (a as ModelTurn).modelTurn === "object";

export const isTurnComplete = (a: any): a is TurnComplete =>
  typeof (a as TurnComplete).turnComplete === "boolean";

export const isInterrupted = (a: any): a is Interrupted =>
  (a as Interrupted).interrupted;

export function isToolCall(value: unknown): value is ToolCall {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;

  return (
    Array.isArray(candidate.functionCalls) &&
    candidate.functionCalls.every((call) => isLiveFunctionCall(call))
  );
}

export function isToolResponse(value: unknown): value is ToolResponse {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;

  return (
    Array.isArray(candidate.functionResponses) &&
    candidate.functionResponses.every((resp) => isLiveFunctionResponse(resp))
  );
}

export function isLiveFunctionCall(value: unknown): value is LiveFunctionCall {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.name === "string" &&
    typeof candidate.id === "string" &&
    typeof candidate.args === "object" &&
    candidate.args !== null
  );
}

export function isLiveFunctionResponse(
  value: unknown,
): value is LiveFunctionResponse {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.response === "object" && typeof candidate.id === "string"
  );
}

export const isToolCallCancellation = (
  a: unknown,
): a is ToolCallCancellationMessage["toolCallCancellation"] =>
  typeof a === "object" && Array.isArray((a as any).ids);

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
export type ServerContentWithGrounding = ServerContent & WithGroundingMetadata;

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

// Add validation for tool calls
export function isValidToolCall(value: unknown): value is ToolCall {
  if (!isToolCall(value)) return false;
  return value.functionCalls.every(call => 
    typeof call.id === 'string' &&
    typeof call.name === 'string' &&
    typeof call.args === 'object'
  );
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

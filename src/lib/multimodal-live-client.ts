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

import {
  GoogleGenAI,
  Content,
  Part,
  FunctionCall,
  FunctionResponse,
  Tool,
  Blob,
  LiveServerMessage,
  Modality
} from "@google/genai";
import { EventEmitter } from "eventemitter3";
import { difference } from "lodash";
import {
  GroundingMetadata,
  LiveFunctionCall,
  LiveFunctionResponse,
  StreamingLog,
  ToolCall,
  type LiveConfig,
  GroundingSupport,
  hasModelTurn,
  hasFunctionCalls,
  hasFunctionResponses,
  isTurnComplete,
  processGroundingChunks,
  processGroundingSupports
} from "../multimodal-live-types";
import { blobToJSON, base64ToArrayBuffer } from "./utils";

// Define event types using SDK types where possible
interface MultimodalLiveClientEventTypes {
  open: () => void;
  log: (log: StreamingLog) => void;
  close: (reason?: string) => void;
  audio: (data: ArrayBuffer) => void;
  content: (data: Content) => void;
  interrupted: () => void;
  setupcomplete: () => void;
  turncomplete: () => void;
  toolcall: (toolCalls: FunctionCall[]) => void;
  grounding: (metadata: GroundingMetadata) => void;
}

export type MultimodalLiveAPIClientConnection = {
  url?: string; // Used only for backward compatibility
  apiKey: string;
};

export class MultimodalLiveClient extends EventEmitter<MultimodalLiveClientEventTypes> {
  private genAI: GoogleGenAI;
  private session: any = null; // Type will be based on SDK's LiveSession
  protected config: LiveConfig | null = null;

  public getConfig() {
    return { ...this.config };
  }

  constructor({ url, apiKey }: MultimodalLiveAPIClientConnection) {
    super();
    // Initialize the GoogleGenAI client
    this.genAI = new GoogleGenAI({apiKey: apiKey, vertexai: false});
    
    // Bind methods to avoid issues with 'this' context
    this.send = this.send.bind(this);
    this.sendRealtimeInput = this.sendRealtimeInput.bind(this);
    this.sendToolResponse = this.sendToolResponse.bind(this);
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
  }

  log(type: string, message: StreamingLog["message"]) {
    const log: StreamingLog = {
      date: new Date(),
      type,
      message,
    };
    this.emit("log", log);
  }

  /**
   * Connect to the Gemini Live API with the given configuration
   */
  async connect(config: LiveConfig): Promise<boolean> {
    this.config = config;

    if (this.session) {
      this.log("client.warn", "Already connected or connecting.");
      return true;
    }

    try {
      // Prepare connection options
      const connectionConfig: any = {};
      
      // Add configuration fields if present
      if (config.systemInstruction) {
        connectionConfig.systemInstruction = config.systemInstruction;
      }
      
      if (config.tools) {
        connectionConfig.tools = config.tools;
      }
      
      if (config.generationConfig) {
        connectionConfig.generationConfig = config.generationConfig;
      }
      
      if (config.responseModalities) {
        connectionConfig.responseModalities = config.responseModalities;
      }

      // Connect to the Live API with callbacks for events
      this.session = await this.genAI.live.connect({
        model: config.model,
        config: connectionConfig,
        callbacks: {
          onopen: () => {
            this.log("client.connect", `Live session opened for model ${config.model}`);
            this.emit("open");
            this.emit("setupcomplete");
          },
          onmessage: (message: LiveServerMessage) => {
            this.log("server.response", message);
            this.handleServerMessage(message);
          },
          onerror: (error: any) => {
            console.error("Live session error:", error);
            this.log("server.error", { error });
            this.disconnect();
          },
          onclose: (event: any) => {
            const reason = event?.reason || "Connection closed";
            console.log("Live session closed:", reason);
            this.log("client.close", { reason });
            this.session = null;
            this.emit("close", reason);
          }
        }
      });

      return true;
    } catch (error) {
      const message = `Failed to connect: ${error instanceof Error ? error.message : String(error)}`;
      console.error(message, error);
      this.log("client.error", { error: message });
      this.session = null;
      this.emit("close", message);
      return false;
    }
  }

  /**
   * Process incoming server messages and emit appropriate events
   */
  private handleServerMessage(message: LiveServerMessage) {
    // Check for model response content (text, images)
    if (hasModelTurn(message)) {
      const modelTurn = message.serverContent?.modelTurn;
      
      if (modelTurn) {
        // Process audio content
        const audioParts = modelTurn.parts?.filter(
          (part: any) => part.inlineData?.mimeType?.startsWith('audio/')
        );
        
        if (audioParts?.length) {
          audioParts.forEach((part: any) => {
            if (part.inlineData?.data) {
              try {
                const audioBuffer = base64ToArrayBuffer(part.inlineData.data);
                this.emit("audio", audioBuffer);
                this.log("server.audio", `Received audio buffer of ${audioBuffer.byteLength} bytes`);
              } catch (e) {
                console.error("Error processing audio data:", e);
                this.log("server.audio.error", { error: e });
              }
            }
          });
        }
        
        // Process non-audio content
        const nonAudioParts = modelTurn.parts?.filter(
          (part: any) => !part.inlineData?.mimeType?.startsWith('audio/')
        );
        
        if (nonAudioParts?.length) {
          const content: Content = {
            role: 'model',
            parts: nonAudioParts
          };
          this.emit("content", content);
        }
      }
    }
    
    // Check for function calls
    if (hasFunctionCalls(message)) {
      // Extract function calls from the parts
      const functionCalls: FunctionCall[] = [];
      
      message.serverContent?.modelTurn?.parts?.forEach((part: any) => {
        if (part.functionCall) {
          functionCalls.push(part.functionCall);
        }
      });
      
      if (functionCalls.length > 0) {
        this.emit("toolcall", functionCalls);
      }
    }
    
    // Check for function responses
    if (hasFunctionResponses(message)) {
      // Handle function responses if needed
    }
    
    // Check for turn completion
    if (isTurnComplete(message)) {
      this.emit("turncomplete");
    }
    
    // Process grounding metadata if present
    if (message.groundingMetadata) {
      this.handleGroundingMetadata(message.groundingMetadata);
    }
  }

  /**
   * Process and emit grounding metadata
   */
  private async handleGroundingMetadata(metadata: GroundingMetadata) {
    try {
      if (!metadata || !Array.isArray(metadata.groundingChunks)) {
        console.warn("Invalid grounding metadata received", metadata);
        return;
      }
      
      // Process grounding chunks
      const processedChunks = await processGroundingChunks(metadata.groundingChunks);
      
      // Process grounding supports
      const processedSupports = await processGroundingSupports(metadata.groundingSupports);
      
      // Emit processed grounding data
      this.emit("grounding", {
        ...metadata,
        groundingChunks: processedChunks,
        groundingSupports: processedSupports
      });
    } catch (error) {
      console.error("Error processing grounding data:", error);
      this.log("grounding.error", {
        error: `Error processing grounding data: ${error instanceof Error ? error.message : "Unknown error"}`
      });
    }
  }

  /**
   * Disconnect from the Live API
   */
  async disconnect(): Promise<boolean> {
    if (this.session) {
      try {
        await this.session.close();
        this.log("client.disconnect", "Disconnected");
        // onclose callback will handle setting session to null and emitting close event
        return true;
      } catch (error) {
        console.error("Error closing session:", error);
        this.log("client.disconnect.error", { error });
        this.session = null;
        this.emit("close", "Error during disconnect");
        return false;
      }
    }
    return false;
  }

  /**
   * Send realtime input (e.g., audio stream)
   */
  async sendRealtimeInput(media: Blob | Part[] | any): Promise<void> {
    if (!this.session) {
      this.log("client.error", "Cannot send realtime input, not connected");
      return;
    }
    
    try {
      // Handle both Blob and Part[] inputs
      if (typeof media === 'object' && 'mimeType' in media && 'data' in media) {
        // It's a Blob
        await this.session.sendRealtimeInput({ media });
      } else if (Array.isArray(media)) {
        // It's an array of parts
        await this.session.sendRealtimeInput({ parts: media });
      } else {
        // Assume it's already formatted correctly
        await this.session.sendRealtimeInput(media);
      }
      
      this.log("client.realtimeInput", "Sent realtime input");
    } catch (error) {
      console.error("Error sending realtime input:", error);
      this.log("client.send.error", { type: 'realtimeInput', error });
      await this.disconnect();
    }
  }

  /**
   * Send a response to a function call
   */
  async sendToolResponse(functionResponse: FunctionResponse): Promise<void> {
    if (!this.session) {
      this.log("client.error", "Cannot send tool response, not connected");
      return;
    }
    
    try {
      await this.session.sendToolResponse({ 
        functionResponses: [functionResponse] 
      });
      
      this.log("client.toolResponse", { response: functionResponse });
    } catch (error) {
      console.error("Error sending tool response:", error);
      this.log("client.send.error", { type: 'toolResponse', error });
      await this.disconnect();
    }
  }

  /**
   * Send content to the model
   */
  async send(parts: Part | Part[] | string, turnComplete: boolean = true): Promise<void> {
    if (!this.session) {
      this.log("client.error", "Cannot send content, not connected");
      return;
    }
    
    try {
      let payload: any;
      
      // Handle different input types
      if (typeof parts === 'string') {
        // Simple string input
        payload = parts;
      } else {
        // Parts array or single part
        payload = Array.isArray(parts) ? parts : [parts];
      }
      
      // Send the content
      await this.session.sendClientContent({
        turns: payload,
        turnComplete
      });
      
      this.log("client.send", { turns: payload, turnComplete });
    } catch (error) {
      console.error("Error sending content:", error);
      this.log("client.send.error", { type: 'clientContent', error });
      await this.disconnect();
    }
  }
}
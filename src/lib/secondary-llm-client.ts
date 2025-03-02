/**
 * Copyright 2024 Google LLC
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import { Content, GenerateContentResult, GenerationConfig, Part } from "@google/generative-ai";
import EventEmitter from "eventemitter3";
import { toolDeclarations } from "./tool-declarations";

interface SecondaryLLMConfig {
  apiKey: string;
  // Allow overriding the model name
  model?: string;
  // Default generation config that can be overridden per request
  defaultGenerationConfig?: Partial<GenerationConfig>;
}

interface SecondaryLLMEventTypes {
  error: (error: Error) => void;
  response: (response: GenerateContentResult) => void;
  complete: () => void;
}

interface FileUploadOptions {
  mimeType: string;
  displayName?: string;
}

export class SecondaryLLM extends EventEmitter<SecondaryLLMEventTypes> {
  private apiKey: string;
  private model: string;
  private defaultGenerationConfig: Partial<GenerationConfig>;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(config: SecondaryLLMConfig) {
    super();
    this.apiKey = config.apiKey;
    this.model = config.model || 'gemini-2.0-flash-exp';
    this.defaultGenerationConfig = config.defaultGenerationConfig || {
      maxOutputTokens: 8192,
    };
  }

  /**
   * Helper function to convert a URL to a Part object
   */
  private async urlToGenerativePart(url: string, mimeType: string): Promise<Part> {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return {
      inlineData: {
        data: Buffer.from(arrayBuffer).toString("base64"),
        mimeType
      },
    };
  }

  /**
   * Upload a file using the File API for large files (>20MB)
   */
  async uploadFile(file: File, options: FileUploadOptions) {
    // In a browser environment, we'd need to implement file upload differently
    // This is a placeholder for browser-compatible file upload
    console.warn('File upload not fully implemented for browser environment');
    
    // Mock implementation that would need to be replaced with actual browser-compatible code
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mimeType', options.mimeType);
    if (options.displayName) {
      formData.append('displayName', options.displayName);
    }

    // This would need to be implemented with a proper API endpoint
    throw new Error('File upload not implemented for browser environment');
  }

  /**
   * Generate content with the secondary LLM
   */
  async generateContent(
    parts: Part | Part[],
    config?: Partial<GenerationConfig>
  ): Promise<GenerateContentResult> {
    const content: Content = {
      role: 'user',
      parts: Array.isArray(parts) ? parts : [parts],
    };

    const generationConfig = {
      ...this.defaultGenerationConfig,
      ...config,
    };

    // Create the request body based on the example from Google Gemini repository
    const requestBody: any = {
      contents: [content],
      generationConfig,
    };

    try {
      console.log('Sending request to Gemini API:', {
        model: this.model,
        config: generationConfig,
        endpoint: `${this.baseUrl}/models/${this.model}:generateContent`
      });

      const response = await fetch(
        `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      this.emit('response', result);
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.emit('error', err);
      throw err;
    }
  }

  /**
   * Generate content with streaming responses
   */
  async *generateContentStream(
    parts: Part | Part[],
    config?: Partial<GenerationConfig>
  ): AsyncGenerator<GenerateContentResult> {
    const content: Content = {
      role: 'user',
      parts: Array.isArray(parts) ? parts : [parts],
    };

    const generationConfig = {
      ...this.defaultGenerationConfig,
      ...config,
    };

    const requestBody: any = {
      contents: [content],
      generationConfig,
    };

    // Only add tools if we have tool declarations and we're not using a schema
    if (!generationConfig.responseSchema && toolDeclarations && toolDeclarations.length > 0) {
      requestBody.tools = [{ functionDeclarations: toolDeclarations }];
    }

    try {
      console.log('Sending streaming request to Gemini API:', {
        model: this.model,
        config: generationConfig,
        endpoint: `${this.baseUrl}/models/${this.model}:streamGenerateContent`
      });

      const response = await fetch(
        `${this.baseUrl}/models/${this.model}:streamGenerateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API streaming error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(5).trim();
            if (jsonStr === '[DONE]') {
              this.emit('complete');
              return;
            }
            try {
              const result = JSON.parse(jsonStr);
              this.emit('response', result);
              yield result;
            } catch (e) {
              console.warn('Failed to parse JSON:', e);
            }
          }
        }
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.emit('error', err);
      throw err;
    }
  }
}
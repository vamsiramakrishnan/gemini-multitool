/**
 * Copyright 2024 Google LLC
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

import { Content, GenerateContentResult, GenerationConfig, Part } from "@google/generative-ai";
import { GoogleAIFileManager, FileState } from "@google/generative-ai/server";
import EventEmitter from "eventemitter3";
import { toolDeclarations } from "./tool-declarations";
import fs from "fs";

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
  private fileManager: GoogleAIFileManager;

  constructor(config: SecondaryLLMConfig) {
    super();
    this.apiKey = config.apiKey;
    this.model = config.model || 'gemini-2.0-flash-exp';
    this.defaultGenerationConfig = config.defaultGenerationConfig || {
      temperature: 0.7,
      topK: 40,
      topP: 0.8,
      maxOutputTokens: 1024,
    };
    this.fileManager = new GoogleAIFileManager(this.apiKey);
  }

  /**
   * Helper function to convert a local file to a Part object for inline data
   */
  private fileToGenerativePart(path: string, mimeType: string): Part {
    return {
      inlineData: {
        data: Buffer.from(fs.readFileSync(path)).toString("base64"),
        mimeType
      },
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
  async uploadFile(filePath: string, options: FileUploadOptions) {
    const uploadResult = await this.fileManager.uploadFile(filePath, options);

    // For video/PDF files, we need to wait for processing to complete
    if (options.mimeType.startsWith('video/') || options.mimeType === 'application/pdf') {
      let file = await this.fileManager.getFile(uploadResult.file.name);
      while (file.state === FileState.PROCESSING) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        file = await this.fileManager.getFile(uploadResult.file.name);
      }

      if (file.state === FileState.FAILED) {
        throw new Error('File processing failed');
      }
    }

    return uploadResult;
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

    const requestBody = {
      contents: [content],
      generationConfig,
      tools: [{ functionDeclarations: toolDeclarations }],
    };

    try {
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

    const requestBody = {
      contents: [content],
      generationConfig,
      tools: [{ functionDeclarations: toolDeclarations }],
    };

    try {
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
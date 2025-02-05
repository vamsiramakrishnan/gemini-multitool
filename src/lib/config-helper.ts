import { LiveConfig } from "../multimodal-live-types";
import { toolDeclarations } from "./tool-declarations";

export async function loadSystemInstructions(): Promise<string> {
  try {
    const response = await fetch('/config/system-instructions.txt');
    if (!response.ok) {
      throw new Error('Failed to load system instructions');
    }
    return await response.text();
  } catch (error) {
    console.error('Error loading system instructions:', error);
    return 'You are a helpful AI assistant.'; // Fallback instruction
  }
}

export function createLiveConfig(systemInstructions: string): LiveConfig {
  return {
    model: "models/gemini-2.0-flash-exp",
    generationConfig: {
      responseModalities: "audio",
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
      },
    },
    systemInstruction: {
      parts: [
        {
          text: systemInstructions,
        },
      ],
    },
    tools: [
      { googleSearch: {} },
      { codeExecution: {} },
      { functionDeclarations: toolDeclarations },
    ],
  };
} 
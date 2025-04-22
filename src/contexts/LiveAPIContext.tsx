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

import { createContext, FC, ReactNode, useContext, useState } from "react";
import { useLiveAPI, UseLiveAPIResults } from "../hooks/use-live-api";
import { Tool } from "@google/genai";
import { FunctionDeclaration } from "@google/generative-ai";
import { toolDeclarations as initialToolDeclarations } from "../lib/tool-declarations";
import { createLiveConfig } from "../lib/config-helper";
import { LiveConfig } from "../multimodal-live-types";
import { ToolDeclaration, ParameterProperty } from "../lib/tool-declarations/types";
import { SchemaType } from "@google/generative-ai";

interface ExtendedUseLiveAPIResults extends UseLiveAPIResults {
  selectedTools: FunctionDeclaration[];
  updateSelectedTools: (tools: FunctionDeclaration[]) => void;
  updateAndApplyConfig: (customConfig?: Partial<LiveConfig>) => void;
}

const LiveAPIContext = createContext<ExtendedUseLiveAPIResults | null>(null);

export type LiveAPIProviderProps = {
  children: ReactNode;
  url?: string;
  apiKey: string;
  systemInstructions: string;
};

// Convert FunctionDeclaration to ToolDeclaration for compatibility with config-helper
const convertToToolDeclarations = (functions: FunctionDeclaration[]): ToolDeclaration[] => {
  return functions.map(func => {
    // Ensure we're using the correct type and that name is not undefined
    const paramType: SchemaType = func.parameters?.type as SchemaType || 'object' as SchemaType;
    
    if (!func.name) {
      console.warn("Function declaration missing name:", func);
    }
    
    // Convert properties to ensure they match ParameterProperty type
    const convertedProperties: Record<string, ParameterProperty> = {};
    if (func.parameters?.properties) {
      Object.entries(func.parameters.properties).forEach(([key, prop]) => {
        convertedProperties[key] = {
          type: prop.type as SchemaType || 'string' as SchemaType,
          description: prop.description || '',
          enum: prop.enum,
          items: prop.items ? {
            type: prop.items.type as SchemaType || 'string' as SchemaType,
            enum: prop.items.enum
          } : undefined, 
          // Cast properties to the expected type
          properties: prop.properties as unknown as Record<string, ParameterProperty> || undefined,
          required: prop.required
        };
      });
    }
    
    return {
      name: func.name || `unnamed_function_${Math.random().toString(36).substring(2, 9)}`, // Ensure name is never undefined
      description: func.description || '', // Ensure description is always a string
      parameters: {
        type: paramType,
        properties: convertedProperties,
        required: func.parameters?.required || []
      }
    };
  });
};

export const LiveAPIProvider: FC<LiveAPIProviderProps> = ({
  children,
  url,
  apiKey,
  systemInstructions,
}) => {
  const liveAPI = useLiveAPI({ url, apiKey });
  // Cast initial declarations to ensure type compatibility
  const [selectedTools, setSelectedTools] = useState<FunctionDeclaration[]>(
    initialToolDeclarations as unknown as FunctionDeclaration[]
  );

  // Update selected tools without applying to config
  const updateSelectedTools = (tools: FunctionDeclaration[]) => {
    setSelectedTools(tools);
    
    // Create updated config with selected tools and templatized system instructions
    // Convert FunctionDeclaration[] to ToolDeclaration[] for compatibility
    const updatedConfig = createLiveConfig(systemInstructions, convertToToolDeclarations(tools));
    
    // Apply the updated config
    liveAPI.setConfig(updatedConfig);
  };

  // Update configuration with selected tools and apply any other custom config
  const updateAndApplyConfig = (customConfig?: Partial<LiveConfig>) => {
    // Create updated config with selected tools and templatized system instructions
    // Convert FunctionDeclaration[] to ToolDeclaration[] for compatibility
    const baseConfig = createLiveConfig(systemInstructions, convertToToolDeclarations(selectedTools));
    
    // Apply any custom config properties
    const updatedConfig: LiveConfig = {
      ...baseConfig,
      ...customConfig,
      // Ensure responseModalities is set to use text and audio if not specified
      responseModalities: customConfig?.responseModalities || 
        baseConfig.responseModalities
    };
    
    // Apply the updated config
    liveAPI.setConfig(updatedConfig);
  };

  const extendedAPI: ExtendedUseLiveAPIResults = {
    ...liveAPI,
    selectedTools,
    updateSelectedTools,
    updateAndApplyConfig
  };

  return (
    <LiveAPIContext.Provider value={extendedAPI}>
      {children}
    </LiveAPIContext.Provider>
  );
};

export const useLiveAPIContext = () => {
  const context = useContext(LiveAPIContext);
  if (!context) {
    throw new Error("useLiveAPIContext must be used within a LiveAPIProvider");
  }
  return context;
};

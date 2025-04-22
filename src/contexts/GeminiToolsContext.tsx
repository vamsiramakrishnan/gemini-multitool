import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toolDeclarations as toolDeclarationsImport } from '../lib/tool-declarations';
import { ToolDeclaration } from '../lib/tool-declarations/types';

// Cast the imported toolDeclarations to the correct type
const toolDeclarations = toolDeclarationsImport as unknown as ToolDeclaration[];

interface GeminiToolsContextType {
  toolDeclarations: ToolDeclaration[];
  isLoading: boolean;
  error: string | null;
}

const defaultContext: GeminiToolsContextType = {
  toolDeclarations: [],
  isLoading: true,
  error: null
};

const GeminiToolsContext = createContext<GeminiToolsContextType>(defaultContext);

export const useGeminiToolsContext = () => useContext(GeminiToolsContext);

interface GeminiToolsProviderProps {
  children: ReactNode;
}

export const GeminiToolsProvider = ({ children }: GeminiToolsProviderProps) => {
  const [state, setState] = useState<GeminiToolsContextType>({
    toolDeclarations: [],
    isLoading: true,
    error: null
  });

  useEffect(() => {
    // Load the tool declarations
    try {
      setState({
        toolDeclarations,
        isLoading: false,
        error: null
      });
    } catch (error) {
      setState({
        toolDeclarations: [],
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load tool declarations'
      });
    }
  }, []);

  return (
    <GeminiToolsContext.Provider value={state}>
      {children}
    </GeminiToolsContext.Provider>
  );
};

export default GeminiToolsProvider; 
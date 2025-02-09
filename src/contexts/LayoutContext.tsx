import React, { createContext, useContext, useState, ReactNode } from 'react';

type LayoutMode = 'auto' | 'compact' | 'spacious';

interface LayoutContextProps {
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  mode: LayoutMode;
  setMode: (mode: LayoutMode) => void;
}

const LayoutContext = createContext<LayoutContextProps>({
  panelOpen: false, // Default: side panel closed
  setPanelOpen: () => {},
  mode: 'auto', // Default layout mode
  setMode: () => {}
});

export const useLayout = () => useContext(LayoutContext);

type LayoutProviderProps = {
  children: ReactNode;
};

export const LayoutProvider: React.FC<LayoutProviderProps> = ({ children }) => {
  const [panelOpen, setPanelOpen] = useState(false);
  const [mode, setMode] = useState<LayoutMode>('auto');

  return (
    <LayoutContext.Provider value={{ panelOpen, setPanelOpen, mode, setMode }}>
      {children}
    </LayoutContext.Provider>
  );
};

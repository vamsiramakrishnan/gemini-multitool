import React, { createContext, useContext, useReducer, ReactNode, useCallback } from 'react';
import { Item, WidgetState } from '../types/widget';
import { useWidget } from './WidgetContext';

// Tab state types
export interface TabState {
  id: string;
  title: string;
  widgets: Item[];
  widgetStates: Record<string, WidgetState>;
  isActive: boolean;
}

interface TabContextState {
  tabs: Record<string, TabState>;
  activeTabId: string;
}

// Action types
type TabAction =
  | { type: 'CREATE_TAB'; payload: { id: string; title: string } }
  | { type: 'REMOVE_TAB'; payload: { id: string } }
  | { type: 'SET_ACTIVE_TAB'; payload: { id: string } }
  | { type: 'UPDATE_TAB_TITLE'; payload: { id: string; title: string } }
  | { type: 'SAVE_TAB_STATE'; payload: { id: string; widgets: Item[]; widgetStates: Record<string, WidgetState> } };

// Context value type
interface TabContextValue extends TabContextState {
  dispatch: React.Dispatch<TabAction>;
  createTab: (title: string) => string;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTabTitle: (id: string, title: string) => void;
  saveTabState: (id: string, widgets: Item[], widgetStates: Record<string, WidgetState>) => void;
}

// Initial state
const initialState: TabContextState = {
  tabs: {
    default: {
      id: 'default',
      title: 'Main',
      widgets: [],
      widgetStates: {},
      isActive: true
    }
  },
  activeTabId: 'default'
};

// Create context
const TabContext = createContext<TabContextValue | undefined>(undefined);

// Reducer
function tabReducer(state: TabContextState, action: TabAction): TabContextState {
  switch (action.type) {
    case 'CREATE_TAB': {
      const { id, title } = action.payload;
      return {
        ...state,
        tabs: {
          ...state.tabs,
          [id]: {
            id,
            title,
            widgets: [],
            widgetStates: {},
            isActive: false
          }
        }
      };
    }

    case 'REMOVE_TAB': {
      const { [action.payload.id]: removedTab, ...remainingTabs } = state.tabs;
      const newActiveTabId = state.activeTabId === action.payload.id
        ? Object.keys(remainingTabs)[0] || 'default'
        : state.activeTabId;

      return {
        ...state,
        tabs: remainingTabs,
        activeTabId: newActiveTabId
      };
    }

    case 'SET_ACTIVE_TAB': {
      const updatedTabs = Object.entries(state.tabs).reduce((acc, [id, tab]) => ({
        ...acc,
        [id]: {
          ...tab,
          isActive: id === action.payload.id
        }
      }), {});

      return {
        ...state,
        tabs: updatedTabs,
        activeTabId: action.payload.id
      };
    }

    case 'UPDATE_TAB_TITLE': {
      const { id, title } = action.payload;
      return {
        ...state,
        tabs: {
          ...state.tabs,
          [id]: {
            ...state.tabs[id],
            title
          }
        }
      };
    }

    case 'SAVE_TAB_STATE': {
      const { id, widgets, widgetStates } = action.payload;
      return {
        ...state,
        tabs: {
          ...state.tabs,
          [id]: {
            ...state.tabs[id],
            widgets,
            widgetStates
          }
        }
      };
    }

    default:
      return state;
  }
}

// Provider component
interface TabProviderProps {
  children: ReactNode;
}

export function TabProvider({ children }: TabProviderProps) {
  const [state, dispatch] = useReducer(tabReducer, initialState);

  const createTab = useCallback((title: string) => {
    const id = `tab-${Date.now()}`;
    dispatch({ type: 'CREATE_TAB', payload: { id, title } });
    return id;
  }, []);

  const removeTab = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_TAB', payload: { id } });
  }, []);

  const setActiveTab = useCallback((id: string) => {
    dispatch({ type: 'SET_ACTIVE_TAB', payload: { id } });
  }, []);

  const updateTabTitle = useCallback((id: string, title: string) => {
    dispatch({ type: 'UPDATE_TAB_TITLE', payload: { id, title } });
  }, []);

  const saveTabState = useCallback((id: string, widgets: Item[], widgetStates: Record<string, WidgetState>) => {
    dispatch({ type: 'SAVE_TAB_STATE', payload: { id, widgets, widgetStates } });
  }, []);

  const value = {
    ...state,
    dispatch,
    createTab,
    removeTab,
    setActiveTab,
    updateTabTitle,
    saveTabState
  };

  return (
    <TabContext.Provider value={value}>
      {children}
    </TabContext.Provider>
  );
}

// Custom hook
export function useTab() {
  const context = useContext(TabContext);
  if (context === undefined) {
    throw new Error('useTab must be used within a TabProvider');
  }
  return context;
}

// Utility hooks
export function useActiveTab() {
  const { tabs, activeTabId } = useTab();
  return tabs[activeTabId];
}

export function useTabWidgets(tabId: string) {
  const { tabs, saveTabState } = useTab();
  const { widgets } = useWidget();
  const tab = tabs[tabId];

  const tabWidgets = React.useMemo(() => {
    return widgets.filter(widget => widget.tabId === tabId);
  }, [widgets, tabId]);

  const updateWidgets = useCallback((newWidgets: Item[] | ((prev: Item[]) => Item[])) => {
    if (typeof newWidgets === 'function') {
      const updatedWidgets = newWidgets(tabWidgets);
      saveTabState(tabId, updatedWidgets, tab.widgetStates);
    } else {
      saveTabState(tabId, newWidgets, tab.widgetStates);
    }
  }, [tabId, tab.widgetStates, saveTabState, tabWidgets]);

  return [tabWidgets, updateWidgets] as const;
}

export function useTabWidgetStates(tabId: string) {
  const { tabs, saveTabState } = useTab();
  const tab = tabs[tabId];

  const updateWidgetStates = useCallback((widgetStates: Record<string, WidgetState>) => {
    saveTabState(tabId, tab.widgets, widgetStates);
  }, [tabId, tab.widgets, saveTabState]);

  return [tab.widgetStates, updateWidgetStates] as const;
} 
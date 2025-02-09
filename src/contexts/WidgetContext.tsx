import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { WidgetManager } from '../lib/widget-manager';
import { BaseWidgetData } from '../components/widgets/base/base-widget';
import { Item, WidgetState } from '../types/widget';

// State types
export interface WidgetContextState {
  widgets: Item[];
  widgetData: Record<string, BaseWidgetData>;
  widgetStates: Record<string, WidgetState>;
  activeTabId: string;
}

// Action types
export type WidgetAction =
  | { type: 'CREATE_WIDGET'; payload: { widget: Item; data: BaseWidgetData } }
  | { type: 'UPDATE_WIDGET'; payload: { id: string; data: Partial<BaseWidgetData> } }
  | { type: 'REMOVE_WIDGET'; payload: { id: string } }
  | { type: 'UPDATE_WIDGET_STATE'; payload: { id: string; state: Partial<WidgetState> } }
  | { type: 'MOVE_WIDGET_TO_TAB'; payload: { id: string; tabId: string } }
  | { type: 'SET_ACTIVE_TAB'; payload: { tabId: string } }
  | { type: 'REORDER_WIDGETS'; payload: { widgets: Item[] } };

// Context value type
interface WidgetContextValue extends WidgetContextState {
  dispatch: React.Dispatch<WidgetAction>;
  widgetManager: WidgetManager;
}

// Initial state
const initialState: WidgetContextState = {
  widgets: [],
  widgetData: {},
  widgetStates: {},
  activeTabId: 'default'
};

// Create context
const WidgetContext = createContext<WidgetContextValue | undefined>(undefined);

// Reducer
function widgetReducer(state: WidgetContextState, action: WidgetAction): WidgetContextState {
  switch (action.type) {
    case 'CREATE_WIDGET':
      return {
        ...state,
        widgets: [action.payload.widget, ...state.widgets],
        widgetData: {
          ...state.widgetData,
          [action.payload.widget.id]: action.payload.data
        },
        widgetStates: {
          ...state.widgetStates,
          [action.payload.widget.id]: { isMaximized: false, isMinimized: false }
        }
      };

    case 'UPDATE_WIDGET':
      return {
        ...state,
        widgetData: {
          ...state.widgetData,
          [action.payload.id]: {
            ...state.widgetData[action.payload.id],
            ...action.payload.data
          }
        }
      };

    case 'REMOVE_WIDGET': {
      const { [action.payload.id]: _, ...remainingData } = state.widgetData;
      const { [action.payload.id]: __, ...remainingStates } = state.widgetStates;
      return {
        ...state,
        widgets: state.widgets.filter(w => w.id !== action.payload.id),
        widgetData: remainingData,
        widgetStates: remainingStates
      };
    }

    case 'UPDATE_WIDGET_STATE':
      return {
        ...state,
        widgetStates: {
          ...state.widgetStates,
          [action.payload.id]: {
            ...state.widgetStates[action.payload.id],
            ...action.payload.state
          }
        }
      };

    case 'MOVE_WIDGET_TO_TAB':
      return {
        ...state,
        widgets: state.widgets.map(widget =>
          widget.id === action.payload.id
            ? { ...widget, tabId: action.payload.tabId }
            : widget
        )
      };

    case 'SET_ACTIVE_TAB':
      return {
        ...state,
        activeTabId: action.payload.tabId
      };

    case 'REORDER_WIDGETS':
      return {
        ...state,
        widgets: action.payload.widgets
      };

    default:
      return state;
  }
}

// Provider component
interface WidgetProviderProps {
  children: ReactNode;
  widgetManager: WidgetManager;
}

export function WidgetProvider({ children, widgetManager }: WidgetProviderProps) {
  const [state, dispatch] = useReducer(widgetReducer, initialState);

  // Update widget manager's current tab when active tab changes
  useEffect(() => {
    widgetManager.setCurrentTab(state.activeTabId);
  }, [state.activeTabId, widgetManager]);

  // Listen for widget creation events
  useEffect(() => {
    const handleWidgetCreated = ({ id, type, data, tabId }: { id: string; type: string; data: any; tabId: string }) => {
      console.log('Widget created event received:', { id, type, data, tabId });
      dispatch({
        type: 'CREATE_WIDGET',
        payload: {
          widget: { id, type, tabId },
          data
        }
      });
    };

    widgetManager.on('widgetCreated', handleWidgetCreated);
    return () => {
      widgetManager.off('widgetCreated', handleWidgetCreated);
    };
  }, [widgetManager]);

  const value = {
    ...state,
    dispatch,
    widgetManager
  };

  return (
    <WidgetContext.Provider value={value}>
      {children}
    </WidgetContext.Provider>
  );
}

// Custom hook
export function useWidget() {
  const context = useContext(WidgetContext);
  if (context === undefined) {
    throw new Error('useWidget must be used within a WidgetProvider');
  }
  return context;
}

// Utility hooks
export function useWidgetState(widgetId: string) {
  const { widgetStates, dispatch } = useWidget();
  
  const updateState = React.useCallback((newState: Partial<WidgetState>) => {
    dispatch({
      type: 'UPDATE_WIDGET_STATE',
      payload: { id: widgetId, state: newState }
    });
  }, [dispatch, widgetId]);

  return [widgetStates[widgetId], updateState] as const;
}

export function useWidgetData<T extends BaseWidgetData>(widgetId: string) {
  const { widgetData, dispatch } = useWidget();
  
  const updateData = React.useCallback((newData: Partial<T>) => {
    dispatch({
      type: 'UPDATE_WIDGET',
      payload: { id: widgetId, data: newData }
    });
  }, [dispatch, widgetId]);

  return [widgetData[widgetId] as T, updateData] as const;
} 
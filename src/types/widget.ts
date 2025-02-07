export interface Item {
  id: string;
  type: string;
  tabId?: string;
}

export interface DragData {
  type: 'widget';
  id: string;
  index: number;
}

export interface WidgetState {
  isMaximized: boolean;
  isMinimized: boolean;
}

export interface WidgetItemProps {
  item: Item;
  index: number;
  widgetData: any;
  widgetState: WidgetState;
  onStateChange: (state: WidgetState) => void;
  setWidgets: React.Dispatch<React.SetStateAction<Item[]>>;
} 
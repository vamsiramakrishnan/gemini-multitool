import React, { useState, useCallback, useEffect } from 'react';
import './TabsContainer.scss';
import { Item, WidgetState } from '../../types/widget';
import { WidgetItem } from '../widgets/item/WidgetItem';
import { useTab, useWidget } from '../../contexts/RootContext';

export interface TabsContainerProps {
  activeTabId: string;
  onTabChange: (id: string) => void;
}

export function TabsContainer({
  activeTabId,
  onTabChange,
}: TabsContainerProps) {
  const { createTab, removeTab, updateTabTitle } = useTab();
  const { widgets, widgetData, widgetStates, dispatch: widgetDispatch } = useWidget();
  const [tabs, setTabs] = useState<Array<{ id: string; label: string }>>([
    { id: 'default', label: 'Main' }
  ]);

  // Debug logging
  useEffect(() => {
    console.log('Current tab:', activeTabId);
    console.log('Available widgets:', widgets);
    console.log('Widget states:', widgetStates);
    console.log('Widget data:', widgetData);
  }, [activeTabId, widgets, widgetStates, widgetData]);

  const handleAddTab = useCallback(() => {
    const id = createTab(`Tab ${tabs.length + 1}`);
    setTabs(prev => [...prev, { id, label: `Tab ${prev.length + 1}` }]);
  }, [tabs.length, createTab]);

  const handleRemoveTab = useCallback((tabId: string) => {
    if (tabs.length > 1) {
      removeTab(tabId);
      setTabs(prev => prev.filter(tab => tab.id !== tabId));
      if (activeTabId === tabId) {
        onTabChange(tabs[0].id);
      }
    }
  }, [tabs, activeTabId, onTabChange, removeTab]);

  const handleTabTitleChange = useCallback((tabId: string, newTitle: string) => {
    updateTabTitle(tabId, newTitle);
    setTabs(prev => prev.map(tab => 
      tab.id === tabId ? { ...tab, label: newTitle } : tab
    ));
  }, [updateTabTitle]);

  const handleWidgetStateChange = useCallback((widgetId: string, state: WidgetState) => {
    widgetDispatch({
      type: 'UPDATE_WIDGET_STATE',
      payload: { id: widgetId, state }
    });
  }, [widgetDispatch]);

  const setWidgets = useCallback((newWidgets: Item[] | ((prev: Item[]) => Item[])) => {
    if (typeof newWidgets === 'function') {
      widgetDispatch({
        type: 'REORDER_WIDGETS',
        payload: { widgets: newWidgets(widgets) }
      });
    } else {
      widgetDispatch({
        type: 'REORDER_WIDGETS',
        payload: { widgets: newWidgets }
      });
    }
  }, [widgets, widgetDispatch]);

  // Filter widgets for current tab
  const visibleWidgets = React.useMemo(() => {
    return widgets.filter(widget => widget.tabId === activeTabId);
  }, [widgets, activeTabId]);

  return (
    <div className="tabs-container">
      <div className="tabs-header">
        {tabs.map(tab => (
          <div
            key={tab.id}
            className={`tab ${activeTabId === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <span className="material-symbols-outlined">tab</span>
            <input
              type="text"
              value={tab.label}
              onChange={(e) => handleTabTitleChange(tab.id, e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
            {tabs.length > 1 && (
              <button
                className="remove-tab"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveTab(tab.id);
                }}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            )}
          </div>
        ))}
        <button className="add-tab" onClick={handleAddTab}>
          <span className="material-symbols-outlined">add</span>
        </button>
      </div>
      <div className="tab-content">
        <div className="widgets-container">
          {visibleWidgets.length === 0 ? (
            <div className="empty-state">
              <span className="material-symbols-outlined empty-icon">widgets</span>
              <h3>No Widgets Yet</h3>
              <p>Start adding widgets to customize your workspace</p>
            </div>
          ) : (
            visibleWidgets.map((widget, index) => (
              <WidgetItem
                key={widget.id}
                item={widget}
                index={index}
                widgetData={widgetData[widget.id]}
                widgetState={widgetStates[widget.id] || { isMaximized: false, isMinimized: false }}
                onStateChange={(state) => handleWidgetStateChange(widget.id, state)}
                setWidgets={setWidgets}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
} 
import React, { useState, useCallback, useEffect } from 'react';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import Button from '@atlaskit/button';
import AddIcon from '@atlaskit/icon/glyph/add';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import { Item } from '../../types/widget';
import { WidgetItem } from '../widgets/item/WidgetItem';
import './TabsContainer.scss';

interface TabData {
  id: string;
  label: string;
}

interface TabsContainerProps {
  widgets: Item[];
  widgetData: Record<string, any>;
  widgetStates: Record<string, { isMaximized: boolean; isMinimized: boolean }>;
  onWidgetStateChange: (widgetId: string, state: { isMaximized: boolean; isMinimized: boolean }) => void;
  setWidgets: React.Dispatch<React.SetStateAction<Item[]>>;
  activeTabId: string;
  onTabChange: (tabId: string) => void;
}

export const TabsContainer: React.FC<TabsContainerProps> = ({
  widgets,
  widgetData,
  widgetStates,
  onWidgetStateChange,
  setWidgets,
  activeTabId,
  onTabChange,
}) => {
  const [tabs, setTabs] = useState<TabData[]>([
    { id: 'default', label: 'Main' }
  ]);

  const handleAddTab = useCallback(() => {
    const newTabId = `tab-${Date.now()}`;
    console.log('Adding new tab:', newTabId);
    setTabs(prev => [...prev, { id: newTabId, label: `Tab ${prev.length + 1}` }]);
    onTabChange(newTabId);
  }, [onTabChange]);

  const handleRemoveTab = useCallback((tabId: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    
    console.log('Removing tab:', tabId);
    
    // Move widgets from the tab being removed to the first tab
    if (tabId === activeTabId) {
      const targetTabId = tabs[0].id === tabId ? tabs[1].id : tabs[0].id;
      console.log('Moving widgets to tab:', targetTabId);
      setWidgets(prev => prev.map(widget => 
        widget.tabId === tabId ? { ...widget, tabId: targetTabId } : widget
      ));
      onTabChange(targetTabId);
    }
    
    setTabs(prev => prev.filter(tab => tab.id !== tabId));
  }, [tabs, activeTabId, setWidgets, onTabChange]);

  const handleSelectTab = useCallback((index: number) => {
    const targetTabId = tabs[index].id;
    console.log('Selecting tab:', targetTabId);
    onTabChange(targetTabId);
  }, [tabs, onTabChange]);

  const getWidgetsForTab = useCallback((tabId: string) => {
    const tabWidgets = widgets.filter(widget => {
      // If widget has no tabId, assign it to the default tab
      if (!widget.tabId && tabId === 'default') {
        return true;
      }
      return widget.tabId === tabId;
    });
    return tabWidgets;
  }, [widgets]);

  // Log active tab changes
  useEffect(() => {
    console.log('TabsContainer: Active tab changed to:', activeTabId);
  }, [activeTabId]);

  return (
    <div className="tabs-container">
      <Tabs
        id="widget-tabs"
        onChange={handleSelectTab}
        selected={tabs.findIndex(tab => tab.id === activeTabId)}
      >
        <div className="tabs-header">
          <TabList>
            {tabs.map((tab) => (
              <Tab key={tab.id}>
                <span className="tab-label">{tab.label}</span>
                {tabs.length > 1 && (
                  <Button
                    appearance="subtle"
                    spacing="none"
                    iconBefore={<CrossIcon label="Remove tab" />}
                    onClick={handleRemoveTab(tab.id)}
                    className="close-button"
                  />
                )}
              </Tab>
            ))}
          </TabList>
          <Button
            appearance="subtle"
            iconBefore={<AddIcon label="Add tab" />}
            onClick={handleAddTab}
            className="add-tab-button"
          />
        </div>

        {tabs.map((tab) => {
          const tabWidgets = getWidgetsForTab(tab.id);
          return (
            <TabPanel key={tab.id}>
              <div className="tab-content">
                <div className="widgets-panel">
                  {tabWidgets.map((widget, index) => (
                    <WidgetItem
                      key={widget.id}
                      item={widget}
                      index={index}
                      widgetData={widgetData[widget.id]}
                      widgetState={widgetStates[widget.id]}
                      onStateChange={(state) => onWidgetStateChange(widget.id, state)}
                      setWidgets={setWidgets}
                    />
                  ))}
                </div>
              </div>
            </TabPanel>
          );
        })}
      </Tabs>
    </div>
  );
}; 
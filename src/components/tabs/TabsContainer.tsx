import React, { useState, useCallback, useEffect, useMemo } from 'react';
import './TabsContainer.scss';
import { Item, WidgetState } from '../../types/widget';
import { WidgetItem } from '../widgets/item/WidgetItem';
import { useTab, useWidget } from '../../contexts/RootContext';
import { Reorder, motion, AnimatePresence } from 'framer-motion';
import { WidgetType } from '../../types/widget-types';

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
  const [isDragging, setIsDragging] = useState(false);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTabName, setEditingTabName] = useState('');
  const editInputRef = React.useRef<HTMLInputElement>(null);

  // Track if tab container is scrollable
  const [isScrollable, setIsScrollable] = useState(false);
  const tabsHeaderRef = React.useRef<HTMLDivElement>(null);

  // Handle tab scrollability
  useEffect(() => {
    const checkScrollable = () => {
      if (tabsHeaderRef.current) {
        const { scrollWidth, clientWidth } = tabsHeaderRef.current;
        setIsScrollable(scrollWidth > clientWidth);
      }
    };

    checkScrollable();
    window.addEventListener('resize', checkScrollable);
    return () => window.removeEventListener('resize', checkScrollable);
  }, [tabs]);

  // Handle tab removal
  const handleRemoveTab = useCallback((tabId: string, event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (tabs.length > 1) {
      // Find the index of the current tab
      const currentIndex = tabs.findIndex(tab => tab.id === tabId);
      
      // Determine which tab to activate next
      let nextTabId: string;
      if (tabId === activeTabId) {
        // If removing active tab, switch to previous tab or next if it's the first tab
        if (currentIndex > 0) {
          nextTabId = tabs[currentIndex - 1].id;
        } else {
          nextTabId = tabs[currentIndex + 1].id;
        }
        onTabChange(nextTabId);
      }

      // Remove the tab with animation
      removeTab(tabId);
      setTabs(prev => prev.filter(tab => tab.id !== tabId));
    }
  }, [tabs, activeTabId, onTabChange, removeTab]);

  const handleAddTab = useCallback(() => {
    const id = createTab(`Tab ${tabs.length + 1}`);
    const newTab = { id, label: `Tab ${tabs.length + 1}` };
    
    setTabs(prev => [...prev, newTab]);
    onTabChange(id); // Automatically switch to new tab
    
    // Start editing the new tab name
    setTimeout(() => {
      setEditingTabId(id);
      setEditingTabName(newTab.label);
    }, 100);
  }, [tabs.length, createTab, onTabChange]);

  // Start editing a tab title
  const startEditingTab = useCallback((tabId: string, event: React.MouseEvent<HTMLDivElement>) => {
    // Double click to edit
    if (event.detail === 2) {
      event.preventDefault();
      event.stopPropagation();
      
      const tab = tabs.find(t => t.id === tabId);
      if (tab) {
        setEditingTabId(tabId);
        setEditingTabName(tab.label);
        
        // Focus the input after it's rendered
        setTimeout(() => {
          if (editInputRef.current) {
            editInputRef.current.focus();
            editInputRef.current.select();
          }
        }, 50);
      }
    }
  }, [tabs]);

  // Handle tab title edit submission
  const handleTabTitleSubmit = useCallback(() => {
    if (editingTabId && editingTabName.trim()) {
      updateTabTitle(editingTabId, editingTabName);
      setTabs(prev => prev.map(tab => 
        tab.id === editingTabId ? { ...tab, label: editingTabName } : tab
      ));
    }
    setEditingTabId(null);
  }, [editingTabId, editingTabName, updateTabTitle]);

  // Handle tab title edit cancel
  const handleTabTitleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleTabTitleSubmit();
    } else if (e.key === 'Escape') {
      setEditingTabId(null);
    }
  }, [handleTabTitleSubmit]);

  // Update widget state
  const handleWidgetStateChange = useCallback((widgetId: string, state: WidgetState) => {
    widgetDispatch({
      type: 'UPDATE_WIDGET_STATE',
      payload: { id: widgetId, state }
    });
  }, [widgetDispatch]);

  // Handle position change
  const handlePositionChange = useCallback((widgetId: string, position: { x: number; y: number }) => {
    widgetDispatch({
      type: 'UPDATE_WIDGET_STATE',
      payload: { id: widgetId, state: { position } }
    });
  }, [widgetDispatch]);

  // Handle size change
  const handleSizeChange = useCallback((widgetId: string, size: { width: number; height: number }) => {
    widgetDispatch({
      type: 'UPDATE_WIDGET_STATE',
      payload: { id: widgetId, state: { size } }
    });
  }, [widgetDispatch]);

  // Reorder widgets
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
  const visibleWidgets = useMemo(() => {
    return widgets.filter(widget => widget.tabId === activeTabId);
  }, [widgets, activeTabId]);

  // Scroll to active tab
  useEffect(() => {
    if (tabsHeaderRef.current) {
      const activeTabElement = tabsHeaderRef.current.querySelector('.tab.active');
      if (activeTabElement) {
        const containerRect = tabsHeaderRef.current.getBoundingClientRect();
        const tabRect = activeTabElement.getBoundingClientRect();
        
        // If tab is not fully visible, scroll to it
        if (tabRect.left < containerRect.left || tabRect.right > containerRect.right) {
          activeTabElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }
    }
  }, [activeTabId]);

  // Start/end drag tracking
  const onDragStart = () => setIsDragging(true);
  const onDragEnd = () => setIsDragging(false);

  // TAB CONTENT TRANSITIONS
  const contentVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
  };

  return (
    <div className="tabs-container">
      <div className="tabs-header-wrapper">
        <div className={`tabs-scroll-indicator left ${isScrollable ? 'visible' : ''}`}>
          <span className="material-symbols-outlined">chevron_left</span>
        </div>
        
        <Reorder.Group 
          as="div"
          axis="x" 
          values={tabs} 
          onReorder={setTabs}
          className="tabs-header"
          ref={tabsHeaderRef}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <AnimatePresence>
            {tabs.map(tab => (
              <Reorder.Item
                key={tab.id}
                value={tab}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                whileHover={!isDragging ? { y: -2 } : {}}
                whileTap={!isDragging ? { scale: 0.95 } : {}}
                className={`tab ${activeTabId === tab.id ? 'active' : ''}`}
                onClick={() => !isDragging && onTabChange(tab.id)}
                onDoubleClick={(e: React.MouseEvent<HTMLDivElement>) => startEditingTab(tab.id, e)}
                aria-selected={activeTabId === tab.id}
                role="tab"
                aria-controls={`tabpanel-${tab.id}`}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                dragTransition={{ bounceStiffness: 300, bounceDamping: 20 }}
              >
                <span className="tab-icon material-symbols-outlined">tab</span>
                
                {editingTabId === tab.id ? (
                  <input
                    ref={editInputRef}
                    className="tab-title-input"
                    value={editingTabName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingTabName(e.target.value)}
                    onBlur={handleTabTitleSubmit}
                    onKeyDown={handleTabTitleKeyDown}
                    onClick={(e: React.MouseEvent<HTMLInputElement>) => e.stopPropagation()}
                    maxLength={20}
                  />
                ) : (
                  <span className="tab-title">{tab.label}</span>
                )}
                
                {tabs.length > 1 && (
                  <motion.button
                    className="remove-tab"
                    onClick={(e) => handleRemoveTab(tab.id, e)}
                    aria-label={`Close ${tab.label}`}
                    whileHover={{ backgroundColor: "rgba(var(--error-rgb), 0.15)" }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <span className="material-symbols-outlined">close</span>
                  </motion.button>
                )}
                
                {activeTabId === tab.id && (
                  <motion.div 
                    className="active-tab-indicator"
                    layoutId="active-tab-indicator"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </Reorder.Item>
            ))}
          </AnimatePresence>
          
          <motion.button
            className="add-tab"
            onClick={handleAddTab}
            aria-label="Add new tab"
            role="button"
            whileHover={{ y: -2, backgroundColor: "rgba(var(--primary-rgb), 0.15)" }}
            whileTap={{ scale: 0.9 }}
          >
            <span className="material-symbols-outlined">add</span>
          </motion.button>
        </Reorder.Group>
        
        <div className={`tabs-scroll-indicator right ${isScrollable ? 'visible' : ''}`}>
          <span className="material-symbols-outlined">chevron_right</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div 
          key={activeTabId}
          className="tab-content" 
          role="tabpanel" 
          id={`tabpanel-${activeTabId}`}
          variants={contentVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <div className="widgets-container">
            {visibleWidgets.length === 0 ? (
              <motion.div 
                className="empty-state"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
              >
                <span className="material-symbols-outlined empty-icon">widgets</span>
                <h3>No Widgets Yet</h3>
                <p>Start adding widgets to customize your workspace</p>
                <motion.button 
                  className="add-widget-btn"
                  whileHover={{ scale: 1.05, backgroundColor: "rgba(var(--primary-rgb), 0.2)" }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="material-symbols-outlined">add_circle</span>
                  Add Widget
                </motion.button>
              </motion.div>
            ) : (
              visibleWidgets.map((widget, index) => (
                <WidgetItem
                  key={widget.id}
                  item={{
                    id: widget.id,
                    type: widget.type as WidgetType,
                    title: widgetData[widget.id]?.title || `Widget ${index + 1}`
                  }}
                  index={index}
                  widgetData={widgetData[widget.id]}
                  widgetState={widgetStates[widget.id] || { isMaximized: false, isMinimized: false }}
                  onStateChange={(state) => handleWidgetStateChange(widget.id, state)}
                  setWidgets={setWidgets}
                  onPositionChange={handlePositionChange}
                  onSizeChange={handleSizeChange}
                  isDraggable={true}
                  isResizable={true}
                  gridLayout={false}
                  data-widget-id={widget.id}
                />
              ))
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
} 
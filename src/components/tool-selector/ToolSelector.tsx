import React, { useState, useEffect, useRef, useCallback, useLayoutEffect, useMemo } from 'react';
import { useGeminiToolsContext } from '../../contexts/GeminiToolsContext';
import { ToolDeclaration } from '../../lib/tool-declarations/types';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import './tool-selector.scss';
import { Button, Popover, Checkbox, Classes, Icon } from '@blueprintjs/core';
import cn from 'classnames';

// Define the type for ToolSelector props
interface ToolSelectorProps {
  onToolSelectionChange: (selectedTools: ToolDeclaration[]) => void;
  isConnected?: boolean;
  disabled?: boolean;
}

const formatToolName = (name: string) => {
  return name.replace(/_/g, ' ');
};

// Tool Tag Component - Enhance with truncation and tooltip support 
const ToolTag = ({ 
  name, 
  onRemove, 
  className,
  id
}: { 
  name: string, 
  onRemove: () => void,
  className?: string, 
  id?: string
}) => {
  const displayName = formatToolName(name);
  const isOverflowing = displayName.length > 15;
  
  return (
    <motion.span 
      className={`tool-tag ${className || ''}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.2 }}
      title={isOverflowing ? displayName : undefined}
      id={id}
    >
      <span className="tool-tag-text">
        {displayName}
      </span>
      <button 
        className="tool-tag-remove" 
        onClick={(e) => {
          e.stopPropagation(); // Prevent event bubbling
          onRemove();
        }}
        aria-label={`Remove ${displayName} tool`}
      >
        <span className="material-symbols-outlined">close</span>
      </button>
    </motion.span>
  );
};

// Tool Item Component - Improve visual feedback and accessibility
const ToolItem = ({ 
  tool, 
  isSelected, 
  onToggle,
  disabled
}: { 
  tool: ToolDeclaration, 
  isSelected: boolean, 
  onToggle: () => void,
  disabled?: boolean
}) => {
  const displayName = formatToolName(tool.name);
  const descriptionText = tool.description || "No description available";
  const isLongName = displayName.length > 25;
  
  return (
    <motion.li 
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={`tool-item ${isSelected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={disabled ? undefined : onToggle}
      role="checkbox"
      aria-checked={isSelected}
      tabIndex={disabled ? -1 : 0}
      onKeyPress={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      <div className="tool-checkbox">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          id={`tool-${tool.name}`}
          disabled={disabled}
          aria-label={`Select ${displayName}`}
        />
        <span className="checkmark">
          <span className="material-symbols-outlined">
            {isSelected ? 'check_circle' : 'circle'}
          </span>
        </span>
      </div>
      <div className="tool-info">
        <label 
          htmlFor={`tool-${tool.name}`} 
          className={`tool-name ${isLongName ? 'long-name' : ''}`}
          title={isLongName ? displayName : undefined}
        >
          {displayName}
        </label>
        <span 
          className="tool-description"
          title={descriptionText.length > 50 ? descriptionText : undefined}
        >
          {descriptionText}
        </span>
      </div>
    </motion.li>
  );
};

const ToolSelector: React.FC<ToolSelectorProps> = ({ 
  onToolSelectionChange, 
  isConnected = false,
  disabled = false
}) => {
  const { toolDeclarations } = useGeminiToolsContext();
  const [selectedTools, setSelectedTools] = useState<ToolDeclaration[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownContentRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toolsListRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // State for dropdown position
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({
    position: 'fixed',
    top: '-9999px',
    left: '-9999px',
    opacity: 0,
  });

  // Handle tool selection
  const handleToolToggle = (tool: ToolDeclaration) => {
    setSelectedTools(prev => {
      const isSelected = prev.some(t => t.name === tool.name);
      const newSelection = isSelected
        ? prev.filter(t => t.name !== tool.name)
        : [...prev, tool];
      
      // Defer parent notification to avoid state updates during render
      setTimeout(() => {
        onToolSelectionChange(newSelection);
      }, 0);
      
      return newSelection;
    });
  };

  // Handle removing a tool
  const handleRemoveTool = (toolName: string) => {
    setSelectedTools(prev => {
      const newSelection = prev.filter(t => t.name !== toolName);
      
      setTimeout(() => {
        onToolSelectionChange(newSelection);
      }, 0);
      
      return newSelection;
    });
  };

  const openSelector = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeSelector = useCallback(() => {
    setIsOpen(false);
    setSearchTerm('');
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if the click is outside the main toggle button AND outside the dropdown content
      const isOutsideButton = buttonRef.current && !buttonRef.current.contains(event.target as Node);
      const isOutsideDropdown = dropdownContentRef.current && !dropdownContentRef.current.contains(event.target as Node);
      
      if (isOutsideButton && isOutsideDropdown) {
        // Only close if the click is truly outside both elements
        closeSelector(); 
      }
    };

    if (isOpen) {
      // Use 'mousedown' to catch the click before potential propagation issues
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, closeSelector, buttonRef, dropdownContentRef]);

  // Handle escape key to close dropdown
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen]);

  // Handle select all and clear all
  const handleSelectAll = () => {
    setSelectedTools(toolDeclarations);
    onToolSelectionChange(toolDeclarations);
  };

  const handleClearAll = () => {
    setSelectedTools([]);
    onToolSelectionChange([]);
  };

  // Ensure dropdown fits in viewport
  useEffect(() => {
    if (isOpen && dropdownContentRef.current) {
      const dropdown = dropdownContentRef.current;
      const rect = dropdown.getBoundingClientRect();
      
      // If the dropdown would extend above the viewport
      if (rect.top < 20) {
        dropdown.style.maxHeight = `${window.innerHeight - 220}px`;
        
        if (toolsListRef.current) {
          toolsListRef.current.style.maxHeight = `${window.innerHeight - 300}px`;
        }
      }
    }
  }, [isOpen]);

  // Add scroll enhancement for tool list
  useEffect(() => {
    if (isOpen && toolsListRef.current) {
      // Add smooth scrolling for better UX
      toolsListRef.current.style.scrollBehavior = 'smooth';
      
      // Focus on the first item after opening for better keyboard navigation
      const firstCheckbox = toolsListRef.current.querySelector('input[type="checkbox"]') as HTMLInputElement;
      if (firstCheckbox) {
        setTimeout(() => {
          firstCheckbox.focus();
        }, 100);
      }
    }
  }, [isOpen]);

  // Use useLayoutEffect for positioning calculations
  useLayoutEffect(() => {
    const calculatePosition = () => {
      if (isOpen && buttonRef.current && dropdownContentRef.current) {
        const buttonRect = buttonRef.current.getBoundingClientRect();
        const dropdownRect = dropdownContentRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const offset = 10;

        // For mobile, position as a bottom drawer
        if (isMobile) {
          setDropdownStyle({
            position: 'fixed',
            bottom: '0',
            left: '0',
            width: '100%',
            maxHeight: '80vh',
            borderRadius: '16px 16px 0 0',
            opacity: 1,
            transform: 'translateY(0)',
            transition: 'transform 0.3s ease-out'
          });
          return;
        }

        // For desktop, position relative to the button
        let top: number;
        let left: number;
        let transformOrigin: string;

        // Check if dropdown fits below
        if (buttonRect.bottom + dropdownRect.height + offset <= viewportHeight) {
          top = buttonRect.bottom + offset;
          transformOrigin = 'top center';
        } else {
          // Check if dropdown fits above
          top = buttonRect.top - dropdownRect.height - offset;
          transformOrigin = 'bottom center';
        }

        // Center horizontally
        left = buttonRect.left + buttonRect.width / 2 - dropdownRect.width / 2;
        
        // Ensure dropdown stays within viewport horizontally
        if (left < offset) {
          left = offset;
        } else if (left + dropdownRect.width > viewportWidth - offset) {
          left = viewportWidth - dropdownRect.width - offset;
        }

        setDropdownStyle({
          position: 'fixed',
          top: `${top}px`,
          left: `${left}px`,
          transformOrigin,
          opacity: 1,
          width: `${Math.min(500, Math.max(320, viewportWidth * 0.8))}px`,
        });
      } else {
        setDropdownStyle(prev => ({ ...prev, opacity: 0 }));
      }
    };

    calculatePosition();

    // Focus input when dropdown opens and position is set
    if (isOpen && inputRef.current && dropdownStyle.opacity === 1) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }

    window.addEventListener('resize', calculatePosition);
    window.addEventListener('scroll', calculatePosition, true);

    return () => {
      window.removeEventListener('resize', calculatePosition);
      window.removeEventListener('scroll', calculatePosition, true);
    };
  }, [isOpen, dropdownStyle.opacity, isMobile]);

  // State for Autocomplete
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number>(0);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  // Handle Search Input Change & Generate Suggestions
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setVisiblePage(1); // Reset pagination when search changes
    
    // Reset scroll position when search changes
    if (toolsListRef.current) {
      toolsListRef.current.scrollTop = 0;
    }

    if (value.length > 0) {
      // Enhanced suggestions - include tool description matches too
      const nameMatches = toolDeclarations
        .filter(tool => 
          formatToolName(tool.name).toLowerCase().includes(value.toLowerCase())
        )
        .map(tool => formatToolName(tool.name));
      
      const descriptionMatches = toolDeclarations
        .filter(tool => 
          !nameMatches.includes(formatToolName(tool.name)) && // Avoid duplicates
          tool.description.toLowerCase().includes(value.toLowerCase())
        )
        .map(tool => formatToolName(tool.name));
      
      // Prioritize name matches, then add description matches
      const combinedSuggestions = [...nameMatches, ...descriptionMatches].slice(0, 7);

      setSuggestions(combinedSuggestions);
      setShowSuggestions(combinedSuggestions.length > 0);
      setActiveSuggestionIndex(0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Handle Suggestion Click
  const handleSuggestionClick = (suggestion: string) => {
    setSearchTerm(suggestion);
    setSuggestions([]);
    setShowSuggestions(false);
    // Optionally focus input again after click
    inputRef.current?.focus(); 
  };

  // Handle Keyboard Navigation for Suggestions
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'Enter':
        e.preventDefault(); // Prevent form submission if applicable
        if (suggestions[activeSuggestionIndex]) {
          handleSuggestionClick(suggestions[activeSuggestionIndex]);
        }
        break;
      case 'ArrowUp':
        e.preventDefault(); // Prevent cursor movement in input
        setActiveSuggestionIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
        break;
      case 'ArrowDown':
        e.preventDefault(); // Prevent cursor movement in input
        setActiveSuggestionIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
        break;
      case 'Escape': // Allow Escape to close suggestions without closing the whole dropdown
        setShowSuggestions(false);
        setSuggestions([]);
        break;
      default:
        break;
    }
  };

  // Filtered tools for rendering
  const filteredTools = useMemo(() => {
    return toolDeclarations.filter(tool => {
      const lowerSearchTerm = searchTerm.toLowerCase();
      const nameMatch = tool.name.toLowerCase().includes(lowerSearchTerm);
      const descriptionMatch = tool.description.toLowerCase().includes(lowerSearchTerm);
      return nameMatch || descriptionMatch;
    });
  }, [toolDeclarations, searchTerm]);

  // Virtualized scrolling for better performance with many tools
  const itemsPerPage = 30;
  const [visiblePage, setVisiblePage] = useState(1);
  
  // Intersection observer for lazy loading more tools as user scrolls
  useEffect(() => {
    if (isOpen && toolsListRef.current) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            setVisiblePage(prev => prev + 1);
          }
        },
        { threshold: 0.1 }
      );
      
      const loadMoreTrigger = toolsListRef.current.querySelector('.load-more-trigger');
      if (loadMoreTrigger) {
        observer.observe(loadMoreTrigger);
      }
      
      return () => observer.disconnect();
    }
  }, [isOpen, filteredTools.length]);

  // Quick action to select/deselect all visible tools matching search
  const handleSelectAllVisible = () => {
    const visibleTools = filteredTools;
    const allSelected = visibleTools.every(tool => 
      selectedTools.some(t => t.name === tool.name)
    );
    
    let newSelection;
    if (allSelected) {
      // Deselect all visible
      newSelection = selectedTools.filter(tool => 
        !visibleTools.some(v => v.name === tool.name)
      );
    } else {
      // Select all visible
      const currentlySelected = new Set(selectedTools.map(t => t.name));
      const newTools = visibleTools.filter(tool => !currentlySelected.has(tool.name));
      newSelection = [...selectedTools, ...newTools];
    }
    
    setSelectedTools(newSelection);
    onToolSelectionChange(newSelection);
  };

  // Batched selection operations
  const handleBatchSelection = (action: 'select-all' | 'clear' | 'invert') => {
    let newSelection: ToolDeclaration[] = [];
    
    switch (action) {
      case 'select-all':
        newSelection = [...toolDeclarations];
        break;
      case 'clear':
        newSelection = [];
        break;
      case 'invert':
        const selectedSet = new Set(selectedTools.map(t => t.name));
        newSelection = toolDeclarations.filter(
          tool => !selectedSet.has(tool.name)
        );
        break;
    }
    
    setSelectedTools(newSelection);
    onToolSelectionChange(newSelection);
  };

  // Truncate long names with ellipsis for display
  const truncateName = (name: string, maxLength = 20) => {
    if (name.length <= maxLength) return name;
    return `${name.substring(0, maxLength)}...`;
  };
  
  // Function to check if all visible tools are selected
  const areAllVisibleToolsSelected = useMemo(() => {
    if (filteredTools.length === 0) return false;
    return filteredTools.every(tool => 
      selectedTools.some(t => t.name === tool.name)
    );
  }, [filteredTools, selectedTools]);

  // Group tools by category with improved sorting
  const groupedTools = useMemo(() => {
    const groups: Record<string, ToolDeclaration[]> = {};
    
    // Define primary categories for better organization
    const primaryCategories = ['get', 'search', 'render', 'explain'];
    
    filteredTools.forEach(tool => {
      // Extract category from tool name
      const category = tool.name.split('_')[0] || 'other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(tool);
    });
    
    // Sort categories to ensure primary categories appear first
    const sortedEntries = Object.entries(groups).sort(([a], [b]) => {
      const aIndex = primaryCategories.indexOf(a.toLowerCase());
      const bIndex = primaryCategories.indexOf(b.toLowerCase());
      
      if (aIndex >= 0 && bIndex >= 0) return aIndex - bIndex;
      if (aIndex >= 0) return -1;
      if (bIndex >= 0) return 1;
      return a.localeCompare(b); // Alphabetical for other categories
    });
    
    return Object.fromEntries(sortedEntries);
  }, [filteredTools]);

  const selectedToolNames = useMemo(() => new Set(selectedTools.map(t => t.name)), [selectedTools]);

  const handleCheckboxChange = (tool: ToolDeclaration, checked: boolean) => {
    const toolName = tool.name;
    let newSelectedTools;
    if (checked) {
      newSelectedTools = [...selectedTools, tool];
    } else {
      newSelectedTools = selectedTools.filter(t => t.name !== toolName);
    }
    onToolSelectionChange(newSelectedTools);
  };

  const renderPopoverContent = () => (
    <div className="tool-selector-popover">
      <h4>Available Tools</h4>
      <ul className={Classes.LIST_UNSTYLED}>
        {filteredTools.map((tool) => {
          const toolName = tool.name;
          const isChecked = selectedToolNames.has(toolName);
          return (
            <li key={toolName}>
              <Checkbox
                label={formatToolName(toolName)}
                checked={isChecked}
                onChange={(e) => handleCheckboxChange(tool, e.target.checked)}
                disabled={disabled}
                className={cn({ "bp5-disabled": disabled })}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );

  const selectedCount = selectedTools.length;
  const buttonText = selectedCount > 0 ? `${selectedCount} Tool${selectedCount > 1 ? 's' : ''}` : 'Select Tools';

  // Synchronize context tools with local state for initialization
  useEffect(() => {
    if (toolDeclarations.length > 0 && selectedTools.length === 0) {
      // Try to load selected tools from local storage first
      const savedTools = localStorage.getItem('selectedTools');
      if (savedTools) {
        try {
          const parsedTools = JSON.parse(savedTools);
          const validTools = toolDeclarations.filter(
            tool => parsedTools.includes(tool.name)
          );
          setSelectedTools(validTools);
          // Inform parent
          onToolSelectionChange(validTools);
        } catch (e) {
          console.error('Failed to load saved tools:', e);
        }
      }
    }
  }, [toolDeclarations, selectedTools.length, onToolSelectionChange]);
  
  // Save selected tools to local storage whenever they change
  useEffect(() => {
    if (selectedTools.length > 0) {
      localStorage.setItem(
        'selectedTools', 
        JSON.stringify(selectedTools.map(t => t.name))
      );
    }
  }, [selectedTools]);

  // Add scroll lock when dropdown is open to prevent body scrolling
  useEffect(() => {
    const lockScroll = () => {
      if (isOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    };
    
    lockScroll();
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Scroll category or tag into view when selected
  const scrollItemIntoView = (elementId: string) => {
    setTimeout(() => {
      const element = document.getElementById(elementId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 50);
  };

  // Enhanced keyboard navigation for scrollable areas
  const handleKeyboardNavigation = (e: React.KeyboardEvent, items: any[], currentIndex: number, setIndex: (index: number) => void, onSelect: (item: any) => void) => {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        if (currentIndex > 0) {
          setIndex(currentIndex - 1);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (currentIndex < items.length - 1) {
          setIndex(currentIndex + 1);
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (items[currentIndex]) {
          onSelect(items[currentIndex]);
        }
        break;
      default:
        break;
    }
  };

  return (
    <div className="tool-selector" ref={dropdownRef}>
      <div className={`tool-selector-main ${selectedTools.length > 0 ? 'has-selected' : ''}`}>
        <motion.button
          ref={buttonRef}
          className={`tool-selector-toggle ${isOpen ? 'active' : ''} ${isConnected ? 'connected' : ''}`}
          onClick={isOpen ? closeSelector : openSelector}
          whileTap={{ scale: 0.95 }}
          disabled={disabled}
          title={isConnected ? "Tools are locked during active connection" : "Select tools"}
        >
          <span className="material-symbols-outlined">
            build
          </span>
          <span className="toggle-text">Tools</span>
          {selectedTools.length > 0 && (
            <span className="tool-count">{selectedTools.length}</span>
          )}
        </motion.button>

        <AnimatePresence>
          {selectedTools.length > 0 && (
            <motion.div 
              className="selected-tools-pills"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <AnimatePresence>
                {selectedTools.slice(0, 3).map(tool => (
                  <ToolTag
                    key={tool.name}
                    name={tool.name}
                    onRemove={() => !disabled && handleRemoveTool(tool.name)}
                    className={disabled ? "disabled" : ""}
                    id={`selected-tag-${tool.name}`}
                  />
                ))}
                {selectedTools.length > 3 && (
                  <motion.button
                    className={`more-tools-button ${disabled ? "disabled" : ""}`}
                    onClick={() => !disabled && setIsOpen(true)}
                    whileHover={disabled ? undefined : { scale: 1.05 }}
                    whileTap={disabled ? undefined : { scale: 0.95 }}
                  >
                    +{selectedTools.length - 3} more
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <>
              {isMobile && (
                <motion.div
                  className="tool-selector-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={closeSelector}
                />
              )}
              <motion.div
                ref={dropdownContentRef}
                className={`tool-selector-dropdown ${isMobile ? 'mobile' : ''}`}
                style={dropdownStyle}
                initial={isMobile ? 
                  { opacity: 1, y: '100%' } : 
                  { opacity: 0, scale: 0.95 }
                }
                animate={isMobile ? 
                  { opacity: 1, y: 0 } : 
                  { opacity: 1, scale: 1 }
                }
                exit={isMobile ? 
                  { opacity: 1, y: '100%' } : 
                  { opacity: 0, scale: 0.95 }
                }
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                {/* Enhanced Header Area */}
                <div className="tool-selector-header">
                  <div className="header-top">
                    {isMobile && <div className="mobile-handle" />}
                    <h3>Select Tools</h3>
                    <button className="close-btn" onClick={closeSelector} aria-label="Close tools panel">
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>
                  
                  {/* Enhanced search with clear button */}
                  <div className="search-container">
                    <span className="material-symbols-outlined search-icon">search</span>
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder="Search tools..."
                      className="search-input"
                      value={searchTerm}
                      onChange={handleSearchChange}
                      onKeyDown={handleKeyDown}
                      autoComplete="off"
                    />
                    {searchTerm && (
                      <button 
                        className="clear-search-btn"
                        onClick={() => setSearchTerm('')}
                        aria-label="Clear search"
                      >
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    )}
                    {showSuggestions && suggestions.length > 0 && (
                      <motion.ul 
                        className="suggestions-list"
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        {suggestions.map((suggestion, index) => (
                          <li
                            key={suggestion}
                            className={index === activeSuggestionIndex ? 'active' : ''}
                            onClick={() => handleSuggestionClick(suggestion)}
                            onMouseEnter={() => setActiveSuggestionIndex(index)}
                          >
                            {suggestion}
                          </li>
                        ))}
                      </motion.ul>
                    )}
                  </div>
                  
                  {/* Enhanced selection summary with more actions */}
                  <div className="selected-tools-summary">
                    <span className="summary-text">
                      {selectedTools.length === 0 ? 'No tools selected' : 
                       selectedTools.length === 1 ? '1 tool selected' : 
                       `${selectedTools.length} tools selected`}
                    </span>
                    <div className="action-buttons">
                      <button 
                        className={`select-all-btn ${areAllVisibleToolsSelected ? 'active' : ''}`}
                        onClick={handleSelectAllVisible}
                        title={areAllVisibleToolsSelected ? "Deselect visible tools" : "Select all visible tools"}
                      >
                        <span className="material-symbols-outlined">
                          {areAllVisibleToolsSelected ? 'deselect' : 'select_all'}
                        </span>
                        <span>{areAllVisibleToolsSelected ? 'Deselect' : 'Select'}</span>
                      </button>
                      <motion.button 
                        className="more-actions-btn"
                        whileHover={{ y: -2 }}
                      >
                        <span className="material-symbols-outlined">more_horiz</span>
                        <div className="dropdown-menu">
                          <button onClick={() => handleBatchSelection('select-all')}>Select All Tools</button>
                          <button onClick={() => handleBatchSelection('invert')}>Invert Selection</button>
                          <button 
                            onClick={() => handleBatchSelection('clear')}
                            disabled={selectedTools.length === 0}
                          >
                            Clear All
                          </button>
                        </div>
                      </motion.button>
                    </div>
                  </div>
                  
                  {/* Enhanced selected tools tags with badge for count */}
                  {selectedTools.length > 0 && (
                    <div className="selected-tools-tags">
                      <div className="tags-header">
                        <span className="tags-title">Selected Tools</span>
                        <span className="tags-count">{selectedTools.length}</span>
                      </div>
                      <div className="tags-container">
                        <AnimatePresence>
                          {selectedTools.map(tool => (
                            <ToolTag
                              key={tool.name}
                              name={tool.name}
                              onRemove={() => handleRemoveTool(tool.name)}
                              id={`selected-tag-${tool.name}`}
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Enhanced tools list with virtualization */}
                <div className="tools-list" ref={toolsListRef} role="list" aria-label="Available tools list">
                  <AnimatePresence>
                    {Object.entries(groupedTools).length === 0 ? (
                      <div className="no-results">
                        <span className="material-symbols-outlined">search_off</span>
                        <p>No tools found matching "{searchTerm}"</p>
                        <button onClick={() => setSearchTerm('')}>Clear search</button>
                      </div>
                    ) : (
                      <>
                        {searchTerm && filteredTools.length > 0 && (
                          <div className="search-results-summary">
                            Found {filteredTools.length} tool{filteredTools.length !== 1 ? 's' : ''} 
                            matching "{searchTerm}"
                          </div>
                        )}
                        
                        {Object.entries(groupedTools).map(([category, tools]) => (
                          <motion.div 
                            key={category}
                            id={`category-${category}`}
                            className="tool-category"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <div className="category-header">
                              <h4>{category.toUpperCase()}</h4>
                              <span className="category-count">{tools.length}</span>
                            </div>
                            <ul role="listbox" aria-label={`${category} tools`}>
                              <AnimatePresence>
                                {tools
                                  .slice(0, visiblePage * itemsPerPage)
                                  .map(tool => (
                                    <ToolItem
                                      key={tool.name}
                                      tool={tool}
                                      isSelected={selectedTools.some(t => t.name === tool.name)}
                                      onToggle={() => {
                                        handleToolToggle(tool);
                                        // Scroll to tool tag in selected tools list if newly selected
                                        if (!selectedTools.some(t => t.name === tool.name)) {
                                          scrollItemIntoView(`selected-tag-${tool.name}`);
                                        }
                                      }}
                                      disabled={disabled}
                                    />
                                  ))
                                }
                              </AnimatePresence>
                            </ul>
                            {tools.length > visiblePage * itemsPerPage && (
                              <div className="load-more-trigger" aria-hidden="true" />
                            )}
                          </motion.div>
                        ))}
                      </>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Footer with enhanced done button */}
                <div className="tools-footer">
                  <div className="footer-info">
                    {selectedTools.length > 0 && (
                      <div className="selected-count">
                        {selectedTools.length} tool{selectedTools.length !== 1 ? 's' : ''} selected
                      </div>
                    )}
                  </div>
                  <button 
                    className="done-btn" 
                    onClick={closeSelector}
                  >
                    Done
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default ToolSelector;
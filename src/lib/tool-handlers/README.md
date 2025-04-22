# Tool Handlers

This directory contains the modular implementation of various tool handlers for the Gemini Multitool application.

## Structure

```
tool-handlers/
├── types.ts             # Common interfaces and base classes
├── index.ts             # Main export and handler registry
├── core/                # Core functionality (tracking, cancellation, etc.)
│   └── index.ts
├── weather/             # Weather-related tools
│   └── index.ts
├── stocks/              # Stock market tools
│   └── index.ts
├── envato/              # Envato API tools
│   └── index.ts
├── explanation/         # Explanation tools
│   └── index.ts
├── maps/                # Map and directions tools
│   └── index.ts
├── places/              # Places search tools
│   └── index.ts
├── visualization/       # Data visualization tools (Altair, Table, Code)
│   └── index.ts
└── README.md            # This file
```

## Available Handlers

- **WeatherHandler**: Provides weather information for a given city
- **StocksHandler**: Provides stock price information for a given symbol
- **EnvatoHandler**: Handles Envato API searches for various types of content
- **ExplanationHandler**: Generates explanations for specified topics
- **MapsHandler**: Provides directions between locations
- **PlacesHandler**: Searches for places and nearby locations
- **VisualizationHandler**: Renders data visualizations, tables, and executes code
- **CoreHandler**: Manages common functionality like tracking active tool calls, cancellation, and grounding support

## Usage

The modular structure allows for easier maintenance and extension of tool handlers. Each category of tools has its own directory with specialized handlers.

### Adding New Handlers

To add a new tool handler:

1. Create a new directory for your tool category
2. Implement a handler class extending `BaseToolHandler`
3. Add your new handler to the main `ToolHandler` class in `index.ts`

Example:

```typescript
// src/lib/tool-handlers/new-category/index.ts
import { BaseToolHandler } from '../types';
import { WidgetManager } from '../../widget-manager';

export class NewCategoryHandler extends BaseToolHandler {
  constructor(widgetManager: WidgetManager, activeTabId: string = 'default') {
    super(widgetManager, activeTabId);
  }

  async handleRequest(args: any): Promise<any> {
    // Implement your handler logic here
    return this.handleWithStatus<any>(
      'new_tool_name',
      args,
      'widget_type',
      (result) => `Widget Title - ${result.someProperty}`,
      () => someApiFunction(args.someProperty)
    );
  }
}
```

Then register it in the main `ToolHandler` class:

```typescript
// In src/lib/tool-handlers/index.ts
import { NewCategoryHandler } from './new-category';

// In the initializeHandlers method
const newCategoryHandler = new NewCategoryHandler(this.widgetManager, this.activeTabId);
this.handlers.set('new_tool_name', newCategoryHandler);
this.coreHandler.registerHandler('new_tool_name', newCategoryHandler);
```

## Integration with Legacy Code

To maintain backward compatibility, the legacy `ToolHandler` class in `src/lib/tool-handler.ts` now delegates all functionality to this modular structure. This allows for a gradual transition without breaking existing code. 
import { LiveConfig } from "../multimodal-live-types";
import { ToolDeclaration } from "./tool-declarations/types";

// Tool name to instruction section mapping
interface ToolInstructionMap {
  [toolName: string]: {
    section: string;
    usageRule?: string;
    examples: string;
  };
}

// Define the mapping between tool names and their corresponding sections in the system instructions
const toolInstructionMap: ToolInstructionMap = {
  get_weather: {
    section: '- `get_weather`: Get current weather information for a city',
    usageRule: '- Weather queries → MUST use `get_weather`',
    examples: `### Weather Queries
\`\`\`
- "What's the weather like in Tokyo?"
- "Is it going to rain in London today?"
- "Tell me the temperature in Dubai"
\`\`\``
  },
  get_stock_price: {
    section: '- `get_stock_price`: Get current stock price and related information',
    usageRule: '- Stock price queries → MUST use `get_stock_price`',
    examples: `### Stock Market Queries
\`\`\`
- "What's the current price of Apple stock?"
- "How is Tesla stock performing?"
- "Show me Microsoft's stock information"
\`\`\``
  },
  google_search: {
    section: '- `google_search`: Search the Google Search Engine for latest information',
    usageRule: '- Information searches → MUST use `google_search`',
    examples: `### Information Search Queries
\`\`\`
- "What are the latest news about AI?"
- "Who won the last World Cup?"
- "What is cheapest price for Flight Ticket to X from Y?"
- "Compare prices of Mobile Phone X and Y"
- "What's the best time to visit Bali?"
\`\`\``
  },
  get_directions: {
    section: '- `get_directions`: Get directions between two locations',
    usageRule: '- Navigation queries → MUST use `get_directions`',
    examples: `### Navigation Queries
\`\`\`
- "How do I get from Times Square to Central Park?"
- "Show me directions from the Eiffel Tower to the Louvre"
- "What's the best route from London Bridge to Big Ben?"
\`\`\``
  },
  search_places: {
    section: '- `search_places`: Broad search for places (restaurants, hotels, attractions)',
    usageRule: '- Broad place searches → MUST use `search_places`',
    examples: `### Place Search Queries
\`\`\`
- "Find Italian restaurants in New York"
- "Show me hotels in Paris near the Eiffel Tower"
- "What are the top-rated museums in London?"
\`\`\``
  },
  search_nearby: {
    section: '- `search_nearby`: Narrowed search for places near specific coordinates',
    usageRule: '- Specific location searches → MUST use `search_nearby`',
    examples: `### Nearby Search Queries
\`\`\`
- "Find restaurants near the Eiffel Tower"
- "Show me cafes within 500m of my location"
- "What parks are near Central Park?"
\`\`\``
  },
  code_execution: {
    section: '- `code_execution`: Execute code for calculations and data processing',
    usageRule: '- Calculations/Processing → MUST use `code_execution`',
    examples: `### Data Processing Queries
\`\`\`
- "Calculate the factorial of 5"
- "Generate a list of prime numbers up to 100"
- "Convert 100 USD to EUR"
\`\`\``
  },
  render_altair: {
    section: '- `render_altair`: Create interactive data visualizations',
    examples: `### Visualization Queries
\`\`\`
- "Plot a line graph of the Fibonacci sequence"
- "Create a bar chart showing monthly sales data"
- "Generate a scatter plot of temperature vs. humidity"
\`\`\``
  },
  render_table: {
    section: '- `render_table`: Generate responsive data tables',
    examples: `### Table Generation Queries
\`\`\`
- "Create a comparison table of different phone models"
- "Show a table of population data for major cities"
- "Display a pricing table for subscription plans"
\`\`\``
  },
  explain_topic: {
    section: '- `explain_topic`: Generate comprehensive explanations on any topic',
    usageRule: '- Explanation requests → MUST use `explain_topic`',
    examples: `### Explanation Queries
\`\`\`
- "Explain quantum computing in simple terms"
\`\`\``
  }
};

// Tool categories mapping
const toolCategories: Record<string, string[]> = {
  "Data Retrieval Tools": ["get_weather", "get_stock_price", "google_search"],
  "Location & Navigation Tools": ["get_directions", "search_places", "search_nearby"],
  "Visualization & Explanation Tools": ["code_execution", "render_altair", "render_table", "explain_topic"]
};

export async function loadSystemInstructions(): Promise<string> {
  try {
    const response = await fetch('/config/system-instructions.txt');
    if (!response.ok) {
      throw new Error('Failed to load system instructions');
    }
    return await response.text();
  } catch (error) {
    console.error('Error loading system instructions:', error);
    return 'You are a helpful AI assistant.'; // Fallback instruction
  }
}

// Generate system instructions based on selected tools
export function generateSystemInstructions(baseInstructions: string, selectedTools: ToolDeclaration[]): string {
  // If no tools are selected, return the base instructions
  if (!selectedTools || selectedTools.length === 0) {
    return baseInstructions;
  }

  // Extract the header part (everything before "## Available Tools")
  const availableToolsIndex = baseInstructions.indexOf('## Available Tools');
  if (availableToolsIndex === -1) {
    return baseInstructions; // Return original if structure not found
  }

  const headerPart = baseInstructions.substring(0, availableToolsIndex + '## Available Tools'.length);
  
  // Extract the footer parts
  const usageRulesIndex = baseInstructions.indexOf('## Usage Rules');
  const exampleUsageIndex = baseInstructions.indexOf('## Example Usage');
  const toolSpecificIndex = baseInstructions.indexOf('## Tool-Specific Guidelines');
  const complexQueryIndex = baseInstructions.indexOf('## Complex Query Examples');
  
  if (usageRulesIndex === -1 || exampleUsageIndex === -1) {
    return baseInstructions; // Return original if structure not found
  }

  // Get the selected tool names
  const selectedToolNames = selectedTools.map(tool => tool.name);
  
  // Generate the tools sections
  let toolsSection = '\n\n';
  
  // Process each tool category
  for (const [category, toolsInCategory] of Object.entries(toolCategories)) {
    // Check if any tool in this category is selected
    const selectedToolsInCategory = toolsInCategory.filter(tool => 
      selectedToolNames.includes(tool)
    );
    
    if (selectedToolsInCategory.length > 0) {
      toolsSection += `### ${category}\n`;
      
      // Add the selected tools in this category
      for (const toolName of selectedToolsInCategory) {
        if (toolInstructionMap[toolName]) {
          toolsSection += `${toolInstructionMap[toolName].section}\n`;
        }
      }
      
      toolsSection += '\n';
    }
  }
  
  // Generate the usage rules section
  let usageRulesSection = '## Usage Rules\n\n### Mandatory Tool Usage\n';
  for (const toolName of selectedToolNames) {
    if (toolInstructionMap[toolName]?.usageRule) {
      usageRulesSection += `${toolInstructionMap[toolName].usageRule}\n`;
    }
  }
  
  // Add the complex queries section from the original
  const complexQueriesSection = baseInstructions.substring(
    baseInstructions.indexOf('### Complex Queries'), 
    exampleUsageIndex
  );
  
  // Generate the examples section
  let examplesSection = '## Example Usage\n\n';
  for (const toolName of selectedToolNames) {
    if (toolInstructionMap[toolName]?.examples) {
      examplesSection += `${toolInstructionMap[toolName].examples}\n\n`;
    }
  }
  
  // Include tool-specific guidelines if they exist
  let toolSpecificSection = '';
  if (toolSpecificIndex !== -1) {
    if (complexQueryIndex !== -1) {
      toolSpecificSection = baseInstructions.substring(toolSpecificIndex, complexQueryIndex);
    } else {
      toolSpecificSection = baseInstructions.substring(toolSpecificIndex);
    }
  }
  
  // Include complex query examples if they exist
  let complexQuerySection = '';
  if (complexQueryIndex !== -1) {
    complexQuerySection = baseInstructions.substring(complexQueryIndex);
  }
  
  // Combine all parts
  return `${headerPart}${toolsSection}${usageRulesSection}${complexQueriesSection}\n${examplesSection}${toolSpecificSection}${complexQuerySection}`;
}

export function createLiveConfig(systemInstructions: string, selectedTools: ToolDeclaration[] = []): LiveConfig {
  // Generate customized system instructions based on selected tools
  const customizedInstructions = generateSystemInstructions(systemInstructions, selectedTools);
  
  return {
    model: "models/gemini-2.0-flash-live-001",
    generationConfig: {
      responseModalities: "audio",
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
      },
    },
    systemInstruction: {
      parts: [
        {
          text: customizedInstructions,
        },
      ],
    },
    tools: [
      { googleSearch: {} },
      { codeExecution: {} },
      { functionDeclarations: selectedTools },
    ],
  };
}
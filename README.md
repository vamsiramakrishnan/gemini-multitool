# Gemini Multi Tool

Author: vamramak@google.com

This repository contains a React-based starter app for using the [Multimodal Live API](https://ai.google.dev/api/multimodal-live) over a websocket. It provides modules for streaming audio playback, recording user media such as from a microphone, webcam, or screen capture, as well as a unified log view to aid in the development of your application.

## Introduction

The application features a sophisticated UI architecture with multiple components designed for an interactive AI-powered workspace:

### Core Layout Components
- **Tab System**: Multi-tab interface supporting widget organization, tab management, and customizable workspaces
- **Widget System**: Extensible widget architecture with common functionality, responsive design, and state management

### Interactive Widgets
- **Chat Widget**: Real-time AI assistant interface with natural language processing
- **Code Execution Widget**: Code editor with syntax highlighting and real-time execution
- **Search Widget**: Integrated search functionality with relevance scoring and citations

### Data Visualization Widgets
- **Map Widget**: Interactive Google Maps with navigation and routing features
- **Stock Widget**: Real-time market data tracking and visualization
- **Weather Widget**: Location-based weather information and forecasts

### Control Components
- **Media Controls**: Webcam and screen sharing functionality
- **Layout Controls**: Flexible view options (compact, spacious, auto)
- **Widget Controls**: Minimize/maximize, drag-and-drop, and state management

### Additional Features
- **Onboarding Experience**: User-friendly introduction and setup guides
- **Media Components**: Video streaming and audio visualization
- **Utility Components**: Logging interface and side panel controls

Each component follows a consistent design system supporting responsive layouts, real-time updates, accessibility features, and seamless integration with the Multimodal Live API.

## Overview

[![Multimodal Live API Demo](readme/thumbnail.png)](https://www.youtube.com/watch?v=J_q7JY1XxFE)

Watch the demo of the Multimodal Live API [here](https://www.youtube.com/watch?v=J_q7JY1XxFE).

## Getting Started

The application uses several API keys to power different widgets through their corresponding tools:

1. **Gemini API Key** (`REACT_APP_GEMINI_API_KEY`)
   - Powers the core AI functionality and tool calls
   - Required for Chat Widget and general AI interactions
   - [Create a free key here](https://aistudio.google.com/apikey)

2. **Google Maps API Key** (`REACT_APP_GOOGLE_MAPS_API_KEY`)
   - Enables Map Widget, Places Widget, and Nearby Places Widget
   - Powers location search and navigation features
   - Used by the Places Search Tool and Maps Tool

3. **Finnhub API Key** (`REACT_APP_FINNHUB_API_KEY`) 
   - Required for Stock Widget functionality
   - Used by Stock Tool to fetch real-time market data
   - Powers financial data visualization

4. **OpenWeather API Key** (`REACT_APP_OPENWEATHER_API_KEY`)
   - Enables Weather Widget features
   - Used by Weather Tool to fetch forecasts
   - Powers weather data visualization

To configure these API keys:

1. Create a `.env` file in the root directory
2. Add your API keys:
   ```
   REACT_APP_GEMINI_API_KEY=your_api_key_here
   REACT_APP_GOOGLE_MAPS_API_KEY=your_maps_api_key_here 
   REACT_APP_FINNHUB_API_KEY=your_finnhub_api_key_here
   REACT_APP_OPENWEATHER_API_KEY=your_weather_api_key_here
   ```
3. Add `.env` to your `.gitignore`:
   ```
   # API keys
   .env
   ```
5. You can access the API keys in your code via `process.env`:
   ```js
   const geminiApiKey = process.env.REACT_APP_GEMINI_API_KEY;
   ```

```bash
$ npm install && npm start
```

We have provided several example applications on other branches of this repository:

- [demos/GenExplainer](https://github.com/google-gemini/multimodal-live-api-web-console/tree/demos/genexplainer)
- [demos/GenWeather](https://github.com/google-gemini/multimodal-live-api-web-console/tree/demos/genweather)
- [demos/GenList](https://github.com/google-gemini/multimodal-live-api-web-console/tree/demos/genlist)

## Architecture

This section describes the key architectural components and their interactions.

### Core Components

1. **Client (App)**
   - Handles WebSocket communication
   - Manages user media streams
   - Coordinates widget rendering

2. **Tool Handler**
   - Processes tool calls from Gemini API
   - Routes requests to appropriate widgets
   - Manages tool execution state

3. **Widget Manager**
   - Creates and manages widget instances
   - Handles widget lifecycle
   - Coordinates widget layout

4. **Base Widget**
   - Provides common widget functionality
   - Implements responsive design
   - Handles state management

### Component Interactions

#### Calling Widgets from Tool Handler

```
+---------------------+     +---------------------+     +---------------------+     +---------------------+
|   Client (App)    | --> |   ToolHandler       | --> |   WidgetManager     | --> |   Specific Widget   |
+---------------------+     +---------------------+     +---------------------+     +---------------------+
|                     |     |                     |     |                     |     | (e.g., WeatherWidget)|
|  Receives          |     |  - handleToolCall() |     |  - createWidget()   |     |  - render()         |
|  'toolcall' event  |     |  - processToolCall()|     |  - renderWidget()   |     |  - postRender()     |
|  from WebSocket    |     |  - mapToolTo...()   |     |                     |     |                     |
|                     |     |  - getWidgetTitle() |     |                     |     |                     |
|                     |     |  - handleWithStatus()|     |                     |     |                     |
+---------------------+     +---------------------+     +---------------------+     +---------------------+
```

#### Voice Input to Tool Execution

```
+----------+     +-------------+     +---------------------+     +---------------------+     +--------+
|  User    | --> | Microphone  | --> |  LiveAPIClient      | --> |   ToolHandler       | --> | Action |
| (Voice)  |     | (Audio      |     | (WebSocket)         |     |                     |     |        |
|          |     |  Recorder)  |     |                     |     |                     |     |        |
+----------+     +-------------+     +---------------------+     +---------------------+     +--------+
                                    | - Sends audio data  |
                                    | - Receives 'tool-   |
                                    |   call' event       |
                                    +---------------------+
```

#### Responsive Widget Layout

```
+---------------------+     +-------------------------------------+
|   BaseWidget        | --> |  Responsive Helper Functions         |
+---------------------+     +-------------------------------------+
| - render()          |     | - createResponsiveColumns()         |
| - postRender()      |     | - createResponsiveGrid()            |
| - create...State()  |     | - createResponsiveText()            |
| - setupDraggable()  |     | - createInfoCard()                  |
| - setupResizable()  |     | - createScrollableContent()         |
+---------------------+     +-------------------------------------+
        ^
        | Inherits
+---------------------+
| Specific Widget     |
| (e.g., MapWidget)   |
+---------------------+
```

## Available Widgets

The application includes a variety of widgets to display different types of data:

### Interactive Widgets
- **Chat Widget**: Real-time chat interface with AI assistant
- **CodeExecution Widget**: Code execution environment with syntax highlighting
- **Search Widget**: Google Search-powered information retrieval

### Data Visualization Widgets
- **Weather Widget**: Real-time weather information and forecasts
- **Stock Widget**: Live stock market data and trends
- **Altair Widget**: Dynamic data visualization using Vega-Embed

### Location & Navigation Widgets
- **Map Widget**: Google Maps integration with directions
- **Places Widget**: Location details with ratings and photos
- **Nearby Places Widget**: Location-based place discovery

### Media Widgets
- **Image Widget**: Image display with zoom and pan
- **Document Widget**: Document viewer with search

## Widget Usage Examples

### Code Execution Widget
```typescript
<WidgetItem
  item={{
    id: 'code-1',
    type: 'CodeExecutionWidget'
  }}
  widgetData={{
    language: 'python',
    code: 'print("Hello, world!")\ndef add(a, b):\n  return a + b\n\nprint(add(5, 3))',
    output: '', // Output will be populated after execution
    outcome: 'success' // or 'error'
  }}
/>
```

### Map Widget
```typescript
<WidgetItem 
  item={{ 
    id: 'map-1', 
    type: 'map' 
  }} 
  widgetData={{ 
    origin: 'London',
    destination: 'Paris' 
  }} 
/>
```

### Altair Visualization Widget
```typescript
// Import required dependencies
import { type FunctionDeclaration, SchemaType } from "@google/generative-ai";
import { useEffect, useRef, useState } from "react";
import vegaEmbed from "vega-embed";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";

// Use the widget
<Altair />
```

## Development

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

### Available Scripts

- `npm start`: Run in development mode at [http://localhost:3000](http://localhost:3000)
- `npm run build`: Build production-ready app in `build` folder

### Project Structure
- `src/components/widgets/`: Widget implementations
- `src/lib/tools/`: API integrations and tools
- `src/contexts/`: React contexts for state management
- `src/styles/`: SCSS modules and design system

_This is an experiment showcasing the Multimodal Live API, not an official Google product. We'll do our best to support and maintain this experiment but your mileage may vary. We encourage open sourcing projects as a way of learning from each other. Please respect our and other creators' rights, including copyright and trademark rights when present, when sharing these works and creating derivative work. If you want more info on Google's policy, you can find that [here](https://developers.google.com/terms/site-policies)._


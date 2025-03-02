import { SecondaryLLM } from '../secondary-llm-client';
import { Part, SchemaType } from '@google/generative-ai';
import { toolDeclarations } from '../tool-declarations';

interface ExplanationSection {
  title: string;
  content: string;
  key_points?: string[];
}

interface VisualContent {
  type: 'diagram' | 'chart';
  title: string;
  description: string;
  data?: any;
  style: 'simple' | 'detailed' | 'technical' | 'artistic';
}

interface InteractiveElement {
  type: 'quiz' | 'exercise' | 'simulation' | 'explorable_example' | 'practice_problem';
  title: string;
  content: any;
}

// Simplified ExplanationResponse to match our schema
export interface ExplanationResponse {
  topic: string;
  style: string;
  level: string;
  format: string;
  sections: ExplanationSection[];
  metadata: {
    word_count: number;
    difficulty_progression: string;
    key_points_covered: number;
  };
}

export interface ExplainerOptions {
  topic: string;
  context?: string;
  style?: 'academic' | 'conversational' | 'technical' | 'simple';
  format?: 'detailed' | 'summary' | 'step-by-step' | 'qa';
}

// Define a simpler schema that Gemini can more easily fulfill
const explanationResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    topic: { 
      type: SchemaType.STRING, 
      description: "The topic being explained"
    },
    style: { 
      type: SchemaType.STRING, 
      description: "The style of the explanation (academic, conversational, technical, or simple)"
    },
    level: { 
      type: SchemaType.STRING, 
      description: "The difficulty level of the explanation (beginner, intermediate, advanced)"
    },
    format: { 
      type: SchemaType.STRING, 
      description: "The format of the explanation (detailed, summary, step-by-step, qa)"
    },
    sections: {
      type: SchemaType.ARRAY,
      description: "The sections of the explanation",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          title: { 
            type: SchemaType.STRING, 
            description: "Section title"
          },
          content: { 
            type: SchemaType.STRING, 
            description: "Section content in HTML format"
          },
          key_points: {
            type: SchemaType.ARRAY,
            description: "Key points for the section (optional)",
            items: { 
              type: SchemaType.STRING 
            }
          }
        },
        required: ["title", "content"]
      }
    },
    metadata: {
      type: SchemaType.OBJECT,
      properties: {
        word_count: { 
          type: SchemaType.NUMBER, 
          description: "Approximate word count of the explanation"
        },
        difficulty_progression: { 
          type: SchemaType.STRING, 
          description: "How the difficulty progresses through the explanation"
        },
        key_points_covered: { 
          type: SchemaType.NUMBER, 
          description: "Number of key points covered in the explanation"
        }
      },
      required: ["word_count", "difficulty_progression", "key_points_covered"]
    }
  },
  required: ["topic", "style", "level", "format", "sections", "metadata"]
};

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY as string;
if (typeof GEMINI_API_KEY !== "string") {
  throw new Error("set REACT_APP_GEMINI_API_KEY in .env");
}

// Create a new instance of SecondaryLLM with the correct configuration
const llmClient = new SecondaryLLM({
  apiKey: GEMINI_API_KEY,
  model: 'gemini-2.0-flash-001', // Use a stable model that supports structured output
  defaultGenerationConfig: {
    maxOutputTokens: 8192,
    responseMimeType: "application/json",
    responseSchema: explanationResponseSchema
  }
});

export async function generateExplanation(
  options: ExplainerOptions
): Promise<ExplanationResponse> {
  console.group('Generating Explanation');
  console.log('Options:', options);

  try {
    // Construct a clear prompt for the LLM
    const prompt: Part = {
      text: `Generate a comprehensive explanation about "${options.topic}" with the following requirements:

Style: ${options.style || 'conversational'}
Format: ${options.format || 'detailed'}
${options.context ? `Additional context: ${options.context}` : ''}

Your response should be a JSON object with the following structure:
- topic: The topic being explained
- style: The style used (academic, conversational, technical, or simple)
- level: The difficulty level (beginner, intermediate, advanced)
- format: The format used (detailed, summary, step-by-step, qa)
- sections: An array of sections, each with:
  - title: Section title
  - content: Section content (can include HTML formatting)
  - key_points: Optional array of key points
- metadata:
  - word_count: Approximate word count
  - difficulty_progression: How difficulty progresses
  - key_points_covered: Number of key points covered

Make the explanation informative, accurate, and engaging.`
    };

    console.log('Prompt:', prompt.text);

    // Send the request to the LLM
    const result = await llmClient.generateContent(prompt);
    console.log('Raw LLM response:', result);

    // Extract and parse the response
    let responseText;
    if (result.response) {
      responseText = result.response.text();
    } else if (result.candidates && result.candidates.length > 0 && 
               result.candidates[0].content && result.candidates[0].content.parts && 
               result.candidates[0].content.parts.length > 0) {
      responseText = result.candidates[0].content.parts[0].text;
    }

    if (!responseText) {
      console.error('Could not extract text from response:', result);
      throw new Error('No response from LLM');
    }

    try {
      // Parse the JSON response
      const parsedResponse: ExplanationResponse = JSON.parse(responseText);
      console.log('Parsed response:', parsedResponse);
      console.groupEnd();
      return parsedResponse;
    } catch (parseError) {
      console.error('Error parsing JSON response:', parseError);
      console.error('Raw response text:', responseText);
      throw new Error('Failed to parse LLM response as JSON');
    }
  } catch (error) {
    console.error('Error generating explanation:', error);
    console.groupEnd();
    throw error;
  }
}
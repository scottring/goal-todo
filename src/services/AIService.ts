import OpenAI from 'openai';
import { currentEnvironment } from '../lib/firebase';

export interface AIServiceOptions {
  apiKey?: string;
}

export interface ParsedGoal {
  title: string;
  description?: string;
  dueDate?: Date;
  priority?: 'low' | 'medium' | 'high';
}

export interface ParsedTask {
  title: string;
  goalId?: string;
  dueDate?: Date;
  isCompleted?: boolean;
  priority?: 'low' | 'medium' | 'high';
}

export interface ParsedResult {
  type: 'goal' | 'task' | 'milestone' | 'unknown';
  data: ParsedGoal | ParsedTask | any;
  confidence: number;
}

export interface AIError extends Error {
  code?: string;
  environment?: string;
}

export class AIService {
  private client: OpenAI;
  private environment: string;
  private isInitialized: boolean = false;

  constructor(options: AIServiceOptions = {}) {
    this.environment = currentEnvironment;
    
    // Initialize with API key if provided
    if (options.apiKey) {
      this.client = new OpenAI({
        apiKey: options.apiKey,
        dangerouslyAllowBrowser: true // For client-side usage
      });
      this.isInitialized = true;
    } else {
      // Will be initialized later when API key is set
      this.client = new OpenAI({
        apiKey: 'placeholder', // Will be replaced later
        dangerouslyAllowBrowser: true
      });
    }
  }

  /**
   * Initialize the AI service with an API key
   */
  initialize(apiKey: string): void {
    this.client = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true
    });
    this.isInitialized = true;
  }

  /**
   * Check if the API key is set and the service is ready to use
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Process a natural language input and parse it into app entities
   */
  async processInput(input: string): Promise<ParsedResult> {
    if (!this.isInitialized) {
      throw this.handleError(new Error('AI service not initialized with API key'));
    }
    
    try {
      const completion = await this.client.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant that helps users manage their goals and tasks.
            Parse the user's input and categorize it as a goal, task, or milestone.
            Extract relevant information like title, description, due date, priority, etc.
            Return the data in a structured JSON format. Your response must be valid JSON.`
          },
          { role: 'user', content: `Parse the following input into a structured JSON object with fields for type, data, and confidence: "${input}"` }
        ],
        model: 'gpt-3.5-turbo',
        response_format: { type: 'json_object' }
      });

      let result;
      try {
        // Try to parse the JSON response
        const responseContent = completion.choices[0].message.content || '{}';
        result = JSON.parse(responseContent);
      } catch (parseError) {
        console.error("Error parsing JSON response:", parseError);
        // Return a fallback result if parsing fails
        return {
          type: 'unknown',
          data: {
            title: input,
            rawInput: input
          },
          confidence: 0.1
        };
      }

      // Basic validation of the result
      if (!result.type || !result.data) {
        return {
          type: 'unknown',
          data: {
            title: input,
            rawInput: input
          },
          confidence: 0.1
        };
      }

      return result;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Generate suggestions for completing a goal or task
   */
  async generateSuggestions(context: any): Promise<string[]> {
    if (!this.isInitialized) {
      throw this.handleError(new Error('AI service not initialized with API key'));
    }
    
    try {
      const completion = await this.client.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant that helps users achieve their goals.
            Based on the provided context, suggest 3-5 actionable steps or tasks.
            Return your suggestions as a JSON array of strings.`
          },
          { role: 'user', content: `Based on this goal context: ${JSON.stringify(context)}, provide 3-5 actionable tasks in JSON format as an array of strings.` }
        ],
        model: 'gpt-3.5-turbo',
        response_format: { type: 'json_object' }
      });

      let suggestions = [];
      try {
        const responseContent = completion.choices[0].message.content || '{}';
        const result = JSON.parse(responseContent);

        // Handle different possible response formats
        if (Array.isArray(result)) {
          suggestions = result;
        } else if (result.suggestions && Array.isArray(result.suggestions)) {
          suggestions = result.suggestions;
        } else if (result.tasks && Array.isArray(result.tasks)) {
          suggestions = result.tasks;
        } else if (typeof result === 'object') {
          // Try to extract any array we can find
          const possibleArrays = Object.values(result).filter(Array.isArray);
          if (possibleArrays.length > 0) {
            suggestions = possibleArrays[0];
          }
        }
      } catch (parseError) {
        console.error("Error parsing JSON response for suggestions:", parseError);
        // Fallback to text parsing if JSON fails
        const suggestionText = completion.choices[0].message.content || '';
        suggestions = suggestionText
          .split(/\d+\.\s+/)
          .filter(item => item.trim().length > 0)
          .map(item => item.trim());
      }
      
      return suggestions;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: unknown): AIError {
    const aiError = error as AIError;
    aiError.environment = this.environment;

    console.error(`[${this.environment}] AI service error:`, aiError);

    // Extract the actual error message
    let errorMessage = 'An unknown error occurred';

    if (aiError.message) {
      errorMessage = aiError.message;
    }

    // Check for OpenAI API errors in various formats
    if (typeof error === 'object' && error !== null) {
      const err = error as any;

      // Possible OpenAI error structures
      if (err.error?.type) {
        errorMessage = `OpenAI API error: ${err.error.type}`;
        if (err.error.message) {
          errorMessage += ` - ${err.error.message}`;
        }
      } else if (err.status && err.statusText) {
        errorMessage = `OpenAI API error: ${err.status} ${err.statusText}`;
      } else if (err.response?.data?.error) {
        errorMessage = `OpenAI API error: ${err.response.data.error.message || JSON.stringify(err.response.data.error)}`;
      }
    }

    // Handle specific OpenAI errors
    if (errorMessage.includes('insufficient_quota') || errorMessage.includes('quota exceeded')) {
      return new Error(`[${this.environment}] API quota exceeded. Please check your OpenAI account.`);
    }

    if (errorMessage.includes('invalid_api_key') || errorMessage.includes('Invalid API key')) {
      return new Error(`[${this.environment}] Invalid API key. Please check your OpenAI API key.`);
    }

    if (errorMessage.includes('rate limit') || errorMessage.includes('rate_limit_exceeded')) {
      return new Error(`[${this.environment}] Rate limit exceeded. Please try again in a moment.`);
    }

    return new Error(`[${this.environment}] An error occurred during AI processing: ${errorMessage}`);
  }
}

// Create singleton instance
let aiService: AIService | null = null;

export const getAIService = (options: AIServiceOptions = {}): AIService => {
  if (!aiService) {
    aiService = new AIService(options);
  }
  // If options include apiKey and service isn't initialized, initialize it
  if (options.apiKey && !aiService.isReady()) {
    aiService.initialize(options.apiKey);
  }
  return aiService;
};
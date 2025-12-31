import { Category } from '../keywords';

export interface ParsedIntent {
  primaryCategory: Category;
  secondaryCategories?: Category[];
  confidence: number;
  userGoal: string;
  constraints: {
    pricing?: 'free' | 'freemium' | 'paid';
    speed?: 'fast' | 'quality';
    expertise?: 'beginner' | 'advanced';
    language?: string;
  };
  keywords: string[];
  reasoning: string;

  // Workflow detection fields
  complexity: 'simple' | 'multi-step';
  estimatedSteps?: number;
  workflowHints?: string[];
}

export interface IntentParsingError {
  code: 'LOW_CONFIDENCE' | 'PARSE_ERROR' | 'API_ERROR';
  message: string;
  suggestions?: string[];
}

// RouteAI Workflow Type Definitions
// Enables multi-step workflow recommendations

import { Category } from '../keywords';
import { Tool } from '../toolsService';

/**
 * Media types that tools can accept as input or produce as output
 */
export type MediaType = 'text' | 'image' | 'audio' | 'video' | 'data' | 'code' | 'document';

/**
 * Template for a single step in a workflow
 */
export interface WorkflowStepTemplate {
  order: number;
  name: string;
  description: string;
  category: Category;

  // What this step needs and produces
  inputType: MediaType;
  outputType: MediaType;

  // Hints for tool matching
  capabilities: string[];

  // Optional prompt template for this step
  promptTemplate?: string | null;

  // Tips for this step
  tips?: string[];

  // Is this step optional?
  optional?: boolean;
}

/**
 * Predefined workflow template
 */
export interface WorkflowTemplate {
  id: string;
  name: string;
  nameEn: string;
  description: string;

  // Keywords that trigger this workflow
  triggers: string[];

  // The steps in this workflow
  steps: WorkflowStepTemplate[];

  // Metadata
  complexity: 'simple' | 'medium' | 'complex';
  estimatedDuration: string;
  tags: string[];
}

/**
 * Tool recommendation for a specific step
 */
export interface StepToolRecommendation {
  tool: Tool;
  score: number;
  reasoning: string;
}

/**
 * A single step in a generated workflow with tool recommendations
 */
export interface WorkflowStepRecommendation {
  order: number;
  name: string;
  description: string;
  category: Category;

  // Tool recommendations
  primary: StepToolRecommendation;
  alternative: StepToolRecommendation;

  // Prompt suggestion for this step
  promptSuggestion?: string;

  // Tips for this step
  tips?: string[];
}

/**
 * Complete generated workflow with all recommendations
 */
export interface GeneratedWorkflow {
  templateId: string;
  templateName: string;

  // The user's original query
  userQuery: string;

  // Workflow steps with tool recommendations
  steps: WorkflowStepRecommendation[];

  // Aggregate info
  totalSteps: number;
  estimatedDuration: string;
  complexity: 'simple' | 'medium' | 'complex';

  // Categories involved
  categories: Category[];
}

/**
 * API response format for workflows
 */
export interface WorkflowApiResponse {
  type: 'workflow';
  category: Category;
  workflow: {
    name: string;
    totalSteps: number;
    estimatedDuration: string;
    complexity: string;
    steps: Array<{
      order: number;
      name: string;
      description: string;
      category: Category;
      primary: {
        toolName: string;
        description: string;
        url: string;
        pricing: Tool['pricing'];
        strength: number;
        why: string;
        promptSuggestion?: string;
      };
      alternative: {
        toolName: string;
        description: string;
        url: string;
        pricing: Tool['pricing'];
        strength: number;
      };
    }>;
  };
  _debug?: {
    intent: unknown;
    confidence: number;
    templateId: string;
  };
}

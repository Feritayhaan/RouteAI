// RouteAI Workflow Type Definitions
// Enables multi-step workflow recommendations

import { Category } from '../keywords';
import { Tool } from '../toolsService';

/**
 * Template for a single step in a workflow
 */
export interface WorkflowStepTemplate {
  order: number;
  name: string;
  description: string;
  category: Category;

  /**
   * Katalogdaki görev kimlikleri (data/tasks.json), öncelik sırasıyla. Adımın
   * aracı bu görevleri yapabilen aktif ürünlerden seçilir; ilk görevin
   * adayları önce gelir.
   */
  tasks: string[];

  // Tips for this step
  tips?: string[];
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

  // Semantic matching: "Bu workflow ne zaman kullanılır?" 1-2 cümle
  semanticDescription: string;

  // Minimum güven eşiği — skor bunun altındaysa workflow tetiklenmez
  minConfidence: number;

  // Hangi kategoriler bu workflow'u tetikleyebilir
  primaryCategories: string[];

  // The steps in this workflow (en fazla MAX_WORKFLOW_STEPS)
  steps: WorkflowStepTemplate[];

  tags: string[];
}

/**
 * Tool recommendation for a specific step
 */
export interface StepToolRecommendation {
  tool: Tool;
}

/**
 * A single step in a generated workflow with tool recommendations
 */
export interface WorkflowStepRecommendation {
  order: number;
  name: string;
  description: string;
  category: Category;
  /** Aracın seçildiği görev (adımın ilk görevi). */
  taskId: string;

  primary: StepToolRecommendation;
  /** Farklı bir ürün; görevde başka aday yoksa null. */
  alternative: StepToolRecommendation | null;

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

  totalSteps: number;

  // Categories involved
  categories: Category[];
}

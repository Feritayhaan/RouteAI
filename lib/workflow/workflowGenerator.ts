// RouteAI Workflow Generator
// Generates step-based tool recommendations for multi-step workflows

import { Category } from '../keywords';
import { Tool, Locale, getToolsByCategory, getLocalized, resolveLocale } from '../toolsService';
import { ParsedIntent } from '../intent/types';
import {
    WorkflowTemplate,
    WorkflowStepTemplate,
    WorkflowStepRecommendation,
    GeneratedWorkflow,
    StepToolRecommendation,
} from './workflowTypes';
import { findMatchingTemplate } from './workflowTemplates';
import { getCachedWorkflow, setCachedWorkflow } from './cache';

// ================================================================
// SORUN 3: OutputTypes eşleştirme haritası
// ================================================================
const mediaTypeToOutputType: Record<string, string> = {
    'text': 'text',
    'image': 'image',
    'audio': 'audio',
    'video': 'video',
    'code': 'code',
    'data': 'text',
    'document': 'text',
};

/**
 * Generate a complete workflow with tool recommendations for each step
 */
export async function generateWorkflow(
    intent: ParsedIntent,
    userQuery: string
): Promise<GeneratedWorkflow | null> {
    // Only generate workflow for multi-step intents
    if (intent.complexity !== 'multi-step') {
        return null;
    }

    // Find matching workflow template (Sorun 2: intent bazlı scoring)
    const template = findMatchingTemplate(userQuery, intent.workflowHints, intent);

    if (!template) {
        // No matching template found, fall back to simple recommendation
        console.log('[Workflow] No matching template found for:', userQuery);
        return null;
    }

    console.log('[Workflow] Matched template:', template.id);

    // ============================================================
    // SORUN 4: Cache kontrolü — daha önce üretilmişse tekrar üretme
    // ============================================================
    const constraintsKey = `${intent.constraints?.pricing || 'all'}-${intent.constraints?.expertise || 'all'}-${intent.constraints?.speed || 'all'}`;
    const cached = await getCachedWorkflow(template.id, intent.primaryCategory, constraintsKey);
    if (cached) {
        console.log('[Workflow] Cache HIT:', template.id);
        return cached;
    }

    // ============================================================
    // SORUN 1: Tüm adımlar PARALEL çalışır (Promise.all)
    // ============================================================
    const steps = await Promise.all(
        template.steps.map(step => generateStepRecommendation(step, intent, template))
    );

    // Collect all unique categories
    const categories = [...new Set(template.steps.map(s => s.category))];

    const result: GeneratedWorkflow = {
        templateId: template.id,
        templateName: template.name,
        userQuery,
        steps,
        totalSteps: steps.length,
        estimatedDuration: template.estimatedDuration,
        complexity: template.complexity,
        categories,
    };

    // Cache'e yaz (fire-and-forget)
    setCachedWorkflow(template.id, intent.primaryCategory, result, constraintsKey).catch(() => {});

    return result;
}

/**
 * Generate tool recommendations for a single workflow step
 */
async function generateStepRecommendation(
    step: WorkflowStepTemplate,
    intent: ParsedIntent,
    template: WorkflowTemplate
): Promise<WorkflowStepRecommendation> {
    // Get tools for this step's category
    const categoryTools = await getToolsByCategory(step.category);

    // Create a modified intent for this specific step
    const stepIntent: ParsedIntent = {
        ...intent,
        primaryCategory: step.category,
        keywords: [...intent.keywords, ...step.capabilities],
    };

    // Score and rank tools for this step (Sorun 3: outputTypes filtresi dahil)
    const scoredTools = categoryTools
        .filter(tool => !tool.deprecated)
        .map(tool => ({
            tool,
            score: calculateStepScore(tool, step, stepIntent),
        }))
        .sort((a, b) => b.score - a.score);

    // Get top 2 tools
    const primaryTool = scoredTools[0] || null;
    const alternativeTool = scoredTools[1] || null;

    // Generate reasoning for primary tool
    const primaryReasoning = primaryTool
        ? generateStepReasoning(primaryTool.tool, step, stepIntent)
        : 'Bu adım için uygun araç bulunamadı';

    const alternativeReasoning = alternativeTool
        ? generateStepReasoning(alternativeTool.tool, step, stepIntent)
        : 'Alternatif araç bulunamadı';

    // Build step recommendation
    return {
        order: step.order,
        name: step.name,
        description: step.description,
        category: step.category,
        primary: primaryTool
            ? {
                tool: primaryTool.tool,
                score: primaryTool.score,
                reasoning: primaryReasoning,
            }
            : createFallbackRecommendation(step.category, 'primary'),
        alternative: alternativeTool
            ? {
                tool: alternativeTool.tool,
                score: alternativeTool.score,
                reasoning: alternativeReasoning,
            }
            : createFallbackRecommendation(step.category, 'alternative'),
        promptSuggestion: step.promptTemplate || undefined,
        tips: step.tips,
    };
}

/**
 * Calculate score for a tool in the context of a specific workflow step
 * Sorun 3: outputTypes/inputTypes filtresi eklendi
 */
function calculateStepScore(
    tool: Tool,
    step: WorkflowStepTemplate,
    intent: ParsedIntent
): number {
    let score = tool.strength || 8;

    // Bonus for matching step capabilities
    const lowerBestFor = getLocalized(tool, 'bestFor', resolveLocale(intent.constraints?.language))
        .map(b => b.toLowerCase());
    const lowerCapabilities = step.capabilities.map(c => c.toLowerCase());

    for (const capability of lowerCapabilities) {
        if (lowerBestFor.some(bf => bf.includes(capability) || capability.includes(bf))) {
            score += 1.5;
        }
    }

    // Bonus for matching features
    const lowerFeatures = tool.features?.map(f => f.toLowerCase()) || [];
    for (const capability of lowerCapabilities) {
        if (lowerFeatures.some(feat => feat.includes(capability))) {
            score += 0.5;
        }
    }

    // ================================================================
    // SORUN 3: OutputTypes ve InputTypes eşleşme kontrolü
    // ================================================================
    const expectedOutput = mediaTypeToOutputType[step.outputType];
    if (expectedOutput && tool.outputTypes) {
        if (tool.outputTypes.includes(expectedOutput as any)) {
            score += 2; // Tam uyuşma — büyük bonus
        } else {
            score -= 1; // Uyuşmazlık — penaltı
        }
    }

    const expectedInput = mediaTypeToOutputType[step.inputType];
    if (expectedInput && tool.inputTypes) {
        if (tool.inputTypes.includes(expectedInput as any)) {
            score += 1; // inputType uyuşması — küçük bonus
        }
    }

    // Apply pricing preferences
    const pricing = tool.pricing;
    if (intent.constraints.pricing === 'free') {
        if (pricing?.free) score += 2;
        else if (pricing?.freemium) score += 1;
        else if (pricing?.paidOnly) score -= 2;
    } else if (intent.constraints.pricing === 'paid') {
        if (pricing?.paidOnly || pricing?.freemium) score += 0.5;
    }

    // Expertise level bonus
    if (intent.constraints.expertise === 'beginner') {
        // Prefer free and easy-to-use tools
        if (pricing?.free) score += 0.5;
        // Simple tools (lower strength sometimes means simpler)
        if (tool.strength && tool.strength < 9) score += 0.3;
    }

    // Speed bonus
    if (intent.constraints.speed === 'fast') {
        if (lowerFeatures.some(f => f.includes('fast') || f.includes('quick'))) {
            score += 0.5;
        }
    }

    return score;
}

/**
 * Generate explanation for why a tool was recommended for a step
 */
function generateStepReasoning(
    tool: Tool,
    step: WorkflowStepTemplate,
    intent: ParsedIntent
): string {
    const reasons: string[] = [];

    // Check capability matches
    const bestFor = getLocalized(tool, 'bestFor', resolveLocale(intent.constraints?.language));
    const matchingCapabilities = step.capabilities.filter(cap =>
        bestFor.some(bf =>
            bf.toLowerCase().includes(cap.toLowerCase()) ||
            cap.toLowerCase().includes(bf.toLowerCase())
        )
    );

    if (matchingCapabilities.length > 0) {
        reasons.push(`"${matchingCapabilities[0]}" konusunda uzman`);
    }

    // OutputType match reason
    const expectedOutput = mediaTypeToOutputType[step.outputType];
    if (expectedOutput && tool.outputTypes?.includes(expectedOutput as any)) {
        reasons.push(`${step.outputType} çıktısı üretiyor`);
    }

    // Pricing reason
    if (intent.constraints.pricing === 'free' && tool.pricing?.free) {
        reasons.push('ücretsiz kullanılabilir');
    }

    // Strength-based reason
    if (tool.strength && tool.strength > 9.5) {
        reasons.push('sektörün en iyisi');
    } else if (tool.strength && tool.strength > 9) {
        reasons.push('çok yüksek kaliteli');
    }

    // Features
    if (tool.features && tool.features.length > 0) {
        const relevantFeature = tool.features[0];
        if (relevantFeature) {
            reasons.push(`${relevantFeature} özelliği var`);
        }
    }

    // Default
    if (reasons.length === 0) {
        reasons.push(`${step.category} kategorisinde güçlü bir seçenek`);
    }

    return reasons.slice(0, 3).join(', ') + '.';
}

/**
 * Create a fallback recommendation when no tools found
 */
function createFallbackRecommendation(
    category: Category,
    type: 'primary' | 'alternative'
): StepToolRecommendation {
    const fallbackTool: Tool = {
        name: type === 'primary' ? 'ChatGPT (GPT-5)' : 'Claude AI (Claude 4)',
        category: category,
        description: { tr: 'Genel amaçlı AI asistanı', en: '' },
        url: type === 'primary' ? 'https://chat.openai.com' : 'https://claude.ai',
        pricing: {
            free: true,
            freemium: true,
            paidOnly: false,
            startingPrice: 20,
            currency: 'USD',
        },
        bestFor: { en: ['general purpose', 'content creation', 'writing'], tr: [] },
        strength: 9.5,
    };

    return {
        tool: fallbackTool,
        score: 8,
        reasoning: 'Bu adım için özel araç bulunamadı, genel amaçlı AI önerildi.',
    };
}

/**
 * Format workflow for API response
 */
export function formatWorkflowForApi(workflow: GeneratedWorkflow, locale?: Locale) {
    return {
        name: workflow.templateName,
        totalSteps: workflow.totalSteps,
        estimatedDuration: workflow.estimatedDuration,
        complexity: workflow.complexity,
        categories: workflow.categories,
        steps: workflow.steps.map(step => ({
            order: step.order,
            name: step.name,
            description: step.description,
            category: step.category,
            primary: {
                toolName: step.primary.tool.name,
                description: getLocalized(step.primary.tool, 'description', locale),
                url: step.primary.tool.url,
                pricing: step.primary.tool.pricing,
                strength: step.primary.tool.strength,
                why: step.primary.reasoning,
                promptSuggestion: step.promptSuggestion,
            },
            alternative: {
                toolName: step.alternative.tool.name,
                description: getLocalized(step.alternative.tool, 'description', locale),
                url: step.alternative.tool.url,
                pricing: step.alternative.tool.pricing,
                strength: step.alternative.tool.strength,
            },
            tips: step.tips,
        })),
    };
}

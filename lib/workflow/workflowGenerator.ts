// RouteAI Workflow Generator
// Generates step-based tool recommendations for multi-step workflows

import { Category } from '../keywords';
import { Tool, Locale, getToolsByCategory, getLocalized, resolveLocale, getTools } from '../toolsService';
import { ParsedIntent } from '../intent/types';
import { makePricing } from '../pricing';
import {
    WorkflowTemplate,
    WorkflowStepTemplate,
    WorkflowStepRecommendation,
    GeneratedWorkflow,
    StepToolRecommendation,
    MediaType,
} from './workflowTypes';
import { findMatchingTemplate } from './workflowTemplates';
import { getCachedWorkflow, setCachedWorkflow } from './cache';
import { getOpenAIClient } from '../openai';

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

// Kategori → varsayılan çıktı tipi (formatWorkflowForApi için)
const categoryDefaultOutput: Record<string, string> = {
    gorsel: 'image',
    video: 'video',
    ses: 'audio',
    metin: 'text',
    arastirma: 'text',
    veri: 'data',
    kod: 'code',
};

// ================================================================
// AI Workflow Generation — OpenAI sistem promptu
// ================================================================
const AI_WORKFLOW_SYSTEM_PROMPT = `Sen RouteAI'in workflow tasarımcısısın. Kullanıcının çok adımlı görevini 3-6 adımlık bir iş akışına dönüştürüyorsun.

Her adım için şunları belirt:
- name: Adımın kısa Türkçe adı (ör: "Görsel Üretimi", "Senaryo Yazımı")
- action: Bu adımda ne yapılacağının Türkçe açıklaması (1 cümle, fiil ile başlasın)
- suggestedTool: Bu adım için en uygun AI aracı adı (ör: "Midjourney", "Suno", "ChatGPT", "Runway")
- category: Bu adım için en uygun kategori
- inputType: Bu adımın girdisi
- outputType: Bu adımın çıktısı
- promptTemplate: Bu adım için örnek prompt şablonu (Türkçe, boş string bırakılabilir)

Kurallar:
- 3 ile 6 arasında adım üret
- Adımlar mantıksal sırada olmalı
- Her adım farklı bir işlevi temsil etmeli
- Gerçekçi ve popüler AI araç isimleri kullan: Midjourney, Suno, ChatGPT, Claude, Runway, ElevenLabs, Canva, Figma, Ideogram, HeyGen, Kling, DALL-E 3, Stable Diffusion vb.
- workflowName: Görevin kısa Türkçe adı
- estimatedDuration: Tahmini süre (ör: "2-4 saat", "1 gün")
- complexity: simple (3 adım), medium (4 adım) veya complex (5-6 adım)`;

// ================================================================
// AI Workflow JSON Schema (gpt-4o-mini strict mode)
// ================================================================
const AI_WORKFLOW_SCHEMA = {
    name: 'workflow_steps',
    strict: true,
    schema: {
        type: 'object',
        properties: {
            workflowName: { type: 'string' },
            estimatedDuration: { type: 'string' },
            complexity: { type: 'string', enum: ['simple', 'medium', 'complex'] },
            steps: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        order: { type: 'integer', minimum: 1, maximum: 6 },
                        name: { type: 'string' },
                        action: { type: 'string' },
                        suggestedTool: { type: 'string' },
                        category: {
                            type: 'string',
                            enum: ['gorsel', 'metin', 'ses', 'arastirma', 'video', 'veri', 'kod'],
                        },
                        inputType: {
                            type: 'string',
                            enum: ['text', 'image', 'audio', 'video', 'data', 'code', 'document'],
                        },
                        outputType: {
                            type: 'string',
                            enum: ['text', 'image', 'audio', 'video', 'data', 'code', 'document'],
                        },
                        promptTemplate: { type: 'string' },
                    },
                    required: ['order', 'name', 'action', 'suggestedTool', 'category', 'inputType', 'outputType', 'promptTemplate'],
                    additionalProperties: false,
                },
            },
        },
        required: ['workflowName', 'estimatedDuration', 'complexity', 'steps'],
        additionalProperties: false,
    },
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
        console.log('[Workflow] No matching template found, trying AI generation for:', userQuery);
        return generateWorkflowWithAI(intent, userQuery);
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

// ================================================================
// AI Workflow Generation — OpenAI ile dinamik workflow üretimi
// Template eşleşmediğinde devreye girer
// ================================================================

/**
 * Find a real database tool that matches an AI-suggested tool name.
 * Three-tier: exact name → partial name → category-best fallback.
 */
async function findToolForStep(
    suggestedName: string,
    category: Category
): Promise<Tool | null> {
    const allTools = await getTools();
    const lower = suggestedName.toLowerCase().trim();

    // Tier 1: Tam isim eşleşmesi
    const exact = allTools.find(t => t.name.toLowerCase() === lower && !t.deprecated);
    if (exact) return exact;

    // Tier 2: Kısmi eşleşme — DB ismi öneriyi içeriyor ya da tam tersi
    // ör: "Midjourney" → "Midjourney v7", "ChatGPT" → "ChatGPT (GPT-4o)"
    const partial = allTools
        .filter(t => !t.deprecated)
        .find(t => {
            const dbLower = t.name.toLowerCase();
            return dbLower.includes(lower) || lower.includes(dbLower.split(' ')[0]);
        });
    if (partial) return partial;

    // Tier 3: Kategori en iyisi (strength'e göre sıralı)
    const categoryBest = allTools
        .filter(t => t.category === category && !t.deprecated)
        .sort((a, b) => (b.strength ?? 0) - (a.strength ?? 0));
    return categoryBest[0] ?? null;
}

/**
 * Map a workflow hint string to the nearest Category.
 */
function mapHintToCategory(hint: string, defaultCategory: Category): Category {
    const lower = hint.toLowerCase();
    if (/görsel|resim|image|grafik|tasarım|logo|çizim/.test(lower)) return 'gorsel';
    if (/video|animasyon|film|klip/.test(lower)) return 'video';
    if (/ses|müzik|audio|sound|seslendirme/.test(lower)) return 'ses';
    if (/kod|program|yazılım|geliştirme|dev/.test(lower)) return 'kod';
    if (/veri|analiz|data|istatistik|dashboard/.test(lower)) return 'veri';
    if (/araştır|research|makale|literatür/.test(lower)) return 'arastirma';
    return defaultCategory;
}

/**
 * Build a minimal workflow from intent hints when OpenAI is unavailable.
 * Uses workflowHints or secondaryCategories to create step templates,
 * then runs each through the existing tool-scoring pipeline.
 */
async function buildFallbackWorkflow(
    intent: ParsedIntent,
    userQuery: string
): Promise<GeneratedWorkflow | null> {
    const hints: string[] =
        intent.workflowHints?.length
            ? intent.workflowHints
            : [intent.primaryCategory, ...(intent.secondaryCategories ?? [])].slice(0, 4);

    if (hints.length < 2) return null;

    const stepTemplates: WorkflowStepTemplate[] = hints.map((hint, idx) => {
        const category = mapHintToCategory(hint, intent.primaryCategory);
        const outType = (categoryDefaultOutput[category] ?? 'text') as MediaType;
        return {
            order: idx + 1,
            name: hint.charAt(0).toUpperCase() + hint.slice(1),
            description: `${hint} adımını tamamla`,
            category,
            inputType: 'text' as MediaType,
            outputType: outType,
            capabilities: [hint],
            promptTemplate: null,
            tips: [],
            optional: false,
        };
    });

    const fakeTemplate: WorkflowTemplate = {
        id: 'fallback',
        name: userQuery,
        nameEn: userQuery,
        description: '',
        triggers: [],
        semanticDescription: '',
        minConfidence: 0,
        primaryCategories: [intent.primaryCategory],
        steps: stepTemplates,
        complexity: 'medium',
        estimatedDuration: '1-3 saat',
        tags: [],
    };

    const steps = await Promise.all(
        stepTemplates.map(step => generateStepRecommendation(step, intent, fakeTemplate))
    );

    const categories = [...new Set(stepTemplates.map(s => s.category))] as Category[];

    return {
        templateId: 'fallback',
        templateName: userQuery,
        userQuery,
        steps,
        totalSteps: steps.length,
        estimatedDuration: '1-3 saat',
        complexity: 'medium',
        categories,
    };
}

/**
 * Dynamically generate a workflow using GPT-4o-mini when no template matches.
 * Falls back to buildFallbackWorkflow on any OpenAI failure.
 */
async function generateWorkflowWithAI(
    intent: ParsedIntent,
    userQuery: string
): Promise<GeneratedWorkflow | null> {
    // Cache key from query slug
    const pseudoTemplateId =
        'ai:' +
        userQuery
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w-]/g, '')
            .slice(0, 60);

    const constraintsKey = `${intent.constraints?.pricing || 'all'}-${intent.constraints?.expertise || 'all'}-${intent.constraints?.speed || 'all'}`;

    const cached = await getCachedWorkflow(pseudoTemplateId, intent.primaryCategory, constraintsKey);
    if (cached) {
        console.log('[Workflow AI] Cache HIT:', pseudoTemplateId);
        return cached;
    }

    // ── OpenAI çağrısı ────────────────────────────────────────────────────────
    let aiResponse: {
        workflowName: string;
        estimatedDuration: string;
        complexity: 'simple' | 'medium' | 'complex';
        steps: Array<{
            order: number;
            name: string;
            action: string;
            suggestedTool: string;
            category: Category;
            inputType: MediaType;
            outputType: MediaType;
            promptTemplate: string;
        }>;
    };

    try {
        const openaiClient = getOpenAIClient();
        const response = await openaiClient.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: AI_WORKFLOW_SYSTEM_PROMPT },
                { role: 'user', content: userQuery },
            ],
            response_format: {
                type: 'json_schema',
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                json_schema: AI_WORKFLOW_SCHEMA as any,
            },
            temperature: 0,
            max_tokens: 800,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            console.warn('[Workflow AI] Empty OpenAI response');
            return buildFallbackWorkflow(intent, userQuery);
        }

        aiResponse = JSON.parse(content);

        if (!aiResponse.steps || aiResponse.steps.length < 2) {
            console.warn('[Workflow AI] Insufficient steps:', aiResponse.steps?.length);
            return buildFallbackWorkflow(intent, userQuery);
        }
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('[Workflow AI] OpenAI call failed:', msg);
        return buildFallbackWorkflow(intent, userQuery);
    }

    // ── AI adımlarını WorkflowStepTemplate'e dönüştür ────────────────────────
    const stepTemplates: WorkflowStepTemplate[] = aiResponse.steps.map(s => ({
        order: s.order,
        name: s.name,
        description: s.action,          // action → description alanına map
        category: s.category,
        inputType: s.inputType,
        outputType: s.outputType,
        capabilities: [s.action],       // action metni yetenek listesi olarak kullanılır
        promptTemplate: s.promptTemplate || null,
        tips: [],
        optional: false,
    }));

    const fakeTemplate: WorkflowTemplate = {
        id: pseudoTemplateId,
        name: aiResponse.workflowName,
        nameEn: aiResponse.workflowName,
        description: '',
        triggers: [],
        semanticDescription: '',
        minConfidence: 0,
        primaryCategories: [intent.primaryCategory],
        steps: stepTemplates,
        complexity: aiResponse.complexity,
        estimatedDuration: aiResponse.estimatedDuration,
        tags: [],
    };

    // ── Her adım için araç önerisi paralel üret ───────────────────────────────
    const stepRecommendations = await Promise.all(
        stepTemplates.map(async (stepTemplate, idx) => {
            const suggestedName = aiResponse.steps[idx].suggestedTool;
            const recommendation = await generateStepRecommendation(stepTemplate, intent, fakeTemplate);

            if (!suggestedName) return recommendation;

            // OpenAI'nin önerdiği araç DB'de bulunursa puanlama ile kıyasla
            const suggestedTool = await findToolForStep(suggestedName, stepTemplate.category);
            if (!suggestedTool || suggestedTool.name === recommendation.primary.tool.name) {
                return recommendation;
            }

            const stepIntent: ParsedIntent = {
                ...intent,
                primaryCategory: stepTemplate.category,
                keywords: [...intent.keywords, ...stepTemplate.capabilities],
            };
            const suggestedScore = calculateStepScore(suggestedTool, stepTemplate, stepIntent);

            // Önerilen araç, mevcut en iyi puanına ±1 içindeyse onu tercih et
            if (suggestedScore >= recommendation.primary.score - 1) {
                return {
                    ...recommendation,
                    primary: {
                        tool: suggestedTool,
                        score: suggestedScore,
                        reasoning: generateStepReasoning(suggestedTool, stepTemplate, stepIntent),
                    },
                };
            }

            return recommendation;
        })
    );

    const categories = [...new Set(stepTemplates.map(s => s.category))] as Category[];

    const result: GeneratedWorkflow = {
        templateId: pseudoTemplateId,
        templateName: aiResponse.workflowName,
        userQuery,
        steps: stepRecommendations,
        totalSteps: stepRecommendations.length,
        estimatedDuration: aiResponse.estimatedDuration,
        complexity: aiResponse.complexity,
        categories,
    };

    // Cache'e yaz (fire-and-forget)
    setCachedWorkflow(pseudoTemplateId, intent.primaryCategory, result, constraintsKey).catch(() => {});

    console.log('[Workflow AI] Generated', result.totalSteps, 'steps for:', userQuery);
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
        pricing: makePricing('freemium', 20),
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
 * Returns clean JSON with step, action, output fields for frontend consumption
 */
export function formatWorkflowForApi(workflow: GeneratedWorkflow, locale?: Locale) {
    return {
        name: workflow.templateName,
        totalSteps: workflow.totalSteps,
        estimatedDuration: workflow.estimatedDuration,
        complexity: workflow.complexity,
        categories: workflow.categories,
        steps: workflow.steps.map(step => ({
            step: step.order,
            order: step.order,
            name: step.name,
            description: step.description,
            action: step.description,
            category: step.category,
            output: categoryDefaultOutput[step.category] ?? step.category,
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

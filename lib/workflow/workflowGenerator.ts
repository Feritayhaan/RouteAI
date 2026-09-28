// RouteAI Workflow Generator
//
// Çok adımlı iş için adım başına araç seçer.
//  - Sadece şablon: şablon eşleşmezse null döner ve çağıran tek araç önerisine
//    düşer. Yapay zekâyla şablon uydurulmaz.
//  - Araç, adımın katalog görevinden seçilir: ürün o görevi yapabiliyor olmalı
//    (data/products.json -> tasks) ve aktif olmalı. Katalogda olmayan araç
//    önerilmez. Sıra ana sayfanın tek araç yoluyla aynıdır (lib/ranking.ts).
//  - Alternatif her zaman ana araçtan farklı bir üründür.
//  - Arayüzdeki fiyat filtresi gevşetilmez: bir adıma uyan araç kalmazsa
//    workflow üretilmez (null), tek araç yolu filtreyle devam eder.
//  - Ardışık iki adımın ana aracı aynıysa adımlar birleşir; tek adım kalırsa
//    bu bir workflow değildir (null).

import { Category } from '../keywords';
import { Tool, Locale, getLocalized, getTools } from '../toolsService';
import { ParsedIntent } from '../intent/types';
import { PricingFilter, getPricingModel, hasFreeTier, matchesPricingFilter } from '../pricing';
import { rankTools } from '../ranking';
import { productTasks } from '../catalog/navigator';
import {
    WorkflowTemplate,
    WorkflowStepTemplate,
    WorkflowStepRecommendation,
    GeneratedWorkflow,
} from './workflowTypes';
import { MAX_WORKFLOW_STEPS, findMatchingTemplate } from './workflowTemplates';

export interface WorkflowOptions {
    /** Arayüzdeki fiyat filtresi (kullanıcının açıkça seçtiği). */
    pricingFilter?: PricingFilter;
    /** Araç listesi; verilmezse getTools() (katalog uygulanmış). */
    tools?: Tool[];
    /** Ürün -> katalog görevleri; verilmezse data/products.json. */
    tasksOf?: (productId: string) => string[];
}

/**
 * Generate a complete workflow with tool recommendations for each step.
 * Şablon yoksa ya da bir adıma araç bulunamazsa null.
 */
export async function generateWorkflow(
    intent: ParsedIntent,
    userQuery: string,
    options: WorkflowOptions = {}
): Promise<GeneratedWorkflow | null> {
    if (intent.complexity !== 'multi-step') return null;

    const template = findMatchingTemplate(userQuery, intent.workflowHints, intent);
    if (!template) return null;

    const tools = options.tools ?? await getTools();
    return buildWorkflow(template, intent, userQuery, tools, options);
}

/** Şablon + araç listesi -> workflow. Saf fonksiyon (ağ yok). */
export function buildWorkflow(
    template: WorkflowTemplate,
    intent: ParsedIntent,
    userQuery: string,
    tools: Tool[],
    { pricingFilter, tasksOf = productTasks }: WorkflowOptions = {}
): GeneratedWorkflow | null {
    const steps: WorkflowStepRecommendation[] = [];
    for (const step of template.steps.slice(0, MAX_WORKFLOW_STEPS)) {
        const [primary, alternative] = candidatesForStep(step, tools, intent, pricingFilter, tasksOf);
        if (!primary) return null;
        steps.push({
            order: step.order,
            name: step.name,
            description: step.description,
            category: step.category,
            taskId: step.tasks[0],
            primary: { tool: primary },
            alternative: alternative ? { tool: alternative } : null,
            tips: step.tips ?? [],
        });
    }

    const merged = mergeSameTool(steps).map((s, i) => ({ ...s, order: i + 1 }));
    if (merged.length < 2) return null;

    return {
        templateId: template.id,
        templateName: template.name,
        userQuery,
        steps: merged,
        totalSteps: merged.length,
        categories: [...new Set(merged.map(s => s.category))] as Category[],
    };
}

/**
 * Adımın görevlerini yapabilen aktif katalog ürünleri, sıralı ve tekrarsız.
 * İlk görevin adayları önce gelir. Kullanıcı sorguda "ücretsiz" dediyse
 * ücretsiz, sonra ücretsiz katmanı olanlar öne alınır (eleme değil).
 */
function candidatesForStep(
    step: WorkflowStepTemplate,
    tools: Tool[],
    intent: ParsedIntent,
    pricingFilter: PricingFilter | undefined,
    tasksOf: (productId: string) => string[]
): Tool[] {
    const seen = new Set<string>();
    const out: Tool[] = [];
    for (const taskId of step.tasks) {
        const pool = tools.filter(t =>
            t.productId &&
            !t.deprecated &&
            !seen.has(t.productId) &&
            tasksOf(t.productId).includes(taskId) &&
            matchesPricingFilter(t.pricing, pricingFilter)
        );
        for (const tool of rankTools(pool)) {
            seen.add(tool.productId!);
            out.push(tool);
        }
    }

    if (intent.constraints?.pricing !== 'free') return out;
    const tier = (t: Tool) => getPricingModel(t.pricing) === 'free' ? 0 : hasFreeTier(t.pricing) ? 1 : 2;
    return out
        .map((tool, i) => ({ tool, i }))
        .sort((a, b) => tier(a.tool) - tier(b.tool) || a.i - b.i)
        .map(x => x.tool);
}

/** Ardışık adımların ana aracı aynıysa tek adımda birleşir. */
function mergeSameTool(steps: WorkflowStepRecommendation[]): WorkflowStepRecommendation[] {
    const out: WorkflowStepRecommendation[] = [];
    for (const step of steps) {
        const prev = out[out.length - 1];
        if (prev && prev.primary.tool.productId === step.primary.tool.productId) {
            out[out.length - 1] = {
                ...prev,
                name: `${prev.name} + ${step.name}`,
                description: `${prev.description}; ${step.description}`,
                alternative: prev.alternative ?? step.alternative,
                tips: [...(prev.tips ?? []), ...(step.tips ?? [])],
            };
        } else {
            out.push(step);
        }
    }
    return out;
}

function toolForApi(tool: Tool, locale?: Locale) {
    return {
        toolName: tool.name,
        description: getLocalized(tool, 'description', locale),
        url: tool.url,
        pricing: tool.pricing,
        productId: tool.productId,
        currentModel: tool.currentModel ?? null,
    };
}

/**
 * Format workflow for API response
 */
export function formatWorkflowForApi(workflow: GeneratedWorkflow, locale?: Locale) {
    return {
        name: workflow.templateName,
        totalSteps: workflow.totalSteps,
        categories: workflow.categories,
        steps: workflow.steps.map(step => ({
            order: step.order,
            name: step.name,
            description: step.description,
            category: step.category,
            taskId: step.taskId,
            primary: toolForApi(step.primary.tool, locale),
            alternative: step.alternative ? toolForApi(step.alternative.tool, locale) : null,
            tips: step.tips,
        })),
    };
}

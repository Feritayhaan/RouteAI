// RouteAI Workflow Cache
// Caches generated workflows in Upstash KV to avoid re-computation

import { kv } from '../kv';
import { GeneratedWorkflow } from './workflowTypes';

const WORKFLOW_CACHE_TTL = 3600; // 1 saat
const WORKFLOW_CACHE_PREFIX = 'wf:';

/**
 * Retrieve a cached workflow result
 * @param templateId - Workflow template ID (e.g., 'podcast-creation')
 * @param category - Primary category of the intent
 */
export async function getCachedWorkflow(
    templateId: string,
    category: string,
    constraintsKey: string = 'default'
): Promise<GeneratedWorkflow | null> {
    try {
        const key = `${WORKFLOW_CACHE_PREFIX}${templateId}:${category}:${constraintsKey}`;
        const cached = await kv.get<GeneratedWorkflow>(key);

        if (cached) {
            console.log('[Workflow Cache] HIT:', key);
        }

        return cached;
    } catch {
        return null;
    }
}

/**
 * Store a generated workflow in cache
 * @param templateId - Workflow template ID
 * @param category - Primary category of the intent
 * @param workflow - The generated workflow to cache
 */
export async function setCachedWorkflow(
    templateId: string,
    category: string,
    workflow: GeneratedWorkflow,
    constraintsKey: string = 'default'
): Promise<void> {
    try {
        const key = `${WORKFLOW_CACHE_PREFIX}${templateId}:${category}:${constraintsKey}`;
        await kv.set(key, workflow, { ex: WORKFLOW_CACHE_TTL });
        console.log('[Workflow Cache] SET:', key);
    } catch {
        // Silently fail — cache write is non-critical
    }
}

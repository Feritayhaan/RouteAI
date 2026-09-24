// RouteAI Workflow Cache
// Caches generated workflows in Upstash KV to avoid re-computation

import { kv } from '../kv';
import { GeneratedWorkflow } from './workflowTypes';

const WORKFLOW_CACHE_TTL = 3600; // 1 saat
const WORKFLOW_CACHE_PREFIX = 'wf:';

/**
 * Anahtarın log'a yazılabilir hali. AI ile üretilen workflow'ların kimliği
 * kullanıcı sorgusundan türüyor ('ai:<sorgu-slug>'); o kısım loglanmaz,
 * yerine uzunluğu yazılır. Şablon kimliği, kategori ve kısıtlar görünür kalır.
 */
function keyForLog(templateId: string, category: string, constraintsKey: string): string {
    const id = templateId.startsWith('ai:') ? `ai:<${templateId.length - 3} karakter>` : templateId;
    return `${WORKFLOW_CACHE_PREFIX}${id}:${category}:${constraintsKey}`;
}

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
            console.log('[Workflow Cache] HIT:', keyForLog(templateId, category, constraintsKey));
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
        console.log('[Workflow Cache] SET:', keyForLog(templateId, category, constraintsKey));
    } catch {
        // Silently fail — cache write is non-critical
    }
}

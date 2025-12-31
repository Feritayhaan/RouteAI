// Tool matching and filtering utilities

import { getTools, Tool } from '../toolsService';
import { Category } from '../keywords';

/**
 * Filter tools by category
 */
export async function filterByCategory(category: Category): Promise<Tool[]> {
    const tools = await getTools();
    return tools.filter(tool => tool.category === category);
}

/**
 * Find best tool for query based on bestFor matching and strength
 */
export async function findBestTool(query: string, category: Category | null = null): Promise<Tool | null> {
    const tools = category ? await filterByCategory(category) : await getTools();
    const lowerQuery = query.toLowerCase();

    // Score each tool
    const scoredTools = tools.map(tool => {
        let score = tool.strength; // Base score from strength

        // Bonus points for bestFor matching
        const bestForMatches = tool.bestFor.filter(keyword =>
            lowerQuery.includes(keyword.toLowerCase())
        );
        score += bestForMatches.length * 0.5;

        return { ...tool, matchScore: score };
    });

    // Sort by match score
    scoredTools.sort((a, b) => b.matchScore - a.matchScore);

    return scoredTools[0] || null;
}

/**
 * Get top N alternatives (excluding primary tool)
 */
export async function getAlternatives(primaryTool: Tool, category: Category | null, limit: number = 2): Promise<Tool[]> {
    const tools = category ? await filterByCategory(category) : await getTools();

    return tools
        .filter(tool => tool.name !== primaryTool.name)
        .sort((a, b) => b.strength - a.strength)
        .slice(0, limit);
}

/**
 * Get tool by name
 */
export async function getToolByName(name: string): Promise<Tool | undefined> {
    const tools = await getTools();
    return tools.find(tool => tool.name === name);
}

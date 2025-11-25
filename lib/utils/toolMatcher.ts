// Tool matching and filtering utilities

import { getAllTools, Tool } from '../tools';
import { Category } from '../keywords';

/**
 * Filter tools by category
 */
export function filterByCategory(category: Category): Tool[] {
    return getAllTools().filter(tool => tool.category === category);
}

/**
 * Find best tool for query based on bestFor matching and strength
 */
export function findBestTool(query: string, category: Category | null = null): Tool | null {
    const tools = category ? filterByCategory(category) : getAllTools();
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
export function getAlternatives(primaryTool: Tool, category: Category | null, limit: number = 2): Tool[] {
    const tools = category ? filterByCategory(category) : getAllTools();

    return tools
        .filter(tool => tool.name !== primaryTool.name)
        .sort((a, b) => b.strength - a.strength)
        .slice(0, limit);
}

/**
 * Get tool by name
 */
export function getToolByName(name: string): Tool | undefined {
    return getAllTools().find(tool => tool.name === name);
}

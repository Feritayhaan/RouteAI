import assert from 'node:assert';
import { describe, it } from 'node:test';
import { ParsedIntent } from '../intent/types';
import { Tool, getRankedToolsByIntent, scoreTool } from '../toolsService.ts';
import * as toolsService from '../toolsService.ts';

const baseIntent: ParsedIntent = {
  primaryCategory: 'gorsel',
  confidence: 0.9,
  userGoal: 'logo design',
  constraints: { pricing: 'free', speed: 'fast', expertise: 'beginner', language: 'tr' },
  keywords: ['logo', 'design', 'branding'],
  reasoning: 'user wants a free and quick logo tool',
};

const sampleTools: Tool[] = [
  {
    name: 'Free Logo Pro',
    category: 'gorsel',
    description: 'Fast logo generator',
    url: 'https://example.com/free-logo',
    pricing: { free: true, freemium: false, paidOnly: false, currency: 'USD' },
    bestFor: ['logo design', 'branding'],
    strength: 8.2,
    features: ['fast generation'],
  },
  {
    name: 'Paid Visual Suite',
    category: 'gorsel',
    description: 'Premium design tool',
    url: 'https://example.com/paid',
    pricing: { free: false, freemium: false, paidOnly: true, currency: 'USD' },
    bestFor: ['3d rendering'],
    strength: 9.5,
    features: ['high quality'],
  },
  {
    name: 'Freemium Graphics',
    category: 'gorsel',
    description: 'Good for brands',
    url: 'https://example.com/freemium',
    pricing: { free: false, freemium: true, paidOnly: false, currency: 'USD' },
    bestFor: ['branding', 'illustration'],
    strength: 8.9,
    features: ['fast preview'],
  },
];

describe('scoreTool', () => {
  it('rewards similarity and pricing alignment', () => {
    const closeMatch = scoreTool(sampleTools[0], baseIntent, { pricingFilter: 'free' });
    const distantPaid = scoreTool(sampleTools[1], baseIntent, { pricingFilter: 'free' });

    assert.ok(closeMatch > distantPaid, 'tool matching keywords and free pricing should score higher');
  });
});

describe('getRankedToolsByIntent', () => {
  it('filters by pricing preferences and sorts using the new score', async () => {
    const ranked = await getRankedToolsByIntent(baseIntent, { pricingFilter: 'free', tools: sampleTools });

    assert.strictEqual(ranked[0].name, 'Free Logo Pro');
    assert.ok(ranked.every((tool) => tool.pricing.free || tool.pricing.freemium));
  });
});

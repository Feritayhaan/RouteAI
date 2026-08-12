import assert from 'node:assert';
import { describe, it } from 'node:test';
import { ParsedIntent } from '../intent/types';
import { Tool, getRankedToolsByIntent, getLocalized, resolveLocale, scoreTool } from '../toolsService';
import { makePricing } from '../pricing';
import * as toolsService from '../toolsService';

const baseIntent: ParsedIntent = {
  primaryCategory: 'gorsel',
  confidence: 0.9,
  userGoal: 'logo design',
  constraints: { pricing: 'free', speed: 'fast', expertise: 'beginner', language: 'tr' },
  keywords: ['logo', 'design', 'branding'],
  reasoning: 'user wants a free and quick logo tool',
  complexity: 'simple',
};

const sampleTools: Tool[] = [
  {
    name: 'Free Logo Pro',
    category: 'gorsel',
    description: { tr: 'Hızlı logo üretici', en: 'Fast logo generator' },
    url: 'https://example.com/free-logo',
    pricing: makePricing('free'),
    bestFor: { en: ['logo design', 'branding'], tr: [] },
    strength: 8.2,
    features: ['fast generation'],
  },
  {
    name: 'Paid Visual Suite',
    category: 'gorsel',
    description: { tr: 'Premium tasarım aracı', en: 'Premium design tool' },
    url: 'https://example.com/paid',
    pricing: makePricing('paid', 30, '2025-11-28'),
    bestFor: { en: ['3d rendering'], tr: [] },
    strength: 9.5,
    features: ['high quality'],
  },
  {
    name: 'Freemium Graphics',
    category: 'gorsel',
    description: { tr: 'Markalar için ideal', en: 'Good for brands' },
    url: 'https://example.com/freemium',
    pricing: makePricing('freemium'),
    bestFor: { en: ['branding', 'illustration'], tr: [] },
    strength: 8.9,
    features: ['fast preview'],
  },
];

describe('getLocalized', () => {
  const tool = sampleTools[0];

  it('returns the requested locale when it is filled', () => {
    assert.strictEqual(getLocalized(tool, 'description', 'tr'), 'Hızlı logo üretici');
    assert.strictEqual(getLocalized(tool, 'description', 'en'), 'Fast logo generator');
  });

  it('falls back to en when the requested locale is empty', () => {
    // bestFor.tr migration sonrasi bos: tr istense de en donmeli, aksi halde
    // keyword skorlamasi sifirlanirdi.
    assert.deepStrictEqual(getLocalized(tool, 'bestFor', 'tr'), ['logo design', 'branding']);
  });

  it('returns empty when every locale is empty', () => {
    const blank = { ...tool, description: { tr: '', en: '' }, bestFor: { tr: [], en: [] } };
    assert.strictEqual(getLocalized(blank, 'description', 'tr'), '');
    assert.deepStrictEqual(getLocalized(blank, 'bestFor', 'tr'), []);
  });

  it('treats whitespace-only text as empty and falls back', () => {
    const padded = { ...tool, description: { tr: '   ', en: 'Fast logo generator' } };
    assert.strictEqual(getLocalized(padded, 'description', 'tr'), 'Fast logo generator');
  });

  it('tolerates the legacy flat shape still living in KV', () => {
    const legacy = {
      ...tool,
      description: 'Eski sema aciklamasi',
      bestFor: ['logo design'],
    } as unknown as Tool;

    assert.strictEqual(getLocalized(legacy, 'description', 'tr'), 'Eski sema aciklamasi');
    assert.deepStrictEqual(getLocalized(legacy, 'bestFor', 'tr'), ['logo design']);
  });

  it('defaults to the tr locale when none is passed', () => {
    assert.strictEqual(getLocalized(tool, 'description'), 'Hızlı logo üretici');
  });
});

describe('resolveLocale', () => {
  it('keeps supported locales and falls back to tr otherwise', () => {
    assert.strictEqual(resolveLocale('en'), 'en');
    assert.strictEqual(resolveLocale('tr'), 'tr');
    assert.strictEqual(resolveLocale('de'), 'tr');
    assert.strictEqual(resolveLocale(undefined), 'tr');
  });
});

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

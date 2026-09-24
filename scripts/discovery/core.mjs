// Aday ürün keşfi — saf mantık (ağ ve LLM dışarıdan verilir; test edilir).
// Kaynaklar: Hacker News "Show HN" (Algolia API) ve (token varsa) Product Hunt.
// Alan adları kaynakların API dokümanından; ilk gerçek koşuda
// data/discovery-report.md'den doğrulanmalı (bu ortamda erişilemedi).

export const HN_URL = 'https://hn.algolia.com/api/v1/search_by_date';
export const PH_URL = 'https://api.producthunt.com/v2/api/graphql';

export function normalizeName(s) {
  return String(s ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function domainOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

export function slugify(s) {
  return String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'candidate';
}

/** "Show HN: Name – açıklama" -> { name, tagline } */
export function parseShowHnTitle(title) {
  const rest = String(title ?? '').replace(/^Show HN:\s*/i, '').trim();
  const m = rest.match(/^(.+?)\s+[–—\-:|]\s+(.+)$/);
  return m ? { name: m[1].trim(), tagline: m[2].trim() } : { name: rest, tagline: rest };
}

export async function fetchHackerNews({ fetchJson, sinceSec }) {
  const url = `${HN_URL}?tags=show_hn&query=AI&hitsPerPage=100&numericFilters=${encodeURIComponent(`created_at_i>${sinceSec}`)}`;
  const body = await fetchJson(url);
  return (body?.hits ?? [])
    .filter((h) => h?.url && h?.title)
    .map((h) => {
      const { name, tagline } = parseShowHnTitle(h.title);
      return { name, tagline, url: h.url, source: 'hackernews', sourceUrl: `https://news.ycombinator.com/item?id=${h.objectID}` };
    });
}

export async function fetchProductHunt({ fetchJson, token, sinceIso }) {
  if (!token) return null;
  const query = `query($after: DateTime) { posts(order: NEWEST, postedAfter: $after, topic: "artificial-intelligence", first: 50) { edges { node { name tagline website url } } } }`;
  const body = await fetchJson(PH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query, variables: { after: sinceIso } }),
  });
  return (body?.data?.posts?.edges ?? [])
    .map((e) => e?.node)
    .filter((n) => n?.name && (n.website || n.url))
    .map((n) => ({ name: n.name, tagline: n.tagline ?? n.name, url: n.website || n.url, source: 'producthunt', sourceUrl: n.url || n.website }));
}

/** Katalogdaki ürünler ve mevcut adaylarla ad ya da alan adı eşleşenleri düşer; kendi içinde tekilleştirir. */
export function dedupe(items, { products, candidates }) {
  const names = new Set([...products, ...candidates].map((p) => normalizeName(p.name)));
  const domains = new Set([...products, ...candidates].map((p) => domainOf(p.url)).filter(Boolean));
  const out = [];
  for (const it of items) {
    const n = normalizeName(it.name);
    const d = domainOf(it.url);
    if (!n || !d || names.has(n) || domains.has(d)) continue;
    names.add(n);
    domains.add(d);
    out.push({ ...it, domain: d });
  }
  return out;
}

/** Kısa OpenAI sınıflandırması; llm yoksa görevler boş. */
export async function classify(item, { llm, taskIds }) {
  if (!llm) return { tasks: [], isWebProduct: null, description: { en: item.tagline, tr: item.tagline } };
  const { data } = await llm({
    name: 'candidate_classification',
    system: 'Classify a newly launched AI product for a catalog. Use only the given name, tagline and URL; if unsure, return an empty task list. Do not invent features or prices.',
    user: JSON.stringify({ name: item.name, tagline: item.tagline, url: item.url }),
    maxTokens: 300,
    temperature: 0,
    schema: {
      type: 'object',
      properties: {
        tasks: { type: 'array', items: { type: 'string', enum: taskIds } },
        isWebProduct: { type: 'boolean' },
        descriptionEn: { type: 'string' },
        descriptionTr: { type: 'string' },
      },
      required: ['tasks', 'isWebProduct', 'descriptionEn', 'descriptionTr'],
      additionalProperties: false,
    },
  });
  const tasks = (data.tasks ?? []).filter((t) => taskIds.includes(t)).slice(0, 5);
  return { tasks, isWebProduct: Boolean(data.isWebProduct), description: { en: data.descriptionEn || item.tagline, tr: data.descriptionTr || item.tagline } };
}

export function toCandidate(item, cls, today, usedIds) {
  let id = slugify(item.name);
  for (let i = 2; usedIds.has(id); i++) id = `${slugify(item.name).slice(0, 55)}-${i}`;
  usedIds.add(id);
  return {
    id, name: item.name, url: item.url, domain: item.domain, description: cls.description,
    tasks: cls.tasks, isWebProduct: cls.isWebProduct, pricingModel: 'unknown', status: 'candidate',
    source: item.source, sourceUrl: item.sourceUrl, discoveredAt: today,
  };
}

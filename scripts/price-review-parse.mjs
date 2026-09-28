// data/price-review.md ayrıştırıcı (scripts/apply-price-review.mjs ve testler).
// "### Ad (`productId`)" bölümleri; her bölümde "- anahtar: değer" satırları.
// Boş değer = doldurulmamış.

const KEYS = new Set(['model', 'startingPrice', 'checkedAt', 'pricingUrl']);

export function parsePriceReview(markdown) {
  const sections = [];
  let current = null;
  for (const line of markdown.split('\n')) {
    const heading = line.match(/^###\s+.*\(`([a-z0-9-]+)`\)\s*$/);
    if (heading) {
      current = { productId: heading[1], fields: {} };
      sections.push(current);
      continue;
    }
    if (!current) continue;
    const field = line.match(/^-\s*([A-Za-z]+)\s*:\s*(.*)$/);
    if (!field || !KEYS.has(field[1])) continue;
    const value = field[2].trim().replace(/^`|`$/g, '');
    if (value) current.fields[field[1]] = value;
  }
  return sections;
}

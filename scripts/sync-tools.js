const fs = require('node:fs/promises');
const path = require('node:path');

const DEFAULT_SOURCE = process.env.TOOLS_SOURCE ?? path.join(process.cwd(), 'data', 'tools.csv');
const OUTPUT_PATH = path.join(process.cwd(), 'data', 'tools.json');

function parseBoolean(value) {
  const normalized = value?.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

function parseNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseList(value) {
  if (!value) return [];
  return value
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function parseCsv(content) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const columns = parseCsvLine(line);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = columns[index] ?? '';
    });

    return row;
  });
}

async function loadSource(source) {
  if (source.startsWith('http')) {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Remote source returned ${response.status}`);
    }
    return await response.text();
  }

  return fs.readFile(source, 'utf-8');
}

function mapRowToTool(row) {
  return {
    name: row.name || row.tool || 'Unnamed Tool',
    category: row.category ?? 'metin',
    description: row.description || row.summary || 'Tanimsiz arac',
    url: row.url || row.link || '',
    pricing: {
      free: parseBoolean(row.free),
      freemium: parseBoolean(row.freemium),
      paidOnly: parseBoolean(row.paidOnly),
      startingPrice: parseNumber(row.startingPrice),
      currency: row.currency || 'USD',
    },
    bestFor: parseList(row.bestFor || row.useCases || row.keywords),
    strength: parseNumber(row.strength || row.score) ?? 8,
    features: parseList(row.features || row.capabilities),
    lastUpdated: row.lastUpdated || row.freshness,
  };
}

async function syncTools() {
  const source = process.argv[2] ?? DEFAULT_SOURCE;
  console.log(`[sync] Using source: ${source}`);

  try {
    const content = await loadSource(source);
    const rows = parseCsv(content);
    const tools = rows.map(mapRowToTool);

    await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
    await fs.writeFile(OUTPUT_PATH, JSON.stringify(tools, null, 2));

    console.log(`[sync] Wrote ${tools.length} tools to ${OUTPUT_PATH}`);
  } catch (error) {
    console.error('[sync] Failed to sync tools:', error);
    process.exitCode = 1;
  }
}

syncTools();

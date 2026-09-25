// Rehber frontmatter'ı için küçük bir YAML ALT KÜMESİ ayrıştırıcısı (paket yok).
//
// Desteklenen:
//  - blok eşlemeler (`anahtar: değer`), blok diziler (`- değer`, `- anahtar: değer`)
//  - skalerler: düz metin, "çift" ve 'tek' tırnaklı metin, tam sayı, ondalık,
//    true/false, null/~, satır içi dizi `[a, "b", 3]`
//  - `#` ile başlayan yorum satırları; düz değerlerde ` #` sonrası yorum
// Desteklenmeyen (açık hata verir): satır içi eşleme `{a: b}`, çok satırlı
// metin (`|`, `>`), çapa/takma ad, sekme ile girinti.
// Dizide `: ` içeren düz metin anahtar-değer sanılır: böyle metni tırnakla.

export class YamlError extends Error {
  constructor(message: string, line: number) {
    super(`YAML satır ${line}: ${message}`);
  }
}

interface Line {
  no: number;
  indent: number;
  content: string;
}

const KEY_RE = /^([A-Za-z_][\w-]*)\s*:(?:\s+(.*))?$/;

function stripComment(s: string): string {
  const i = s.search(/\s#/);
  return i === -1 ? s : s.slice(0, i).trimEnd();
}

function splitFlow(inner: string, no: number): string[] {
  const out: string[] = [];
  let cur = '';
  let quote: string | null = null;
  for (const ch of inner) {
    if (quote) {
      cur += ch;
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      cur += ch;
    } else if (ch === ',') {
      out.push(cur.trim());
      cur = '';
    } else if (ch === '[' || ch === '{') {
      throw new YamlError('iç içe satır içi yapı desteklenmiyor', no);
    } else cur += ch;
  }
  if (quote) throw new YamlError('kapanmamış tırnak', no);
  if (cur.trim() !== '') out.push(cur.trim());
  return out;
}

export function parseScalar(raw: string, no = 0): unknown {
  const s = raw.trim();
  if (s.startsWith('"')) {
    if (!s.endsWith('"') || s.length < 2) throw new YamlError('kapanmamış çift tırnak', no);
    try {
      return JSON.parse(s);
    } catch {
      throw new YamlError(`geçersiz çift tırnaklı metin: ${s}`, no);
    }
  }
  if (s.startsWith("'")) {
    if (!s.endsWith("'") || s.length < 2) throw new YamlError('kapanmamış tek tırnak', no);
    return s.slice(1, -1).replace(/''/g, "'");
  }
  if (s.startsWith('[')) {
    if (!s.endsWith(']')) throw new YamlError('kapanmamış satır içi dizi', no);
    return splitFlow(s.slice(1, -1), no).map((x) => parseScalar(x, no));
  }
  if (s.startsWith('{')) throw new YamlError('satır içi eşleme desteklenmiyor; blok eşleme kullan', no);
  if (s.startsWith('|') || s.startsWith('>')) throw new YamlError('çok satırlı metin desteklenmiyor', no);
  if (s.startsWith('&') || s.startsWith('*')) throw new YamlError('çapa/takma ad desteklenmiyor', no);
  const plain = stripComment(s);
  if (plain === '' || plain === 'null' || plain === '~') return plain === '' ? '' : null;
  if (plain === 'true') return true;
  if (plain === 'false') return false;
  if (/^-?\d+$/.test(plain)) return Number(plain);
  if (/^-?\d+\.\d+$/.test(plain)) return Number(plain);
  return plain;
}

export function parseYamlSubset(text: string): Record<string, unknown> {
  const lines: Line[] = [];
  text.split('\n').forEach((raw, idx) => {
    if (/^\s*\t/.test(raw)) throw new YamlError('sekme ile girinti desteklenmiyor', idx + 1);
    const content = raw.trim();
    if (!content || content.startsWith('#')) return;
    lines.push({ no: idx + 1, indent: raw.length - raw.trimStart().length, content });
  });
  let i = 0;

  const isSeqItem = (l: Line) => l.content === '-' || l.content.startsWith('- ');

  function parseBlock(indent: number): unknown {
    return isSeqItem(lines[i]) ? parseSeq(indent) : parseMap(indent);
  }

  function parseMap(indent: number): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    while (i < lines.length && lines[i].indent === indent && !isSeqItem(lines[i])) {
      const line = lines[i];
      const m = line.content.match(KEY_RE);
      if (!m) throw new YamlError(`"anahtar: değer" bekleniyordu: ${line.content}`, line.no);
      const [, key, rest] = m;
      if (key in obj) throw new YamlError(`tekrar eden anahtar "${key}"`, line.no);
      i++;
      if (rest === undefined || rest === '') {
        const next = lines[i];
        if (next && next.indent > indent) obj[key] = parseBlock(next.indent);
        else if (next && next.indent === indent && isSeqItem(next)) obj[key] = parseSeq(indent);
        else obj[key] = null;
      } else {
        obj[key] = parseScalar(rest, line.no);
      }
    }
    if (i < lines.length && lines[i].indent > indent) throw new YamlError('beklenmeyen girinti', lines[i].no);
    return obj;
  }

  function parseSeq(indent: number): unknown[] {
    const arr: unknown[] = [];
    while (i < lines.length && lines[i].indent === indent && isSeqItem(lines[i])) {
      const line = lines[i];
      const after = line.content.slice(1);
      const text = after.trim();
      if (text === '') {
        i++;
        if (!lines[i] || lines[i].indent <= indent) throw new YamlError('boş dizi elemanı', line.no);
        arr.push(parseBlock(lines[i].indent));
        continue;
      }
      if (KEY_RE.test(text) && !text.startsWith('"') && !text.startsWith("'")) {
        // "- anahtar: değer": eşleme elemanı; sonraki anahtarlar aynı sütunda
        const col = indent + 1 + (after.length - after.trimStart().length);
        lines[i] = { no: line.no, indent: col, content: text };
        arr.push(parseMap(col));
      } else {
        arr.push(parseScalar(text, line.no));
        i++;
      }
    }
    return arr;
  }

  if (lines.length === 0) return {};
  if (lines[0].indent !== 0) throw new YamlError('ilk satır girintisiz olmalı', lines[0].no);
  const root = parseMap(0);
  if (i < lines.length) throw new YamlError('ayrıştırılamayan satır', lines[i].no);
  return root;
}

/** "---\nfrontmatter\n---\ngövde" */
export function splitFrontmatter(md: string): { frontmatter: string; body: string } {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error('frontmatter bulunamadı (dosya "---" ile başlamalı)');
  return { frontmatter: m[1], body: m[2] };
}

/** "## Başlık" bölümleri -> { başlık: içerik } */
export function splitSections(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  let current: string | null = null;
  for (const line of body.split('\n')) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) {
      current = h[1];
      out[current] = '';
    } else if (current) {
      out[current] += `${line}\n`;
    }
  }
  for (const k of Object.keys(out)) out[k] = out[k].trim();
  return out;
}

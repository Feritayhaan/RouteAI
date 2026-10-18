// Katalog denetimi: sıralama neye dayanıyor, hangi görevler aynı skoru paylaşıyor,
// alt kategorilerle sıra nasıl değişirdi. SALT OKUR: hiçbir veriyi ya da sıralamayı değiştirmez.
//
//   npm run audit:catalog                 # raporu ekrana basar
//   npm run audit:catalog -- --write      # ayrıca data/audit-report.md dosyasına yazar
//   npm run audit:catalog -- --today=2026-10-16   # tarihi sabitle (tazelik hesabı için)
//
// 5. bölüm (alt kategori) için data/lmarena-categories.json gerekir:
//   npm run sync:models -- --categories   (gerçek ağ erişimi olan makinede)
// Dosya yoksa bölüm "veri yok" der; geri kalanı çalışır.
// Çıkış kodu: 0 başarılı, 1 hata (dosya okunamadı / bozuk).

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCatalog } from '../lib/catalog/index.ts';
import { defaultSearchContext } from '../lib/catalog/search.ts';
import { auditCoverage, categoryWhatIf, formatAuditReport } from './audit/core.mjs';
import { CATEGORY_PROPOSALS } from './audit/proposals.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const write = process.argv.includes('--write');
const todayArg = process.argv.find((a) => a.startsWith('--today='))?.slice('--today='.length);
const today = todayArg ?? new Date().toISOString().slice(0, 10);

if (!/^\d{4}-\d{2}-\d{2}$/.test(today) || Number.isNaN(Date.parse(today))) {
  console.log('[audit-catalog] --today=YYYY-MM-DD biçiminde olmalı.');
  process.exit(1);
}

try {
  const catalog = loadCatalog();
  const ctx = defaultSearchContext(Date.parse(today));

  let categoryFile = null;
  const categoryPath = path.join(ROOT, 'data/lmarena-categories.json');
  if (existsSync(categoryPath)) {
    categoryFile = JSON.parse(readFileSync(categoryPath, 'utf8'));
    if (typeof categoryFile?.fetchedAt !== 'string' || typeof categoryFile?.configs !== 'object' || categoryFile.configs === null) {
      throw new Error('data/lmarena-categories.json biçimi bozuk (fetchedAt ve configs gerekli).');
    }
  }

  const labels = new Map(catalog.tasks.map((t) => [t.id, t.label.tr]));
  const coverage = auditCoverage(ctx, { editorPicks: catalog.editorPicks });
  const whatIf = categoryWhatIf({ ctx, categoryFile, proposals: CATEGORY_PROPOSALS });
  const text = formatAuditReport({ coverage, whatIf, today, labelOf: (id) => labels.get(id) ?? id });

  if (write) {
    writeFileSync(path.join(ROOT, 'data/audit-report.md'), text);
    console.log(`[audit-catalog] data/audit-report.md yazıldı (${coverage.totals.pairs} çift, ${coverage.totals.tasks} görev).`);
  } else {
    process.stdout.write(text);
  }
} catch (error) {
  console.log(`[audit-catalog] hata: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}

/**
 * Script to clean tools-database.json:
 * 1. Remove duplicate/variant entries (keep the better one)
 * 2. Add unique "id" field (slug format)
 * 3. Fix outputTypes inconsistencies (gorsel/video tools with only "text" outputTypes)
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(__dirname, '..', 'lib', 'tools-database.json');

const tools = JSON.parse(readFileSync(DB_PATH, 'utf-8'));

console.log(`📊 Başlangıç: ${tools.length} araç`);

// ============================================================
// STEP 1: Duplicate gruplarını tanımla ve birleştir
// ============================================================

const DUPLICATE_GROUPS = [
  // Cursor duplicates - keep the earlier one (line ~479) with better data
  {
    keep: 'Cursor',
    remove: ['Cursor (AI Code Editor)'],
    mergeStrategy: 'keepFirst',
  },
  // Sora 2 duplicates - keep "Sora 2 (OpenAI)" as it has the best description
  {
    keep: 'Sora 2 (OpenAI)',
    remove: ['Sora 2', 'Sora 2 (Launch)'],
    mergeStrategy: 'keepFirst',
  },
  // FLUX variants - keep "Flux.1 Pro" (earlier, better data), remove FLUX.1 Pro and FLUX.2
  {
    keep: 'Flux.1 Pro',
    remove: ['FLUX.1 Pro'],
    mergeStrategy: 'keepFirst',
  },
  // FLUX.2 is a newer model, keep it separately but fix its outputTypes
  // NotebookLM duplicates - keep "NotebookLM Deep Research" as more specific
  {
    keep: 'NotebookLM Deep Research',
    remove: ['NotebookLM'],
    mergeStrategy: 'keepFirst',
  },
  // Gamma duplicates - keep "Gamma AI" which has better data
  {
    keep: 'Gamma AI',
    remove: ['Gamma (AI Presentations)'],
    mergeStrategy: 'keepFirst',
  },
];

const namesToRemove = new Set();
for (const group of DUPLICATE_GROUPS) {
  for (const name of group.remove) {
    namesToRemove.add(name);
  }
}

let cleaned = tools.filter(tool => !namesToRemove.has(tool.name));
console.log(`🧹 Duplicate temizliği: ${tools.length - cleaned.length} araç kaldırıldı`);
console.log(`   Kaldırılanlar: ${[...namesToRemove].join(', ')}`);

// ============================================================
// STEP 2: outputTypes tutarsızlıklarını düzelt
// ============================================================

const CATEGORY_OUTPUT_FIXES = {
  gorsel: ['image'],
  video: ['video'],
  ses: ['audio'],
  kod: ['code', 'text'],
};

let fixedCount = 0;
cleaned = cleaned.map(tool => {
  // Sadece outputTypes: ["text"] olan ve category'si gorsel/video/ses/kod olan kayıtları düzelt
  if (tool.outputTypes && 
      tool.outputTypes.length === 1 && 
      tool.outputTypes[0] === 'text') {
    
    const expectedOutputs = CATEGORY_OUTPUT_FIXES[tool.category];
    if (expectedOutputs && tool.category !== 'metin' && tool.category !== 'arastirma' && tool.category !== 'veri') {
      fixedCount++;
      return { ...tool, outputTypes: expectedOutputs };
    }
  }
  
  return tool;
});

console.log(`🔧 outputTypes düzeltildi: ${fixedCount} araç`);

// ============================================================
// STEP 3: Her araca benzersiz "id" alanı ekle (slug formatında)
// ============================================================

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[()]/g, '')  // parantez kaldır
    .replace(/[&]/g, 'and')
    .replace(/[^a-z0-9\s-]/g, '')  // özel karakterleri kaldır
    .replace(/\s+/g, '-')  // boşlukları tire yap
    .replace(/-+/g, '-')   // çoklu tireleri teke indir
    .replace(/^-|-$/g, ''); // baştaki/sondaki tireleri kaldır
}

const usedIds = new Set();
cleaned = cleaned.map(tool => {
  let baseId = slugify(tool.name);
  let id = baseId;
  let counter = 2;
  
  // Benzersizlik garantisi
  while (usedIds.has(id)) {
    id = `${baseId}-${counter}`;
    counter++;
  }
  usedIds.add(id);
  
  return { id, ...tool };
});

console.log(`🏷️  ID eklendi: ${cleaned.length} araç`);

// ============================================================
// STEP 4: Kaydet
// ============================================================

writeFileSync(DB_PATH, JSON.stringify(cleaned, null, 2) + '\n', 'utf-8');
console.log(`\n✅ Tamamlandı! Sonuç: ${cleaned.length} araç (${tools.length - cleaned.length} kaldırıldı)`);

// Rapor: Duplicate kontrolü
console.log('\n📋 Kalan benzersiz araç isimleri kontrolü:');
const nameCount = {};
for (const t of cleaned) {
  nameCount[t.name] = (nameCount[t.name] || 0) + 1;
}
const dupes = Object.entries(nameCount).filter(([, c]) => c > 1);
if (dupes.length > 0) {
  console.log('⚠️  Hâlâ duplikat bulundu:');
  dupes.forEach(([name, count]) => console.log(`   - "${name}" x${count}`));
} else {
  console.log('✅ Duplikat yok!');
}

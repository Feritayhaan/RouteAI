// Gece workflow'u (nightly-data) PR'ı açmadan önce çalıştırır:
//   npm run automerge:guard
// Çalışma kopyasındaki değişiklikleri HEAD ile karşılaştırır. Çıkış 0 = PR
// otomatik merge edilebilir; 1 = PR açık kalır (sebepler stdout'ta, PR'a yorum olur).

import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { autoMergeDecision } from './sync/automerge.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const git = (cmd) => execSync(`git ${cmd}`, { cwd: ROOT, encoding: 'utf8' });
const readJson = (rel) => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));

const changedFiles = git('status --porcelain')
  .split('\n')
  .filter(Boolean)
  .map((line) => line.slice(3).trim());

let oldModels = [];
try {
  oldModels = JSON.parse(git('show HEAD:data/models.json'));
} catch {
  oldModels = [];
}

const anomaliesPath = path.join(ROOT, 'data/signals-anomalies.md');
const decision = autoMergeDecision({
  changedFiles,
  oldModels,
  newModels: readJson('data/models.json'),
  products: readJson('data/products.json'),
  anomaliesMd: existsSync(anomaliesPath) ? readFileSync(anomaliesPath, 'utf8') : '',
});

if (decision.ok) {
  console.log('Otomatik merge: uygun (değişen dosyalar: ' + (changedFiles.join(', ') || 'yok') + ')');
  process.exit(0);
}
console.log('Otomatik merge edilmedi; elle inceleme gerekiyor:');
for (const r of decision.reasons) console.log(`- ${r}`);
process.exit(1);

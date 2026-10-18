// Tarayıcıdan kopyalanan fiyat sayfası metnini kaydeder (bot engeli / JS ile çizilen sayfalar,
// ve sayfanın yalnızca yıllık fiyatı gösterdiği durumlar için: Aylık'ı seçip kopyalarsın).
//
// Rehberli (önerilen): doğrulanmamış ürünlerin sayfalarını sırayla tarayıcıda açar.
//   npm run price:snap -- --guided
//   npm run price:snap -- --guided --only=ideogram-20,tableau
//
// Tek ürün:
//   1) Sayfayı kendi tarayıcında aç. Aylık/yıllık düğmesi varsa AYLIK'ı seç.
//   2) Ctrl+A, Ctrl+C (sayfanın tamamını kopyala)
//   3) npm run price:snap -- <ürün-id>            # panodaki metni kaydeder
//      npm run price:snap -- <ürün-id> --file=C:\yol\sayfa.txt   # panoya erişemezse, metni bir dosyaya yapıştırıp ver
//   4) npm run check:prices -- --only=<ürün-id> --dry-run
//
// Kayıt: data/page-snapshots/<ürün-id>.txt (ilk satırlarda alındığı gün ve kaynak adres).

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { MIN_PAGE_CHARS, pricingText } from './prices/core.mjs';
import { SNAPSHOT_DIR, SNAPSHOT_MAX_AGE_DAYS, writeSnapshot } from './prices/snapshots.mjs';
import { openInBrowser, readClipboard, runGuided } from './prices/guided.mjs';
import { isPriceVerified } from '../lib/pricing.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const today = new Date().toISOString().slice(0, 10);

const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const flags = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
    const [k, ...v] = a.slice(2).split('=');
    return [k, v.length ? v.join('=') : true];
  })
);

const products = JSON.parse(readFileSync(path.join(ROOT, 'data/products.json'), 'utf8'));

if (flags.guided) {
  const only = typeof flags.only === 'string' ? flags.only.split(',').map((s) => s.trim()).filter(Boolean) : null;
  for (const id of only ?? []) {
    if (!products.some((p) => p.id === id && p.status === 'active' && p.pricingUrl)) {
      console.error(`Aktif ve pricingUrl'si olan ürün yok: ${id}`);
      process.exit(2);
    }
  }
  // Varsayılan: fiyatı doğrulanmamış (tarihsiz ya da 60 günden eski) ve fiyat sayfası adresi olan aktif ürünler.
  const ids = only ?? products.filter((p) => p.status === 'active' && p.pricingUrl && !isPriceVerified(p.pricing)).map((p) => p.id);
  if (ids.length === 0) {
    console.log('Doğrulanmamış, fiyat sayfası olan ürün yok.');
    process.exit(0);
  }
  console.log(`Rehberli tur: ${ids.length} ürün. Her sayfa tarayıcında açılacak. Gizli pencerede açıp Aylık'ı seçmen önerilir.`);
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  // Satırlar kuyruğa alınır (yapıştırılan ya da boruyla gelen girdi kaybolmasın).
  // Girdi kapanırsa (Ctrl+C, Ctrl+Z, boru bitti) tur 'q' gibi sona erer.
  const queue = [];
  const waiters = [];
  let ended = false;
  rl.on('line', (line) => {
    const waiting = waiters.shift();
    if (waiting) waiting(line);
    else queue.push(line);
  });
  rl.on('close', () => {
    ended = true;
    while (waiters.length > 0) waiters.shift()('q');
  });
  const ask = (question) => {
    if (!ended) {
      rl.setPrompt(question);
      rl.prompt();
    }
    if (queue.length > 0) return Promise.resolve(queue.shift());
    if (ended) return Promise.resolve('q');
    return new Promise((resolve) => waiters.push(resolve));
  };
  const result = await runGuided({ products, ids, root: ROOT, today, readClipboard, openUrl: openInBrowser, ask, log: (m) => console.log(m) });
  rl.close();
  console.log(`\nKaydedilen: ${result.saved.length}, atlanan: ${result.skipped.length}${result.quit ? ' (tur yarıda bırakıldı)' : ''}.`);
  if (result.saved.length > 0) {
    console.log(`Sıradaki adım (kayıtlar ${SNAPSHOT_MAX_AGE_DAYS} gün geçerli):\n  npm run check:prices -- --dry-run`);
  }
  process.exit(result.error ? 1 : 0);
}

const id = positional[0];
if (!id) {
  console.error('Kullanım: npm run price:snap -- <ürün-id> [--file=metin.txt]\n         npm run price:snap -- --guided\nÜrün id\'leri data/price-report.md\'deki parantez içindeki adlardır (ör. ideogram-20).');
  process.exit(2);
}

const product = products.find((p) => p.id === id && p.status === 'active');
if (!product) {
  console.error(`Aktif ürün bulunamadı: ${id}`);
  process.exit(2);
}
if (!product.pricingUrl) {
  console.error(`${product.name} için pricingUrl yok. Önce data/products.json'a fiyat sayfasının adresini ekle (npm run check:url -- <adres> ile dene).`);
  process.exit(2);
}

let raw;
if (typeof flags.file === 'string') {
  try {
    raw = readFileSync(path.resolve(flags.file), 'utf8');
  } catch (error) {
    console.error(`Dosya okunamadı: ${error.message}`);
    process.exit(2);
  }
} else {
  raw = readClipboard();
  if (raw === null) {
    console.error('Panoya erişemedim. Metni Not Defteri\'ne yapıştırıp kaydet ve şunu çalıştır:\n  npm run price:snap -- ' + id + ' --file=C:\\yol\\sayfa.txt');
    process.exit(2);
  }
}

const text = raw.replace(/^\uFEFF/, '').trim();
if (text.length < MIN_PAGE_CHARS) {
  console.error(`Metin çok kısa (${text.length} karakter). Sayfayı açıp Ctrl+A, Ctrl+C yaptıktan sonra komutu çalıştır.`);
  process.exit(1);
}
const file = writeSnapshot({ root: ROOT, id, date: today, source: product.pricingUrl, text });
const { hasAmount } = pricingText(text);
console.log(`Kaydedildi: ${path.relative(ROOT, file)} (${text.length} karakter, alındı: ${today})`);
if (!hasAmount) {
  console.log('UYARI: metinde dolar/euro gibi bir tutar bulamadım. Doğru sayfayı mı kopyaladın? Fiyatlar görünür olduktan sonra tekrar dene.');
}
console.log(`Sıradaki adım: npm run check:prices -- --only=${id} --dry-run   (${SNAPSHOT_DIR} içindeki dosya ${SNAPSHOT_MAX_AGE_DAYS} gün geçerli)`);

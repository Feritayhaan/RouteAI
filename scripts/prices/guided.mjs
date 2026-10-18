// Rehberli sayfa alma (npm run price:snap -- --guided): sırayla her ürünün fiyat sayfasını
// kullanıcının kendi tarayıcısında açar; kullanıcı Aylık'ı seçip Ctrl+A, Ctrl+C yapar,
// betik panodaki metni data/page-snapshots/<id>.txt olarak kaydeder (snapshots.mjs).
//
// Pano, tarayıcı ve soru dışarıdan verilir; testte sahtesi kullanılır.

import { spawn, spawnSync } from 'node:child_process';
import { MIN_PAGE_CHARS, pricingText } from './core.mjs';
import { writeSnapshot } from './snapshots.mjs';

/** Panoyu okur; okuyamazsa null. Windows'ta Base64 ile alınır (Türkçe karakterler bozulmasın). */
export function readClipboard() {
  const run = (cmd, args) => {
    const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    return r.status === 0 ? r.stdout : null;
  };
  if (process.platform === 'win32') {
    const script = '$t = Get-Clipboard -Raw; if ($null -ne $t) { [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($t)) }';
    const out = run('powershell', ['-NoProfile', '-NonInteractive', '-Command', script]);
    return out ? Buffer.from(out.trim(), 'base64').toString('utf8') : null;
  }
  if (process.platform === 'darwin') return run('pbpaste', []);
  return run('xclip', ['-selection', 'clipboard', '-o']) ?? run('wl-paste', []) ?? run('xsel', ['--clipboard', '--output']);
}

/** Adresi kullanıcının varsayılan tarayıcısında açar (kabuk kullanmadan, adresteki & gibi karakterler bozulmasın). */
export function openInBrowser(url) {
  const [cmd, args] =
    process.platform === 'win32' ? ['rundll32', ['url.dll,FileProtocolHandler', url]] : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  try {
    const child = spawn(cmd, args, { stdio: 'ignore', detached: true });
    child.on('error', () => {});
    child.unref();
    return true;
  } catch {
    return false;
  }
}

/** Ürün adındaki anlamlı kelimeler ("Canva AI (Magic Studio)" -> canva, magic, studio). */
export function nameWords(name) {
  return (String(name).toLowerCase().match(/\p{L}{4,}/gu) ?? []).filter((w) => !['with', 'from', 'tool', 'tools'].includes(w));
}

/** Kopyalanan metin bu ürünün sayfasına benziyor mu? (ad kelimelerinden biri geçmeli) */
export function looksLikeProductPage(name, text) {
  const words = nameWords(name);
  const lower = String(text).toLowerCase();
  return words.length === 0 || words.some((w) => lower.includes(w));
}

/**
 * Rehberli tur. ids sırayla işlenir; aynı fiyat sayfasını paylaşan ürünler tek kez sorulur.
 * Dönüş: { saved: [{ id, chars, hasAmount }], skipped: [id], quit: boolean, error?: string }
 */
export async function runGuided({ products, ids, root, today, readClipboard: read, openUrl, ask, log }) {
  const saved = [];
  const skipped = [];
  const seenUrls = new Map();
  const list = [];
  for (const id of ids) {
    const p = products.find((x) => x.id === id && x.status === 'active' && x.pricingUrl);
    if (!p) continue;
    if (seenUrls.has(p.pricingUrl)) {
      seenUrls.get(p.pricingUrl).also.push(p.name);
      continue;
    }
    const entry = { p, also: [] };
    seenUrls.set(p.pricingUrl, entry);
    list.push(entry);
  }

  let lastText = null;
  for (const [i, { p, also }] of list.entries()) {
    log(`\n[${i + 1}/${list.length}] ${p.name} (${p.id})`);
    if (also.length > 0) log(`  Aynı sayfa ${also.join(', ')} için de kullanılır.`);
    log(`  Sayfa tarayıcıda açılıyor: ${p.pricingUrl}`);
    if (!openUrl(p.pricingUrl)) log('  Tarayıcı açılamadı; adresi kendin aç.');
    log("  Sayfa yüklenince Aylık'ı seç (düğme varsa), sayfaya tıkla, Ctrl+A, Ctrl+C yap.");

    for (;;) {
      const answer = (await ask('  Kopyaladıktan sonra Enter (atla: s, çık: q, yine de kaydet: e): ')).trim().toLowerCase();
      if (answer === 'q') return { saved, skipped, quit: true };
      if (answer === 's') {
        skipped.push(p.id);
        break;
      }
      const raw = read();
      if (raw === null) {
        log("  Panoya erişemedim. Tek tek şunu kullan: npm run price:snap -- <id> --file=metin.txt");
        return { saved, skipped, quit: true, error: 'pano' };
      }
      const text = raw.replace(/^﻿/, '').trim();
      if (text.length < MIN_PAGE_CHARS) {
        log(`  Pano boş ya da çok kısa (${text.length} karakter). Sayfada Ctrl+A, Ctrl+C yapıp tekrar Enter'a bas.`);
        continue;
      }
      if (answer !== 'e') {
        if (text === lastText) {
          log('  Pano bir öncekiyle aynı: bu sayfayı kopyalamayı unutmuş olabilirsin. Kopyalayıp tekrar Enter (ya da e).');
          continue;
        }
        if (!looksLikeProductPage(p.name, text)) {
          log(`  Metinde "${nameWords(p.name).join('" ya da "')}" geçmiyor; doğru sayfayı mı kopyaladın? Düzeltip Enter, doğruysa e.`);
          continue;
        }
      }
      const { hasAmount } = pricingText(text);
      writeSnapshot({ root, id: p.id, date: today, source: p.pricingUrl, text });
      lastText = text;
      saved.push({ id: p.id, chars: text.length, hasAmount });
      log(`  Kaydedildi (${text.length} karakter).${hasAmount ? '' : ' UYARI: metinde tutar bulamadım; fiyatlar görünür olduktan sonra tekrar dene.'}`);
      break;
    }
  }
  return { saved, skipped, quit: false };
}

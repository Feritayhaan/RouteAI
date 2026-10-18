// Elle alınan sayfa metni ("anlık görüntü"): bot engeli (HTTP 403) ya da JS ile
// çizilen fiyat sayfaları için. Sayfayı kendi tarayıcında açıp Ctrl+A, Ctrl+C ile
// kopyalar, `npm run price:snap -- <ürün-id>` ile kaydedersin. check-prices o
// ürünün sayfasını internetten çekmek yerine bu dosyayı okur; LLM çıkarımı ve
// kanıt doğrulaması aynen çalışır. Hiçbir engel aşılmaz: sayfayı sen görüntülemiş olursun.
//
// Dosya: data/page-snapshots/<ürün-id>.txt
//   alındı: 2026-10-14
//   kaynak: https://ideogram.ai/pricing
//   ---
//   <sayfa metni>
//
// Eski anlık görüntü kullanılmaz (eski fiyatı bugünün tarihiyle "doğrulamamak" için).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const SNAPSHOT_DIR = 'data/page-snapshots';
/** Anlık görüntü bundan eskiyse yok sayılır. */
export const SNAPSHOT_MAX_AGE_DAYS = 7;
/** Çok büyük yapıştırmaları keser (dosya şişmesin). */
export const SNAPSHOT_MAX_CHARS = 200_000;

const DAY_MS = 24 * 60 * 60 * 1000;

export function snapshotPath(root, id) {
  return path.join(root, SNAPSHOT_DIR, `${id}.txt`);
}

/** Dosya içeriğini { date, source, text } olarak ayırır; başlık yoksa date null. */
export function parseSnapshot(raw) {
  const clean = String(raw ?? '').replace(/^﻿/, '').replace(/\r\n/g, '\n');
  const sep = clean.indexOf('\n---\n');
  const head = sep === -1 ? '' : clean.slice(0, sep);
  const text = sep === -1 ? clean : clean.slice(sep + 5);
  const date = head.match(/^alındı:\s*(\d{4}-\d{2}-\d{2})\s*$/m)?.[1] ?? null;
  const source = head.match(/^kaynak:\s*(\S+)\s*$/m)?.[1] ?? null;
  return { date, source, text: text.trim() };
}

export function formatSnapshot({ date, source, text }) {
  return `alındı: ${date}\nkaynak: ${source ?? '-'}\n---\n${String(text).replace(/\r\n/g, '\n').trim().slice(0, SNAPSHOT_MAX_CHARS)}\n`;
}

/** Tarih (YYYY-MM-DD) bugünden kaç gün önce; geçersizse ya da gelecekteyse Infinity. */
export function snapshotAgeDays(date, today) {
  const t = date ? Date.parse(date) : NaN;
  const now = Date.parse(today);
  if (Number.isNaN(t) || Number.isNaN(now) || t > now) return Infinity;
  return Math.floor((now - t) / DAY_MS);
}

/**
 * Verilen ürün kimlikleri (aynı fiyat sayfasını paylaşanlar) için en yeni anlık görüntüyü bulur.
 * Dönüş: { id, date, text, ageDays, stale } ya da null (hiç dosya yok).
 * stale=true: dosya var ama tarihsiz/eski; çağıran bunu kullanmamalı, sadece ipucu vermeli.
 */
export function findSnapshot({ root, ids, today, maxAgeDays = SNAPSHOT_MAX_AGE_DAYS }) {
  let best = null;
  for (const id of ids) {
    const file = snapshotPath(root, id);
    if (!existsSync(file)) continue;
    const { date, text } = parseSnapshot(readFileSync(file, 'utf8'));
    const ageDays = snapshotAgeDays(date, today);
    const candidate = { id, date, text, ageDays, stale: !text || ageDays > maxAgeDays };
    if (!best || (best.stale && !candidate.stale) || (best.stale === candidate.stale && candidate.ageDays < best.ageDays)) best = candidate;
  }
  return best;
}

/** Anlık görüntüyü yazar; klasör yoksa oluşturur. Yazılan dosyanın yolunu döndürür. */
export function writeSnapshot({ root, id, date, source, text }) {
  const file = snapshotPath(root, id);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, formatSnapshot({ date, source, text }));
  return file;
}

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { normalizeTr } from '../text';
import { detectCategory } from '../keywords';

/** Iki metin normalize edildiginde ayni mi? Eslestirmenin gercek sorusu bu. */
function eslesir(a: string, b: string): boolean {
  return normalizeTr(a) === normalizeTr(b);
}

describe('normalizeTr', () => {
  it('diakritiksiz yazilan sorgu diakritikli veriyle eslesir', () => {
    // Turk kullanicilarin cogu diakritiksiz yazar; veri diakritikli duruyor.
    assert.ok(eslesir('dugun davetiyesi', 'düğün davetiyesi'));
    assert.ok(eslesir('cizgi roman', 'çizgi roman'));
    assert.ok(eslesir('gorsel tasarim', 'görsel tasarım'));
  });

  it('buyuk/kucuk harf farkini yok sayar', () => {
    assert.ok(eslesir('ÇİZGİ ROMAN', 'cizgi roman'));
    assert.ok(eslesir('ses klonlama', 'Ses Klonlama'));
  });

  it('Turkce ozel harfleri dogru kucultur', () => {
    // toLowerCase() bunlari yanlis yapar: 'I' -> 'i' (dogrusu 'ı'),
    // 'İ' -> birlesik noktali 'i'. Ikisi de 'i'ye sadelesmeli.
    assert.strictEqual(normalizeTr('İSTANBUL'), 'istanbul');
    assert.strictEqual(normalizeTr('ISITMA'), 'isitma');
    assert.strictEqual(normalizeTr('Iğdır'), 'igdir');
  });

  it('tum diakritikleri sadelestirir', () => {
    assert.strictEqual(normalizeTr('çğıöşü'), 'cgiosu');
    assert.strictEqual(normalizeTr('ÇĞIÖŞÜ'), 'cgiosu');
  });

  it('fazla bosluklari kirpar', () => {
    assert.strictEqual(normalizeTr('  ses   klonlama  '), 'ses klonlama');
  });

  it('bos girdiyi tolere eder', () => {
    assert.strictEqual(normalizeTr(''), '');
    assert.strictEqual(normalizeTr(undefined as unknown as string), '');
  });
});

describe('detectCategory diakritik duyarsizligi', () => {
  it('diakritikli ve diakritiksiz sorgu ayni kategoriyi verir', () => {
    assert.strictEqual(detectCategory('görsel tasarım'), detectCategory('gorsel tasarim'));
    assert.strictEqual(detectCategory('yazı yazma'), detectCategory('yazi yazma'));
  });

  it('diakritiksiz yazilan anahtar kelimeyi yakalar', () => {
    // Anahtar kelime listesinde "görsel" diakritikli duruyor; kullanici
    // "gorsel" yazdiginda eskiden hicbir kategori bulunamazdi.
    assert.strictEqual(detectCategory('gorsel uretmek istiyorum'), 'gorsel');
  });
});

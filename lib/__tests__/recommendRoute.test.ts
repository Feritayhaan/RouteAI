// P12 kabul: "Bayrak kapalıyken canlı davranış değişmez."
//
// app/api/recommend/route.ts "next/server" import ettiği için Next'in edge
// ortamı dışında (bu projenin node --test + lib/__tests__/ts-loader.mjs
// koşucusunda) DOĞRUDAN çalıştırılamaz: next paketi "./server" için ESM
// exports girdisi vermiyor, loader da (haklı olarak) Next'e özel modül
// çözümlemesi yapmıyor — bu proje route.ts'i hiçbir zaman doğrudan test
// etmedi (recommendV1/recommendV3 kendi testlerinde koşuyor, route.ts ince
// bir HTTP sargısı). Bu yüzden bayrak dalının "aynen kalır" garantisi
// kaynak yapısı üzerinden kilitlenir: v3 dalı erken return eder ve v1
// kodundan ÖNCE durur; v1 çağrısı bu dalın DIŞINDA, koşulsuz kalır — yani
// RECOMMENDER!=='v3' iken hiçbir satırı değiştirmeden aynı v1 akışına düşer.
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = readFileSync(path.join(ROOT, 'app/api/recommend/route.ts'), 'utf8');

describe('app/api/recommend/route.ts: RECOMMENDER=v3 bayrağı', () => {
  it('v3 dalı erken return eder (v1 koduna hiç düşmez)', () => {
    const flagIndex = source.indexOf("process.env.RECOMMENDER === 'v3'");
    assert.notStrictEqual(flagIndex, -1, 'bayrak kontrolü bulunamadı');
    const blockEnd = source.indexOf('\n    }', flagIndex);
    const block = source.slice(flagIndex, blockEnd);
    assert.match(block, /return new Response\(stream/, 'v3 dalı bir Response ile erken dönmeli');
  });

  it('v1 çağrısı (recommendV1) bayrak bloğunun DIŞINDA ve koşulsuz: satır sırası ve girinti bunu gösterir', () => {
    const flagIndex = source.indexOf("process.env.RECOMMENDER === 'v3'");
    const v1CallIndex = source.indexOf('const result = await recommendV1(prompt, pricingFilter);');
    assert.notStrictEqual(v1CallIndex, -1, 'recommendV1 çağrısı bulunamadı');
    assert.ok(v1CallIndex > flagIndex, 'recommendV1 çağrısı v3 bayrak kontrolünden SONRA durmalı (yoksa v3 hiç devreye girmez)');
    // v1 çağrısı fonksiyonun üst seviyesinde (try bloğu içinde, if'in içinde DEĞİL):
    // 4 boşluk girintili — if bloğunun içindeki satırlar 6+ boşluk.
    const line = source.slice(0, v1CallIndex).split('\n').at(-1) ?? '';
    assert.strictEqual(line, '    ', 'recommendV1 çağrısı if bloğunun dışında, try\'ın üst seviyesinde olmalı');
  });

  it('P12 öncesi v1 akışı (workflow/empty/error/stream chunk\'ları) hiç değişmedi: anahtar satırlar hâlâ aynen var', () => {
    for (const needle of [
      "if (result.kind === 'error') {",
      "if (result.kind === 'workflow') {",
      "if (result.kind === 'empty') {",
      "chunk: 'main'",
      "chunk: 'alternatives'",
      "chunk: 'meta'",
    ]) {
      assert.ok(source.includes(needle), `v1 akışından beklenen satır kayıp: ${needle}`);
    }
  });
});

// Bir fiyat sayfası adresi betik tarafından okunabiliyor mu? products.json'a pricingUrl
// eklemeden önce dene:
//
//   npm run check:url -- https://example.com/pricing
//
// Bildirir: HTTP durumu, kaç karakter metin çıktı, sayfada tutar (örn. $20) var mı ve
// fiyatın geçtiği ilk parça. OpenAI kullanmaz, ücretsizdir.

import { MIN_PAGE_CHARS, fetchPageText, pricingText } from './prices/core.mjs';

const url = process.argv.slice(2).find((a) => !a.startsWith('--'));
if (!url || !/^https?:\/\//i.test(url)) {
  console.error('Kullanım: npm run check:url -- https://site.com/pricing');
  process.exit(2);
}

let html;
try {
  html = await fetchPageText(url);
} catch (error) {
  console.log(`Sonuç: OKUNAMADI (${error.message})`);
  if (/HTTP (?:401|403|429)/.test(error.message)) {
    console.log('Bu site betikleri engelliyor. Sayfayı tarayıcında açıp kopyalayarak çözebilirsin: npm run price:snap -- <ürün-id>');
  } else {
    console.log('Adresi tarayıcıda açıp doğru olduğunu kontrol et (yazım, www, sondaki / farkı).');
  }
  process.exit(1);
}

const { text, hasAmount } = pricingText(html);
console.log(`Sonuç: sayfa indi (${html.length} karakter HTML, ${text.length} karakter fiyat metni)`);
if (text.length < MIN_PAGE_CHARS || !hasAmount) {
  console.log('Tutar bulunamadı: sayfa fiyatları JavaScript ile çiziyor ya da giriş istiyor olabilir. Başka bir adres dene (yardım merkezi, dokümantasyon) ya da npm run price:snap -- <ürün-id> kullan.');
  process.exit(1);
}
const first = text.search(/(?:US\$|[$€£¥])\s?\d|\d\s?(?:USD|EUR|GBP)/);
console.log(`Tutar var. İlk fiyat parçası: ...${text.slice(Math.max(0, first - 80), first + 160).replace(/\s+/g, ' ')}...`);
console.log('Bu adres kullanılabilir: products.json içinde ürünün pricingUrl alanına yaz.');

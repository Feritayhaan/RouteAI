# Lansman kontrol listesi

Ferit'in lansmandan önce işaretleyeceği maddeler. Kodda hazır olan kısım yanında yazıyor; kutuyu doğrulayan kişi işaretler. Durum sütunundaki bilgiler 2026-09-24 tarihli dosyalardan.

## 1. Ortam ve gizli anahtarlar

- [ ] Vercel (Production + Preview) ortam değişkenleri, `.env.local.example` ile birebir:
  - [ ] `OPENAI_API_KEY`
  - [ ] `OPENAI_MODEL` (boşsa `gpt-4o-mini`)
  - [ ] `OPENAI_PROMPT_MODEL` (boşsa `OPENAI_MODEL`)
  - [ ] `OPENAI_MONTHLY_TOKEN_BUDGET` (boş = sınırsız; lansmanda boş bırakma)
  - [ ] `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_REST_API_READ_ONLY_TOKEN` (Vercel KV entegrasyonu `KV_URL` ve `REDIS_URL`'i de ekler)
  - [ ] `ADMIN_SECRET` (uzun, rastgele)
  - [ ] `NEXT_PUBLIC_BASE_URL`
  - [ ] `NEXT_PUBLIC_CONTACT_EMAIL` (gizlilik sayfasındaki iletişim satırı; boşsa satır çıkmaz)
  - [ ] `VECTOR_SEARCH_ENABLED` + `UPSTASH_VECTOR_*` sadece v1 vektör araması istenirse
- [ ] GitHub repo secret'ları:
  - [ ] `AA_API_KEY` (nightly-data)
  - [ ] `KV_REST_API_URL` + `KV_REST_API_READ_ONLY_TOKEN` (nightly-data, sinyal toplama; yazma token'ı VERME)
  - [ ] `OPENAI_API_KEY` (discover-tools sınıflandırma, check-prices)
  - [ ] `PRODUCT_HUNT_TOKEN` (isteğe bağlı)
- [ ] Settings → Actions → General → "Allow GitHub Actions to create and approve pull requests" açık (yoksa üç workflow da PR açamaz, 403).
- [ ] OpenAI hesabında aylık harcama limiti (usage limit) ayarlı; `OPENAI_MONTHLY_TOKEN_BUDGET` bununla uyumlu.

## 2. Katalog verisi

Bugün: 40 görev, 56 aktif ürün, **0 model, 0 uzman değerlendirmesi, 0 sinyal**. Bu haliyle RouteAI Skoru hiçbir ürünü önermez (kanıt kuralı).

- [ ] `nightly-data` elle çalıştırıldı (workflow_dispatch) ve ilk senkron PR'ı gözden geçirilip merge edildi. `data/sync-report.md`'deki eşleşmeyen modeller kontrol edildi. Not: AA ve LMArena alan eşlemesi bu ortamda gerçek API'ye karşı denenemedi (ağ kapalıydı); ilk koşunun raporu dikkatle okunmalı.
- [ ] `node scripts/link-products.mjs` → `data/link-review.md`'de doğru eşlemeler `[x]` ile işaretlendi → `node scripts/link-products.mjs --apply`; `data/products.json`'da `models` alanları dolu.
- [ ] Uzman brief'leri (`data/briefs.json`, 30 taslak) ile en az her görevin ilk ürünleri için `data/reviews.json` dolduruldu.
- [ ] `npm run validate:catalog` temiz (hata 0). Uyarılar okundu.
- [ ] Aktif ürünlerin `pricingUrl` alanı: 46/56 dolu (2026-09-25, web aramasıyla resmi alan adından). Kalan 10 ürün ve katalog sorunları (ör. OpenAI Atlas kapanmış olabilir, Copilot Pro → Microsoft 365 Premium): `docs/catalog-review-2026-09-25.md`. İlk `check-prices` raporu okundu.
- [ ] Artificial Analysis ve LMArena kullanım koşulları kaynakların kendi sayfalarından okundu; atıf (kaynak adı) kartlarda ve gizlilik sayfasında görünüyor.

## 3. Eval

`evals/golden.jsonl` hâlâ TASLAK (`evals/REVIEW.md`). Önce golden gözden geçirilmeli, sonra OpenAI anahtarı ve dolu katalogla tekrar koşulmalı.

- [ ] Golden set gözden geçirildi (`evals/REVIEW.md`).
- [ ] Tablo anahtarla ve dolu katalogla yeniden dolduruldu:

| Recommender | taskMatch | top3Hit | clarifyRate | Koşu |
| --- | --- | --- | --- | --- |
| v1 baseline | n/a (v1 görev döndürmez) | 13/15 = %86.7 (25/40 skipped, anahtarsız) | 0/15 | 2026-09-24 |
| v2-oracle | n/a (görev golden'dan) | 0/39 = %0 (katalog boş) | 0/40 | 2026-09-24 |
| v2 | koşulmadı | koşulmadı | koşulmadı | — |
| Hedef | ≥ %90 | ≥ %85 | %15–%35 | — |

  - [ ] `npm run eval -- --recommender=v1` (anahtarla)
  - [ ] `npm run eval -- --recommender=v2-oracle` (senkron + review sonrası)
  - [ ] `npm run eval -- --recommender=v2`
  - [ ] `npm run eval:prompts` (bugün 20/20 skipped)

## 4. Prompt rehberleri

- [ ] 10 rehberden gözden geçirilmiş (`reviewedBy` dolu) olan: **0 / 10**. Hepsi resmi dokümana erişilemediği için KAYNAK GEREKLİ; `docs/prompt-guides-review.md`'deki listeyle her rehberde kaynak eklenip gövde yazılmalı. Her rehber için resmi doküman linkleri aynı dosyada "Resmi kaynak adayları" bölümünde (2026-09-25).
- [ ] En az 3 rehberde uçtan uca elle test: soru kartı → iki varyant → buton ile iyileştirme → varsayım değiştirme → serbest metin → kopyala.

## 5. Uygulama kontrolleri

- [ ] Navigasyon uçtan uca (gerçek anahtarlarla): ana sayfada sorgu → öneri → "Bu araç için prompt yaz" → (soru kartı) → prompt kartı → iyileştir → kopyala. Rehberi olmayan araçta kutu çıkmamalı. Sohbet modu `/chat` linkinden açılmalı; `/classic` `/`'a yönlenmeli.
- [ ] Rate limit testi: `/api/chat` 20/dk (429 + `Retry-After`, arayüzde geri sayım), `/api/prompt/*` 30/dk, `/api/events` 60/dk aşılınca 429.
- [ ] Bütçe testi: düşük `OPENAI_MONTHLY_TOKEN_BUDGET` ile v1'e düşüş; kartta "Quick keyword match … No score." / Türkçe karşılığı görünüyor.
- [ ] Mobil kontrol: 360 px'de taşma yok (`docs/manual-test-p6.md` adımları), klavye ile gezinme, karanlık tema. (2026-09-25: `/privacy` en/tr, 404 en/tr ve sohbet footer'ı Playwright ile 360 px'de taşmasız: `docs/screenshots/p8-*-360.png`. Navigasyon ana sayfası, öneri kartı ve prompt kutusu 360 ve 1280 px'de taşmasız: `docs/screenshots/nav-*.png`. Bunlar sahte API cevaplarıyla alındı; öneri ve prompt metinleri örnek. Gerçek telefonda ve sohbet kartlarıyla tekrar bak.)
- [ ] Gizlilik sayfası `/privacy?lang=en` ve `/privacy?lang=tr` açılıyor; footer linki var; `docs/privacy-verification.md`'deki kontroller yeniden yapıldı.
- [ ] OG görseli: `/opengraph-image` açılıyor; bir paylaşım önizleme aracında görünüyor.
- [ ] 404 (`/olmayan-sayfa`) ve 500 (hata sınırı, `app/error.tsx`) sayfaları iki dilde doğru.
- [ ] `/api/admin/stats` üretimde `x-admin-key` ile çalışıyor; `?sample=1` üretimde sentetik veri DÖNDÜRMÜYOR (`sample: false`).
- [ ] Vercel Analytics açık; `/api/events` sayaçları KV'de görünüyor (`ev:<gün>`).
- [ ] `robots.txt` ve `sitemap.xml` doğru alan adını gösteriyor.

## 6. Son adımlar

- [ ] `npm run lint`, `npm test`, `npm run build` temiz.
- [ ] Production'a deploy (Ferit).
- [ ] Deploy sonrası ilk gün: `/api/admin/stats` ile iş sonucu yanıt oranı, netleştirme oranı ve günlük token kullanımı kontrol edildi.

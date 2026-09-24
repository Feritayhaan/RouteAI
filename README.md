# RouteAI

Ne yapmak istediğini yazarsın; RouteAI sohbet ederek amacını netleştirir, kendi görev taksonomisinden bir görev seçer, katalogdaki ürünleri **RouteAI Skoru** ile sıralar ve en iyi aracı + 2 alternatifi güven seviyesi, fiyat, veri tarihi ve kaynakla önerir. Seçilen araç için prompt rehberinden etkileşimli olarak prompt yazar (iki varyant: güvenli / yaratıcı). İngilizce ve Türkçe.

Eski tek sorgu arayüzü (v1, anahtar kelime + niyet analizi) `/classic` altında duruyor. Sohbet ajanı OpenAI'a ulaşamazsa ya da aylık bütçe dolarsa aynı v1 yoluna düşer.

## Durum (dosyalardan, 2026-09-24)

Bu tablo `data/` ve `evals/results/` altındaki dosyalardan okundu; dosyalar değiştikçe güncellenmeli.

| Ne | Sayı | Kaynak |
| --- | --- | --- |
| Görev (task) | 40 | `data/tasks.json` |
| Ürün | 96 (56 `active`, 40 `retired`) | `data/products.json` |
| Model (benchmark verisi) | 0 — ilk gece senkronu henüz merge edilmedi | `data/models.json` |
| Uzman değerlendirmesi | 0 | `data/reviews.json` |
| Uzman brief taslağı | 30 | `data/briefs.json` |
| Kendi sinyal kaydı (ürün+görev) | 0 | `data/signals.json` |
| Aday ürün | 0 | `data/candidates.json` |
| Prompt rehberi | 10 (10'u taslak, 0'ı gözden geçirilmiş; hepsi KAYNAK GEREKLİ) | `data/prompt-guides/*.md` |
| Rehbere bağlı ürün | 17 | `data/products.json` → `promptGuide` |
| `pricingUrl` dolu aktif ürün | 0 | `data/products.json` |

Sonuç: benchmark, uzman ve kendi sinyal verisi olmadığı için **RouteAI Skoru bugün hiçbir ürünü önermiyor** (kanıt kuralı). Katalog dolana kadar sohbet ajanı "yeterli kanıt yok" der ya da v1'e düşer. Ayrıntı: `evals/results/v2-oracle-misses.md`.

## Mimari

```
Tarayıcı (components/chat, lib/i18n)
   │  NDJSON akışı                         ┌──────────── git'teki katalog (data/*.json) ───────────┐
   ▼                                       │ tasks · products · models · reviews · signals ·      │
POST /api/chat  (edge, fra1)               │ briefs · candidates · prompt-guides                   │
   │  rate limit + aylık token bütçesi     └──────────▲───────────────────────▲───────────────────┘
   ▼                                                  │ gece PR'ı             │ haftalık/aylık PR
lib/agent: OpenAI tool calling (en fazla 6 araç)      │                       │
   ├─ search_catalog ─► lib/catalog/search ─► score.ts (RouteAI Skoru, deterministik)
   ├─ ask_user        (en fazla 2 soru)               │                       │
   ├─ get_workflow                                    │                       │
   └─ build_prompt ──► lib/promptBuilder: extract → plan → generate → validate
                          (oturum KV'de ps:<id>, 24 saat)
   hata / bütçe dolu ─► lib/recommendV1 (v1 anahtar kelime yolu)

Kartlar ─► /api/outcome · /api/feedback · /api/events ─► KV (sayaçlar, anonim)
                                                          │ sadece okuma
GitHub Actions: nightly-data  (AA + LMArena → models.json; KV → signals.json)  ─┘
                discover-tools (Show HN + Product Hunt → candidates.json)
                check-prices   (pricingUrl → products.json önerisi + price-report.md)
```

- Puanı her zaman kod hesaplar; model sadece aracı çağırır ve kartı anlatır. Kartlar modelin metninden değil araç sonucundan çizilir.
- RouteAI Skoru: `q = (kb·B + ke·E + Σ w·y) / (kb + ke + Σ w)`; kb = 10 (benchmark yüzdelik dilimi), ke = 5 (uzman rubriği), iş sonucu w = 1, karşılaştırma w = 0.5, oy w = 0.3. Benchmark ve uzman verisi yoksa ve kendi gözlem ağırlığı 3'ten azsa ürün önerilmez. Ağırlıklar: `lib/catalog/weights.ts`. Ayrıntı: `docs/ROADMAP-v2.md`.
- Sponsorluk ya da affiliate bilgisi sıralamaya girmez.

## Veri kaynakları ve lisanslar

| Kaynak | Ne için | Nasıl | Not |
| --- | --- | --- | --- |
| [Artificial Analysis](https://artificialanalysis.ai) | Model benchmark skorları | `npm run sync:models`, API (`AA_API_KEY`) | Gösterilirken kaynak adı görünür olmalı; kartlar adı `lib/catalog/sources.ts`'ten yazar |
| [LMArena](https://lmarena.ai) | Arena sıralamaları | Hugging Face datasets-server, `lmarena-ai/leaderboard-dataset` | Aynı atıf şartı |
| [Hacker News Algolia API](https://hn.algolia.com/api) | Aday ürün keşfi (Show HN) | `npm run discover:tools` | Sadece ad, URL, tarih ve HN bağlantısı saklanır |
| [Product Hunt API](https://api.producthunt.com/v2/docs) | Aday ürün keşfi | `PRODUCT_HUNT_TOKEN` varsa | Aynı |
| Ürünlerin kendi fiyat sayfaları | Fiyat kontrolü | `npm run check:prices` | Öneri + rapor PR ile gelir; fiyat PR merge edilince geçerli |
| Kendi sinyallerimiz | İş sonucu, karşılaştırma, oy | KV → `npm run aggregate:signals` | Anonim; mesaj metni ve IP saklanmaz |

Her sayı `data/` altında kaynağı ve tarihiyle durur. Kaynaklarının lisans metinleri bu repoda kopyalanmadı; kullanım koşulları lansmandan önce kaynakların kendi sayfalarından doğrulanmalı (bkz. `docs/LAUNCH-CHECKLIST.md`).

## Kurulum

```bash
npm install
cp .env.local.example .env.local   # değerleri doldur
npm run dev                         # http://localhost:3000
```

Sohbet için en az `OPENAI_API_KEY` ve KV (`KV_REST_API_URL`, `KV_REST_API_TOKEN`) gerekir; rate limiter KV olmadan isteği reddeder (429).

## Ortam değişkenleri

`.env.local.example` ile birebir aynı liste ve sıra.

| Değişken | Açıklama | Zorunlu |
| --- | --- | --- |
| `OPENAI_API_KEY` | Sohbet ajanı, prompt oluşturucu, v1 niyet analizi; workflow'larda keşif sınıflandırması ve fiyat çıkarımı | ✅ |
| `OPENAI_MODEL` | Sohbet ajanının modeli. Boşsa `gpt-4o-mini` (`lib/agent/config.ts`) | ⬜ |
| `OPENAI_PROMPT_MODEL` | Prompt oluşturucunun modeli. Boşsa `OPENAI_MODEL`, o da boşsa `gpt-4o-mini` | ⬜ |
| `OPENAI_MONTHLY_TOKEN_BUDGET` | Aylık token bütçesi (sohbet + prompt oluşturucu). Kullanım KV'de `usage:<YYYY-MM>` ve `usage:day:<YYYY-MM-DD>`; aşılınca v1'e düşülür. Boş = sınır yok | ⬜ |
| `UPSTASH_VECTOR_REST_URL` | Upstash Vector URL'i (sadece `VECTOR_SEARCH_ENABLED=true` iken) | ⬜ |
| `UPSTASH_VECTOR_REST_TOKEN` | Upstash Vector token'ı (aynı koşul) | ⬜ |
| `VECTOR_SEARCH_ENABLED` | `true` ise v1'de vektör araması; boş = anahtar kelime araması | ⬜ |
| `KV_REST_API_URL` | Upstash Redis REST URL'i (rate limit, oturumlar, sinyaller, analitik) | ✅ |
| `KV_REST_API_TOKEN` | Upstash Redis yazma token'ı | ✅ |
| `KV_REST_API_READ_ONLY_TOKEN` | Salt okunur token; `aggregate:signals` bunu tercih eder | ⬜ |
| `KV_URL` | Vercel KV entegrasyonu ekler; kod kullanmaz | ⬜ |
| `REDIS_URL` | Vercel KV entegrasyonu ekler; kod kullanmaz | ⬜ |
| `ADMIN_SECRET` | `/api/admin/*` ve `/api/update-tools`; sadece `x-admin-key` başlığıyla | ✅ |
| `AA_API_KEY` | Artificial Analysis API; boşsa senkron AA'yı atlar, LMArena yine çalışır | ⬜ |
| `PRODUCT_HUNT_TOKEN` | Keşif; boşsa sadece Hacker News | ⬜ |
| `NEXT_PUBLIC_BASE_URL` | Taban URL (metadata); boşsa `https://www.routeai.chat` | ⬜ |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Gizlilik sayfasındaki iletişim adresi; boşsa satır çıkmaz | ⬜ |

## Scriptler

| Komut | Ne yapar |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js (build öncesi `build:guides` çalışır) |
| `npm run lint` | ESLint |
| `npm test` | Birim testleri (`node:test`, `lib/__tests__/*.test.ts`) |
| `npm run validate:catalog` | Rehberleri derler, `data/` altındaki tüm katalog dosyalarını Zod + çapraz kontrollerle doğrular |
| `npm run build:guides` | `data/prompt-guides/*.md` → `data/prompt-guides.json` |
| `npm run eval -- --recommender=v1\|v2-oracle\|v2` | Altın set değerlendirmesi → `evals/results/<tarih>-<recommender>.json` |
| `npm run eval:prompts` | Prompt oluşturucu senaryoları (OpenAI gerekir) |
| `npm run eval:simulate` | RouteAI Skoru'nun sentetik veriyle davranışı (gerçek veri değil) |
| `npm run sync:models` | Artificial Analysis + LMArena → `data/models.json` + `data/sync-report.md` |
| `npm run aggregate:signals` | KV'den iş sonucu, karşılaştırma ve oyları **okur** → `data/signals.json` + `data/signals-anomalies.md` |
| `npm run discover:tools` | Show HN + Product Hunt → `data/candidates.json` + `data/discovery-report.md` |
| `npm run check:prices` | Aktif ürünlerin `pricingUrl` sayfaları → `data/products.json`'da fiyat önerisi + `data/price-report.md` |
| `npm run validate:db` / `bench` / `migrate:pricing` | v1 veritabanı (`lib/tools-database.json`) araçları |

## GitHub Actions

Hepsi değişiklik varsa ayrı bir dala commit atar ve PR açar; merge kararı insanın. Repo ayarında *Settings → Actions → General → "Allow GitHub Actions to create and approve pull requests"* açık olmalı.

| Workflow | Zaman (UTC) | Secret'lar |
| --- | --- | --- |
| `nightly-data` (`sync-models.yml`) | her gün 03:00 | `AA_API_KEY`, `KV_REST_API_URL`, `KV_REST_API_READ_ONLY_TOKEN` |
| `discover-tools` | pazartesi 04:00 | `OPENAI_API_KEY`, `PRODUCT_HUNT_TOKEN` (ikisi de isteğe bağlı) |
| `check-prices` | ayın 1'i 05:00 | `OPENAI_API_KEY` |

Adaylar (`status: candidate`) hiçbir zaman önerilmez; ürün `data/products.json`'a `active` olarak elle taşınınca girer.

## API

| Uç | Açıklama | Rate limit |
| --- | --- | --- |
| `POST /api/chat` | Sohbet ajanı, NDJSON akışı (`text`, `card`, `done`, `error`) | 20/dk, 100/saat |
| `POST /api/prompt/answer` | Prompt soru kartının cevapları → PromptCard | 30/dk, 200/saat |
| `POST /api/prompt/refine` | Hazır buton / varsayım değişikliği / serbest talimat → yeni versiyon | 30/dk, 200/saat |
| `POST /api/outcome` | "İşini gördü mü?" ve karşılaştırma cevabı (oturum+ürün+görev başına tek kayıt) | 20/dk, 120/saat |
| `POST /api/feedback` | Öneri oyu (oturum+ürün+görev başına son oy geçerli; v1 alanları da kabul) | 20/dk, 120/saat |
| `POST /api/events` | Anonim olay sayaçları | 60/dk, 600/saat |
| `POST /api/recommend` | v1 önerisi (`/classic`) | 10/dk, 60/saat |
| `GET /api/admin/stats` | Son 30 gün ve ROADMAP metrikleri. Yerelde `?sample=1` sentetik veri (üretimde kapalı) | `x-admin-key` |
| `GET /api/admin/feedback` | Son geri bildirimler | `x-admin-key` |
| `POST /api/admin/seed` | v1 araçlarını KV'ye (ve açıksa vektöre) yazar — yıkıcı | `x-admin-key` |

## Eval nasıl çalışır

- `evals/golden.jsonl`: 40 sorgu (20 tr, 20 en; taslak, `evals/REVIEW.md`). Her satırda beklenen görev, kabul edilebilir ürünler ve netleştirme gerekip gerekmediği.
- `npm run eval -- --recommender=…` KV ve vektör değişkenlerini süreçten siler; `OPENAI_API_KEY` yoksa OpenAI'a giden satırlar `skipped` sayılır. Metrikler `evals/metrics.mjs`: `taskMatch`, `top1Hit`, `top3Hit`, `clarifyRate` (+ gerekli/gereksiz ayrımı), ortalama gecikme.
- `v2-oracle`: görevi golden'dan doğru kabul eder, sadece RouteAI Skoru sıralamasını ölçer. `v2`: tam ajan (OpenAI gerekir).

Son koşular (2026-09-24, OpenAI anahtarı olmadan):

| Recommender | Değerlendirilen | taskMatch | top3Hit | clarifyRate | Dosya |
| --- | --- | --- | --- | --- | --- |
| v1 | 15/40 (25 skipped) | n/a | 13/15 = %86.7 | 0/15 | `evals/results/2026-09-24-v1.json` |
| v2-oracle | 40/40 | n/a (görev verili) | 0/39 = %0 | 0/40 | `evals/results/2026-09-24-v2-oracle.json` |
| v2 | koşulmadı (anahtar yok) | — | — | — | — |
| eval:prompts | 0/20 (20 skipped) | — | — | — | `evals/results/2026-09-24-prompts.json` |

v1 sayıları sadece kural tabanlı kademede çözülen kısa sorguları kapsar ve iyimserdir. v2-oracle'ın %0'ı katalogda benchmark, uzman ve sinyal verisi olmamasından.

## Gizlilik

`/privacy` (en/tr). Saklanan: anonim `sessionId` (sunucuda sadece hash'i), günlük olay sayaçları, oylar ve iş sonucu cevapları. Sohbet mesajları saklanmaz ve loglanmaz; IP sadece rate limit için en fazla yaklaşık 1 saat tutulur. İstisnalar: prompt oluşturucu oturumu (amaç, talimatlar, üretilen promptlar) 24 saat; `/classic`'te oy verilirse arama metni oyla birlikte saklanır. Sohbet metni yanıt üretmek için OpenAI'a gönderilir. Kodda nasıl doğrulandığı: `docs/privacy-verification.md`.

## Proje yapısı (v2 parçaları)

```
app/
  page.tsx                 sohbet (components/chat)
  classic/                 v1 arayüzü
  privacy/                 gizlilik sayfası
  api/chat, api/prompt/*, api/outcome, api/feedback, api/events, api/admin/stats
lib/
  agent/                   ajan döngüsü, araçlar, bütçe, v1'e düşüş
  catalog/                 şema, yükleme, RouteAI Skoru, uygunluk, arama
  promptBuilder/           rehberler, extract/plan/generate/validate, oturum
  analytics/               olaylar, KV sayaçları, stats
  signals/                 iş sonucu / karşılaştırma / oy kayıtları
  i18n/                    en + tr sözlükleri, dil seçimi
data/                      katalog (git'te JSON) ve raporlar
scripts/                   sync, aggregate, discover, prices, validate, build-guides
evals/                     altın set, metrikler, sonuçlar
docs/                      ROADMAP-v2, LAUNCH-CHECKLIST, rehber gözden geçirme, elle test
```

## Lisans

Bu proje özel lisans altındadır. Ticari kullanım için iletişime geçin.

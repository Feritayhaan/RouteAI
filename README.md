# RouteAI

RouteAI bir **yapay zekâ navigatörü**: ne yapmak istediğini yazarsın, sana en uygun AI aracını ya da adım adım iş akışını (workflow) önerir.

- **Ana sayfa (`/`), navigasyon:** Tek sorgu, fiyat filtresi (tümü / ücretsiz / ücretli), ana öneri + alternatifler ya da workflow. Arka uç `POST /api/recommend` (anahtar kelime + OpenAI niyet analizi, `lib/tools-database.json`). Türkçe.
- **Prompt oluşturucu (aynı ekranda):** Fiyat filtresinin solunda **"Prompt da yaz"** düğmesi, sağında **prompt aracı** listesi var. Liste varsayılan olarak "Önerilen araç"; rehberi olan 17 araçtan biri de seçilebilir. Düğme açıkken "Bana Yol Göster" önerinin hemen altında promptu da yazar: arama metni `POST /api/prompt/start`'a gider, gerekirse tek bir soru kartı, sonra iki varyantlı prompt kartı (güvenli / yaratıcı) gelir. Kartta iyileştirme, varsayım değiştirme, sürüm geçmişi ve kopyalama var. Önerilen aracın rehberi yoksa bunu söyler ve listeden araç seçmeyi önerir. Sonuç varken düğmeyi açmak ya da araç değiştirmek aramayı tekrarlamadan sadece promptu üretir; aynı arama ve araç için üretilen prompt tekrar üretilmez.
- **Sohbet modu yok:** 2026-09-25'te siteden kaldırıldı (`/chat`, `/api/chat`). Ajan kodu (`lib/agent`) v2 eval'i için repoda duruyor.

`/classic` adresi kalıcı olarak `/`'a yönlenir.

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
| `pricingUrl` dolu aktif ürün | 46 / 56 (eksikler: `docs/catalog-review-2026-09-25.md`) | `data/products.json` |

Sonuç: benchmark, uzman ve kendi sinyal verisi olmadığı için **RouteAI Skoru bugün hiçbir ürünü önermiyor** (kanıt kuralı). Ana sayfa bundan etkilenmez: öneriler v1 araç veritabanından (`lib/tools-database.json`) gelir; RouteAI Skoru şu an sadece v2 eval'inde kullanılıyor. Ayrıntı: `evals/results/v2-oracle-misses.md`.

## Mimari

```
Ana sayfa / (components/HomeClient) ─► POST /api/recommend ─► lib/recommendV1 (v1: anahtar kelime + niyet analizi)
   └─ "Prompt da yaz" + araç listesi ─► components/PromptPanel ─► POST /api/prompt/start
                                            ─► lib/promptBuilder: extract → plan → generate → validate
                                               (oturum KV'de ps:<id>, 24 saat; /api/prompt/answer, /refine)

Sitede kullanılmayan v2 altyapısı (eval ve gelecek için):
lib/agent (eskiden /api/chat)              ┌──────────── git'teki katalog (data/*.json) ───────────┐
   │  rate limit + aylık token bütçesi     │ tasks · products · models · reviews · signals ·      │
   ▼                                       │ briefs · candidates · prompt-guides                   │
OpenAI tool calling (en fazla 6 araç)      └──────────▲───────────────────────▲───────────────────┘
                                                      │ gece PR'ı             │ haftalık/aylık PR
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

Öneri ve prompt için en az `OPENAI_API_KEY` ve KV (`KV_REST_API_URL`, `KV_REST_API_TOKEN`) gerekir; rate limiter KV olmadan isteği reddeder (429).

## Ortam değişkenleri

`.env.local.example` ile birebir aynı liste ve sıra.

| Değişken | Açıklama | Zorunlu |
| --- | --- | --- |
| `OPENAI_API_KEY` | Prompt oluşturucu, navigasyon niyet analizi; workflow'larda keşif sınıflandırması ve fiyat çıkarımı | ✅ |
| `OPENAI_MODEL` | Varsayılan model (prompt oluşturucu `OPENAI_PROMPT_MODEL` boşsa bunu kullanır; v2 eval ajanı). Boşsa `gpt-4o-mini` (`lib/agent/config.ts`) | ⬜ |
| `OPENAI_PROMPT_MODEL` | Prompt oluşturucunun modeli. Boşsa `OPENAI_MODEL`, o da boşsa `gpt-4o-mini` | ⬜ |
| `OPENAI_MONTHLY_TOKEN_BUDGET` | Aylık token bütçesi (prompt oluşturucu). Kullanım KV'de `usage:<YYYY-MM>` ve `usage:day:<YYYY-MM-DD>`; aşılınca prompt oluşturucu 503 döner. Boş = sınır yok | ⬜ |
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
| `npm run build:guides` | `data/prompt-guides/*.md` → `data/prompt-guides.json` + `data/prompt-products.json` (prompt aracı listesi: araç adı → ürün) |
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
| `POST /api/prompt/start` | Ana sayfadaki prompt oluşturucu: ürün + amaç → soru kartı ya da PromptCard | 30/dk, 200/saat |
| `POST /api/prompt/answer` | Prompt soru kartının cevapları → PromptCard | 30/dk, 200/saat |
| `POST /api/prompt/refine` | Hazır buton / varsayım değişikliği / serbest talimat → yeni versiyon | 30/dk, 200/saat |
| `POST /api/outcome` | "İşini gördü mü?" ve karşılaştırma cevabı (oturum+ürün+görev başına tek kayıt) | 20/dk, 120/saat |
| `POST /api/feedback` | Öneri oyu (oturum+ürün+görev başına son oy geçerli; v1 alanları da kabul) | 20/dk, 120/saat |
| `POST /api/events` | Anonim olay sayaçları | 60/dk, 600/saat |
| `POST /api/recommend` | Navigasyon önerisi (ana sayfa, v1) | 10/dk, 60/saat |
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

`/privacy` (en/tr). Saklanan: anonim `sessionId` (sunucuda sadece hash'i), günlük prompt olay sayaçları. Arama metni loglanmaz; IP sadece rate limit için en fazla yaklaşık 1 saat tutulur. İstisnalar: prompt oluşturucu oturumu (amaç, talimatlar, üretilen promptlar) 24 saat; ana sayfada beğendim/beğenmedim denirse arama metni oyla birlikte saklanır; yıldız puanları sadece tarayıcıda kalır. Yazılan metin (arama, prompt amacı) OpenAI'a gönderilir. Kodda nasıl doğrulandığı: `docs/privacy-verification.md`.

## Proje yapısı (v2 parçaları)

```
app/
  page.tsx                 tek ekran: navigasyon (components/HomeClient) + prompt (components/PromptPanel)
  classic/                 / adresine kalıcı yönlendirme
  privacy/                 gizlilik sayfası
  api/recommend, api/prompt/*, api/feedback, api/outcome, api/events, api/admin/stats
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

# RouteAI v2 — Yol haritası (lansman: Kasım 2026 sonu)

## Ürün
Sohbet eden ajan: amacı anlar, gerekirse en fazla 2 seçenekli soru sorar, görev taksonomisinden bir görev seçer, katalogdan puanlı ürünleri alır, en iyi araç + 2 alternatifi güven seviyesi, fiyat, veri tarihi ve kaynakla önerir, seçilen araç için prompt rehberinden etkileşimli olarak prompt üretir: konuşmadan bilgileri çıkarır, gerekirse tek kartta en fazla 3 soru sorar, iki varyant (güvenli/yaratıcı) gösterir, kullanıcı butonlar ve serbest metinle iyileştirir. Global, en + tr.
Kapsam dışı (lansman sonrası): hesaplar, ödeme, sponsorlu listeleme, mobil uygulama, Postgres, API-proxy.

## Ürün kararı (2026-09-25, Ferit)
RouteAI bir **navigasyon** aracı, sohbet botu değil. Site **tek ekran**:
- Ana sayfa (`/`) eski navigasyon arayüzü (`components/HomeClient.tsx`, `/api/recommend`). Görünümü korunur.
- Fiyat filtresi tek küçük düğme (`components/PricingToggle.tsx`; tümü → ücretsiz → ücretli, tema düğmesiyle aynı görünüm).
- Prompt oluşturucu aynı ekranda: fiyat düğmesinin solunda "Prompt da yaz" düğmesi, sağında prompt aracı listesi ("Önerilen araç" ya da rehberi olan 17 araçtan biri, `data/prompt-products.json`). Açıkken prompt önerinin altında çıkar (`components/PromptPanel.tsx` → `POST /api/prompt/start`).
- Sohbet modu kaldırıldı (`/chat`, `/api/chat`, `ChatShell`). `lib/agent` v2 eval'i için repoda.
- `/classic` → `/` kalıcı yönlendirme.
- Model listesi elle tutulmaz (2026-09-25): ürün adları sürümsüz, `modelRule` ile güncel model gece senkronundan otomatik; ana sayfa ad/link/fiyat/durumu `data/products.json`'dan okur. Gece PR'ı katalog kontrolü + test + build + `automerge:guard` geçerse otomatik merge edilir; şüpheli durumda Ferit'i bekler.
Aşağıdaki "Ürün" ve "Mimari" tanımları sohbet ajanı dönemine ait; ajan şu an sitede yok.

## Mimari
- Katalog git'te JSON: data/tasks.json, data/models.json, data/products.json, data/reviews.json, data/briefs.json, data/signals.json, data/prompt-guides/*.md. Zod şeması lib/catalog/schema.ts.
- Modeller her gece GitHub Action ile Artificial Analysis API ve LMArena (Hugging Face) verisinden güncellenir ve PR açılır. Ürünler seçilmiştir; yeni ürünler 'candidate' olarak PR ile gelir.
- /api/chat: OpenAI tool calling. Araçlar: search_catalog, ask_user, build_prompt, get_workflow. Puanı her zaman deterministik kod hesaplar.
- OpenAI erişilemezse ya da aylık bütçe dolarsa v1 anahtar kelime yoluna düşülür.

## RouteAI Skoru (ana sistem)
Sıralama RouteAI'ın kendi kanıtına dayanır; benchmark sadece ön bilgidir. Birim: (ürün, görev) çifti. Görev taksonomisi bu yüzden omurgadır.
q = (kb*B + ke*E + Σ w*y) / (kb + ke + Σ w). kb = 10 (B: LMArena/AA yüzdelik dilimi; yoksa kb = 0). ke = 5 (E: uzman rubriği 0–1; yoksa ke = 0).
Kendi gözlemler: iş sonucu w = 1 (evet 1, kısmen 0.5, hayır 0), karşılaştırma w = 0.5 (kazanan 1, kaybeden 0), öneri oyu w = 0.3. 90 iş sonucundan sonra benchmark'ın payı %10'un altına düşer.
Kanıt kuralı: B yok, uzman değerlendirmesi yok ve kendi gözlem ağırlığı 3'ten azsa ürün önerilmez. Sponsorluk ve affiliate bilgisi sıralamaya asla girmez.
Güven: high = kendi gözlem ağırlığı ≥ 30 VE en yeni gözlem ≤ 30 gün; medium = kendi gözlem ≥ 10 VEYA (benchmark ≤ 30 gün VE uzman değerlendirmesi); low = diğer.

## Fazlar
P0 zemin | P1 altın eval seti | P2 veri modeli + taksonomi | P3 gece model senkronu | P4 RouteAI Skoru motoru | P5 sohbet ajanı API | P6 sohbet arayüzü + i18n | P7 etkileşimli prompt oluşturucu | P8 keşif, geri bildirim, analitik, lansman

## Hedefler
Altın sette doğru görev ≥ %90, ilk 3'te kabul edilebilir araç ≥ %85. Lansman sonrası: iş sonucu yanıt oranı ≥ %20, işini gördü oranı ≥ %65, beğenilme ≥ %70, araca geçiş ≥ %40, prompt kopyalama ≥ %30, netleştirme oranı %15–%35.

## P0 notları
- lib/recommendV1.ts P0'da oluşturuldu; P1 onu yeniden oluşturmaz, kullanır.
- Anahtar kelime eşleşmesi: kelime başından önek eşleşmesi, Türkçe eklere izin verir; "art" tam kelime.
- Admin uçları sadece x-admin-key başlığı; seed POST.

## Baseline (v1)
Koşu: 2026-09-24, `npm run eval -- --recommender=v1`. Sonuç: `evals/results/2026-09-24-v1.json`. Altın set: `evals/golden.jsonl` (40 sorgu, TASLAK; bkz. `evals/REVIEW.md`). Katalog `lib/tools-database.json` (56 aktif araç); KV ve vektör araması eval sürecinde kapalı.

**Eksik ölçüm:** Koşu OPENAI_API_KEY olmadan yapıldı. LLM kademesine giden 25 sorgu (6 kelimeden uzun ya da anahtar kelimesi olmayan sorgular) skipped. Aşağıdaki sayılar sadece kural tabanlı kademede çözülen 15 kısa sorguyu kapsıyor ve iyimser. Anahtarla tekrar koşulup bu tablo güncellenmeli.

| Metrik | v1 (anahtarsız) | Hedef (v2) |
| --- | --- | --- |
| top1Hit | 12/15 = %80.0 | — |
| top3Hit | 13/15 = %86.7 | ≥ %85 |
| taskMatch | n/a (v1 görev döndürmüyor) | ≥ %90 |
| clarifyRate | 0/15 = %0 (netleştirme gereken 5 satırın hiçbirinde sormadı) | %15–%35 |
| skipped | 25/40 | 0 |

Iskalar: tr-05 "python kodumda hata var" (ana öneri n8n; ilk 3'te Copilot var), tr-06 "ürün fotoğrafı arka plan kaldır" (görsel üreticilere düştü), tr-19 "YouTube kanalım için ses lazım" (workflow'a düştü; ilk adımda NotebookLM).

## P4 notları
- v2-oracle (görev golden'dan doğru kabul, sadece RouteAI Skoru sıralaması), 2026-09-24: top3Hit 0/39. Neden veri: `data/models.json` boş (senkron henüz koşmadı, ürünlere model bağlı değil), uzman değerlendirmesi ve sinyal yok; RouteAI Skoru kanıtsız ürünü önermiyor. Ayrıntı: `evals/results/v2-oracle-misses.md`.
- Simülasyon (sentetik, `npm run eval:simulate`): gözlem yokken sıra benchmark'a göre; ürün başına 10 iş sonucunda kendi kanıtı iyi olan ürün öne geçiyor. `evals/results/2026-09-24-v2-oracle-simulation.md`.
- Formül notu: 90 iş sonucunda benchmark payı tam 10/100 = %10; "%10'un altı" 91'de başlıyor. Ağırlıklar değiştirilmedi; ifade ya da K_BENCHMARK Ferit'in kararı.
- `searchCatalog` kısıt gevşetmesi sırası: maxMonthlyUsd → access → pricing → commercialUse; gevşetilenler `relaxedConstraint` dizisinde döner.

## P5 notları
- `/api/chat` (edge, fra1): NDJSON `text | card | done | error`. Akış mantığı `lib/agent/handler.ts`, döngü `lib/agent/loop.ts`, araçlar `lib/agent/tools.ts`. Model `OPENAI_MODEL` (varsayılan `gpt-4o-mini`), temperature 0.2, en fazla 700 çıktı token'ı, tur zaman aşımı 15 sn.
- İstek mesajlarında isteğe bağlı `kind` alanı var; `kind: 'question'` olan asistan mesajları "konuşma başına en fazla 2 soru" bütçesine sayılır.
- Bütçe: `OPENAI_MONTHLY_TOKEN_BUDGET` tanımsızsa sınır yok. Tanımlıysa ve KV okunamazsa güvenli tarafta kalınır (v1 yolu). v1 yedeği LLM çağırmaz (`allowLLM: false`).
- Rate limiter tek pipeline: izin verilen istek 1 KV çağrısı (eskiden pencere başına 4–5), reddedilen 2.
- v2 eval (`npm run eval -- --recommender=v2`) bu ortamda OPENAI_API_KEY olmadığı için koşulamadı; 40/40 skipped. Anahtarla koşulunca taskMatch hedefi ≥ %90; altındaysa özet satırındaki "karışan görevler"e göre `lib/agent/systemPrompt.ts` ve `data/tasks.json` açıklamaları iyileştirilecek (en fazla 3 tur).
- get_workflow adım adları şablondan geldiği için şimdilik Türkçe (EN arayüzde de).

## P6 notları
- (2026-09-25'te değişti: ana sayfa yine navigasyon, sohbet kaldırıldı; bkz. "Ürün kararı".) P6'da ana sayfa sohbet (`components/chat/ChatShell.tsx`) yapılmıştı; eski tek sorgu arayüzü `/classic`'teydi. `/dev/cards` sadece geliştirmede açılan kart önizlemesi (örnek veri), üretimde 404.
- Dil: `proxy.ts` (Next 16'da middleware'in yeni adı) `?lang` -> Accept-Language -> en sırasıyla `x-routeai-locale` başlığını ekler; `<html lang>` ve metadata bundan. Sözlük `lib/i18n/{en,tr}.ts`; anahtar eşitliği tiple zorunlu.
- Türkçe şablonlarda sayıya ek getiren kalıplardan ("%43'i") kaçınıldı: ek sayının okunuşuna göre değişiyor ("%43'ü"). Yeni şablon yazarken aynı kural.
- `WorkflowDisplay`'deki "tahmini maliyet" bölümü sohbet kartına alınmadı: kaynaksız fiyat tahmini üretiyor (klasik arayüzde duruyor).
- Kart kanıt payı çubuğu için skor sonucuna `expertShare` ve `ownShare` eklendi (formül değişmedi).
- `/api/outcome`: oturum + ürün + görev başına tek kayıt, oturum kimliği sadece hash olarak (`lib/signals/store.ts`), IP ve mesaj metni saklanmaz. Anahtarlar `sig:outcome:index` ve `sig:comparison:index` kümelerinde; P8 toplar.
- `next dev` bir AI ajanı altında çalışınca CLAUDE.md'ye kendi "agent rules" bloğunu ekliyor; geri alındı, commit edilmedi.
- Yerelde sohbet için KV şart: KV yoksa rate limiter bilinçli olarak kapalı kalır ve `/api/chat` 429 döner.

## P7 notları
- Rehber formatı: `data/prompt-guides/<id>.md` (YAML alt kümesi frontmatter + 4 bölüm) -> `npm run build:guides` -> `data/prompt-guides.json` (edge için). `prebuild` ve `validate:catalog` bunu çağırır. Ayrıştırıcı `lib/promptBuilder/yaml.ts` (paket yok): satır içi eşleme, çok satırlı metin ve çapa desteklenmez, açık hata verir.
- 10 taslak rehber, 17 ürüne bağlı. Resmi dokümana erişilemediği için hepsi KAYNAK GEREKLİ; `docs/prompt-guides-review.md` Ferit'in kontrol listesi.
- Oturum KV'de `ps:<id>` (24 saat). Akış: extract (1 LLM çağrısı) -> plan (deterministik, en fazla 3 soru, oturum başına 1 soru kartı) -> generate (1 çağrı, safe + creative) -> validate (+ en fazla 1 onarım, sonra "kontrol edilmedi"). İyileştirme: hazır buton | varsayım değişikliği | serbest talimat; oturum başına 10.
- `build_prompt` sonucu (soru ya da prompt kartı) ajanın turunu bitirir; prompt oluşturucunun token'ları sohbet bütçesine eklenir. `/api/prompt/answer` ve `/api/prompt/refine` ajan döngüsüne girmez; rate limit 'prompt', bütçe, 20 sn zaman aşımı.
- Model: `OPENAI_PROMPT_MODEL`, yoksa `OPENAI_MODEL`. max_tokens: görsel/video/ses/müzik 600, metin/kod/sunum 1200.
- Analitik çağrıları yerinde (`lib/analytics.ts`, şimdilik no-op): prompt_question_shown, prompt_generated, prompt_refined, prompt_copied. OutcomeCard, sohbette son kopyalanan promptSessionId'yi taşır.
- `npm run eval:prompts`: 20 senaryo; bu ortamda anahtar yok, 20/20 skipped. Uçtan uca elle test (en az 3 rehber) OPENAI_API_KEY + KV ile yapılmalı; kart arayüzü `/dev/cards`'ta örnek veriyle görülebilir.


## P8 notları
- Sinyaller: `/api/outcome`, `/api/feedback` (v2 alanları sessionId + taskId + productId; eski v1 alanları hâlâ kabul) ve karşılaştırmalar KV'de `sessionId+productId+taskId` başına TEK kayıt (son cevap geçerli), `sig:*:index` setleriyle. İş sonucu kaydı son kopyalanan promptun `guideId`/`guideVersion`'ını taşır.
- `npm run aggregate:signals` KV'yi SADECE okur (tercihen salt okunur token) → `data/signals.json` + `data/signals-anomalies.md`. Anormallik: bir ürün+görevde son 24 saatin olumlu sonuçları önceki 30 günün günlük ortalamasının 5 katından fazla (ve en az 5) ise o 24 saatin olumluları DAHİL EDİLMEZ, rapora yazılır. Gece workflow'u (`nightly-data`) PR'a ekler.
- Analitik: istemci `trackEvent` → `POST /api/events` (rate limit 'events') → KV `ev:<gün>` (+ `:task`, `:guide`, `:refine`) HINCRBY sayaçları. Ham içerik, IP, mesaj metni yok. 7 gün geri dönüş: sessionId'nin hash'i (iki tuzlu FNV-1a, `lib/signals/store.ts` → `sessionHash`) `ret:<gün>` setine, 30 gün TTL.
- `/api/admin/stats` (x-admin-key): son 30 gün, ROADMAP metrikleri, rehber bazında kopyalama oranı / ortalama iyileştirme / en çok kullanılan butonlar / kopyalamadan sonra işini gördü oranı, günlük token (`usage:day:<gün>`). Yerelde `?sample=1` sentetik veri (`lib/analytics/sample.ts`); `NODE_ENV=production`'da kapalı.
- Keşif: `npm run discover:tools` (Show HN son 7 gün + PRODUCT_HUNT_TOKEN varsa Product Hunt) → ad ve alan adıyla mevcut ürünler ve adaylar düşülür → OpenAI varsa sınıflandırma → `data/candidates.json` (`status: candidate`, fiyat modeli `unknown`). Adaylar `searchCatalog`'a hiç girmez (ayrı dosya). Haftalık workflow PR açar.
- Fiyat: `npm run check:prices` (aylık workflow) aktif ürünlerin `pricingUrl` sayfasından OpenAI ile {model, startingPrice, currency} çıkarır; model emin değilse ya da para birimi USD değilse sonuç "emin olunamadı" (dokunulmaz). Fark varsa products.json önerisi + `data/price-report.md` PR ile; priceCheckedAt PR merge edilince geçerli. 2026-09-25: 46/56 aktif üründe pricingUrl var (web aramasıyla, resmi alan adından; sayfalar bu ortamdan açılamadı). Ayrıntı: `docs/catalog-review-2026-09-25.md`.
- Gizlilik: `/privacy` (en/tr), footer linki; kodda doğrulama `docs/privacy-verification.md`.
- Lansman: `docs/LAUNCH-CHECKLIST.md`; 404 (`app/not-found.tsx`), hata sınırı (`app/error.tsx`), OG görseli (`app/opengraph-image.tsx`).
- Doğrulanamayanlar (bu ortamda dış ağ ve anahtar yok): HN Algolia / Product Hunt / fiyat sayfası çağrıları gerçek API'ye karşı denenmedi (birim testler sahte cevaplarla), aggregate-signals gerçek KV'ye karşı koşmadı, v2 eval koşulmadı.

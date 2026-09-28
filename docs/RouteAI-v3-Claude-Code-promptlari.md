# RouteAI v3 — Claude Code promptları (P9–P18)

Kaynak: 2026-09-28 denetimi (`docs/ROADMAP-v2.md` → "Denetim (2026-09-28)").
P0–P8 bitti; bu dosya aynı yöntemle devam eder. Hedef: Kasım 2026 sonunda lansman.

## Nasıl kullanılır
- Promptları **sırayla ve tek tek** ver. Her prompt tek bir PR üretir: incele, merge et, sonra sıradakine geç.
- Bir promptun başında **"Önce sen"** varsa, o adımlar yapılmadan promptu verme.
- `CLAUDE.md` kuralları her promptta geçerli:
  - uydurma sayı yok;
  - canlı KV'yi silen ya da değiştiren komut yok;
  - anahtar commit'lenmez;
  - sponsorluk ve affiliate sıralamaya girmez.
- Promptun "Kapsam" satırı dışındaki dosyalara dokunulmaz.
- P14 (veri), P11–P13 ile paralel yürüyebilir.

| Prompt | Faz | Konu | Önce sen | Hafta |
|---|---|---|---|---|
| P9 | 0 Zemin | PR kontrolü, görünür gece raporu, eval işi | GitHub secrets, `ADMIN_SECRET` | 1 |
| P10 | 0 Zemin | LMArena senkronunu düzeltmek | Gece işini elle çalıştır, raporu yapıştır | 1 |
| P11 | 1 Doğru öneri | Sorgudan görevi bulmak + altın set | — | 1–2 |
| P12 | 1 Doğru öneri | Görev tabanlı öneri motoru + uzman değerlendirme aracı | P11'in altın setini kontrol et | 2–3 |
| P13 | 1 Doğru öneri | Ana sayfada yeni kart, geçiş | Önemli görevlerde uzman puanları | 3 |
| P14 | 2 Güncel veri | Tek veri kaynağı, fiyat/model tazeliği, metinler | Fiyat kontrol listesi | 2–4 |
| P15 | 3 Kanıt | "İşini gördü mü?", oylar, olaylar | KV salt okunur token (P9) | 5 |
| P16 | 4 Beta | Yanlış öneri bildirimi, haftalık döngü | Beta listesi (20–50 kişi) | 6–7 |
| P17 | 5 Lansman | Görev sayfaları, kontrol listesi | — | 8–9 |
| P18 | Mali | Satış ortaklığı linkleri (sıralamaya dokunmadan) | Program başvuruları | 4 ve sonrası |

---

## P9 — Faz 0: Zemin (PR kontrolü, gece raporu, eval işi)

**Önce sen**
1. GitHub → Settings → Secrets and variables → Actions:
   - `AA_API_KEY`
   - `KV_REST_API_URL`
   - `KV_REST_API_READ_ONLY_TOKEN`
   - `OPENAI_API_KEY`
2. GitHub → Settings → Actions → General → "Allow GitHub Actions to create and approve pull requests" açık.
3. Vercel → Environment Variables: `ADMIN_SECRET` uzun ve rastgele bir değerle değişsin.

```text
P9 — Faz 0: Zemin. Kapsam: .github/workflows/, scripts/sync-models.mjs, scripts/aggregate-signals.mjs, scripts/sync/core.mjs, README.md. Uygulama koduna (app/, components/, lib/ altındaki öneri kodu) dokunma.

Bağlam:
- PR'larda otomatik kontrol yok; GitHub'daki tek iş nightly-data.
- nightly-data 3 gecedir "success" bitiyor ama data/models.json değişmiyor. Log'da sadece "(10 hata)" yazıyor, rapor hiçbir yerde görünmüyor.
- Eval bu ortamda OpenAI'a erişemediği için 40 sorgunun 25'i "skipped".

Görev:
1. .github/workflows/ci.yml: pull_request ve main'e push'ta npm ci, npm run lint, npx tsc --noEmit, npm test, npm run validate:catalog, npm run build.
   - Secret kullanma; testler canlı servislere dokunmuyor.
   - Node sürümü sync-models.yml ile aynı olsun.
2. Gece raporu görünür olsun: sync-models.yml'de data/sync-report.md ve data/signals-anomalies.md içeriği $GITHUB_STEP_SUMMARY'ye yazılsın.
3. Sessiz başarı bitsin:
   - Karar mantığını scripts/sync/core.mjs'de saf bir fonksiyon yap: syncExitDecision({ sources, errors }) -> { code, reasons }.
   - Anahtarı tanımlı (AA_API_KEY) ya da anahtar gerektirmeyen (LMArena) bir kaynaktan hiç veri gelmezse iş kırmızı olsun.
   - Anahtar tanımlı değilse o kaynak "atlandı" diye raporlansın, hata sayılmasın.
   - aggregate-signals için aynı kural: KV secret'ı yoksa "atlandı"; varsa ve okuma başarısızsa hata.
4. .github/workflows/eval.yml (workflow_dispatch, elle):
   - OPENAI_API_KEY secret'ıyla npm run eval ve npm run eval:prompts.
   - Özet satırları $GITHUB_STEP_SUMMARY'ye; evals/results/*.json artifact olarak.
   - KV secret'ı verme; eval KV'ye dokunmamalı.
5. README'deki GitHub Actions tablosuna ci ve eval'i ekle.

Kapsam dışı: LMArena veri seti düzeltmesi (P10), uygulama kodu.

Kabul:
- syncExitDecision için birim testleri geçer: kaynak yok, anahtar yok, veri geldi, kısmi hata.
- build, test, lint, validate:catalog geçer; ci.yml bu PR'da kendini koşup yeşil olur.

Bitince: commit, PR aç, merge etme. Özette Ferit'in elle yapacaklarını yaz: Actions → nightly-data → Run workflow; Actions → eval → Run workflow.
```

---

## P10 — Faz 0: LMArena senkronu

**Önce sen:** P9 merge edildikten sonra GitHub → Actions → nightly-data → Run workflow. Bitince iş özetindeki senkron raporunu kopyala ve aşağıdaki yere yapıştır.

```text
P10 — Faz 0: LMArena senkronu. Kapsam: scripts/sync/, scripts/sync-models.mjs, lib/catalog/benchmarkKeys.ts, data/model-aliases.json, lib/__tests__/syncModels.test.ts.

Bağlam: fetchLmArena (scripts/sync/core.mjs), Hugging Face datasets-server'dan lmarena-ai/leaderboard-dataset okuyor. Config/split ve sütun adları, veri setine erişilemeden yazılmıştı; gece raporu hata veriyor. Rapor:

<<< BURAYA GECE RAPORUNU YAPIŞTIR >>>

Görev:
1. Rapordaki "LMArena configs" ve alan listesine göre gerçek config/split ve sütun adlarını kullan; BENCHMARK_ARENAS.sourceField ve LMARENA_FIELDS'i düzelt. Tahmin etme: rapor yetmiyorsa hangi bilgiye ihtiyacın olduğunu yaz ve dur.
2. Rapordaki gerçek satır örneğini test fikstürü yap; fetchLmArena ve mergeModels bu fikstürle test edilsin.
3. Gerekirse data/model-aliases.json'u güncelle. Kaç aktif ürüne güncel model atanacağını (lib/catalog/currentModel.ts, modelRule) özette listele.

Kabul:
- Fikstür testleri geçer; build, test, lint, validate:catalog geçer.
- Bir sonraki gece koşusunda LMArena satırları gelir ve models.json PR'ı açılır. Ağın yoksa bunu özette açıkça yaz; Ferit işi elle tetikleyip doğrular.
```

---

## P11 — Faz 1: Sorgudan görevi bulmak

```text
P11 — Faz 1: Sorgudan görevi bulmak. Kapsam: data/tasks.json + lib/catalog/schema.ts, lib/intent/ (yeni taskClassifier), evals/golden.jsonl, evals/REVIEW.md, evals/recommenders.mjs, testler. Ana sayfa akışını değiştirme (P12–P13).

Bağlam:
- Ana sayfa sorguyu 7 kaba kategoriye ayırıyor (lib/keywords.ts, lib/intent/parser.ts).
- 40 görevlik taksonomi (data/tasks.json) ana sayfada kullanılmıyor.
- Denetimde yaygın kısa sorgular kural yolunda tanınmadı ve tamamen OpenAI'a bağlı kaldı: "arka plan kaldır", "cv hazırla", "web sitesi yap", "write email", "toplantı notu".

Görev:
1. tasks.json: her göreve keywords: { tr: string[], en: string[] } ekle (Zod şeması + validate:catalog).
   - Her görev en az 5 tr ve 5 en ifade.
   - Eşleşme lib/text.ts → hasTerm ile (kelime başına bağlı, Türkçe eklere izin verir).
2. lib/intent/taskClassifier.ts: classifyTask(query, { allowLLM }).
   - Dönüş: { taskId, confidence, source: 'rules' | 'llm', alternatives: taskId[] } ya da { clarify: [taskId, taskId, taskId] }.
   - Kural katmanı: görev başına eşleşme puanı. En iyi aday açık farkla öndeyse sonuç; eşiği testlerle belirle.
   - Belirsizse ya da eşleşme yoksa ve allowLLM true: OpenAI json_schema strict. taskId enum = 40 görev, açıklamalar tasks.json'dan. Fiyat/dil kısıtları aynı çağrıda. Token sınırı cevaba yetecek kadar; finish_reason === 'length' ise cevap kullanılmaz (lib/intent/parser.ts'deki gibi).
   - LLM de başarısızsa hata yok: kural puanına göre ilk 3 görev → { clarify }.
   - Önbellek KV'de, önek task:v1:, 24 saat. Kullanıcı metni loglanmaz.
3. Altın set: evals/golden.jsonl'ı yaklaşık 100 satıra çıkar.
   - tr + en; 40 görevin her biri en az 2 satır.
   - "Projenin tek parçası" ("podcast kapağı") ve belirsiz sorgular dahil.
   - Yeni satırlarda needsReview: true; evals/REVIEW.md'ye Ferit'in kontrol listesi.
4. evals/recommenders.mjs'ye 'task' adaptörü: sadece görev doğruluğu (taskMatch). OpenAI yoksa kural katmanının sonucu ayrıca raporlansın.

Kapsam dışı: ürün seçimi, arayüz.

Kabul:
- Altın setin kısa sorgularında kural katmanı tek başına taskMatch ≥ %80.
- OpenAI ile (eval.yml) toplam taskMatch raporlanır; hedef ≥ %90.
- build, test, lint, validate:catalog, eval geçer.
```

---

## P12 — Faz 1: Görev tabanlı öneri motoru

**Önce sen:** P11'in eklediği altın set satırlarını `evals/REVIEW.md` listesiyle kontrol et.

```text
P12 — Faz 1: Görev tabanlı öneri motoru. Kapsam: lib/recommendV3.ts (yeni), app/api/recommend/route.ts (bayrakla), lib/workflow/ (adım araçlarını searchCatalog'dan almak için), scripts/ (uzman değerlendirmesi araçları), data/review-drafts/, evals/, testler. Arayüze dokunma (P13).

Bağlam:
- Ana sayfa lib/recommendV1.ts ile sıralıyor: kaynaksız strength (56 aktif aracın 31'i 9.5) + kelime araması.
- RouteAI Skoru (lib/catalog/search.ts → searchCatalog) ana sayfada kullanılmıyor.
- Kanıt dosyaları boş (models, reviews, signals); searchCatalog kanıtsız ürünü önermiyor.

Görev:
1. lib/recommendV3.ts: recommendV3(query, pricingFilter, options).
   - Akış: classifyTask (P11) → searchCatalog({ taskId, constraints }). constraints = arayüz fiyat filtresi + sorgudaki fiyat kısıtı.
   - Dönüşler:
     - { kind: 'recommendation', taskId, items, relaxedConstraint }. items: ürün, skor, güven, gerekçe kodları, veri tarihi, kaynaklar.
     - { kind: 'clarify', options }
     - { kind: 'no_evidence', taskId, products }
     - { kind: 'workflow', ... }: mevcut şablonlar (lib/workflow); adım araçları da searchCatalog'dan.
   - Arayüz fiyat filtresi asla gevşetilmez. Sorgudaki kısıt gevşetilirse relaxedConstraint döner.
   - no_evidence: görevdeki aktif ürünler puansız, alfabetik, "doğrulanmadı" etiketiyle. Sıralama iddiası yok.
   - Sadece products.json: katalogda olmayan araç yapısal olarak gelemez.
2. route.ts: RECOMMENDER=v3 ortam bayrağı; yoksa v1 (bugünkü davranış aynen). NDJSON biçimi geriye uyumlu, yeni alanlar eklenir: taskId, confidence, reasons, dataDate, sources.
3. Uzman değerlendirmesi araçları (Ferit için):
   - scripts/review-template.mjs <taskId> → data/review-drafts/<taskId>.md. İçerik: görevin brif(ler)i (data/briefs.json), görevin aktif ürünleri, rubrik tablosu (quality/ease/value/speed 1–5, not, kanıt linki).
   - scripts/import-reviews.mjs: doldurulan şablonları Zod ile doğrulayıp data/reviews.json'a ekler. reviewer ve date zorunlu.
   - Boş hücre = değerlendirme yok. Hiçbir puan tahmin edilmez.
4. Eval: recommenders.mjs'ye v3 adaptörü. v1 ile yan yana rapor: top1, top3, taskMatch, clarifyRate, no_evidence oranı.

Kabul:
- v3 ürün önermediği her durumda nedenini döner (clarify ya da no_evidence).
- search.test.ts'deki "sponsorluk/affiliate sıralamaya girmez" testi geçer.
- Bayrak kapalıyken canlı davranış değişmez (test).
- build, test, lint, validate:catalog, eval geçer.

Not: Uzman puanları girilene kadar v3 çoğu görevde no_evidence döner; bu beklenen. Bayrağı açma kararı Ferit'te.
```

**P12'den sonra sen:** En çok aranan 10–12 görev için `node scripts/review-template.mjs <görev>` ile şablon al. Brif'i her görevin en güçlü 2–3 aracında dene, puanla, `node scripts/import-reviews.mjs` ile ekle.

---

## P13 — Faz 1: Ana sayfada yeni kart ve geçiş

**Önce sen:** P12 merge edilmiş, önemli görevlerde uzman puanları girilmiş, eval.yml'de v3 sonuçları v1'den kötü değil.

```text
P13 — Faz 1: Ana sayfada v3. Kapsam: components/HomeClient.tsx, components/SimpleRecommendationDisplay.tsx (ya da yeni kart bileşeni), components/WorkflowDisplay.tsx, lib/i18n/, lib/types.ts. components/chat/RecommendationCard.tsx'ten parça alınabilir; o dosyayı değiştirme.

Görev:
1. Kart: mevcut görünüm korunur. Eklenenler:
   - güven seviyesi rozeti (yüksek / orta / düşük);
   - "neden" satırı (lib/i18n → reasonText): uzman puanı, kullanıcı sonuçları, benchmark sırası.
   Kaynak adı görünür (Artificial Analysis / LMArena lisans şartı), veri tarihi var. Kaynaksız hiçbir ifade yok.
2. clarify: "Şunu mu demek istedin?" + 3 görev düğmesi. Seçilen görevle istek tekrarlanır (aynı sorgu + taskId).
3. no_evidence: dürüst boş durum ("Bu iş için henüz güvenilir veri yok") + görevdeki araçlar "doğrulanmadı" etiketiyle.
4. İş akışı ve prompt oluşturucu v3 sonuçlarıyla çalışır (productId zaten var).
5. Yıldız puanlama kaldırılır: hiçbir yere gitmiyor; P15'te gerçek geri bildirim geliyor.
6. Playwright ekran görüntüleri (örnek API cevabıyla): 360 ve 1280 px, açık ve koyu tema, dört durum (öneri, clarify, no_evidence, iş akışı).

Kabul:
- RECOMMENDER=v3 ile dört durum yerelde çalışır; v1'e dönüş bayrakla anında mümkün.
- Yatay taşma yok.
- build, test, lint geçer.

Bitince: özette yaz: "Ferit, Vercel'de RECOMMENDER=v3 yapıp yeniden yayınla; sorun olursa değişkeni sil."
```

---

## P14 — Faz 2: Tek veri kaynağı ve tazelik

**Önce sen:** Bu prompt bir fiyat kontrol listesi üretir. Listeyi linklerden doldurman gerekecek; tarihi olmayan 24 ürün öncelikli.

```text
P14 — Faz 2: Tek veri kaynağı ve tazelik. Kapsam: data/products.json + şema, lib/catalog/navigator.ts, lib/toolsService.ts (sadece v3 yolunun okumadığından emin olmak için), fiyat gösteren bileşenler, scripts/ (fiyat listesi araçları), data/prompt-guides/ meta alanları, docs/prompt-guides-review.md.

Bağlam:
- Ana sayfa araç açıklamalarını lib/tools-database.json'dan ya da canlıda KV'deki 'tools' kopyasından okuyor. KV kopyası, admin seed çalıştırılmadıkça repodaki düzeltmeleri almıyor.
- 56 aktif ürünün 32'sinin fiyatı 2025 sonundan, 24'ünün hiç tarihi yok.
- Açıklamalarda kaynaksız üstünlük ifadeleri var; 32 aktif ürünün İngilizce açıklaması boş.

Görev:
1. Ekranda görünen her alan (ad, açıklama tr/en, url, fiyat, durum) products.json'dan gelsin. v3 yolu tools-database.json'ı ve KV 'tools' anahtarını hiç okumasın; v1 bayrağı için eski yol kalsın.
   KV'deki veriyi silen ya da değiştiren komut YOK; o karar Ferit'in.
2. Açıklamalar:
   - Üstünlük ifadelerini ("en güçlü", "üstün", "en gerçekçi" vb.) tarafsız işlev tanımına çevir.
   - Eksik İngilizce açıklamaları yaz.
   - Test: aktif ürünlerde tr/en dolu ve üstünlük kelimesi listesi geçmiyor.
3. Fiyat tazeliği: priceCheckedAt yoksa ya da PRICE_STALE_AFTER_DAYS (60) aşılmışsa, kartta fiyat yerine "Fiyat doğrulanmadı" + pricingUrl linki. Uydurma fiyat yok.
4. Fiyat kontrol listesi:
   - data/price-review.md: tarihi olmayan ya da eskimiş her aktif ürün için ad, pricingUrl, mevcut kayıt ve boş "doğrulanan" sütunları (model, başlangıç fiyatı, para birimi, kontrol tarihi).
   - scripts/apply-price-review.mjs: doldurulan satırları Zod ile doğrulayıp products.json'a uygular. priceCheckedAt = Ferit'in yazdığı tarih.
5. modelRule kapsamı: güncel modeli olması beklenen aktif ürünlerde (metin, görsel, video modelleri) modelRule eksikse ekle. P10 sonrası kaç üründe "Güncel model" satırı görüneceğini özette raporla.
6. Prompt rehberleri:
   - docs/prompt-guides-review.md'yi rehber başına kısa bir kontrol listesine çevir: resmi doküman linki, kontrol edilecek 3–5 madde, "onaylandı" kutusu.
   - Onaylananlarda reviewedBy ve kaynak alanlarını dolduran küçük bir script yaz.

Kabul:
- Tarihsiz ya da 60 günden eski fiyat ekranda "doğrulanmadı" görünür (test + ekran görüntüsü).
- Açıklama testleri geçer.
- build, test, lint, validate:catalog, eval geçer.
```

---

## P15 — Faz 3: Kanıt döngüsü ana sayfada

**Önce sen:** GitHub'da `KV_REST_API_URL` ve `KV_REST_API_READ_ONLY_TOKEN` tanımlı (P9).

```text
P15 — Faz 3: Kanıt döngüsü. Kapsam: components/HomeClient.tsx ve öneri kartı, components/FeedbackButtons.tsx, lib/chat/session.ts, lib/chat/outcomes.ts, components/chat/OutcomeCard.tsx (yeniden kullanım), app/api/outcome, app/api/feedback, lib/analytics/, lib/i18n/privacy.ts, docs/privacy-verification.md.

Bağlam:
- Ana sayfadaki 👍/👎 eski formatta (sorgu metni + araç adı) kaydediliyor; RouteAI Skoru'na girmiyor.
- "İşini gördü mü?" ve karşılaştırma sadece kaldırılan sohbette vardı.
- Ana sayfada analitik olay atılmıyor. Bu yüzden lansman metrikleri ölçülemiyor.

Görev:
1. Anonim oturum kimliği (lib/chat/session.ts) ana sayfada da kullanılır; sunucuya sadece hash gider (lib/signals/store.ts).
2. "Araca Git" tıklaması:
   - trackEvent('tool_click', { taskId, productId }) + yerel kayıt (lib/chat/outcomes.ts).
   - Kullanıcı sekmeye döndüğünde ya da sonraki ziyaretinde (OutcomeCard'daki mevcut bekleme kuralıyla) "İşini gördü mü? Evet / Kısmen / Hayır" → /api/outcome.
3. 👍/👎: FeedbackButtons'ın v2 modu (sessionId, taskId, productId).
4. Olaylar: recommendation_shown, tool_click, prompt_copied, outcome_shown, outcome_answered, clarify_shown. Admin istatistik sayfası (lib/analytics/stats.ts) ROADMAP → "Hedefler"deki lansman metriklerini göstersin.
5. Gizlilik sayfası ve docs/privacy-verification.md yeni davranışa göre güncellensin. Mesaj metni, IP ya da kişisel veri saklanmaz.

Kabul:
- Uçtan uca test (sahte KV ile): öneri → tıklama → dönüş → cevap → aggregate (salt okunur) → signals.json satırı → searchCatalog'da ownN artıyor.
- build, test, lint, validate:catalog geçer.
```

---

## P16 — Faz 4: Kapalı beta araçları

**Önce sen:** 20–50 kişilik beta listesi (arkadaşlar, topluluklar).

```text
P16 — Faz 4: Kapalı beta araçları. Kapsam: öneri kartına küçük ek, yeni bildirim ucu (app/api/report), lib/validations/, scripts/, docs/BETA.md, admin sayfası, gizlilik metni.

Görev:
1. Kartta "Yanlış öneri mi? Bildir" linki.
   - Gönderilen: sorgu, önerilen görev ve ürün, isteğe bağlı "ne bekliyordun" (serbest metin, en fazla 300 karakter).
   - Rate limit uygulanır. KV'de ayrı liste, 90 gün TTL.
   - Gizlilik sayfasına eklenir; admin sayfasında son bildirimler görünür.
2. scripts/triage-reports.mjs: bildirimleri salt okunur token'la okur, altın sete aday satırlar üretir (evals/golden-candidates.jsonl). Ferit onaylayınca golden.jsonl'a taşıyan komut da olsun.
3. docs/BETA.md: davet metni (tr), denenecek 5 örnek iş, haftalık döngü (bildirimler → altın set → düzeltme → eval), izlenecek metrikler.

Kabul: bildirim → aday satır akışı testle sınanır; build, test, lint geçer.
```

---

## P17 — Faz 5: Lansman

```text
P17 — Faz 5: Lansman. Kapsam: app/gorev/[taskId]/ (yeni), app/sitemap.ts, metadata, docs/LAUNCH-CHECKLIST.md. İngilizce ana sayfa ayrı onayla.

Görev:
1. Görev sayfaları: /gorev/[taskId] (tr).
   - İçerik: başlık ("… için yapay zekâ araçları"), görev açıklaması, searchCatalog sırası, güven, kaynak ve veri tarihi.
   - Sitemap ve metadata.
   - Kanıt yoksa sayfa "henüz güvenilir veri yok" der ve noindex olur. Kaynaksız "en iyi" iddiası yok.
2. docs/LAUNCH-CHECKLIST.md'yi baştan sona geç; her maddeyi "yapıldı / Ferit / açık" diye işaretle.
3. Ana sayfa ilk yükleme ve /api/recommend süresini ölç, docs'a yaz.
4. (Sadece Ferit onaylarsa) İngilizce ana sayfa /en; proxy.ts'deki "/ → tr" zorlaması korunur.

Kabul: build, test, lint, validate:catalog, eval geçer; ölçüm çıktısı özette.
```

---

## P18 — Mali: satış ortaklığı (affiliate) linkleri

**Önce sen:** Ortaklık programlarına başvur (ör. ElevenLabs, Gamma, Synthesia; şartları resmi sayfalarından doğrula). Onaylanan ürünler için ortaklık linklerini topla.

```text
P18 — Mali: Satış ortaklığı linkleri, sıralamaya dokunmadan. Kapsam: lib/catalog/schema.ts + data/products.json, araca giden linkleri üreten tek yardımcı, öneri kartı ve iş akışı linkleri, lib/i18n/, gizlilik/açıklama metni, testler, lib/analytics/.

Görev:
1. productSchema'ya opsiyonel affiliate: { url, program, approvedAt } ekle. Değerleri sadece Ferit ekler; hiçbir link tahmin edilmez.
2. Link tek yerden üretilir: "Araca Git" ve iş akışı adım linkleri affiliate varsa onu, yoksa url'yi kullanır.
3. Kartta küçük not: "Bu link satış ortaklığı içerir; öneri sırasını etkilemez." (tr/en). Gizlilik/açıklama sayfasına bölüm eklenir.
4. Testler:
   a) Bütün görevlerde affiliate alanı eklenip çıkarıldığında searchCatalog ve recommendV3 sırası birebir aynı.
   b) Sıralama kodu affiliate alanını okumuyor (search.test.ts'deki statik kontrol gibi).
5. tool_click olayına affiliate: true/false ekle. Admin sayfasında görev ve ürün başına tıklama sayısı (gelir hesabı için).

Kabul: sıralama değişmezliği testleri geçer; build, test, lint, validate:catalog, eval geçer.
```

---

## Kod gerektirmeyen mali adımlar (Ferit)
- **Beta'da ölç.** Araca tıklama → ücretli üyeliğe dönüşüm oranı ve sorgu başına maliyet (OpenAI + altyapı). Admin sayfası günlük token'ı zaten sayıyor.
- **Lansman + 1–3 ay.** Affiliate geliri ve 2–3 kurumsal pilot ("ekibiniz hangi işte hangi aracı kullanmalı" raporu + prompt rehberleri + eğitim).
- **3–6 ay.** Veri yeterliyse gömülebilir araç bulucu (widget/API lisansı) ve anonim, toplu pazar içgörüsü raporu (KVKK'ya uygun). İşaretli sponsor alanı en son; sıralamayla asla karışmaz.
- **Destekler.** TÜBİTAK BiGG, KOSGEB girişimci destekleri, bulut/yapay zekâ sağlayıcılarının girişim kredileri. Dönem ve şartları kontrol et.
- **Hukuk.** Ortaklık linkleri ve sponsor içerikte ticari ilişki açıkça belirtilir. Lansmandan önce kısa bir hukuk danışmanlığı önerilir.

# RouteAI v2 katalog verisi

Katalog git'te JSON olarak durur. Şema `lib/catalog/schema.ts` (Zod), yükleyici `lib/catalog/index.ts`. Her değişiklikten sonra `npm run validate:catalog` çalıştırılır: şemayı ve dosyalar arası referansları kontrol eder, aktif ürünü olmayan görevleri uyarı olarak listeler.

**Kural:** Hiçbir puan, fiyat, benchmark değeri ya da tarih uydurulmaz. Her sayı kaynağı ve tarihiyle durur.

## Dosyalar

| Dosya | Ne | Kim yazar |
| --- | --- | --- |
| `tasks.json` | Görev taksonomisi (40 görev). Sıralamanın birimi (ürün, görev) çiftidir. | Elle |
| `products.json` | Seçilmiş ürünler. `status`: `active` (önerilir), `candidate` (keşiften gelen aday, önerilmez), `retired` (emekli). **Ana sayfanın tek kaynağı:** gösterilen ad, link, fiyat ve aktif/emekli durumu buradan gelir (`lib/catalog/navigator.ts`); KV'deki araç kopyasını yeniden doldurmak gerekmez. Ad sürümsüz yazılır ("ChatGPT", "Claude"); güncel model `modelRule` ile otomatik bulunur. | Elle; ilk hali `scripts/migrate-to-catalog.mjs` |
| `models.json` | Modeller ve benchmark puanları (Artificial Analysis, LMArena). | Gece senkronu, PR ile; kontrollerden geçen PR otomatik merge edilir (`scripts/automerge-guard.mjs`) |
| `briefs.json` | Uzman değerlendirmesi için sabit test brifleri. **Şu anki 30 brif TASLAK; Ferit onaylamalı.** | Elle |
| `reviews.json` | Uzman değerlendirmeleri (rubrik). | Elle |
| `migration-review.md` | v1 → v2 göçünde emin olunmayan görev eşlemeleri. | Göç scripti |
| `model-aliases.json` | İki kaynakta farklı adla geçen modellerin elle eşlemesi (sadece emin olunanlar). | Elle |
| `sync-report.md` | Son model senkronunun raporu: hatalar, yeni/kaybolan modeller, alias adayları, kullanılan alanlar. | Gece senkronu |
| `prompt-guides/*.md` | Araç başına prompt rehberleri (frontmatter + Sözdizimi / Şablon / Yap-Yapma / Örnekler). `reviewedBy` boşsa taslak. Biçim: `lib/promptBuilder/guideSchema.ts`. | Elle; Ferit onaylar |
| `prompt-guides.json` | Rehberlerin derlenmiş hali (edge'de fs yok). Elle düzenleme. | `npm run build:guides` |
| `prompt-products.json` | Ana sayfadaki prompt aracı listesi: ürün adı → id (rehberi olan aktif ürünler). Elle düzenleme. | `npm run build:guides` |
| `link-review.md` | Ürün → model bağlantı önerileri; `[x]` işaretlenenler `--apply` ile products.json'a yazılır. | `scripts/link-products.mjs` |

### tasks.json

```json
{
  "id": "image.logo",
  "label": { "en": "Logo design", "tr": "Logo tasarımı" },
  "description": { "en": "...", "tr": "..." },
  "modality": "image",
  "benchmark": [{ "source": "lmarena", "key": "text_to_image" }],
  "slots": [{ "id": "text-in-logo", "question": { "en": "...", "tr": "..." }, "options": [...], "critical": true }],
  "outputTypes": ["image"]
}
```

- `benchmark[].key` sadece `lib/catalog/benchmarkKeys.ts`'teki sabitlerden gelir. Boş dizi = bu görevin genel bir benchmark'ı yok; puan kendi kanıtımızdan gelir.
- `slots`: sadece öneriyi değiştiren bilgiler, en fazla 3. `critical: true` olanı ajan eksikse sorabilir.

### products.json

```json
{
  "id": "gamma-ai",
  "name": "Gamma AI",
  "url": "https://gamma.app",
  "description": { "en": "...", "tr": "..." },
  "tasks": ["slides.create", "docs.create"],
  "models": [],
  "pricing": { "model": "freemium", "startingPrice": 10, "priceStatus": "stale", "priceCheckedAt": "2025-12-31", ... },
  "access": [],
  "status": "active",
  "reviewStatus": "reviewed",
  "addedAt": "2025-12-31"
}
```

- `pricing` = `lib/pricing.ts`'teki `ToolPricing`; `makePricing()` ile üretilir, bayraklar `model`'den türer.
- `access: []` = bilinmiyor. v1'de bu bilgi olmadığı için göçte boş bırakıldı.
- `facts` (isteğe bağlı): RouteAI'ın kendi doğruladığı ürün gerçekleri (`freeTierLimit`, `watermarkOnFree`, `commercialUse`) + `source` (URL) + `checkedAt`. Bilinmeyen alan yazılmaz.
- `promptGuide` (isteğe bağlı): `data/prompt-guides/<id>.md` (P7).
- Göçle gelen kayıtlarda `addedAt` = v1'deki `lastUpdated`.

### models.json

```json
{
  "id": "example-model",
  "name": "Example Model",
  "creator": "Example Lab",
  "aliases": [],
  "modalities": ["image"],
  "scores": [{ "source": "lmarena", "key": "text_to_image", "value": 0, "votes": 0, "rank": 1, "fetchedAt": "YYYY-MM-DD" }]
}
```

Bu dosyayı elle düzenleme; gece senkronu yazar. Burada gördüğün değerler şablondur, gerçek veri değildir.

### briefs.json

```json
{ "id": "image-logo-1", "taskId": "image.logo", "text": { "en": "...", "tr": "..." } }
```

Bir görevi test etmek için sabit, gerçekçi iş tarifi. Aynı brif her üründe aynen kullanılır, sonuçlar böylece karşılaştırılabilir.

### reviews.json — uzman değerlendirmesi

Örnek (biçim örneğidir, gerçek bir değerlendirme değildir):

```json
{
  "productId": "gamma-ai",
  "taskId": "slides.create",
  "briefId": "slides-create-1",
  "rubric": { "quality": 4, "ease": 5, "value": 4, "speed": 5 },
  "notes": { "tr": "Yapı iyi, iki slayt görsel olarak boş kaldı." },
  "reviewer": "ferit",
  "date": "2026-10-01",
  "evidenceUrl": "https://example.com/ekran-goruntusu.png"
}
```

**Rubrik (her boyut 1–5 tam sayı):** 1 = kullanılamaz, 2 = zayıf, 3 = idare eder, 4 = iyi, 5 = mükemmel.

| Boyut | Soru |
| --- | --- |
| `quality` | Çıktı brifin istediğini ne kadar iyi karşılıyor? |
| `ease` | Yeni başlayan biri bu sonuca ne kadar kolay ulaşır? |
| `value` | Fiyatına göre ne kadar değerli (ücretsiz katman dahil)? |
| `speed` | Brifi tamamlamak ne kadar hızlı? |

Skor motoru (P4) rubriği 0–1 aralığına çevirir: `(quality*0.5 + ease*0.2 + value*0.2 + speed*0.1 - 1) / 4`.

## Puanı kim, ne zaman değiştirir

- **Benchmark (B):** Sadece gece senkronu (`scripts/sync-models.mjs`), PR ile. Elle düzenlenmez.
- **Uzman değerlendirmesi (E):** Sadece `reviews.json`'a yeni kayıt ekleyerek. Her kayıtta brif, tarih, değerlendiren kişi ve mümkünse kanıt linki olur. Eski kayıt silinmez; yeni değerlendirme eklenir.
- **Kendi gözlemler (iş sonucu, karşılaştırma, oy):** Sadece `scripts/aggregate-signals.mjs` (P8) `data/signals.json`'a yazar, gece PR ile.
- **Ağırlıklar** (`lib/catalog/weights.ts`): Sadece Ferit değiştirir; değişiklik ROADMAP'e not edilir.
- Sponsorluk ya da affiliate bilgisi hiçbir puana ve sıralamaya girmez.

### Güncel model: `modelRule` (sürüm elle yazılmaz)

Ürün adında sürüm tutulmaz. Kartta görünen "Güncel model: X · kaynak · tarih", gece senkronundaki `models.json` içinden otomatik seçilir (`lib/catalog/currentModel.ts`):

```json
"modelRule": { "creator": "OpenAI", "include": ["gpt"], "exclude": ["mini", "nano"], "modality": "text" }
```

- `creator`: üretici (büyük/küçük harf ve boşluk duyarsız, "Google" ~ "Google DeepMind").
- `include`: model adında/id'sinde geçmesi gereken parçalardan en az biri. `exclude`: geçmemesi gerekenler.
- `modality`: `text`, `code`, `research`, `image`, `video`, `audio` (senkronun atadığı türler; müzik yok).
- Kurala uyan ve skoru olan modellerden **en yeni çıkış tarihli** seçilir; tarih yoksa en iyi sıralı. `models` dizisinde elle bağlanmış id varsa kural yerine onlar kullanılır.
- Her gece `data/sync-report.md` sonundaki "Ürün → güncel model" tablosu hangi ürünün hangi modele bağlandığını gösterir. Yanlış eşleşme varsa kuralı düzelt.

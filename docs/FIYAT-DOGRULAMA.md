# Fiyat doğrulama: fiyatlar nasıl güncel kalır

Kural (CLAUDE.md): hiçbir fiyat uydurulmaz; her sayı kaynağı ve tarihiyle `data/products.json`'da durur. Bir fiyat **60 günden eskiyse** arayüz tutarı göstermez ("Fiyat doğrulanmadı", `lib/pricing.ts` → `PRICE_STALE_AFTER_DAYS`). Yani fiyat güncel kalmazsa site dürüst ama işe yaramaz görünür. Bu belge o 60 günü nasıl tutacağını anlatır.

## Üç katman

| Katman | Ne yapar | Kim |
| --- | --- | --- |
| 1. Otomatik hat | Her pazartesi doğrulaması 21 günden eski/tarihsiz ürünlerin `pricingUrl` sayfasını okur, fiyatı çıkarır, **kanıtı sayfaya karşı doğrular**, farkı PR olarak açar | `check-prices` workflow (`npm run check:prices`) |
| 2. Elle liste | Makinenin okuyamadığı ya da emin olamadığı ürünler için doldurulacak liste | Sen: `npm run price:review` → doldur → `npm run price:apply` |
| 3. Arayüz kuralı | 60 günden eski fiyat gösterilmez; yanlış rakam yerine "doğrulanmadı" görünür | `lib/pricing.ts` (kodda hazır) |

Otomatik hat tek başına yetmez: bazı fiyat sayfaları JS ile çiziliyor ya da sadece yıllık fiyat gösteriyor. 2026-10-14 turunda 56 üründen yalnızca 13'ünün fiyatı sayfadan okunabilir ve kesin çıktı (bkz. `data/price-report.md`). Katman 2 bu yüzden zorunlu.

## Otomatik hat nasıl çalışır

1. Seçim: `priceCheckedAt` boş ya da 21 günden eski aktif ürünler (`--all` hepsi, `--only=id` belirli ürünler).
2. Sayfa: düz `fetch` (bir kez yeniden dener), metne çevrilir. JS ile çizilen sayfalarda fiyat çoğu zaman gömülü JSON'dadır; tutar içeren parçalar da metne eklenir. Uzun sayfada başlıktan sonraki fiyat bölümü kesilmez.
3. Sayfada hiç tutar yoksa OpenAI'a **sorulmaz** (uydurma riski): ürün "emin olunamadı" olur.
4. Çıkarım: `{model, startingPrice, currency, billing, evidence, freeTierEvidence}`.
5. **Doğrulama** (`verifyExtraction`): `evidence` sayfa metninde birebir geçmeli, `startingPrice` bu alıntıda yazmalı, `free`/`freemium` için ücretsiz plan alıntısı da sayfada geçmeli. Biri tutmazsa sonuç atılır.
6. Karşılaştırma (`comparePrice`):

| Durum | Anlamı | products.json'a yazılır mı |
| --- | --- | --- |
| `same` | Değişmedi | Evet, sadece `priceCheckedAt` tazelenir |
| `changed` | Küçük fark | Evet (PR'da görünür) |
| `review` | Model değişti, tutar >%50 oynadı ya da sadece yıllık fiyat var | **Hayır**; raporda önerilir. Onay: `npm run check:prices -- --accept=<id>` |
| `unknown` | Tutar/kanıt yok, USD değil | Hayır |
| `error` | Sayfa açılmadı (403, zaman aşımı) | Hayır |

7. Rapor `data/price-report.md` ve GitHub iş özeti; fark varsa `prices/auto` dalındaki tek PR güncellenir (her hafta yeni PR birikmez).
8. **Kırmızı bitme:** `OPENAI_API_KEY` yoksa ya da kontrol edilenlerin yarısından fazlası hata/emin değil ise iş kırmızı biter. İlk koşuda 46/46 hata yeşil bitmişti; bu artık olamaz.

## Neden haftalık ve 21 gün

Fiyat 60 gün sonra "eski" sayılır. Haftalık koşu + 21 günlük eşik: bir ürünün ilk denemesi en geç 27. günde olur; başarısız olursa haftalık yeniden deneme 60. güne kadar en az 4 şans daha verir (35., 42., 49., 56. günler). Yani bir aylık kesinti bile fiyatları eskitmez. Taze ürüne bakılmadığı için OpenAI maliyeti küçük kalır. Raporun sonundaki "doğrulaması 14 gün içinde sona erecek" bölümü elle müdahale için erken uyarıdır.

## Elle tur (haftada 10 dakika, ya da kırmızı rapor gelince)

```bash
npm run price:review     # data/price-review.md: doğrulanmamış ürünler, boş alanlarla
# her ürün için fiyat sayfasını aç; model, startingPrice, checkedAt (bugün) doldur
npm run price:apply
npm run validate:catalog
```

Tanımlar (`startingPrice` ve `model` için):

- `startingPrice`: en ucuz **ücretli bireysel** planın **aylık faturalanan** USD fiyatı. Sayfa sadece "yıllık faturalanır, aylık X" diyorsa onu yazma; aylık fiyatı bul ya da boş bırak.
- Tanıtım fiyatı ("ilk ay %83 indirim") değil, normal fiyat.
- `freemium`: ücretsiz planda **gerçekten** kullanılabilir bir kullanım var (0 kredi, sadece deneme ya da öğrenci indirimi ücretsiz plan sayılmaz).
- Ürün bir modelin adıysa ("Gemini 2.5 Pro") ve fiyat bir aboneliğin planıysa, hangi planın kastedildiğine karar ver ve sayfada o planın o modeli içerdiğini doğrula.

## Okunamayan sayfalar için kalıcı çözüm

`pricingUrl` kullanıcıya da link olarak gösterilir, ama makine için sunucuda çizilen (JS gerektirmeyen) bir sayfa olmalı. 2026-10-14 turunda:

- `grok.com/plans` yalnızca meta etiket döndürüyordu; `x.ai/pricing` fiyatları düz metin veriyor. `grok-41` ve `grok-imagine-v09-xai` için `pricingUrl` buna çevrildi.
- `chatgpt.com/pricing` tutarsız, ama `help.openai.com` makaleleri düz metin ("$20/month"). ChatGPT'de en ucuz planın Go olduğu görünüyor ve Go'nun fiyatı hiçbir okunabilir sayfada yok; bu yüzden ChatGPT elle doğrulanmalı.
- Yardım merkezi / dokümantasyon sayfaları (help.*, docs.*) genellikle okunabilir. Yeni `pricingUrl` eklerken önce sayfayı açıp **metinde tutar var mı** bak.

### Yeni pricingUrl eklemek

1. Ürünün resmi sitesinde fiyat sayfasını bul (ana sayfada "Pricing" bağlantısı; bazı sitelerde fiyat ana sayfada bir bölümdür).
2. `npm run check:url -- <adres>` ile dene. "Tutar var" diyorsa `data/products.json`'da ürünün `pricingUrl` alanına yaz. "OKUNAMADI (HTTP 403)" ya da "Tutar bulunamadı" diyorsa aşağıdaki elle alma yöntemini kullan ya da başka (yardım merkezi, dokümantasyon) bir adres dene.
3. Fiyat bölgeye göre değişen sitelerde (Gemini TRY gösteriyordu) ülke kodlu adres kullan: `https://gemini.google/us/subscriptions/`.
4. Ürünün kendi fiyat sayfası yoksa (açık kaynak model, başka bir ürünün içindeki özellik) `pricingUrl` boş kalabilir; rapor bunu "pricingUrl yok" diye listeler, hata sayılmaz.

### Bot engeli (HTTP 403) ve JS ile çizilen sayfalar: tarayıcıdan elle alma

Betik dürüst kimliğiyle gider (`RouteAI-price-check`); siteler bunu engelleyebilir. Engeli kandırmaya (sahte tarayıcı kimliği, captcha aşma, proxy) çalışılmaz: çoğu site kullanım şartlarında bunu yasaklar ve haftalık bir fiyat kontrolü için gerekmiyor. Onun yerine sayfayı **sen tarayıcıda görüp** metnini betiğe verirsin:

**Rehberli (önerilen):** `npm run price:snap -- --guided`. Doğrulanmamış ve fiyat sayfası adresi olan her ürün için sayfayı tarayıcıda açar; sen **Aylık**'ı seçip `Ctrl+A`, `Ctrl+C` yaparsın, terminale dönüp Enter'a basarsın, betik kaydeder. `s` atlar, `q` çıkar, `e` "uyarıya rağmen kaydet" demektir. Betik panonun boş, öncekiyle aynı ya da başka bir siteye ait olmasına karşı uyarır. Belirli ürünler için: `--guided --only=id,id`. Sonra `npm run check:prices -- --dry-run`.

**Tek ürün:**

1. Sayfayı kendi tarayıcında aç. Aylık/yıllık düğmesi varsa **Aylık**'ı seç.
2. `Ctrl+A`, `Ctrl+C`.
3. `npm run price:snap -- <ürün-id>` (panodaki metni `data/page-snapshots/<id>.txt` olarak, bugünün tarihiyle kaydeder).
4. `npm run check:prices -- --only=<ürün-id> --dry-run`.

Betik bir ürün için "emin değil" derse nedenini görmek için `npm run check:prices -- --only=<ürün-id> --dry-run --verbose`: OpenAI'nin bulduğu fiyat ve alıntılar da yazılır.

Betik o ürün için internete gitmez, kaydedilen metni kullanır; LLM çıkarımı ve "kanıt sayfada var mı" doğrulaması aynen çalışır. Kayıt **7 gün** geçerlidir (eski sayfayla bugünün fiyatını doğrulamamak için); doğrulama tarihi olarak sayfanın alındığı gün yazılır. Aynı sayfayı paylaşan ürünler (ChatGPT x2, Grok x2) tek kayıtla çözülür.

### Yıllık ve promosyon fiyat koruması

Fiyat sayfaları genellikle **yıllık** seçili açılır ve gösterilen "aylık" tutar ay ay ödenen fiyat değildir (ör. $25 yerine $20 görünür). Betik şu durumlarda fiyatı `products.json`'a **yazmaz**, "İnceleme gerekli" listesine koyar:

- alıntının kendisi "billed annually / per year / Save %" ya da "first month / regular price / % off" diyorsa,
- sayfada yıllık faturalama de geçiyor ama alıntı "billed monthly / month-to-month" demiyorsa.

Sayfayı açıp fiyatın gerçekten aylık olduğunu görürsen `npm run check:prices -- --accept=<id>` ile onayla. Fiyat zaten kayıtlıyla aynıysa bu kontrol devreye girmez (teyit edilir).

### 2026-10-14 adres turu: bulgular

| Ürün | Bulgu |
|---|---|
| Runway | `runwayml.com/pricing` → `runway.com/pricing`'a yönleniyor; sayfa okunuyor, yıllık seçili açılıyor (Standard $12 görünüyor; üstü çizili $15 muhtemelen aylık fiyat, sayfa etiketlemiyor). `pricingUrl` eklendi |
| Adcreative.ai | Ayrı fiyat sayfası yok; fiyatlar ana sayfada (Starter $39 aylık). `pricingUrl` ana sayfa olarak eklendi |
| Gemini, Gemini (görsel) | TR'den TRY geliyordu; `pricingUrl` `gemini.google/us/subscriptions/` yapıldı |
| Sora | OpenAI'ye göre web/uygulama 2026-04-26'da kapandı, API 2026-09-24'te kapanıyor. Katalogda `status: retired` yapılması karar bekliyor |
| Tome | Sunum ürünü 2025-04-30'da kapandı, tome.app artık satış yazılımı (Lightfield). `status: retired` karar bekliyor |
| FLUX | Katalogdaki `url` `flux-ai.io` (resmi Black Forest Labs sitesi `bfl.ai`). Doğru site ve plan seçilmeden `pricingUrl` eklenmedi |
| DALL-E 3, OpenAI Atlas | Kendi fiyat sayfaları yok, ChatGPT planlarının içinde. ChatGPT sayfası 403 verdiği için ya ChatGPT'nin elle alınan sayfasıyla ya da `pricingUrl` boş bırakılarak çözülür |
| Imagen 4, Veo 3 | Fiyatlar hem Gemini aboneliğinde hem Gemini API sayfasında; hangisinin kastedildiği karar bekliyor |
| Stable Diffusion XL | Açık model, ücretsiz; fiyat sayfası gerekmez |

### Otomasyon durumu (2026-10-14): neden çoğu ürün yarı otomatik?

Statik sayfa (tarayıcı olmadan indirilen HTML) çoğu sitede yalnızca **yıllık faturalamalı** fiyatı gösterir; aylık fiyat, tarayıcıda Aylık düğmesine basınca görünür. Betik bu yüzden "aylık fiyat" değil "yıllık fiyat" görür ve yazmaz. Çözüm `price:snap`: Aylık seçili halde kopyalanan sayfa aylık fiyatı da içerir.

| Durum | Ürünler |
|---|---|
| Tam otomatik olabilir (aylık fiyat statik sayfada yazıyor) | Adcreative.ai (ana sayfada "Starter $39/ay, aylık faturalama") |
| Yarı otomatik: sayfa okunuyor ama statik metinde yalnızca yıllık fiyat var, `price:snap` ile Aylık seçili kopyala | Base44, Elicit, Replit, Perplexity, Fathom, Canva, Ideogram (son ikisi betiğe 403 de verebilir) |
| Yarı otomatik: fiyatlar JavaScript ile çiziliyor, `price:snap` | Murf, Udio, NotebookLM, Kling (tüketici sayfası; `kling.ai/dev/pricing` API fiyatıdır, aynı şey değil) |
| Yarı otomatik: bot engeli (403), `price:snap` | ChatGPT |
| Otomatiğe uygun değil, elle karar | n8n (fiyatlar yalnızca EUR, ücretsiz plan yok, topluluk sürümü kendi sunucuda), Simplified (sayfada ücretsiz plan yok, Starter $79; katalogda `freemium`), FLUX (`flux-ai.io` tek seferlik kredi paketi satıyor, aylık abonelik değil), Imagen ve Veo (API birim fiyatı; katalogdaki "$0.035/ay" aslında görsel başına fiyat olabilir), DALL-E ve Atlas (ChatGPT planlarının içinde), Stable Diffusion XL (açık model), Sora ve Tome (kapandı) |

Tam otomatik yapmak için sayfayı bir tarayıcı gibi çalıştırıp Aylık düğmesine tıklamak gerekir (Playwright gibi bir paket; yeni bağımlılık, her sitenin düğmesi için ayrı ayar, bot korumalı siteler yine engeller). Aylık ~15 dakikalık `price:snap -- --guided` turu bunun yerine geçer.

## Periyodik koşu: kendi makinende (GitHub'sız)

GitHub ayarlarına erişimin yoksa ya da fiyatları yerelde tutuyorsan haftalık koşuyu Python betiği yapar (`scripts/price_scheduler.py`, yalnızca standart kütüphane):

```
python scripts/price_scheduler.py run --dry-run                 # önce dene: hiçbir dosya değişmez
python scripts/price_scheduler.py install --every-days 7 --at 09:00   # Windows zamanlanmış görev
python scripts/price_scheduler.py status
```

Her koşu: `data/products.json` yedeklenir (`logs/price-check/backup/`, son 20) → `npm run check:prices` → dosya değiştiyse `npm run validate:catalog` (bozulduysa **yedek geri yüklenir**) → `logs/price-check/latest.md` özeti → ayarlıysa bildirim (`PRICE_NOTIFY_WEBHOOK` ya da `PRICE_NOTIFY_SMTP_*`). Betik yayınlamaz: git push, deploy ve KV işlemi yoktur. Sayfası okunamayan ürünler her raporda "elle yapılacaklar" olarak çıkar; onları ayda bir `npm run price:snap -- --guided` ile çözersin (Aylık düğmesine betik basamaz). Bütün komutlar sırayla tek dosyada: **`docs/FIYAT-KOMUTLARI.md`**.

## Kurulum denetim listesi (bir kez)

- [ ] GitHub → Settings → Secrets → `OPENAI_API_KEY` tanımlı.
- [ ] Settings → Actions → General → "Allow GitHub Actions to create and approve pull requests" açık.
- [ ] Actions → check-prices → Run workflow, `all` işaretli. Rapor iş özetinde; kırmızı bittiyse nedeni orada yazar.
- [ ] İlk PR'daki `inceleme gerekli` ve `emin olunamadı` bölümlerini oku; gerekirse yukarıdaki elle turu çalıştır.
- [ ] Workflow'un başarısızlık e-postası GitHub bildirimlerinde açık (Settings → Notifications → Actions).

## Karar bekleyenler

`data/price-report.md` 5. bölüm: Gemini (AI Plus $4.99 mu, AI Pro $19.99 mu), Grok (hangi plan), Copilot Pro → Microsoft 365 Premium, ChatGPT Go. Bunlar kod değil ürün kararı: "bu ürün hangi planı temsil ediyor?" cevabı `data/README.md`'ye bir cümle olarak yazılırsa hat tutarlı çalışır.

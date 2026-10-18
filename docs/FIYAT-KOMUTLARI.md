# Fiyat doğrulama: bütün komutlar, sırayla (tek dosya)

Bu dosya fiyat doğrulaması için çalıştırman gereken **her komutu** sırasıyla verir. Açıklamalı anlatım için: `docs/FIYAT-DOGRULAMA.md`.

**Kurallar**

- Bütün komutlar **proje klasöründe** çalışır (Komut İstemi ya da PowerShell):
  `cd C:\Users\Kerem\Desktop\new\1\RouteAI-main\RouteAI-main`
- Bu komutlar hiçbir şeyi yayınlamaz: `git push`, deploy ya da canlı veritabanı (KV) işlemi yoktur. Sadece yerel `data/products.json` değişir.
- OpenAI anahtarını (`OPENAI_API_KEY`) kimseye gönderme, sohbete yapıştırma. Yalnızca kendi bilgisayarındaki `.env.local` dosyasında durur.

**Bir bakışta (her tur böyle gider)**

```
1. npm run price:snap -- --guided            sayfaları tarayıcıda aç, Aylık'ı seç, kopyala   (~15 dk)
2. npm run check:prices -- --dry-run         ne değişecek? (hiçbir şey yazılmaz)
3. python scripts/price_scheduler.py run     yedek al + gerçekten yaz + katalog denetimi
4. npm test                                  hepsi geçmeli
```

Periyodik (otomatik) koşu için Bölüm 6'ya bak.

---

## Bölüm 0: Bir kez yapılacaklar (ilk kurulum)

**0.1** Klasöre gir:

```
cd C:\Users\Kerem\Desktop\new\1\RouteAI-main\RouteAI-main
```

**0.2** Programlar kurulu mu? İkisi de bir sürüm numarası yazmalı (Python 3.8 ya da üstü):

```
node --version
python --version
```

`python` bulunamazsa `py --version` dene; o çalışıyorsa bu dosyadaki her `python` yerine `py` yaz. İkisi de yoksa python.org'dan Python'u kur (kurarken "Add python.exe to PATH" kutusunu işaretle).

**0.3** OpenAI anahtarı: proje klasöründeki `.env.local` dosyasında şu satır olmalı (değeri sen yazarsın, buraya ya da sohbete yapıştırma):

```
OPENAI_API_KEY=sk-...
```

**0.4** Güncelleme dosyalarını proje klasörüne kopyala (zip'in içindekileri, aynı klasör yapısıyla; sorarsa "Değiştir"). Sonra yedek al:

```
copy data\products.json data\products.yedek.json
copy data\price-report.md data\price-report-elle-tur.md
```

**0.5** Her şey yerinde mi? Testler yeşil çıkmalı, Python kısmının testi de:

```
npm test
python -I scripts/test_price_scheduler.py
```

---

## Bölüm 1: Fiyat doğrulama turu (elle başlatılan, sırayla)

**1.1 Sayfaları tarayıcıdan al (rehberli).** Aylık fiyat çoğu sitede ancak tarayıcıda "Aylık" düğmesine basınca görünür; betik bunu kendi yapamaz. Bu komut her ürünün sayfasını sırayla açar:

```
npm run price:snap -- --guided
```

Her ürün için: sayfa açılır → **Aylık**'ı seç → `Ctrl+A`, `Ctrl+C` → terminale dön → `Enter`.
`s` = bu ürünü atla, `q` = turu bitir, `e` = uyarıya rağmen kaydet.
Kayıtlar `data\page-snapshots\` içine yazılır ve **7 gün** geçerlidir; yani 1.1'den sonra 7 gün içinde 1.3'ü çalıştır.

Yalnızca belirli ürünler için:

```
npm run price:snap -- --guided --only=ideogram-20,tableau
```

**1.2 Ne olacağına bak (hiçbir şey yazılmaz).**

```
npm run check:prices -- --dry-run
```

Rapor ekrana yazılır. "emin değil" diyen ürünün nedenini görmek için (OpenAI'nin bulduğu fiyat ve alıntıyla):

```
npm run check:prices -- --only=ürün-id --dry-run --verbose
```

**1.3 Gerçekten yaz.** İki yoldan biri; ikincisi önerilir çünkü yedek alır, katalog bozulursa kendiliğinden geri yükler ve özet dosyası yazar:

```
python scripts/price_scheduler.py run
```

ya da yalın hâli (yedeği sen almış olmalısın):

```
npm run check:prices
npm run validate:catalog
```

**1.4 "İnceleme gerekli" çıkanlar.** Betik fiyatı yıllık/promosyon olabilir diye `products.json`'a **yazmamıştır**. Sayfayı kendin açıp fiyatın gerçekten **aylık** olduğunu görürsen onayla:

```
npm run check:prices -- --accept=ürün-id
```

Birden fazlası: `--accept=id1,id2`. (Not: `--accept` yalnızca o ürünleri işler. Bu komutu `python scripts/price_scheduler.py run --check-args="--accept=ürün-id"` diye de verebilirsin.)

**1.5 Katalog ve testler.**

```
npm run validate:catalog
npm test
```

Sonuçta bakılacak dosyalar:

| Dosya | Ne var |
|---|---|
| `data\price-report.md` | Betiğin ayrıntılı raporu: ne değişti, neden emin olamadı |
| `logs\price-check\latest.md` | Python koşusunun kısa özeti (en son koşu) |
| `data\products.json` | Fiyatların kendisi |

---

## Bölüm 2: Betiğin okuyamadıkları (elle liste)

Bot engeli, JS ile çizilen sayfa, tutar yok, ücretsiz plan belirsiz gibi durumlarda betik **tahmin etmez**; ürünü rapora koyar. Bunlar için elle liste:

```
npm run price:review
```

`data\price-review.md` oluşur. Her ürün için sayfayı aç, `model`, `startingPrice`, `checkedAt` (bugünün tarihi) alanlarını doldur; bilmediğini **boş bırak** (boş ürün değişmez). Sonra:

```
npm run price:apply
npm run validate:catalog
```

**Dikkat:** `npm run price:review` dosyanın üzerine yazar. Doldurup uygulamadığın değerler varken tekrar çalıştırma.

Tanımlar:

- `startingPrice`: en ucuz **ücretli bireysel** planın **aylık faturalanan** fiyatı (USD). Sayfa "yıllık faturalanır, aylık X" diyorsa X'i yazma.
- Tanıtım fiyatı ("ilk ay %50 indirim") değil, normal fiyat.
- `freemium`: ücretsiz planda gerçekten kullanılabilir bir kullanım var (sadece deneme/kredi yok sayılır).

---

## Bölüm 3: Yardımcı komutlar

| Ne yapmak istiyorsun | Komut |
|---|---|
| Tek ürünün sayfasını kaydet (panodan) | `npm run price:snap -- ürün-id` |
| Pano çalışmıyorsa: metni dosyaya yapıştırıp ver | `npm run price:snap -- ürün-id --file=C:\yol\sayfa.txt` |
| Bir fiyat adresi betiğe uygun mu? | `npm run check:url -- https://site.com/pricing` |
| Sadece belirli ürünleri kontrol et | `npm run check:prices -- --only=id1,id2` |
| Taze olanlar dahil hepsini kontrol et | `npm run check:prices -- --all` |
| Doğrulaması şu günden eskiler | `npm run check:prices -- --max-age-days=30` |
| Python ile aynıları | `python scripts/price_scheduler.py run --check-args="--only=id1,id2"`, `run --all`, `run --max-age-days=30` |

`check:url` sonuçları: **Tutar var** → `data\products.json`'da ürünün `pricingUrl` alanına yazılabilir. **OKUNAMADI (HTTP 403)** → bot engeli, `price:snap` kullan. **Tutar bulunamadı** → sayfa JS ile çiziliyor ya da yanlış sayfa; başka adres dene.

Ürün id'leri `data\price-report.md`'de parantez içindeki adlardır (ör. `ideogram-20`).

### ChatGPT için

ChatGPT (`chatgpt-gpt-5`) ve ChatGPT (görsel) (`chatgpt-gpt-4o-image`) aynı sayfayı paylaşır; tek kayıt ikisini çözer:

```
npm run price:snap -- chatgpt-gpt-5
npm run check:prices -- --only=chatgpt-gpt-5,chatgpt-gpt-4o-image --dry-run --verbose
```

Burada karar senin: "ChatGPT'nin başlangıç fiyatı" **Go** planı mı (en ucuz ücretli plan) yoksa **Plus** (20 USD) mu? Seçtiğin planın fiyatı sayfada aylık olarak yazıyor mu, ona bak. Sayfa 403 verirse `price:review` ile elle gir.

---

## Bölüm 4: Bir şey ters giderse (geri alma)

**En kolayı (Python yedeği):**

```
python scripts/price_scheduler.py restore
python scripts/price_scheduler.py restore --yes
```

İlki hangi yedeğin geri yükleneceğini gösterir, ikincisi yükler (o anki dosya önce yine yedeklenir). Ardından: `npm run validate:catalog`.

**İlk kurulumdaki yedekten:**

```
copy data\products.yedek.json data\products.json
npm run validate:catalog
```

Yedekler `logs\price-check\backup\` içindedir (son 20 tanesi tutulur).

---

## Bölüm 5: Periyodik koşuyu denemek (bir kez, elle)

Zamanlamadan önce elle bir kez dene. **Önce dene-modu** (hiçbir dosyayı değiştirmez, bildirim göndermez):

```
python scripts/price_scheduler.py run --dry-run
```

Sonra gerçek koşu:

```
python scripts/price_scheduler.py run
```

Bu komut sırayla şunları yapar:

1. `data\products.json` yedeklenir.
2. `npm run check:prices` çalışır (yeni fiyatlar yalnızca kanıtı doğrulanırsa yazılır).
3. Dosya değiştiyse `npm run validate:catalog` çalışır; **bozulduysa yedek geri yüklenir** ve sonuç BAŞARISIZ olur.
4. Özet `logs\price-check\latest.md` dosyasına yazılır; ayarlıysa bildirim gider.

İsteğe bağlı: `--with-tests` (değişiklikten sonra `npm test` de çalışır, geçmezse geri alır), `--no-validate`, `--no-notify`.

Sonuç etiketleri:

| Etiket | Anlamı | Ne yaparsın |
|---|---|---|
| **TAMAM** | Sorun yok | Bir şey |
| **DİKKAT** | İnceleme gereken, okunamayan ya da süresi dolmak üzere ürünler var | `logs\price-check\latest.md`'yi oku; 1.1 ya da 1.4 |
| **BAŞARISIZ** | Anahtar yok, betik çöktü, katalog bozuldu ya da zaman aşımı | `latest.md`'deki nedene bak; gerekirse Bölüm 4 |

Çıkış kodları: `0` tamam/dikkat/atlandı, `1` başarısız, `2` ayar hatası (anahtar yok, yanlış klasör).

---

## Bölüm 6: Otomatik periyodik koşu (Windows)

**6.1 Kur.** Haftada bir, her gün saat 09:00'da bakar; son başarılı koşudan 7 gün geçmişse çalıştırır (kapalıyken kaçırdığını ertesi gün yakalar):

```
python scripts/price_scheduler.py install --every-days 7 --at 09:00
```

**6.2 Kontrol et.**

```
python scripts/price_scheduler.py status
```

Son koşunun zamanı, sonucu ve görevin kurulu olup olmadığı yazılır. İstersen Windows'ta: `schtasks /Run /TN RouteAI-PriceCheck` ile görevi hemen bir kez çalıştırabilirsin.

**6.3 Kaldır.**

```
python scripts/price_scheduler.py uninstall
```

**Bilmen gerekenler**

- Görev yalnızca **bilgisayar açıkken ve sen Windows'ta oturum açmışken** çalışır.
- Klasör yolu uzunsa (Windows görev satırı sınırı ~260 karakter) kurulum "yolu kısalt" der; projeyi daha kısa bir yola taşı (ör. `C:\RouteAI`).
- Mac/Linux'ta `install` bir `crontab` satırı yazdırır; `crontab -e` ile ekle.
- Proje klasörünü taşırsan görevi `uninstall` + `install` ile yeniden kur.
- Zamanlanmış koşu **Aylık düğmesine basamaz**. Sayfası okunamayan ürünler her raporda "elle yapılacaklar" olarak listelenir; bunları ayda bir `npm run price:snap -- --guided` (Bölüm 1.1) ile çöz, hemen ardından `python scripts/price_scheduler.py run` çalıştır.
- Önerilen ritim: **haftalık otomatik koşu** + **ayda bir ~15 dakikalık rehberli tur**. Fiyatlar 60 günden eskiyse arayüz rakam göstermez, o yüzden ayda bir tur yeter.
- Rehberli turda kaydedilen sayfa 7 gün geçerlidir. Doğrulaması 21 günü geçen ürünler haftalık raporlarda tekrar "elle yapılacaklar" arasında görünebilir; bu normaldir, o ayki turu yaptıysan fiyatlar zaten 60 günün içindedir.
- Betik hiçbir şeyi yayınlamaz. Fiyatlar siteye, normal yayın akışınla (sen çalıştırınca) gider.

**Pencere açık kaldıkça döngü (zamanlama kurmadan):**

```
python scripts/price_scheduler.py loop --every-days 7
```

---

## Bölüm 7: Bildirim (isteğe bağlı)

Sonuç sana kendiliğinden ulaşsın istersen `.env.local` dosyasına (bu betik yalnızca `PRICE_NOTIFY_` ile başlayan satırları okur) aşağıdakilerden birini ekle.

**Telefon bildirimi (ntfy.sh, hesapsız):** ntfy uygulamasını kur, tahmin edilmesi zor bir konu adı seç, o konuya abone ol:

```
PRICE_NOTIFY_WEBHOOK=https://ntfy.sh/routeai-fiyat-kerem-7391
```

Konu adını herkes bilirse mesajı okuyabilir; o yüzden uzun ve rastgele bir ad kullan. Slack/Discord için ek olarak `PRICE_NOTIFY_WEBHOOK_FORMAT=json`.

**E-posta (örnek: Gmail "uygulama şifresi" ile):**

```
PRICE_NOTIFY_SMTP_HOST=smtp.gmail.com
PRICE_NOTIFY_SMTP_PORT=587
PRICE_NOTIFY_SMTP_USER=adresin@gmail.com
PRICE_NOTIFY_SMTP_PASS=uygulama-sifresi
PRICE_NOTIFY_MAIL_FROM=adresin@gmail.com
PRICE_NOTIFY_MAIL_TO=adresin@gmail.com
```

Ne zaman bildirsin: `PRICE_NOTIFY_WHEN=auto` (varsayılan: sorun, inceleme ya da fiyat değişikliği varsa), `always`, `failed` (yalnızca başarısızlık), `never`.

Dene:

```
python scripts/price_scheduler.py notify-test
```

---

## Bölüm 8: Sorun giderme

| Gördüğün | Anlamı | Çözüm |
|---|---|---|
| `OPENAI_API_KEY bulunamadı` | `.env.local` içinde anahtar yok ya da dosya başka klasörde | Bölüm 0.3; dosya proje klasöründe olmalı |
| `HTTP 403` / `bot engeli` | Site betiği reddediyor | `npm run price:snap -- ürün-id` (ya da `--guided`) |
| `İNCELEME (...yıllık...)` | Sayfa yıllık fiyatı gösteriyor, fiyat yazılmadı | Aylık'ı seçip `price:snap`, sonra tekrar çalıştır; gerçekten aylıksa `--accept=id` |
| `emin değil` | Sayfada net tutar/kanıt yok ya da para birimi USD değil | `--only=id --dry-run --verbose` ile nedenine bak |
| `elle alınan sayfa ... eski` | Kayıt 7 günden eski | `price:snap`'i yeniden çalıştır |
| `Kontrol edilen N üründen M'i hata` | Sistemik sorun (engel, anahtar ya da site değişti) | `data\price-report.md` ilk bölümleri; birkaç ürünü `--verbose` ile dene |
| `Bu klasör RouteAI projesi gibi görünmüyor` | Yanlış klasördesin | `cd` ile proje klasörüne gir ya da `--project "C:\...\RouteAI-main"` ekle |
| `npm bulunamadı` | Node/npm PATH'te değil (zamanlanmış görevde olur) | Node'u yeniden kur, PATH'e ekle; sonra görevi `uninstall` + `install` |
| `Atlandı: başka bir koşu sürüyor` | Önceki koşu bitmedi (kilit dosyası `logs\price-check\run.lock`) | Bekle; 2 saatten eskiyse kilit kendiliğinden temizlenir |
| Katalog denetimi başarısız, geri alındı | Bir fiyat şemaya uymuyor | `logs\price-check\run-*.log` içindeki hataya bak; `--only` ile ürünü ayır |
| Windows'ta `python` açılmıyor / Mağaza açılıyor | Python kurulu değil ya da PATH yok | python.org'dan kur; ya da `py` kullan |
| PowerShell `--` seçeneklerini yutuyor | Nadir bir PowerShell davranışı | Komutu "Komut İstemi"nde (cmd) çalıştır |

---

## Bölüm 9: Karar bekleyenler (kod değil, ürün kararı)

Bu kararları sen verirsin; betik bunları kendi başına seçmez:

- **Sora** ve **Tome**: kapanmış görünüyor. Katalogda `status: 'retired'` yapılması öneriliyor.
- **ChatGPT**: başlangıç fiyatı Go mu (8), Plus mu (20)?
- **Gemini**: AI Plus ($4.99) mu, AI Pro ($19.99) mu?
- **FLUX**: katalogdaki `url` `flux-ai.io` (resmi site `bfl.ai`).
- **Simplified**: sayfada ücretsiz plan yok, katalogda `freemium`.
- **n8n**: fiyatlar yalnızca EUR.
- **Imagen / Veo**: API birim fiyatı mı, abonelik mi?
- **Tarayıcı otomasyonu (Playwright)**: Aylık düğmesine betiğin kendisinin basması için gerekir; yeni bağımlılık olduğu için ancak sen açıkça izin verirsen eklenir.

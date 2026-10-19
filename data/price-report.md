# Fiyat raporu

Koşu: 2026-10-19. Değişen ve teyit edilen fiyatlar products.json'a önerildi; PR merge edilince geçerli.
Bu koşuda 28 ürüne bakıldı, 69 ürün yeterince yeni olduğu için atlandı.
Güncellemeler sonrası doğrulanmış (son 60 gün) fiyat: **70/97** aktif ürün.

**Durum: tamam.** 13 ürün okunamadı; elle doğrulama gerekebilir (npm run price:review).

## Değişti (1)

- v0: freemium — → freemium 30 USD (https://v0.app/pricing) — kanıt: "Plus Popular $30 $ 90 /user/month"

## İnceleme gerekli (products.json'a YAZILMADI) (14)

- Uizard (`uizard`): sayfada yıllık faturalama da var, kanıt aylık fiyat olduğunu açıkça söylemiyor (aylık/yıllık düğmesi olabilir). Önerilen: freemium 12 USD (https://uizard.io/pricing/) — kanıt: "$12 per month". Onaylamak için: `npm run check:prices -- --accept=uizard`. Aylık fiyatı görmek için sayfada Aylık'ı seçip `npm run price:snap -- uizard`
- Figma Make (`figma-make`): kanıt yıllık faturalamayı gösteriyor. Önerilen: freemium 16 USD (https://www.figma.com/pricing/) — kanıt: "Professional Monthly Annual Full seat $16 /mo + 3,000 AI credits/mo". Onaylamak için: `npm run check:prices -- --accept=figma-make`. Aylık fiyatı görmek için sayfada Aylık'ı seçip `npm run price:snap -- figma-make`
- Clay (`clay`): sayfada yıllık faturalama da var, kanıt aylık fiyat olduğunu açıkça söylemiyor (aylık/yıllık düğmesi olabilir). Önerilen: freemium 167 USD (https://www.clay.com/pricing) — kanıt: "$167/mo Starts at 15,000 actions/mo". Onaylamak için: `npm run check:prices -- --accept=clay`. Aylık fiyatı görmek için sayfada Aylık'ı seçip `npm run price:snap -- clay`
- Intercom Fin (`intercom-fin`): model değişti: paid → freemium. Önerilen: freemium 19 USD (https://www.intercom.com/pricing) — kanıt: "Intercom helpdesk $19 per seat/mo". Onaylamak için: `npm run check:prices -- --accept=intercom-fin`
- Tidio (`tidio`): sayfada yıllık faturalama da var, kanıt aylık fiyat olduğunu açıkça söylemiyor (aylık/yıllık düğmesi olabilir). Önerilen: freemium 24.17 USD (https://www.tidio.com/pricing/) — kanıt: "Starter $ 24.17 /mo.". Onaylamak için: `npm run check:prices -- --accept=tidio`. Aylık fiyatı görmek için sayfada Aylık'ı seçip `npm run price:snap -- tidio`
- Chatbase (`chatbase`): sayfada yalnızca yıllık faturalamalı aylık fiyat var. Önerilen: freemium 32 USD (https://www.chatbase.co/pricing) — kanıt: "$32 /month billed yearly". Onaylamak için: `npm run check:prices -- --accept=chatbase`. Aylık fiyatı görmek için sayfada Aylık'ı seçip `npm run price:snap -- chatbase`
- QuickBooks (`quickbooks`): kanıtta indirim/promosyon ibaresi var. Önerilen: freemium 19 USD (https://quickbooks.intuit.com/pricing/) — kanıt: "$19 / mo 50% off for 3 months*". Onaylamak için: `npm run check:prices -- --accept=quickbooks`
- Zoho Books (`zoho-books`): kanıt yıllık faturalamayı gösteriyor. Önerilen: freemium 20 USD (https://www.zoho.com/us/books/pricing/) — kanıt: "$ 20 $ 15 Price/Org/Month Price/Org/Month Billed Annually". Onaylamak için: `npm run check:prices -- --accept=zoho-books`. Aylık fiyatı görmek için sayfada Aylık'ı seçip `npm run price:snap -- zoho-books`
- Surfer (`surfer-seo`): model değişti: paid → freemium. Önerilen: freemium 49 USD (https://surferseo.com/pricing/) — kanıt: "Discovery 49 USD per month Billed yearly Save $120". Onaylamak için: `npm run check:prices -- --accept=surfer-seo`
- monday.com (`monday-com`): sayfada yıllık faturalama da var, kanıt aylık fiyat olduğunu açıkça söylemiyor (aylık/yıllık düğmesi olabilir). Önerilen: freemium 9 USD (https://monday.com/pricing) — kanıt: "Basic $ 9 seat / month". Onaylamak için: `npm run check:prices -- --accept=monday-com`. Aylık fiyatı görmek için sayfada Aylık'ı seçip `npm run price:snap -- monday-com`
- Dia (`dia-browser`): model değişti: freemium → free. Önerilen: free 0 USD (https://www.diabrowser.com) — kanıt: "Download Dia for free". Onaylamak için: `npm run check:prices -- --accept=dia-browser`
- Reclaim (`reclaim`): sayfada yıllık faturalama da var, kanıt aylık fiyat olduğunu açıkça söylemiyor (aylık/yıllık düğmesi olabilir). Önerilen: freemium 10 USD (https://reclaim.ai/pricing) — kanıt: "Starter For small teams. $10 per seat/month". Onaylamak için: `npm run check:prices -- --accept=reclaim`. Aylık fiyatı görmek için sayfada Aylık'ı seçip `npm run price:snap -- reclaim`
- Motion (`motion`): model değişti: paid → freemium. Önerilen: freemium 19 USD (https://www.usemotion.com/pricing) — kanıt: "$ 19 /seat /mo". Onaylamak için: `npm run check:prices -- --accept=motion`
- Notion AI (`notion-ai`): sayfada yıllık faturalama da var, kanıt aylık fiyat olduğunu açıkça söylemiyor (aylık/yıllık düğmesi olabilir). Önerilen: freemium 10 USD (https://www.notion.com/pricing) — kanıt: "Plus $10 per member / month". Onaylamak için: `npm run check:prices -- --accept=notion-ai`. Aylık fiyatı görmek için sayfada Aylık'ı seçip `npm run price:snap -- notion-ai`

## Teyit edildi (0)

- yok

## Emin olunamadı (12)

- Ludo.ai (`ludo-ai`): kanıt cümlesi sayfada bulunamadı
- PixelLab (`pixellab`): kanıt cümlesi sayfada bulunamadı
- Hyper3D Rodin (`hyper3d-rodin`): tutar (0) kanıt cümlesinde yok
- Apollo.io (`apollo-io`): kanıt cümlesi sayfada bulunamadı
- Instantly (`instantly`): ücretsiz plan kanıtı sayfada bulunamadı
- Khanmigo (`khanmigo`): sayfada tutar bulunamadı
- Duolingo (`duolingo`): sayfada tutar yok (JS ile çiziliyor ya da giriş istiyor olabilir)
- Speak (`speak`): sayfada tutar bulunamadı
- Praktika (`praktika`): ücretsiz plan kanıtı sayfada bulunamadı
- Perplexity Comet (`perplexity-comet`): ücretsiz plan kanıtı sayfada bulunamadı
- Superhuman (`superhuman`): sayfada tutar yok (JS ile çiziliyor ya da giriş istiyor olabilir)
- Reflect (`reflect`): kanıt cümlesi sayfada bulunamadı

## Hata (1)

- Tripo: HTTP 403 (bot engeli ya da giriş isteniyor olabilir). Çözüm: npm run price:snap -- tripo

## Sayfası elle alınarak çözülebilecekler (3)

- Tripo: sayfayı tarayıcıda aç, Ctrl+A, Ctrl+C, sonra `npm run price:snap -- tripo`
- Duolingo: sayfayı tarayıcıda aç, Ctrl+A, Ctrl+C, sonra `npm run price:snap -- duolingo`
- Superhuman: sayfayı tarayıcıda aç, Ctrl+A, Ctrl+C, sonra `npm run price:snap -- superhuman`

## pricingUrl yok (0)

- yok

## Doğrulaması 14 gün içinde sona erecek (0)

- yok

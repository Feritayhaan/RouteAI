# Yeni iş kataloğu: rapor (kaynak kanıtları)

Hazırlanma tarihi: 2026-10-18. Durum: **BİRLEŞTİRİLDİ (2026-10-18, Kerem’in kararlarıyla).** Taslak onaylandı ve canlı kataloğa girdi: `data/tasks.json` (+15 görev), `data/products.json` (+45 ürün, hepsi `active`; +5 mevcut ürüne yeni görev eşlemesi), `evals/golden.jsonl` (+30 satır, hepsi `needsReview: true`, Ferit onayı bekliyor). Taslak dosyaları silindi; bu rapor **kaynak kanıtı** olarak kalıyor (hangi sayfa okundu, sayfada ne yazıyordu). Test: `lib/__tests__/newTasks.test.ts`.

Kerem’in kararları (2026-10-18): (1) `legal.contract-review` (Spellbook, Juro, SpotDraft) **kataloğa ALINMADI**; bu rapordaki o bölümler yalnızca kayıt için duruyor. (2) “cv hazırla” `docs.create`’te kalır. (3) Fiyatı bilinmeyen ürünler de `active` (arayüzde “Fiyat doğrulanmadı”). (4) Golden satırları `needsReview: true` ile eklendi.

Aşağıdaki “taslak/öneri” dilindeki cümleler taslak aşamasından kalma kayıttır; güncel durum için bu başlığa ve 7. bölüme bak.

## 1. Özet

- **16 görev önerilmişti, 15’i alındı** (sözleşme inceleme çıkarıldı) (oyun/3D/yaratıcı, iş fonksiyonları, eğitim, kişisel verimlilik ve ajanlar) + mevcut `3d.generate` görevine **3 yeni araç** (derinlik).
- **48 ürün önerilmişti, 45’i alındı** (Spellbook, Juro, SpotDraft çıkarıldı). Taslakta hepsi `candidate` idi; birleştirirken Kerem’in kararıyla hepsi `active` yapıldı.
- **5 mevcut ürüne** yeni görev eşlemesi önerildi (hepsinin resmi sayfası bu turda okundu; Writesonic için kısmi eşleme uyarısı var).
- Çakışma ölçümü: mevcut 128 golden satırdan kural sonucu değişen **0**; taslak golden satırlarında kural katmanı 32 satırın 32’inde doğru, 0’inde belirsiz (LLM’e gider), **0’inde yanlış**.
- Sağlık ve bilim araçları **bilerek ertelendi** (tıbbi içerik Ferit’in güvenlik incelemesi olmadan kataloğa girmemeli).

| Görev | Araçlar |
| --- | --- |
| `game.dev` Oyun geliştirme | Unity AI, Rosebud AI, Bezi, GDevelop |
| `game.asset-art` Oyun görseli ve varlıkları | Scenario, Ludo.ai, PixelLab |
| `design.ui-prototype` Arayüz tasarımı ve prototip | v0, Uizard, Figma Make |
| `sales.prospecting` Müşteri adayı bulma | Apollo.io, Clay, Instantly |
| `support.chatbot` Müşteri destek botu | Intercom Fin, Tidio, Chatbase |
| `finance.bookkeeping` Muhasebe ve gider takibi | QuickBooks, Xero, Zoho Books |
| `marketing.seo` SEO içeriği | Surfer, Frase, Writesonic (mevcut ürün) |
| `project.management` Proje ve görev yönetimi | Asana, monday.com, ClickUp Brain (mevcut ürün) |
| ~~`legal.contract-review` Sözleşme inceleme~~ (ALINMADI) | ~~Spellbook, Juro, SpotDraft~~ |
| `education.tutor` Yapay zekâ öğretmen | Khanmigo, Photomath, ChatGPT (mevcut ürün), Gemini (mevcut ürün) |
| `education.language-learning` Yabancı dil öğrenme | Duolingo, Speak, Praktika |
| `agent.browser` Yapay zekâlı tarayıcı | Perplexity Comet, Dia, Opera Neon |
| `productivity.inbox` E-posta kutusu yönetimi | Superhuman, Shortwave, Fyxer |
| `productivity.planning` Takvim ve günlük planlama | Reclaim, Motion, Akiflow |
| `productivity.notes` Not alma ve bilgi yönetimi | Notion AI, Mem, Reflect |
| `career.resume` Özgeçmişi ilana göre uyarlama | Kickresume, Rezi, Teal (mevcut ürün) |
| `3d.generate` (mevcut) | Meshy, Tripo, Hyper3D Rodin (+ mevcut World Labs Marble) |

## 2. Bu veriye nasıl güvenilmeli (önemli)

- Her bilgi **resmi ürün sayfasından** okundu, ama sayfalar bu ortamda **otomatik bir sayfa özetleyiciyle** okundu (tarayıcıyla elle değil). Alıntılar özetleyicinin sayfadan çıkardığı ifadelerdir. Fiyat ve plan bilgisi bu yüzden **elle yeniden doğrulanmalı**: `npm run price:snap -- --guided` ve `npm run check:prices`.
- Fiyat kuralı (docs/FIYAT-DOGRULAMA.md): `startingPrice` = en ucuz ücretli bireysel planın **aylık ödemeli** USD fiyatı. Sayfa yalnızca yıllık-eşdeğer, promosyonlu ya da aylık/yıllık etiketi olmayan tutar gösteriyorsa **null** bırakıldı; olası değer "aday" olarak notlandı. Bu yüzden ürünlerin çoğunda fiyat bilinmiyor görünür: bu bilinçli, uydurmaktan iyidir.
- Ücretsiz mi? Sayfada açıkça yazmıyorsa model `paid` bırakıldı (lib/pricing.ts: veri yokluğunda "ücretsiz" demek tek yanlış yön). Bu, Comet ve PixelLab gibi ürünler için "belki ücretsizdir" ihtimalini dışlamaz; elle bakılmalı.
- Talep ölçülmedi: bu görevlerin gerçekte ne kadar arandığı bilinmiyor (analitik sorgu metni tutmuyor). Önce küçük bir yayın, sonra `clarifyRate` ve görev dağılımına bakmak mantıklı.
- Ürün açıklamaları sayfanın kendi cümlelerine dayanır; sayfada yazmayan bir yetenek (ör. "kodu dışa aktarır") yazılmadı.

## 3. Görevler ve araçlar

### Görev: `game.dev` — Oyun geliştirme

Oyun yapma: yapay zekâ asistanıyla oyun prototipi ve oyun kodu üretme (bir oyun motorunda ya da tarayıcıda).

Anahtar kelimeler (kural katmanı): `oyun geliştir`, `oyun yap`, `oyun motoru`, `oyun prototipi`, `oyun kodu`, `oyun tasarla`, `oyun projesi`, `unity`, `unreal`, `godot`, `roblox`, `gamedev`, `game development`, `make a game`, `build a game`, `game engine`, `game prototype`, `game code`, `unity`, `unreal engine`, `godot`, `roblox`, `gamedev`, `game dev`


### Unity AI

- Adres: https://unity.com/features/ai  ·  Fiyat sayfası: https://unity.com/features/ai
- Fiyat kararı: **ücretli, aylık 10 USD (2026-10-18)**. 10 USD = Personal sürümde deneme sonrası aylık abonelik; asistan kredi de kullanıyor. Beta olduğu için fiyat değişebilir.
- Ücretsiz kullanım: Personal sürümde asistanın ücretsiz denemesi var; CLI, MCP sunucusu ve eklenti ücretsiz
- Doğrulama (okunan sayfa → sayfadaki ifade):
  - https://unity.com/features/ai → "an agentic assistant in the Editor, plus a CLI, MCP server, and official plugins"
  - https://unity.com/features/ai → Personal Edition: free trial of the assistant, which "converts to a $10/month subscription"; Pro/Enterprise/Industry: assistant included in the paid subscription
  - https://unity.com/features/ai → "Start building with Unity's AI tools in beta" · "It requires Unity 6.0 and up"

### Rosebud AI

- Adres: https://rosebud.ai  ·  Fiyat sayfası: https://rosebud.ai/pricing
- Fiyat kararı: **freemium, aylık 15 USD (2026-10-18)**
- Ücretsiz kullanım: Free plan: haftada 8000 kredi, kredi kartı yok
- Doğrulama (okunan sayfa → sayfadaki ifade):
  - https://rosebud.ai/ → "Create playable games with AI prompts." · "Describe your idea or choose a template, then build and deploy your game." · "No coding required."
  - https://rosebud.ai/pricing → "The Free plan starts you with 8,000 credits and no credit card." · Indie Dev: "$15/month" (billed monthly)

### Bezi

- Adres: https://www.bezi.com  ·  Fiyat sayfası: https://www.bezi.com/pricing
- Fiyat kararı: **freemium, aylık 20 USD (2026-10-18)**
- Ücretsiz kullanım: Free: 100 kredi, 1 çalışma alanı, en çok 2 sayfa; modellere sınırlı erişim
- Doğrulama (okunan sayfa → sayfadaki ifade):
  - https://www.bezi.com/pricing → "Transparent pricing for AI-powered Unity development." (meta description)
  - https://www.bezi.com/pricing → Free: "No credit card required", "100 credits", "1 Workspace", "Up to 2 Pages"; Pro: "$20" "/month" (aylık gösterilmiş, yıllık fiyat yok)

### GDevelop

- Adres: https://gdevelop.io  ·  Fiyat sayfası: https://gdevelop.io/pricing
- Fiyat kararı: **freemium, fiyat girilmedi (bilinmiyor)**. Silver planın fiyatı sayfada boş yer tutucu ("-USD per month") olarak görünüyor.
- Ücretsiz kullanım: İlk oyun %100 ücretsiz; Silver planda haftada 200 AI kredisi
- Doğrulama (okunan sayfa → sayfadaki ifade):
  - https://gdevelop.io/pricing → "AI is integrated in GDevelop: you can open it at any moment" (SSS)
  - https://gdevelop.io/pricing → "Create your first game 100% free." · Silver: "200 AI credits per week" · fiyat: boş "-USD per month"

### Görev: `game.asset-art` — Oyun görseli ve varlıkları

Oyun görseli üretme: sprite, karakter, doku, karo seti ve oyun arayüzü.

Anahtar kelimeler (kural katmanı): `oyun görseli`, `oyun karakteri`, `oyun varlığı`, `oyun varlıkları`, `oyun assetleri`, `oyun arka planı`, `oyun ikonları`, `oyun dokusu`, `sprite`, `piksel sanat`, `pixel art`, `tileset`, `game asset`, `game art`, `game character art`, `game textures`, `game icons`, `sprite sheet`, `sprites`, `pixel art`, `tileset`, `2d game assets`, `character sprite`


### Scenario

- Adres: https://www.scenario.com  ·  Fiyat sayfası: https://www.scenario.com/pricing
- Fiyat kararı: **freemium, aylık 15 USD (2026-10-18)**
- Ücretsiz kullanım: Her gün 50 ücretsiz kredi, kredi kartı yok
- Doğrulama (okunan sayfa → sayfadaki ifade):
  - https://www.scenario.com/ → "The leading AI models in one place for creative production and game assets." · "Turn one image into a textured 3D model, then rig it and take it into your engine."
  - https://www.scenario.com/pricing → "50 free daily credits · No credit card required" · Starter: "$15/mo" (Monthly seçeneği altında)

### Ludo.ai

- Adres: https://ludo.ai  ·  Fiyat sayfası: https://ludo.ai/pricing
- Fiyat kararı: **freemium, fiyat girilmedi (bilinmiyor)**. Indie plan kartında "$15/mo paid annually" (yıllık), meta açıklamada "Indie $20/mo": iki rakam çelişiyor, aylık ödeme fiyatı sayfada yok. Aday: 20.
- Ücretsiz kullanım: 30 ücretsiz üretim kredisiyle başlanır
- Doğrulama (okunan sayfa → sayfadaki ifade):
  - https://ludo.ai/ → "Production-ready game assets - sprites, icons, UI, textures, music, 3D, and video - generated by AI" · animasyon: "Idle, walk, run, attack, hit, death"
  - https://ludo.ai/pricing → "Start free with 30 generation credits." · Indie: "$15/ mo paid annually" · meta: "Indie $20/mo"

### PixelLab

- Adres: https://www.pixellab.ai  ·  Fiyat sayfası: https://www.pixellab.ai/pricing
- Fiyat kararı: **ücretli, fiyat girilmedi (bilinmiyor)**. Fiyat tablosu sayfada "Loading subscription plans..." olarak kaldı; model "paid" yalnızca güvenli varsayılan.
- Ücretsiz kullanım: Ücretsiz deneme ("Try for free", kredi kartı yok); sürekli ücretsiz plan olup olmadığı sayfada yok
- Doğrulama (okunan sayfa → sayfadaki ifade):
  - https://www.pixellab.ai/ → "Create unique pixel art assets for your game 10x faster with AI" · "Generate walking, running, attacking, and custom animations for your sprite sheets."
  - https://www.pixellab.ai/pricing → "Try for free" · "No credit card required" · "Loading subscription plans..."

### Görev: `design.ui-prototype` — Arayüz tasarımı ve prototip

Uygulama ya da web sitesi ekranlarını tasarlayıp tıklanabilir ya da çalışan prototipe çevirme.

Anahtar kelimeler (kural katmanı): `arayüz`, `arayüz tasarla`, `arayüz tasarımı`, `uygulama arayüzü`, `ui tasarım`, `ui prototip`, `ux tasarım`, `ekran tasarımı`, `uygulama ekranları`, `wireframe`, `ui mockup`, `uygulama prototipi`, `figma`, `user interface`, `ui design`, `ui prototype`, `interface design`, `ux design`, `screen design`, `app screens`, `design an app`, `design a ui`, `wireframe`, `ui mockup`, `app mockup`, `app prototype`, `figma`


### v0

- Adres: https://v0.app  ·  Fiyat sayfası: https://v0.app/pricing
- Fiyat kararı: **freemium, fiyat girilmedi (bilinmiyor)**. Plus "$30" yanında üstü çizili "$90" var (kişi/ay): tanıtım mı normal fiyat mı belli değil. Aday: 30.
- Ücretsiz kullanım: Free: günde 7 mesaj
- Doğrulama (okunan sayfa → sayfadaki ifade):
  - https://v0.app/pricing → "Your collaborative AI assistant to design, iterate, and scale full-stack applications for the web."
  - https://v0.app/pricing → Free: "$0/month", "7 message/day limit" · Plus: "$30" (üstü çizili "$90") /user/month

### Uizard

- Adres: https://uizard.io  ·  Fiyat sayfası: https://uizard.io/pricing/
- Fiyat kararı: **freemium, fiyat girilmedi (bilinmiyor)**. Pro "$12 per month" ama "Billed annually": yıllık eşdeğer.
- Ücretsiz kullanım: Free: ayda 3 AI üretimi, 2 proje
- Doğrulama (okunan sayfa → sayfadaki ifade):
  - https://uizard.io/pricing/ → "Visualize product ideas fast and easy with AI"
  - https://uizard.io/pricing/ → Free: "3 AI generations per month", "2 projects" · Pro: "$12" "per month", "Billed annually"

### Figma Make

- Adres: https://www.figma.com/make/  ·  Fiyat sayfası: https://www.figma.com/pricing/
- Fiyat kararı: **freemium, fiyat girilmedi (bilinmiyor)**. Figma bireyler için "always free". Ücretli plan fiyatı Make sayfasında yok; fiyatlandırma sayfasında en düşük ücretli katman aylık 15 USD, ama bu katmanın Make içerdiği o sayfada yazmıyor. Aday: 15.
- Ücretsiz kullanım: Starter planda ayda 500 AI kredisi (günlük 150 kredi sınırı)
- Doğrulama (okunan sayfa → sayfadaki ifade):
  - https://www.figma.com/make/ → "Your ideas get real in Figma Make" · "Prototype. Polish. Ship."
  - https://help.figma.com/hc/en-us/articles/33459875669015 → "AI credits are included with every seat on every plan." · Starter: "500 credits per month" · "Starter plan users ... also have a daily limit of 150 credits."
  - https://www.figma.com/pricing/ → "Figma is always free for individuals."

### Görev: `sales.prospecting` — Müşteri adayı bulma

Potansiyel müşteri bulma ve onlara ulaşma (müşteri adayı listeleri, soğuk e-posta).

Anahtar kelimeler (kural katmanı): `potansiyel müşteri`, `müşteri adayı`, `satış prospeksiyonu`, `lead bul`, `lead listesi`, `soğuk e-posta`, `soğuk eposta`, `soğuk mail`, `outbound satış`, `b2b müşteri`, `satış erişimi`, `lead generation`, `find leads`, `sales prospecting`, `prospecting`, `cold email`, `cold outreach`, `b2b leads`, `outbound sales`, `sales outreach`, `prospect list`


### Apollo.io

- Adres: https://www.apollo.io  ·  Fiyat sayfası: https://www.apollo.io/pricing
- Fiyat kararı: **freemium, fiyat girilmedi (bilinmiyor)**. Basic ve Professional planların USD fiyatı sayfada yok.
- Ücretsiz kullanım: Starter plan süresiz ücretsiz
- Doğrulama (okunan sayfa → sayfadaki ifade):
  - https://www.apollo.io/ → "Apollo is the AI sales platform rebuilt as one connected AI GTM system" · "240M+ contacts and 30M+ accounts with trusted B2B data" · "Get verified emails and phone numbers and instantly reach out"
  - https://www.apollo.io/pricing → "The most loved sales platform on the planet" · Basic: "Individual sellers doing regular outbound"
  - https://www.apollo.io/pricing → "our free Starter plan — which stays free with no time limit"

### Clay

- Adres: https://www.clay.com  ·  Fiyat sayfası: https://www.clay.com/pricing
- Fiyat kararı: **freemium, fiyat girilmedi (bilinmiyor)**. Launch planı sayfada "$167/mo" ama SSS "starting at $185/mo" diyor; aylık/yıllık seçimi sayfa metninde belli değil.
- Ücretsiz kullanım: Free: ayda 500 eylem
- Doğrulama (okunan sayfa → sayfadaki ifade):
  - https://www.clay.com/ → "Infrastructure to get any data, run agentic workflows, and launch GTM plays." · "Research target companies and people with AI" · "Use Clay's native sequencer or automate messaging"
  - https://www.clay.com/pricing → "Build and scale any GTM play you can imagine to grow pipeline, win deals, and expand customers." (meta)
  - https://www.clay.com/pricing → Free: "500 actions/mo" · Launch: "$167/mo" (SSS: "starting at $185/mo")

### Instantly

- Adres: https://instantly.ai  ·  Fiyat sayfası: https://instantly.ai/pricing
- Fiyat kararı: **ücretli, fiyat girilmedi (bilinmiyor)**. Growth "$47/mo" ve karşılaştırmada "$37.6/monthly": hangisinin aylık/yıllık olduğu etiketli değil. Model "paid" güvenli varsayılan.
- Ücretsiz kullanım: "Start free" ve "No credit card required" yazıyor; ücretsiz planın ne olduğu belli değil
- Doğrulama (okunan sayfa → sayfadaki ifade):
  - https://instantly.ai/pricing → "Compare plans for cold email outreach, B2B lead database, and CRM." (meta)
  - https://instantly.ai/pricing → Growth: "$47/mo" · liste: "$37.6/monthly" · "No credit card required"

### Görev: `support.chatbot` — Müşteri destek botu

Sitene ya da destek sistemine müşteri sorularını yanıtlayan yapay zekâ ajanı koyma.

Anahtar kelimeler (kural katmanı): `müşteri destek botu`, `müşteri destek chatbot`, `müşteri hizmetleri botu`, `destek chatbot`, `sitem için chatbot`, `web siteme chatbot`, `canlı destek`, `sss botu`, `destek ajanı`, `müşteri sorularını yanıtla`, `müşteri desteği`, `müşteri hizmetleri`, `customer support bot`, `customer service chatbot`, `support chatbot`, `chatbot for my`, `chatbot for the website`, `customer support automation`, `ai support agent`, `live chat`, `faq bot`, `helpdesk`, `answer customer questions`, `customer support`, `customer service`


### Intercom Fin

- Adres: https://www.intercom.com  ·  Fiyat sayfası: https://www.intercom.com/pricing
- Fiyat kararı: **ücretli, fiyat girilmedi (bilinmiyor)**. Fin "From $0.99 per Fin outcome" (kullanım başına). Essential plan "$29 per seat/mo" ama aylık/yıllık belli değil.
- Ücretsiz kullanım: Ücretsiz plan yok; ücretsiz deneme var
- Doğrulama (okunan sayfa → sayfadaki ifade):
  - https://www.intercom.com/pricing → "Our AI Agent and AI architecture trained specifically for customer service."
  - https://www.intercom.com/pricing → "From $0.99 per Fin outcome" · "Included in your free trial" · Essential: "$29 per seat/mo"

### Tidio

- Adres: https://www.tidio.com  ·  Fiyat sayfası: https://www.tidio.com/pricing/
- Fiyat kararı: **freemium, fiyat girilmedi (bilinmiyor)**. Starter "$ 24.17 /mo." ama aylık/yıllık ("Annually (2 months free)") belli değil.
- Ücretsiz kullanım: Free plan; Lyro AI için ilk 50 konuşma ömür boyu ücretsiz
- Doğrulama (okunan sayfa → sayfadaki ifade):
  - https://www.tidio.com/pricing/ → "AI customer service chatbot software" (sayfa başlığı)
  - https://www.tidio.com/pricing/ → Free: "$0/mo." · "Your first 50 conversations are free (lifetime)." · Starter: "$ 24.17 /mo."

### Chatbase

- Adres: https://www.chatbase.co  ·  Fiyat sayfası: https://www.chatbase.co/pricing
- Fiyat kararı: **ücretli, fiyat girilmedi (bilinmiyor)**. Hobby "$32 /month billed yearly" (yıllık eşdeğer), yanında etiketsiz "$40".
- Ücretsiz kullanım: 7 günlük deneme; ücretsiz plan görünmüyor
- Doğrulama (okunan sayfa → sayfadaki ifade):
  - https://www.chatbase.co/pricing → "Chatbase: The Leading AI Customer Support Agent Platform."
  - https://www.chatbase.co/pricing → Hobby: "$32" "/month" "billed yearly" (yanında "$40") · "Start 7-day trial"

### Görev: `finance.bookkeeping` — Muhasebe ve gider takibi

Küçük işletme için muhasebe: fatura, gider takibi, banka hareketlerini eşleştirme.

Anahtar kelimeler (kural katmanı): `muhasebe`, `ön muhasebe`, `muhasebe yazılımı`, `gider takibi`, `gelir gider takibi`, `fatura kes`, `banka hareketlerini eşleştir`, `bookkeeping`, `küçük işletme muhasebesi`, `bookkeeping`, `accounting software`, `small business accounting`, `expense tracking`, `track expenses`, `bank reconciliation`, `reconcile transactions`, `invoicing software`, `send invoices`, `categorize expenses`


### QuickBooks

- Adres: https://quickbooks.intuit.com  ·  Fiyat sayfası: https://quickbooks.intuit.com/pricing/
- Fiyat kararı: **freemium, fiyat girilmedi (bilinmiyor)**. Simple Start "$19/mo" + "50% off for 3 months*"; yanında "$38" görünüyor: normal aylık fiyat 38 olabilir, ama sayfa özetinden kesin değil. Aday: 38.
- Ücretsiz kullanım: "Organize your finances for free" ($0/ay, kredi kartı yok) ve 30 günlük deneme
- Doğrulama (okunan sayfa → sayfadaki ifade):
  - https://quickbooks.intuit.com/pricing/ → "Organize your finances for free" · "$0/mo" · "Free trial for 30 days"
  - https://quickbooks.intuit.com/pricing/ → Simple Start: "$19/mo", "50% off for 3 months*", "$38" · "AI Chat for instant insights" (BETA) · "Categorizes expenses"

### Xero

- Adres: https://www.xero.com  ·  Fiyat sayfası: https://www.xero.com/us/pricing-plans/
- Fiyat kararı: **ücretli, aylık 27 USD (2026-10-18)**. ABD sayfası: Early plan ilk 3 ay 5,40 USD, sonra "$27 per month"; abonelikler aylık yenilenir. Fiyat ülkeye göre değişir.
- Ücretsiz kullanım: Ücretsiz plan yok; yeni müşteriye ilk aylar indirim kodu
- Doğrulama (okunan sayfa → sayfadaki ifade):
  - https://www.xero.com/us/pricing-plans/ → "JAX, your AI finance partner" (menü)
  - https://www.xero.com/us/pricing-plans/ → Early: "$5.40" "for the first 3 months", "Then $27 per month" · "auto-renew monthly until they are cancelled"

### Zoho Books

- Adres: https://www.zoho.com/us/books/  ·  Fiyat sayfası: https://www.zoho.com/us/books/pricing/
- Fiyat kararı: **freemium, fiyat girilmedi (bilinmiyor)**. Standard "$20" ve "$15 ... Billed Annually": yıllık olan $15 etiketli, $20 etiketsiz. Aday: 20.
- Ücretsiz kullanım: Free plan: 1 kullanıcı + 1 muhasebeci, yılda 1000 fatura; yıllık gelir 50.000 USD eşiğini aşmamalı
- Doğrulama (okunan sayfa → sayfadaki ifade):
  - https://www.zoho.com/us/books/ → "Ask questions in plain English, spot anomalies early, and automate collections with AI built into your accounting platform."
  - https://www.zoho.com/us/books/pricing/ → FREE: "$0" · "Up to 1,000 invoices can be created annually." · "As long as your revenue for the financial year does not exceed the threshold of $50K" · Standard: "$20" / "$15 ... Billed Annually"

### Görev: `marketing.seo` — SEO içeriği

Arama motorlarında üst sıraya çıkması için içerik yazma ve optimize etme.

Anahtar kelimeler (kural katmanı): `seo`, `seo içeriği`, `seo uyumlu`, `anahtar kelime araştırması`, `arama motoru optimizasyonu`, `google'da üst sıra`, `google sıralaması`, `içerik optimizasyonu`, `organik trafik`, `seo`, `seo content`, `seo article`, `keyword research`, `search engine optimization`, `rank on google`, `google ranking`, `content optimization`, `organic traffic`

- Mevcut ürün: Writesonic (mevcut ürün)

### Surfer

- Adres: https://surferseo.com  ·  Fiyat sayfası: https://surferseo.com/pricing/
- Fiyat kararı: **ücretli, fiyat girilmedi (bilinmiyor)**. Discovery 49 USD/ay ama "Billed yearly" ("Save $120"); aylık ödeme fiyatı yok.
- Ücretsiz kullanım: Ücretsiz plan yok ("Start for Free" düğmesi var, deneme koşulu yazmıyor)
- Doğrulama (okunan sayfa → sayfadaki ifade):
  - https://surferseo.com/pricing/ → "Create content that ranks on Google and gets cited by AI search engines."
  - https://surferseo.com/pricing/ → Discovery: 49 USD/ay, "Billed yearly", "Save $120"

### Frase

- Adres: https://www.frase.io  ·  Fiyat sayfası: https://www.frase.io/pricing
- Fiyat kararı: **ücretli, aylık 49 USD (2026-10-18)**
- Ücretsiz kullanım: 7 günlük ücretsiz deneme, kredi kartı yok
- Doğrulama (okunan sayfa → sayfadaki ifade):
  - https://www.frase.io/pricing → "The content operating system for AI search"
  - https://www.frase.io/pricing → Starter: "$39/mo" "billed yearly · $49/mo month to month" · "Free 7-day trial. No credit card."

### Görev: `project.management` — Proje ve görev yönetimi

Kendin ya da ekibin için görev ve projeleri planlama ve takip etme.

Anahtar kelimeler (kural katmanı): `proje yönetimi aracı`, `proje yönetimi uygulaması`, `proje yönetim aracı`, `görev yönetimi`, `proje takibi`, `görev takibi`, `ekip görevleri`, `iş yönetimi`, `kanban`, `sprint planı`, `proje planla`, `project management software`, `project management app`, `task management`, `project tracking`, `track tasks`, `team tasks`, `work management`, `manage a project`, `project planning`, `kanban`, `sprint planning`

- Mevcut ürün: ClickUp Brain (mevcut ürün)

### Asana

- Adres: https://asana.com  ·  Fiyat sayfası: https://asana.com/pricing
- Fiyat kararı: **freemium, aylık 13.49 USD (2026-10-18)**. Starter "$13.49 billed monthly" (yıllıkta $10.99).
- Ücretsiz kullanım: Personal: süresiz ücretsiz, 2 kullanıcı, sınırsız görev/proje; AI hakkı listelenmemiş
- Doğrulama (okunan sayfa → sayfadaki ifade):
  - https://asana.com/pricing → Personal: "$0" "Free forever" · "2 users" · "Unlimited tasks and projects"
  - https://asana.com/pricing → Starter: "$10.99" "Per user, per month billed annually" · "$13.49 billed monthly" · "AI Teammates and Asana Dash" · "AI Studio"

### monday.com

- Adres: https://monday.com  ·  Fiyat sayfası: https://monday.com/pricing
- Fiyat kararı: **freemium, fiyat girilmedi (bilinmiyor)**. Basic "$9" koltuk/ay ama yalnızca yıllık ödeme gösteriliyor.
- Ücretsiz kullanım: Free: en çok 2 koltuk, 3 pano, 3 doküman; AI özellikleri Basic’ten itibaren
- Doğrulama (okunan sayfa → sayfadaki ifade):
  - https://monday.com/pricing → Free: "$0" · "Up to 2 seats" · "Up to 3 boards" · "AI features: Available from Basic"
  - https://monday.com/pricing → Basic: "$9" "seat / month" · "Total = $90 / month, billed annually" · "1,000 AI credits / month"

### Görev: `legal.contract-review` — Sözleşme inceleme (KATALOĞA ALINMADI; yalnızca kayıt)

Sözleşmeleri yapay zekâyla inceleme, düzeltme önerisi çıkarma ve taslak hazırlama. Hukuki tavsiye değildir.

Anahtar kelimeler (kural katmanı): `sözleşme incele`, `sözleşmeyi incele`, `sözleşme inceleme`, `sözleşme analizi`, `sözleşme riskleri`, `sözleşmedeki risk`, `sözleşme taslağı hazırla`, `kontrat incele`, `hukuki sözleşme`, `riskleri bul`, `riskli madde`, `sözleşme maddeleri`, `redline`, `contract review`, `review a contract`, `review this contract`, `contract analysis`, `contract risks`, `draft a contract`, `legal contract`, `nda review`, `review my agreement`, `review this agreement`, `flag the risks`, `risky clauses`, `contract clauses`, `redline`


### Spellbook

- Adres: https://www.spellbook.com  ·  Fiyat sayfası: https://www.spellbook.com/pricing
- Fiyat kararı: **ücretli, fiyat girilmedi (bilinmiyor)**. Fiyat yok: "book a demo". Kurumsal ürün.
- Ücretsiz kullanım: 7 günlük ücretsiz deneme
- Doğrulama (okunan sayfa → sayfadaki ifade):
  - https://www.spellbook.com/pricing → "AI contract review, drafting, and agentic solutions" (meta)
  - https://www.spellbook.com/pricing → "Lawyers and legal teams can try Spellbook free for 7 days" · fiyat için "book a demo"

### Juro

- Adres: https://www.juro.com  ·  Fiyat sayfası: https://www.juro.com/pricing
- Fiyat kararı: **ücretli, fiyat girilmedi (bilinmiyor)**. Fiyat yok: yalnızca "Get a demo". Kurumsal ürün.
- Doğrulama (okunan sayfa → sayfadaki ifade):
  - https://www.juro.com/pricing → AI Review: "Auto-redline against custom playbooks" · AI Draft: "Your copilot for editing contracts."
  - https://www.juro.com/pricing → Tek çağrı: "Get a demo"; ücretsiz plan/deneme yok

### SpotDraft

- Adres: https://www.spotdraft.com  ·  Fiyat sayfası: https://www.spotdraft.com/pricing
- Fiyat kararı: **ücretli, fiyat girilmedi (bilinmiyor)**. Fiyat yok: "price based on either users or contract volume", demo isteniyor. Kurumsal ürün.
- Doğrulama (okunan sayfa → sayfadaki ifade):
  - https://www.spotdraft.com/pricing → VerifAI: "Review contracts 15x faster using AI, within Microsoft Word"
  - https://www.spotdraft.com/pricing → "Plans that fit your business, price based on either users or contract volume." · "Request a demo"

### Görev: `education.tutor` — Yapay zekâ öğretmen

Yapay zekâ öğretmenle bir konuyu öğrenme ya da ödevi adım adım çözme.

Anahtar kelimeler (kural katmanı): `ders çalış`, `ödev yardımı`, `ödevime yardım`, `konuyu anlat`, `özel ders`, `yapay zeka öğretmen`, `adım adım öğret`, `sınava hazırlan`, `matematik problemi çöz`, `bana öğret`, `homework help`, `help with my homework`, `homework helper`, `ai tutor`, `help me study`, `tutor me`, `explain step by step`, `exam prep`, `teach me`, `study for an exam`, `solve a math problem`

- Mevcut ürün: ChatGPT (mevcut ürün)
- Mevcut ürün: Gemini (mevcut ürün)

### Khanmigo

- Adres: https://www.khanmigo.ai  ·  Fiyat sayfası: https://www.khanmigo.ai
- Fiyat kararı: **ücretli, fiyat girilmedi (bilinmiyor)**. Tutar sayfada yok. Khan Academy içerik kütüphanesinin ücretsiz olduğu Khanmigo için geçerli değil.
- Ücretsiz kullanım: Öğrenciler aylık ya da yıllık ödeme yapar; öğretmen araçlarında "Sign up for free" düğmeleri var (süresi yazmıyor)
- Doğrulama (okunan sayfa → sayfadaki ifade):
  - https://www.khanmigo.ai/ → "an AI-powered personal tutor and teaching assistant from trusted education nonprofit Khan Academy" (SSS)
  - https://www.khanmigo.ai/ → Öğrenciler "make a monthly or annual payment"; tutar yok

### Photomath

- Adres: https://photomath.com  ·  Fiyat sayfası: https://photomath.com
- Fiyat kararı: **freemium, aylık 9.99 USD (2026-10-18)**
- Ücretsiz kullanım: Basic: ücretsiz adım adım açıklama; görsel yardımlar ve ek ipuçları ücretli
- Doğrulama (okunan sayfa → sayfadaki ifade):
  - https://photomath.com/ → "Solve even complex math problems with Photomath, the top-rated math camera solver app."
  - https://photomath.com/ → Basic: "$0 USD" "Step-by-step explanations" · Monthly: "$9.99 USD, billed monthly" · Annually: "$69.99 USD, billed annually"

### Görev: `education.language-learning` — Yabancı dil öğrenme

Yapay zekâyla konuşarak yabancı dil öğrenme ve pratik yapma.

Anahtar kelimeler (kural katmanı): `dil öğren`, `yabancı dil öğren`, `ingilizce öğren`, `almanca öğren`, `ispanyolca öğren`, `fransızca öğren`, `konuşma pratiği`, `dil pratiği`, `telaffuz çalış`, `dil öğrenme`, `learn a language`, `language learning`, `learn english`, `learn spanish`, `learn french`, `learn german`, `speaking practice`, `practice conversation`, `pronunciation practice`, `language app`


### Duolingo

- Adres: https://www.duolingo.com  ·  Fiyat sayfası: https://www.duolingo.com
- Fiyat kararı: **freemium, fiyat girilmedi (bilinmiyor)**. Max/Super fiyatları okunan sayfalarda yok.
- Ücretsiz kullanım: Ana sayfa: "100% free"
- Doğrulama (okunan sayfa → sayfadaki ifade):
  - https://www.duolingo.com/ → "It's 100% free, fun and science-based." (meta)
  - https://blog.duolingo.com/duolingo-max/ → "a new subscription tier above Super Duolingo that gives learners access to two brand-new features" · Video Call · Roleplay

### Speak

- Adres: https://www.speak.com  ·  Fiyat sayfası: https://www.speak.com/
- Fiyat kararı: **ücretli, fiyat girilmedi (bilinmiyor)**. Fiyat yok: "Pricing varies by plan, region, and any current promotions".
- Ücretsiz kullanım: 7 günlük ücretsiz deneme
- Doğrulama (okunan sayfa → sayfadaki ifade):
  - https://www.speak.com/ → "Speak is the first & only app that lets you get real conversational practice without needing a live tutor on the other end."
  - https://www.speak.com/ → "Speak offers a 7-day free trial" · "Pricing varies by plan, region, and any current promotions, so the most accurate pricing is always within the app."

### Praktika

- Adres: https://praktika.ai  ·  Fiyat sayfası: https://praktika.ai
- Fiyat kararı: **ücretli, fiyat girilmedi (bilinmiyor)**. Sayfada "~$8/ month" yazıyor: yaklaşık değer, aylık/yıllık belirtilmemiş.
- Ücretsiz kullanım: "Try it for free!"
- Doğrulama (okunan sayfa → sayfadaki ifade):
  - https://praktika.ai/ → "Learn a new language with AI tutors. Private tutor quality, app convenience, truly personal. Try it for free!"
  - https://praktika.ai/ → "~$8/ month"

### Görev: `agent.browser` — Yapay zekâlı tarayıcı

Sekmelerinle sohbet eden ya da senin yerine web’de işlem yapan, yapay zekâsı içinde tarayıcı.

Anahtar kelimeler (kural katmanı): `yapay zeka tarayıcı`, `yapay zekalı tarayıcı`, `ai tarayıcı`, `ajan tarayıcı`, `tarayıcı ajanı`, `akıllı tarayıcı`, `sekmelerimle sohbet`, `tarayıcıda otomatik`, `ai browser`, `agentic browser`, `browser agent`, `ai web browser`, `ai-powered browser`, `browser with ai`, `chat with tabs`, `browse the web for me`, `browser that can act`


### Perplexity Comet

- Adres: https://www.perplexity.ai/comet  ·  Fiyat sayfası: https://www.perplexity.ai/hub/pricing
- Fiyat kararı: **ücretli, fiyat girilmedi (bilinmiyor)**. Comet’in ücretsiz olup olmadığı okunan hiçbir sayfada yok (SSS başlığı "Is Comet free?" cevapsız). Model "paid" yalnızca güvenli varsayılan; elle doğrulanmalı.
- Doğrulama (okunan sayfa → sayfadaki ifade):
  - https://www.perplexity.ai/comet → "Comet browser by Perplexity is the AI browser that acts as a personal assistant."
  - https://www.perplexity.ai/help-center/en/articles/11172798-getting-started-with-comet → "Select the appropriate version for your operating system (Windows or Mac)."

### Dia

- Adres: https://www.diabrowser.com  ·  Fiyat sayfası: https://www.diabrowser.com
- Fiyat kararı: **freemium, fiyat girilmedi (bilinmiyor)**. "Dia for Work" için fiyat yok.
- Ücretsiz kullanım: "Download Dia for free"; "Dia for Work" SSO ve yönetici araçları ekliyor
- Doğrulama (okunan sayfa → sayfadaki ifade):
  - https://www.diabrowser.com/ → "Dia is the browser for better days at work." · "Download Dia for free"
  - https://www.diabrowser.com/ → Anahtar kelimeler: "AI browser", "chat with tabs", "contextual AI", "AI assistant" · "Available for macOS and Windows"

### Opera Neon

- Adres: https://www.operaneon.com  ·  Fiyat sayfası: https://www.operaneon.com
- Fiyat kararı: **ücretli, aylık 19.9 USD (2026-10-18)**. "See everything Neon unlocks for $19.90/month" (aylık).
- Doğrulama (okunan sayfa → sayfadaki ifade):
  - https://www.operaneon.com/ → "Opera Neon is a browser built to act." · "an agentic browser that understands your intent, assists with tasks, and takes actions."
  - https://www.operaneon.com/ → "Subscribe to Neon to activate agentic functionalities and top world LLMs." · "$19.90/month"

### Görev: `productivity.inbox` — E-posta kutusu yönetimi

E-posta kutusunu toparlama: gelen kutusunu düzenleme, yanıt taslağı hazırlama, toplantı notu.

Anahtar kelimeler (kural katmanı): `gelen kutusu`, `gelen kutum`, `e-posta asistanı`, `eposta asistanı`, `mail asistanı`, `e-posta kutusunu yönet`, `inbox`, `inbox zero`, `e-postaları sınıflandır`, `yanıt taslağı hazırla`, `inbox`, `email assistant`, `inbox management`, `manage my email`, `inbox zero`, `email triage`, `organize my inbox`, `clean up my inbox`, `draft replies`


### Superhuman

- Adres: https://superhuman.com  ·  Fiyat sayfası: https://superhuman.com/pricing
- Fiyat kararı: **ücretli, fiyat girilmedi (bilinmiyor)**. Okunan sayfalarda ücretsiz plan/deneme ve fiyat yok (plan adları: Go + Agents, Mail, Docs, Superhuman Suite).
- Doğrulama (okunan sayfa → sayfadaki ifade):
  - https://superhuman.com/ → "Superhuman is the AI productivity suite that gives you superpowers everywhere you work." · "Go", "Auto Drafts"
  - https://superhuman.com/ → Plan adları: "Go + Agents", "Mail", "Docs", "Superhuman Suite"; fiyat yok

### Shortwave

- Adres: https://shortwave.com  ·  Fiyat sayfası: https://shortwave.com/pricing/
- Fiyat kararı: **ücretli, aylık 30 USD (2026-10-18)**. En ucuz ücretli plan Business "$30 per seat / month"; sayfada yıllık fiyat gösterilmiyor. SSS "Can I use Shortwave for free?" cevabı okunamadı.
- Ücretsiz kullanım: 14 günlük ücretsiz deneme
- Doğrulama (okunan sayfa → sayfadaki ifade):
  - https://shortwave.com/pricing/ → "Supercharge your productivity with the world's most advanced email AI"
  - https://shortwave.com/pricing/ → "Start your 14 day free trial" · Business: "$30 per seat / month"

### Fyxer

- Adres: https://www.fyxer.com  ·  Fiyat sayfası: https://www.fyxer.com/pricing
- Fiyat kararı: **freemium, aylık 49 USD (2026-10-18)**. SSS: "With monthly billing, Pro is $49 per seat per month" (yıllıkta kişi başı 37 USD).
- Ücretsiz kullanım: Free plan: ayda 400 kredi; 14 günlük deneme sonrası Free plana düşülür
- Doğrulama (okunan sayfa → sayfadaki ifade):
  - https://www.fyxer.com/ → "Fyxer is the email assistant that organizes your inbox, writes draft replies in your tone, and takes meeting notes."
  - https://www.fyxer.com/pricing → Free: "400 monthly credits" · "Free 14-day trial" · Pro: "$37 ... billed annually"; "With monthly billing, Pro is $49 per seat per month"

### Görev: `productivity.planning` — Takvim ve günlük planlama

Günü planlama: yapay zekâ görev ve toplantıları takvimine yerleştirir.

Anahtar kelimeler (kural katmanı): `günümü planla`, `takvim asistanı`, `takvimimi planla`, `toplantı zamanla`, `toplantıları planla`, `zaman yönetimi`, `zaman bloklama`, `görevleri takvime`, `günlük plan`, `takvim yapay zeka`, `plan my day`, `calendar assistant`, `schedule meetings`, `time blocking`, `time management`, `ai calendar`, `daily planner`, `schedule my tasks`, `calendar scheduling`, `auto-schedule`


### Reclaim

- Adres: https://reclaim.ai  ·  Fiyat sayfası: https://reclaim.ai/pricing
- Fiyat kararı: **freemium, fiyat girilmedi (bilinmiyor)**. Starter planda "$10" ve "$12" (koltuk/ay) yazıyor ama hangisinin yıllık/aylık olduğu etiketli değil. Aday: 12 (aylık), elle doğrulanmalı.
- Ücretsiz kullanım: Lite plan süresiz ücretsiz
- Doğrulama (okunan sayfa → sayfadaki ifade):
  - https://reclaim.ai/ → "AI agents that schedule work, meetings, and life – automatically." · "Reclaim's AI scheduling assistant intelligently optimizes your calendar"
  - https://reclaim.ai/pricing → Lite: "Free forever" · Starter: "$10" ve "$12" "per seat/month" (Yearly - SAVE 20% / Monthly)

### Motion

- Adres: https://www.usemotion.com  ·  Fiyat sayfası: https://www.usemotion.com/pricing
- Fiyat kararı: **ücretli, fiyat girilmedi (bilinmiyor)**. Pro AI "$ 19 /seat /mo": aylık mı yıllık mı belli değil ("Pay annually (Save 33%)" seçeneği var).
- Ücretsiz kullanım: Ücretsiz plan yok; ücretsiz deneme var (süre yazmıyor)
- Doğrulama (okunan sayfa → sayfadaki ifade):
  - https://www.usemotion.com/ → "Have an AI assistant schedule your day" · "Motion's AI detects and prioritizes your most urgent and important tasks, automatically"
  - https://www.usemotion.com/pricing → "Start your free trial. Risk free. Cancel anytime." · Pro AI: "$ 19 /seat /mo"

### Akiflow

- Adres: https://akiflow.com  ·  Fiyat sayfası: https://akiflow.com/pricing
- Fiyat kararı: **ücretli, aylık 34 USD (2026-10-18)**
- Ücretsiz kullanım: Ücretsiz plan yok; 7 günlük ücretsiz deneme
- Doğrulama (okunan sayfa → sayfadaki ifade):
  - https://akiflow.com/pricing → "Manage your tasks and meetings in one place." · Aki: "the AI executive assistant"
  - https://akiflow.com/pricing → "Akiflow has no free plan." · "Start your 7-day free trial today" · Pro Monthly: "$34" "Per month, Billed monthly" (yıllık: "$19")

### Görev: `productivity.notes` — Not alma ve bilgi yönetimi

Not alma ve kaydettiğin her şeyin arasından cevap bulma.

Anahtar kelimeler (kural katmanı): `not al`, `not tutma`, `not uygulaması`, `not defteri`, `ikinci beyin`, `notlarımda ara`, `notlarımı düzenle`, `notlarım arasında`, `kişisel bilgi yönetimi`, `take notes`, `note taking`, `note-taking`, `notes app`, `second brain`, `personal knowledge management`, `organize my notes`, `search my notes`, `note app`


### Notion AI

- Adres: https://www.notion.com  ·  Fiyat sayfası: https://www.notion.com/pricing
- Fiyat kararı: **freemium, fiyat girilmedi (bilinmiyor)**. Plus "$10 per member / month" ama Plus da AI’yı yalnızca deneme olarak içeriyor; tam AI’nın hangi planda olduğu okunan sayfada belli değil.
- Ücretsiz kullanım: Free planda Notion AI yalnızca deneme olarak var
- Doğrulama (okunan sayfa → sayfadaki ifade):
  - https://www.notion.com/pricing → "Chat about anything, generate and edit docs, autofill databases, and find answers across your Notion workspace."
  - https://www.notion.com/pricing → Free ve Plus: "Trial of Notion AI" · Plus: "$10 per member / month"

### Mem

- Adres: https://get.mem.ai  ·  Fiyat sayfası: https://get.mem.ai/pricing
- Fiyat kararı: **freemium, aylık 9 USD (2026-10-18)**. Mem Plus "$9 / month"; sayfada yıllık fiyat gösterilmiyor.
- Ücretsiz kullanım: Ücretsiz plan var ("A useful place to start building your memory with Mem Agent")
- Doğrulama (okunan sayfa → sayfadaki ifade):
  - https://get.mem.ai/pricing → "Mem ties together notes, meetings, ideas, and the context to act."
  - https://get.mem.ai/pricing → Free: "A useful place to start building your memory with Mem Agent." · Mem Plus: "$9" "/ month"

### Reflect

- Adres: https://reflect.app  ·  Fiyat sayfası: https://reflect.app
- Fiyat kararı: **freemium, fiyat girilmedi (bilinmiyor)**. Fiyat sayfada yok: "See local pricing on the App Store".
- Ücretsiz kullanım: Mac’te ücretsiz ("No subscription required"); iPhone ve iPad’de ücretli abonelik
- Doğrulama (okunan sayfa → sayfadaki ifade):
  - https://reflect.app/ → "An open-source note-taking app with daily notes, backlinks, and local Markdown files." · AI: "Find answers with links to your notes, summarize text, and improve your writing." (isteğe bağlı)
  - https://reflect.app/ → "Free on Mac. Paid subscription on iPhone and iPad." · "See local pricing on the App Store"

### Görev: `career.resume` — Özgeçmişi ilana göre uyarlama

İş başvurusu için özgeçmişi (CV) iş ilanına göre geliştirme ve uyarlama.

Anahtar kelimeler (kural katmanı): `iş başvurusu`, `ats uyumlu`, `iş ilanına göre`, `özgeçmişimi geliştir`, `özgeçmişimi iyileştir`, `özgeçmişimi uyarla`, `cvmi geliştir`, `cvmi iyileştir`, `iş ilanına uygun`, `job application`, `ats-friendly`, `ats friendly`, `tailor my resume`, `improve my resume`, `resume for a job`, `job posting`, `apply for jobs`, `applicant tracking`

- Mevcut ürün: Teal (mevcut ürün)

### Kickresume

- Adres: https://www.kickresume.com  ·  Fiyat sayfası: https://www.kickresume.com/en/pricing/
- Fiyat kararı: **freemium, aylık 24 USD (2026-10-18)**. Monthly "$24 / month"; Yearly "$8 / month" ama "Pay $96 every 12 months" (yıllık eşdeğer).
- Ücretsiz kullanım: Free: 4 temel şablon, sınırsız indirme
- Doğrulama (okunan sayfa → sayfadaki ifade):
  - https://www.kickresume.com/en/ → "Online resume and cover letter builder used by 8,000,000 job seekers worldwide." · "let our AI resume builder write, optimize, and polish every detail" · "AI Cover Letter Writer"
  - https://www.kickresume.com/en/pricing/ → Free: "$0 / month", "4 basic resume templates", "Unlimited downloads" · Monthly: "$24 / month" · Yearly: "$8 / month", "Pay $96 every 12 months"

### Rezi

- Adres: https://www.rezi.ai  ·  Fiyat sayfası: https://www.rezi.ai/pricing
- Fiyat kararı: **freemium, aylık 29 USD (2026-10-18)**. Pro "$29 / month"; sayfada yıllık fiyat gösterilmiyor.
- Ücretsiz kullanım: Free: ödeme gerekmez; AI Resume Writer ve AI Resume Editor Free ve Pro listelerinde
- Doğrulama (okunan sayfa → sayfadaki ifade):
  - https://www.rezi.ai/ → "Build, improve, and tailor your resume with AI." · "Write, tailor, score and optimize your resume through a single conversation." (AI Resume Agent)
  - https://www.rezi.ai/pricing → Free: "$0" "No payment required." · Pro: "$29 / month"

### 3d.generate için eklenen araçlar

`3d.generate` canlı katalogda zaten var (şu an tek ürünü World Labs Marble). Taslak onu 3 araçla besler: Meshy, Tripo, Hyper3D Rodin.

### Meshy

- Adres: https://www.meshy.ai  ·  Fiyat sayfası: https://www.meshy.ai/pricing
- Fiyat kararı: **freemium, aylık 20 USD (2026-10-18)**. Pro 20 USD "Billed monthly"; ilk ay 10 USD tanıtım fiyatı yok sayıldı.
- Ücretsiz kullanım: Free: ayda 100 kredi, kredi kartı yok
- Doğrulama (okunan sayfa → sayfadaki ifade):
  - https://www.meshy.ai/pricing → "Meshy is a 3D generative AI toolbox for effortlessly creating 3D assets from text or images, accelerating your 3D workflow."
  - https://www.meshy.ai/pricing → Free: "$ 0/ month", "100 monthly credits", "No credit card needed" · Pro: "Billed monthly, $ 20 / month" (ilk ay "$ 10" tanıtım)

### Tripo

- Adres: https://www.tripo3d.ai  ·  Fiyat sayfası: https://www.tripo3d.ai/pricing
- Fiyat kararı: **freemium, fiyat girilmedi (bilinmiyor)**. Pro "$20.00/ Month" ama altında "billed annually as: $240.00 / year": yıllık eşdeğer. Aday: 20 (aylık fiyat elle doğrulanmalı).
- Ücretsiz kullanım: Free: ayda 200 kredi (yaklaşık 13 model)
- Doğrulama (okunan sayfa → sayfadaki ifade):
  - https://www.tripo3d.ai/ → "Meet Tripo, a free online AI 3D model generator that turns your text prompts or images into 3D models instantly."
  - https://www.tripo3d.ai/pricing → Free: "200 Monthly Credits ≈ 13 Models" · Pro: "$20.00/ Month", "billed annually as: $240.00 / year"

### Hyper3D Rodin

- Adres: https://hyper3d.ai  ·  Fiyat sayfası: https://hyper3d.ai
- Fiyat kararı: **freemium, fiyat girilmedi (bilinmiyor)**. Plan adları ve fiyatlar sayfada yok ("Subscribe"/"Pricing" bağlantıları var). Ücretsiz kredinin süresi/miktarı yazmıyor.
- Ücretsiz kullanım: Abonelik gerekmeden ücretsiz kredilerle denenebilir
- Doğrulama (okunan sayfa → sayfadaki ifade):
  - https://hyper3d.ai/ → "Rodin generates high-quality 3D assets that are nearly production-ready for supported workflows."
  - https://hyper3d.ai/ → "Test the platform with free credits—no subscription required." · "Free 7-Day Trial"

## 4. Mevcut ürünlere önerilen yeni görev eşlemeleri

- `clickup-brain-project-ai` → `project.management`. Resmi sayfadan doğrulandı. ClickUp Brain sayfası okundu. Not: sayfa "Brain2 AI starts at $9/user/month" diyor; canlı katalogdaki startingPrice 10 (2026-10-15). Canlı katalog değiştirilmedi; price:snap ile bak.
  - https://clickup.com/brain → AI Tasks: "Structured work units that carry state, owners, and dependencies forward" · AI Projects: "Cross-list orchestration of work across timelines" · Brain²: "sees your tasks, docs, and conversations"
  - https://clickup.com/brain → SSS: "Brain2 AI starts at $9/user/month" · "Everything AI" planı "$28/user/month"
- `teal-resume-builder-ai` → `career.resume`. Resmi sayfadan doğrulandı. Teal ana sayfası okundu.
  - https://www.tealhq.com/ → "Create a professional ATS-friendly resume in minutes with Teal." · "Quickly tailor your resume for each job with AI." · "Resume Job Description Match" · "ATS Resume Checker"
- `writesonic-seo-content` → `marketing.seo`. Resmi sayfadan doğrulandı. Writesonic ana sayfası okundu. DİKKAT (kısmi eşleme): sayfa artık "SEO makale yazımı" değil "AI arama görünürlüğü (GEO/AEO)" ve "Track SEO rankings" anlatıyor; katalogdaki "SEO-focused blog and article writing tool" açıklaması güncellenmeli mi, Ferit’e soru.
  - https://writesonic.com/ → "The AI Search Growth Engine. GEO, AEO, and AI visibility in one platform." (meta) · "Track SEO rankings" · "Rankings follow."
- `chatgpt-gpt-5` → `education.tutor`. Resmi sayfadan doğrulandı. OpenAI "study mode" sayfası okundu.
  - https://openai.com/index/chatgpt-study-mode/ → "a learning experience that helps you work through problems step by step instead of just getting an answer" · "available to logged in users on Free, Plus, Pro, Team"
- `gemini-25-pro` → `education.tutor`. Resmi sayfadan doğrulandı. Google "Guided Learning" sayfası okundu.
  - https://blog.google/outreach-initiatives/education/guided-learning/ → "a new mode in Gemini that helps you learn and study by building a deep understanding instead of just getting answers"

Test kuralı: bir görev en az 3 ürüne bağlı olmalı; yalnızca resmi sayfadan doğrulanmış eşlemeler sayılır. Sonuç: `education.tutor` 4 (Khanmigo, Photomath, ChatGPT, Gemini), `project.management` 3 (Asana, monday.com, ClickUp Brain), `marketing.seo` 3 (Surfer, Frase, Writesonic), `career.resume` 3 (Kickresume, Rezi, Teal).

## 5. Okunup kataloğa ALINMAYAN adaylar

- **Google Stitch**: stitch.withgoogle.com: ne yaptığı yazıyor ("Stitch generates UIs for mobile and web applications") ama ücretsiz mi/fiyat var mı sayfada yok.
- **Roblox Assistant**: create.roblox.com/docs/assistant/guide: ne yaptığı yazıyor ama fiyat ve plan şartı sayfada yok ("Pricing: not shown").
- **Layer**: layer.ai ana sayfası artık oyun stüdyoları yerine "The creative harness for brand-differentiated content" diyor; oyun odaklı olduğu kanıtlanamadı. Fiyat sayfası başlığı "Usage-Based AI for Game Studios" diyor ama iki sayfa çelişiyor.
- **ChatGPT Atlas**: OpenAI sayfası: "Atlas has since been deprecated." Katalogda zaten emekli (openai-atlas-ai-browser).
- **Claude (öğrenme modu)**: anthropic.com/news/introducing-claude-for-education: "Learning mode" yalnızca üniversitelere özel "Claude for Education" içinde anlatılıyor; genel kullanıcıya açık olduğu sayfada yok. education.tutor’a eklenmedi.
- **Quizlet**: quizlet.com/upgrade: yapay zekâ özelliği (Q-Chat vb.) sayfada geçmiyor; yalnızca "$19.99 per year" Plus planı görünüyor.
- **Robin AI**: robinai.com: "free Microsoft Word Add-In" var, fiyat yok; ürünün güncel durumu doğrulanmadı.
- **LegalOn**: legalon.com: robots.txt okumaya izin vermedi (ROBOTS_DISALLOWED); dolaşmadık.
- **Fellou**: fellou.ai: "agentic browser" ama fiyat/ücretsiz bilgisi sayfada yok. agent.browser’da 3 araç yeterli olduğu için eklenmedi.
- **Sunsama**: sunsama.com/pricing: yapay zekâ özelliği sayfada yok; ayrıca aynı sayfada yıllık fiyat 17 ve 20 USD diye çelişiyor.
- **Capacities**: capacities.io/pricing: yapay zekâ özelliği anlatılmıyor ("The studio for your mind").
- **FreshBooks**: freshbooks.com/pricing: yapay zekâ özelliği geçmiyor.
- **Leonardo AI için oyun görseli eşlemesi**: leonardo.ai/pricing: oyun varlığı ifadesi yok ("From art and design to gaming and beyond" genel bir cümle).
- **Sağlık araçları**: Bilerek ertelendi: tıbbi içerik ayrı güvenlik incelemesi (Ferit) olmadan kataloğa alınmaz.

## 6. Çakışma ölçümü

- Kural katmanı (`classifyTask` allowLLM:false) mantığı birebir kopyalanıp mevcut 40 + yeni görevlerle çalıştırıldı (birleştirme sonrası toplam 55 görev).
- Mevcut 128 golden satır: kural sonucu değişen = **0** (test bunu kilitler). Birleştirmeden sonra ölçüm tekrarlandı: `npm run eval -- --recommender=v3` top1 95/125 ve belirsizlik sorulan satır sayısı (26) öncekiyle aynı.
- Golden’a eklenen 30 satır (sözleşme satırları çıkarıldı): kural yoluyla 30’u da beklenen işe düşüyor (test: `newTasks.test.ts`).
- DÜRÜSTLÜK: anahtar kelimeleri bu taslak satırlara ve testteki ek sorgulara bakarak ayarladım; kural katmanındaki 30/30 doğru sonuç bağımsız bir doğrulama DEĞİL. Bağımsız kısım: mevcut 128 golden satırın ve 28 günlük cümlenin sonucunun değişmemesi.
- Bilerek yapılan seçim: `career.resume` anahtar kelimeleri "özgeçmiş/cv/resume" gibi genel sözcükleri İÇERMEZ (docs.create’te duruyorlar ve golden tr-37 "cv hazırla", en-37 "build a resume" beklentisi docs.create). Yani "cv hazırla" bugünkü gibi `docs.create`’e gider; "ats uyumlu özgeçmiş", "özgeçmişimi iş ilanına göre geliştir" gibi özel cümleler `career.resume`’e gider. İstersen (Ferit onayıyla) docs.create’ten bu sözcükleri çıkarıp golden tr-37/en-37’yi `career.resume`’e çevirebiliriz.
- `project.management` için "project management" gibi çıplak ifade kullanılmadı: golden en-36 ("research the top project management tools...") `research.web` bekliyor.
- Bu ölçüm yalnızca kural katmanını kapsar. LLM katmanı (gpt-4o-mini) gerçek anahtarla ÖLÇÜLMEDİ; yeni görevlerin listeye girmesi prompt’u uzatır (40 → 55 görev; ölçüm: liste ≈ 970 → ≈ 1.410 token, çağrı başına yaklaşık +440 token).

## 7. Birleştirme (YAPILDI) ve sıradaki adımlar

Yapıldı (2026-10-18):

1. `tasks` (15) `data/tasks.json` sonuna, `products` (45, `status: "active"`) `data/products.json` sonuna eklendi. Spellbook, Juro, SpotDraft ve `legal.contract-review` eklenmedi.
2. 5 mevcut ürünün `tasks` dizisinin SONUNA yeni iş eklendi (ilk görev prompt rehberini belirlediği için sıra bozulmadı): ClickUp Brain → `project.management`, Teal → `career.resume`, Writesonic → `marketing.seo`, ChatGPT ve Gemini → `education.tutor`.
3. `evals/golden.jsonl` sonuna 30 satır eklendi (`tr-72…tr-86`, `en-58…en-72`), hepsi `needsReview: true`, `acceptableTools: []` + “katalog boşluğu” notu (v1 araç listesinde yeni ürünler yok). **Ferit onayı olmadan kalıcı sayılmaz** (`evals/REVIEW.md` “Katalog genişletme eki”).
4. Testler uyarlandı: `catalog.test.ts` (55 görev, 141 ürün, 97 aktif), `navigator.test.ts` (ClickUp Brain artık bir işe bağlı), `productNamePin.test.ts` (kanıtsız görev sıralama sunmaz), `understanding*.test.ts` (“unity gamedev” artık katalogda karşılık buluyor; örnek hâlâ katalogda olmayan “kubernetes terraform” ile değiştirildi), yeni `newTasks.test.ts`. `description` alanlarından kaynaksız sayılar (Unity 6, 240M, B2B) çıkarıldı (P14 kuralı).

Sıradaki adımlar (Kerem):

5. **Fiyat doğrulaması** (şimdi mümkün, çünkü ürünler `active`): `npm run check:prices -- --only=<id1>,<id2>` (OPENAI_API_KEY gerekir; haftalık otomatik hat da aynısını yapar), okunamayanlar için `npm run price:snap -- --guided`. Doğrulananların `startingPrice` ve `priceCheckedAt` alanları güncellenir. Doğrulanana kadar fiyatı boş ürünler arayüzde “Fiyat doğrulanmadı” görünür, yanlış rakam göstermez.
6. `lib/tools-database.json` (v1 araç listesi) yeni ürünleri içermez: golden `acceptableTools` boş + “katalog boşluğu” notuyla duruyor.
7. Yayından sonra: `clarifyRate`, “tahmini eşleşme” oranı ve yeni görevlerin gerçek tıklanma/oy dağılımını izle; zayıf kalan görevi kaldır. Geri alma: ürünleri tekrar `candidate` yapmak yeni işleri hemen öneriden çıkarır.

## 8. Bilinen sınırlar

- Yeni görevler “kanıt yok” durumunda başlar: ekranda ürünler alfabetik, sıralama iddiası olmadan listelenir (mevcut 40 görevin 21’i de şu an böyle (ölçüldü)). RouteAI Skoru oy/karşılaştırma geldikçe oluşur.
- Yeni görevlerin hiçbirinde benchmark eşlemesi yok (LMArena/AA bu işleri ölçmüyor); sıralama RouteAI Skoru’nun kendi kanıtından (oy, karşılaştırma, uzman değerlendirmesi) gelecek. Bu veriler başlangıçta boş olduğu için sıralama ilk günlerde zayıf olabilir.
- Ürünlerde `access` boş (kanal doğrulanmadı), `models` boş, prompt rehberi yok: ürünün ilk görevine göre genel rehber kullanılır (kod görevleri `cursor-task`, görsel görevler `image-natural`, metin/otomasyon `chat-general`). Bu rehberler iş-araçları (satış, muhasebe vb.) için çok anlamlı olmayabilir.
- Xero fiyatı ABD sayfasından; ülkeye göre değişir. Fiyatlar ayrıca kur/bölge farkı taşıyabilir.
- Unity AI beta; Comet, Dia, Opera Neon, Fellou gibi tarayıcı ürünleri hızlı değişiyor; 60 günden eski fiyat zaten "doğrulanmadı" gösterilir.

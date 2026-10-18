# Yetenek denetimi raporu

Üretim tarihi: 2026-10-16. Salt rapor: data/products.json ve diğer veri dosyaları DEĞİŞMEDİ. Karar insanındır.

## 1. Özet

- Denetlenen aktif ürün: 56. Sayfası okunan: 40. Okunamayan: 16. Hata: 0.
- Okunan ürünlerdeki ürün-görev çifti: 98. Sayfada açıkça yazan ("kanıtlı"): 51 (%52). Dolaylı: 14. Bulunamadı: 28. Alıntı doğrulanamadı: 5.
- **"Bulunamadı", ürünün o işi yapamadığı anlamına GELMEZ**; yalnızca denetlenen sayfa metninde geçmiyor (pazarlama sayfaları her özelliği saymaz, bazı sayfalar JS ile çiziliyor).
- "Kanıtlı" bile ürünün o iş için EN İYİ olduğunu göstermez; yalnızca iddianın ürünün kendi sayfasında geçtiğini gösterir.
- OpenAI token kullanımı (toplam): 113883.

## 2. Kapanma / yeniden adlandırma işaretleri (öncelikli)

Alıntı sayfada doğrulandı. Ürünün durumuna ve adına ürün sahibi karar verir; `status: retired` yapmadan önce sayfayı kendin aç.

| Ürün | İşaret | Alıntı | Sayfa |
| --- | --- | --- | --- |
| Claude | YENİDEN ADLANDIRILDI | Claude Cowork is now just Claude. | https://claude.com/pricing |
| Cursor | YENİDEN ADLANDIRILDI | Cursor is now a part of SpaceX | https://cursor.com |
| Fathom (Meeting Assistant) | YENİDEN ADLANDIRILDI | FATHOM IS NOW PART OF SUPERHUMAN. | https://www.fathom.video |

## 3. Editör seçimi olup sayfada açık kanıtı olmayanlar

| Görev | Editör seçimi | Durum | Alıntı / not |
| --- | --- | --- | --- |
| Ses klonlama | ElevenLabs | alıntı doğrulanamadı | Voice Cloning |
| Ses temizleme | ElevenLabs | bulunamadı | — |
| Akademik araştırma | Elicit AI | dolaylı | Elicit helps you synthesize evidence, understand the landscape, design programs and experiments, draft proposals, and weigh tradeoffs. |
| Altyazı | OpusClip (Video Repurposing) | alıntı doğrulanamadı | Multi-language transcription |
| Görsel büyütme | Leonardo AI | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| Arka plan kaldırma | Canva AI (Magic Studio) | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| Belge ve şablon, Tablo analizi | ChatGPT | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| Sunum hazırlama | Gamma AI | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| 3D üretimi | World Labs Marble | sayfa okunamadı | sayfa metni çok kısa (72 karakter; JS ile çiziliyor olabilir) |

## 4. Görev görev sonuç

| Görev | Ürün | Durum | Alıntı / not |
| --- | --- | --- | --- |
| 3D üretimi | World Labs Marble | sayfa okunamadı | sayfa metni çok kısa (72 karakter; JS ile çiziliyor olabilir) |
| Akademik araştırma | Elicit AI | dolaylı | Elicit helps you synthesize evidence, understand the landscape, design programs and experiments, draft proposals, and weigh tradeoffs. |
| Akademik araştırma | Perplexity AI | dolaylı | Max adds advanced reasoning models for deep investigations and large datasets. |
| Altyazı | OpusClip (Video Repurposing) | alıntı doğrulanamadı | Multi-language transcription |
| Arka plan kaldırma | Adobe Firefly | bulunamadı | — |
| Arka plan kaldırma | Canva AI (Magic Studio) | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| Avatar sunuculu video | Synthesia | kanıtlı | AI Avatars Lifelike avatars from a script |
| Belge ve şablon | Canva AI (Magic Studio) | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| Belge ve şablon | ChatGPT | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| Belge ve şablon | Claude | dolaylı | Create Artifacts More information |
| Belge ve şablon | Gamma AI | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| Belge ve şablon | Microsoft Copilot Pro | kanıtlı | Create impressive documents and improve your writing with built-in intelligent features. |
| Belge ve şablon | Teal (Resume Builder AI) | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| Belgeyle soru-cevap | ChatGPT | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| Belgeyle soru-cevap | Claude | dolaylı | Research Yes Yes Yes |
| Belgeyle soru-cevap | Gemini | kanıtlı | Upload your documents , from notes to slides, and make them into a study guide or even a practice test. |
| Belgeyle soru-cevap | NotebookLM | bulunamadı | — |
| Çeviri | ChatGPT | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| Çeviri | Claude | bulunamadı | — |
| Çeviri | Gemini | bulunamadı | — |
| Çeviri | Le Chat (Mistral) | bulunamadı | — |
| Dashboard ve BI | Microsoft Power BI | kanıtlı | Create rich, interactive reports |
| Dashboard ve BI | Tableau | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| Düzeltme ve yeniden yazma | ChatGPT | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| Düzeltme ve yeniden yazma | Claude | bulunamadı | — |
| Düzeltme ve yeniden yazma | Gemini | dolaylı | help you get to a first draft, work on your arguments and fine tune your ideas. |
| E-posta yazımı | ChatGPT | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| E-posta yazımı | Claude | dolaylı | Claude for Microsoft Outlook |
| E-posta yazımı | Gemini | bulunamadı | — |
| E-posta yazımı | Microsoft Copilot Pro | kanıtlı | Manage your email, calendar, tasks, and contacts together in one place. |
| Genel asistan | ChatGPT | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| Genel asistan | Claude | dolaylı | AI Agents Coding Commerce Departments Customer support Cybersecurity Legal Sales |
| Genel asistan | Gemini | kanıtlı | Get everyday help from Google AI to tackle tasks at work, school or home. |
| Genel asistan | Grok | kanıtlı | Grok is an AI assistant |
| Genel asistan | Le Chat (Mistral) | kanıtlı | Your personal AI agent for everyday tasks. |
| Genel asistan | Microsoft Copilot Pro | kanıtlı | AI chat that works across your day. |
| Görsel büyütme | Leonardo AI | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| Görsel düzenleme | Adobe Firefly | kanıtlı | Create and edit images, video, and audio |
| Görsel düzenleme | ChatGPT (görsel) | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| Görsel düzenleme | Gemini (görsel) | kanıtlı | Image generation and editing |
| Görsel üretimi | Adobe Firefly | kanıtlı | Generate images, video, audio and more |
| Görsel üretimi | ChatGPT (görsel) | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| Görsel üretimi | DALL-E (OpenAI) | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| Görsel üretimi | FLUX (Black Forest Labs) | sayfa okunamadı | The operation was aborted due to timeout |
| Görsel üretimi | Gemini (görsel) | kanıtlı | Image generation and editing |
| Görsel üretimi | Google Imagen | sayfa okunamadı | HTTP 404 |
| Görsel üretimi | Ideogram | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| Görsel üretimi | Leonardo AI | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| Görsel üretimi | Midjourney | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| Görsel üretimi | Stable Diffusion | kanıtlı | image generation and editing tools |
| Görselden video | Google Veo | bulunamadı | — |
| Görselden video | Grok Imagine (xAI) | bulunamadı | — |
| Görselden video | Kling AI | kanıtlı | image to video |
| Görselden video | Luma Dream Machine | kanıtlı | video generation and image creation |
| Görselden video | Pika Labs | bulunamadı | — |
| Görselden video | Runway | bulunamadı | — |
| Görselden video | Sora (OpenAI) | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| Hata ayıklama | ChatGPT | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| Hata ayıklama | Claude | kanıtlı | Create and edit files with code execution |
| Hata ayıklama | Claude Code (Anthropic) | bulunamadı | — |
| Hata ayıklama | Cursor | bulunamadı | — |
| Hata ayıklama | Gemini | kanıtlı | debug complex code bases, optimize large scale performance changes. |
| Hata ayıklama | GitHub Copilot | bulunamadı | — |
| Hata ayıklama | Windsurf (Codeium) | kanıtlı | Devin Desktop includes a full IDE with syntax highlighting, autocomplete, and debugging tools built in |
| İş akışı otomasyonu | n8n AI Workflow Builder | kanıtlı | n8n is a workflow automation platform |
| Kısa sosyal medya videosu | Canva AI (Magic Studio) | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| Kısa sosyal medya videosu | OpusClip (Video Repurposing) | kanıtlı | share on TikTok, YouTube Shorts, and Reels |
| Kısa sosyal medya videosu | Pika Labs | dolaylı | Create short clips or full videos |
| Kısa sosyal medya videosu | Runway | dolaylı | everything you need, to make anything you want. |
| Kod ajanı (terminal) | Claude Code (Anthropic) | kanıtlı | AI Agents Coding |
| Kod asistanı (editör) | Cursor | kanıtlı | Cursor is your coding agent for building ambitious software. |
| Kod asistanı (editör) | GitHub Copilot | kanıtlı | "Write better code with AI" |
| Kod asistanı (editör) | Windsurf (Codeium) | kanıtlı | Devin Desktop is the home for coding agents to do your best work. |
| Logo tasarımı | Canva AI (Magic Studio) | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| Logo tasarımı | ChatGPT (görsel) | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| Logo tasarımı | Gemini (görsel) | bulunamadı | — |
| Logo tasarımı | Ideogram | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| Logo tasarımı | Midjourney | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| Metinden video | Google Veo | kanıtlı | "Generate cinematic video with audio" |
| Metinden video | Grok Imagine (xAI) | bulunamadı | — |
| Metinden video | Kling AI | dolaylı | Turn text, images, and references into multimodal creative content |
| Metinden video | Luma Dream Machine | kanıtlı | video generation and image creation |
| Metinden video | Pika Labs | bulunamadı | — |
| Metinden video | Runway | bulunamadı | — |
| Metinden video | Sora (OpenAI) | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| Müzik üretimi | Suno AI | kanıtlı | create complete, original songs |
| Müzik üretimi | Udio | kanıtlı | create AI music in seconds |
| Özetleme | ChatGPT | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| Özetleme | Claude | bulunamadı | — |
| Özetleme | Gemini | bulunamadı | — |
| Özetleme | NotebookLM | kanıtlı | quick summarization and note taking |
| Pazarlama metni | Adcreative.ai | kanıtlı | Ad Copy Generation Generate texts high-conversion-rate text |
| Pazarlama metni | Anyword (Copy AI) | dolaylı | Generate high performing, on-brand content for ads, social, blogs, emails, LPs and more |
| Pazarlama metni | ChatGPT | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| Pazarlama metni | Claude | bulunamadı | — |
| Pazarlama metni | Copy.ai | kanıtlı | transforming the way we develop marketing content |
| Pazarlama metni | Jasper AI | kanıtlı | transform briefs, insights, & channel requirements into on-brand campaign content. |
| Pazarlama metni | Simplified (Content & Design) | alıntı doğrulanamadı | Ad copy, slogans, product descriptions and campaign text. |
| Pazarlama metni | Writesonic (SEO Content) | dolaylı | Create new content |
| Ses klonlama | ElevenLabs | alıntı doğrulanamadı | Voice Cloning |
| Ses temizleme | ElevenLabs | bulunamadı | — |
| Seslendirme (metinden ses) | ElevenLabs | kanıtlı | Text to Speech |
| Seslendirme (metinden ses) | Murf.ai | kanıtlı | Convert text to speech and create voiceovers |
| Sosyal medya görseli | Adcreative.ai | kanıtlı | Generate ad banners, texts, photoshoots, and videos that outperform those of your competitors. |
| Sosyal medya görseli | Canva AI (Magic Studio) | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| Sosyal medya görseli | ChatGPT (görsel) | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| Sosyal medya görseli | Gemini (görsel) | bulunamadı | — |
| Sosyal medya görseli | Ideogram | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| Sosyal medya görseli | Simplified (Content & Design) | alıntı doğrulanamadı | Designing posts, stories and banners for social media. |
| Sunum hazırlama | Beautiful.ai | kanıtlı | create polished presentations |
| Sunum hazırlama | Canva AI (Magic Studio) | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| Sunum hazırlama | Gamma AI | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| Sunum hazırlama | Microsoft Copilot Pro | kanıtlı | Easily create polished presentations that stand out. |
| Sunum hazırlama | Tome | sayfa okunamadı | HTTP 404 |
| Tablo analizi | ChatGPT | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| Tablo analizi | Claude | bulunamadı | — |
| Tablo analizi | Gemini | bulunamadı | — |
| Tablo analizi | Microsoft Copilot Pro | kanıtlı | Simplify complex data and create easy-to-read spreadsheets. |
| Toplantı notu | Fathom (Meeting Assistant) | kanıtlı | Fathom captures, transcribes, and summarizes Zoom, Google Meet, and Microsoft Teams calls. |
| Transkript (döküm) | ElevenLabs | kanıtlı | Speech to Text |
| Uygulama oluşturucu | Base44 (No-Code App Platform) | kanıtlı | Base44 is a no-code AI platform that uses vibe coding to build fully-functional apps and websites. |
| Uygulama oluşturucu | Replit Agent | kanıtlı | Replit builds it. Get a working app or website in minutes. No coding required. |
| Uzun metin yazımı | ChatGPT | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| Uzun metin yazımı | Claude | bulunamadı | — |
| Uzun metin yazımı | Gemini | kanıtlı | generate new content ideas for any platform – like comprehensive blog posts, social captions, and website pages. |
| Uzun metin yazımı | Grok | bulunamadı | — |
| Uzun metin yazımı | Jasper AI | dolaylı | Jasper automates how it’s made. From SEO to personalization, localization to campaign creation. |
| Uzun metin yazımı | Writesonic (SEO Content) | kanıtlı | 50 AI articles per month |
| Uzun videodan klip | OpusClip (Video Repurposing) | kanıtlı | turns long videos into high-quality viral clips |
| Ürün fotoğrafı | Adobe Firefly | bulunamadı | — |
| Ürün fotoğrafı | ChatGPT (görsel) | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| Ürün fotoğrafı | DALL-E (OpenAI) | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| Ürün fotoğrafı | FLUX (Black Forest Labs) | sayfa okunamadı | The operation was aborted due to timeout |
| Ürün fotoğrafı | Google Imagen | sayfa okunamadı | HTTP 404 |
| Web araştırması | ChatGPT | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| Web araştırması | Gemini | kanıtlı | Gemini can analyze hundreds of sources in real-time to generate comprehensive research reports. |
| Web araştırması | Grok | dolaylı | get real-time answers from the web |
| Web araştırması | Le Chat (Mistral) | kanıtlı | Mistral has delivered productivity gains across coding, research, and surveillance. |
| Web araştırması | OpenAI Atlas (AI Browser) | sayfa okunamadı | fetch failed |
| Web araştırması | Perplexity AI | kanıtlı | Every answer includes inline citations that show exactly where each claim comes from. |
| Web sitesi yapma | Base44 (No-Code App Platform) | kanıtlı | Base44 is a no-code AI platform that uses vibe coding to build fully-functional apps and websites. |
| Web sitesi yapma | Cursor | alıntı doğrulanamadı | let&#x27;s build a landing page based on attached docs explaining what we do |
| Web sitesi yapma | Gamma AI | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| Web sitesi yapma | Replit Agent | kanıtlı | Replit builds it. Get a working app or website in minutes. No coding required. |

## 5. Okunamayan ya da hata veren ürünler

| Ürün | Durum | Neden |
| --- | --- | --- |
| Midjourney | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| ChatGPT (görsel) | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| DALL-E (OpenAI) | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| Google Imagen | sayfa okunamadı | HTTP 404 |
| FLUX (Black Forest Labs) | sayfa okunamadı | The operation was aborted due to timeout |
| Leonardo AI | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| Ideogram | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| Canva AI (Magic Studio) | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| ChatGPT | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| Sora (OpenAI) | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| Tableau | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| Gamma AI | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
| Tome | sayfa okunamadı | HTTP 404 |
| World Labs Marble | sayfa okunamadı | sayfa metni çok kısa (72 karakter; JS ile çiziliyor olabilir) |
| OpenAI Atlas (AI Browser) | sayfa okunamadı | fetch failed |
| Teal (Resume Builder AI) | sayfa okunamadı | HTTP 403 (bot engeli ya da giriş isteniyor olabilir) |
- Claude: url okunamadı (HTTP 403 (bot engeli ya da giriş isteniyor olabilir))
- Gemini: url okunamadı (sayfa metni çok kısa (182 karakter; JS ile çiziliyor olabilir))
- Claude Code (Anthropic): url okunamadı (HTTP 403 (bot engeli ya da giriş isteniyor olabilir))
- Perplexity AI: url okunamadı (sayfa metni çok kısa (139 karakter; JS ile çiziliyor olabilir))
- Microsoft Power BI: url okunamadı (HTTP 403 (bot engeli ya da giriş isteniyor olabilir))
- Udio: url okunamadı (sayfa metni çok kısa (196 karakter; JS ile çiziliyor olabilir))
- Grok: pricingUrl okunamadı (HTTP 403 (bot engeli ya da giriş isteniyor olabilir))
- Adcreative.ai: pricingUrl okunamadı (HTTP 404)
- Base44 (No-Code App Platform): url okunamadı (sayfa metni çok kısa (0 karakter; JS ile çiziliyor olabilir))
- Luma Dream Machine: pricingUrl okunamadı (HTTP 404)
- Gemini (görsel): url okunamadı (sayfa metni çok kısa (182 karakter; JS ile çiziliyor olabilir))
- Grok Imagine (xAI): pricingUrl okunamadı (HTTP 403 (bot engeli ya da giriş isteniyor olabilir))

### 5b. Okunan metin miktarı

Okunan metin 1500 karakterin altındaysa sayfa "ince" sayılır (sezgisel eşik): sayfa büyük olasılıkla JS ile çiziliyor, model yalnızca başlık ve kısa açıklamayı görmüştür. İnce sayfada "bulunamadı"ya güvenilmez. İnce ürün: 4/40.

| Ürün | Okunan sayfa (karakter) | Toplam | Not |
| --- | --- | --- | --- |
| Adobe Firefly | url: 639, pricingUrl: 1250 | 1889 | — |
| Stable Diffusion | url: 6209 | 6209 | — |
| Claude | pricingUrl: 9172 | 9172 | — |
| Gemini | pricingUrl: 9183 | 9183 | — |
| Jasper AI | url: 9164, pricingUrl: 8836 | 18000 | — |
| Copy.ai | url: 8301, pricingUrl: 8642 | 16943 | — |
| GitHub Copilot | url: 9276, pricingUrl: 8724 | 18000 | — |
| Cursor | url: 9187, pricingUrl: 8813 | 18000 | — |
| Claude Code (Anthropic) | pricingUrl: 9172 | 9172 | — |
| ElevenLabs | url: 9204, pricingUrl: 8309 | 17513 | — |
| Murf.ai | url: 9225, pricingUrl: 231 | 9456 | — |
| Google Veo | url: 9026 | 9026 | — |
| Perplexity AI | pricingUrl: 3487 | 3487 | — |
| Elicit AI | url: 9260, pricingUrl: 8740 | 18000 | — |
| Microsoft Power BI | pricingUrl: 9362 | 9362 | — |
| Beautiful.ai | url: 9176, pricingUrl: 8824 | 18000 | — |
| Suno AI | url: 6335, pricingUrl: 3051 | 9386 | — |
| Udio | pricingUrl: 373 | 373 | İNCE: "bulunamadı" güvenilmez |
| Runway | url: 4570, pricingUrl: 6345 | 10915 | — |
| Pika Labs | url: 5833, pricingUrl: 6745 | 12578 | — |
| Grok | url: 341 | 341 | İNCE: "bulunamadı" güvenilmez |
| NotebookLM | url: 598, pricingUrl: 248 | 846 | İNCE: "bulunamadı" güvenilmez |
| Synthesia | url: 9187, pricingUrl: 8813 | 18000 | — |
| n8n AI Workflow Builder | url: 8064, pricingUrl: 9167 | 17231 | — |
| Adcreative.ai | url: 9195 | 9195 | — |
| Replit Agent | url: 9166, pricingUrl: 3332 | 12498 | — |
| Windsurf (Codeium) | url: 9142, pricingUrl: 3940 | 13082 | — |
| OpusClip (Video Repurposing) | url: 1035, pricingUrl: 9076 | 10111 | — |
| Fathom (Meeting Assistant) | url: 7548, pricingUrl: 7113 | 14661 | — |
| Base44 (No-Code App Platform) | pricingUrl: 7510 | 7510 | — |
| Anyword (Copy AI) | url: 9203, pricingUrl: 8797 | 18000 | — |
| Writesonic (SEO Content) | url: 9230, pricingUrl: 8770 | 18000 | — |
| ClickUp Brain (Project AI) | url: 9200, pricingUrl: 8800 | 18000 | — |
| Simplified (Content & Design) | url: 9183, pricingUrl: 8817 | 18000 | — |
| Kling AI | url: 6823, pricingUrl: 273 | 7096 | — |
| Luma Dream Machine | url: 3569 | 3569 | — |
| Gemini (görsel) | pricingUrl: 9183 | 9183 | — |
| Microsoft Copilot Pro | url: 9174, pricingUrl: 8826 | 18000 | — |
| Le Chat (Mistral) | url: 5777, pricingUrl: 8581 | 14358 | — |
| Grok Imagine (xAI) | url: 341 | 341 | İNCE: "bulunamadı" güvenilmez |

## 6. Sınırlar

- Yalnızca ürünün kendi sayfası okunur (url ve pricingUrl); yardım merkezi, belgeler ve sürüm notları okunmaz. Bu yüzden "bulunamadı" çoktur.
- "Kanıtlı" ve "dolaylı" ayrımını model yapar; alıntı doğrulaması kodla yapılır, ama alıntının görevi gerçekten kanıtlayıp kanıtlamadığını insan okumalıdır.
- Bu rapor ürünleri birbirine göre sıralamaz; sıralamaya, puana ve katalogdaki görev listelerine dokunmaz.

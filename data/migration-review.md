# Göç incelemesi: lib/tools-database.json -> data/products.json

Bu dosyayı `scripts/migrate-to-catalog.mjs` üretir. Elle düzenleme; eşlemeyi scriptteki `ACTIVE_TASKS` tablosunda değiştir ve scripti yeniden çalıştır.

Özet: 96 kayıt → 56 active, 40 retired. Emekli ürünlerin görevi sadece kategori varsayılanıdır (önerilmezler).

## Emin olmadığım eşlemeler

Biçim: ürün → önerilen görev → neden → emin değilim. Bu görevler şimdilik ürüne EKLENDİ; yanlışsa scriptten çıkar.

- Midjourney v7 → `image.logo` → logo işe yarar ama metin render zayıf → emin değilim
- ChatGPT (GPT-4o Image) → `image.product-photo` → ürün çekimi için özel bir iddia yok → emin değilim
- Google Imagen 4 → `image.product-photo` → fotogerçekçilik iddiasından çıkarım → emin değilim
- Adobe Firefly Image 4 → `image.background-remove` → Firefly web uygulamasında arka plan kaldırma doğrulanmalı → emin değilim
- Adobe Firefly Image 4 → `image.product-photo` → ticari güvenli iddiasından çıkarım → emin değilim
- Flux.1 Pro → `image.product-photo` → yüksek kalite iddiasından çıkarım → emin değilim
- Leonardo AI → `image.upscale` → Leonardo'nun büyütme aracı kayıtta geçmiyor → emin değilim
- Canva AI (Magic Studio) → `image.logo` → logo şablonları var, üretim gücü ayrı → emin değilim
- Canva AI (Magic Studio) → `video.edit-short-social` → Canva video editörü kayıtta geçmiyor → emin değilim
- Cursor → `code.website-builder` → sadece geliştirici için → emin değilim
- ElevenLabs → `audio.cleanup` → Voice Isolator kayıtta geçmiyor → emin değilim
- ElevenLabs → `audio.transcribe` → Speech-to-Text (Scribe) ayrı kayıttı, emekliye ayrıldı → emin değilim
- Sora 2 (OpenAI) → `video.image-to-video` → görselden video kayıtta geçmiyor → emin değilim
- Google Veo 3 → `video.image-to-video` → görselden video kayıtta geçmiyor → emin değilim
- Perplexity AI → `research.academic` → akademik mod kayıtta geçmiyor → emin değilim
- Gamma AI → `code.website-builder` → açıklamada "web sitesi" geçiyor, sınırlı site aracı → emin değilim
- Tome → `slides.create` → Tome sunum ürününü kapatmış olabilir; doğrulanmalı → emin değilim
- Runway Gen-3 → `video.edit-short-social` → montaj/efekt iddiasından çıkarım → emin değilim
- Pika Labs → `video.edit-short-social` → "social video" iddiasından çıkarım → emin değilim
- Grok 4.1 → `text.write-longform` → creative-writing iddiası → emin değilim
- Grok 4.1 → `research.web` → real-time-search iddiası → emin değilim
- NotebookLM → `text.summarize` → kayıttaki açıklama ürünle uyuşmuyor (bkz. veri sorunları) → emin değilim
- OpenAI Atlas (AI Browser) → `research.web` → bir tarayıcı; araştırma aracı sayılmalı mı? → emin değilim
- Adcreative.ai → `text.marketing-copy` → reklam metni de üretiyor ama odak görsel → emin değilim
- OpusClip (Video Repurposing) → `video.subtitles` → altyazı var; uzun videonun tamamı için uygun mu? → emin değilim
- Base44 (No-Code App Platform) → `code.website-builder` → web uygulaması üretir; tanıtım sitesi için? → emin değilim
- Writesonic (SEO Content) → `text.marketing-copy` → SEO içerik odaklı → emin değilim
- Simplified (Content & Design) → `text.marketing-copy` → entegre metin yazarlığı iddiası → emin değilim
- Gemini 3 Pro Image → `image.edit` → düzenleme kayıtta geçmiyor → emin değilim
- Gemini 3 Pro Image → `design.social-graphic` → metin render iddiasından çıkarım → emin değilim
- Microsoft Copilot Pro → `slides.create` → PowerPoint içinde; kayıtta sunum geçmiyor → emin değilim
- Le Chat (Mistral) → `research.web` → kaynakçalı web araması iddiası → emin değilim
- Grok Imagine v0.9 (xAI) → `video.image-to-video` → kayıtta geçmiyor → emin değilim

## Görevi olmayan aktif ürünler

- ClickUp Brain (Project AI): bestFor: project-automation, task-generation — taksonomide proje yönetimi görevi yok. Hiç önerilmez; ya bir görev eklenmeli ya da ürün emekliye ayrılmalı.

## Tüm aktif ürünler

| Ürün | Görevler | Dayanak |
| --- | --- | --- |
| Midjourney v7 | image.generate, image.logo (?) | bestFor: artistic images, poster design, concept art |
| ChatGPT (GPT-4o Image) | image.generate, image.logo, image.edit, design.social-graphic, image.product-photo (?) | bestFor: text rendering, signage, infographic; ChatGPT içinde görsel düzenleme |
| DALL-E 3 | image.generate, image.product-photo | bestFor: photorealistic images, product shots |
| Google Imagen 4 | image.generate, image.product-photo (?) | bestFor: photorealism, fast generation |
| Adobe Firefly Image 4 | image.generate, image.edit, image.background-remove (?), image.product-photo (?) | bestFor: brand-safe editing, commercial use |
| Stable Diffusion XL | image.generate | bestFor: high-volume generation, customization |
| Flux.1 Pro | image.generate, image.product-photo (?) | bestFor: fast generation, high quality |
| Leonardo AI | image.generate, image.upscale (?) | bestFor: custom models, game assets |
| Ideogram 2.0 | image.generate, image.logo, design.social-graphic | bestFor: text rendering, posters, typography, logos |
| Canva AI (Magic Studio) | design.social-graphic, slides.create, docs.create, image.background-remove, image.logo (?), video.edit-short-social (?) | bestFor: social media, presentations, branding, marketing |
| ChatGPT (GPT-5) | chat.general-assistant, text.write-longform, text.marketing-copy, text.email, text.summarize, text.translate, text.rewrite-edit, research.web, research.document-qa, data.spreadsheet-analysis, code.debug, docs.create | bestFor: content writing, research, coding, analysis — genel asistan |
| Claude AI (Claude 4) | chat.general-assistant, text.write-longform, text.marketing-copy, text.email, text.summarize, text.translate, text.rewrite-edit, research.document-qa, data.spreadsheet-analysis, code.debug, docs.create | bestFor: long documents, analysis, coding, research — genel asistan |
| Gemini 2.5 Pro | chat.general-assistant, text.write-longform, text.email, text.summarize, text.translate, text.rewrite-edit, research.web, research.document-qa, data.spreadsheet-analysis, code.debug | bestFor: multimodal tasks, Google integration, research, code |
| Jasper AI | text.marketing-copy, text.write-longform | bestFor: marketing copy, SEO content, brand voice |
| Copy.ai | text.marketing-copy | bestFor: copywriting, social-media-content |
| GitHub Copilot | code.assistant-ide, code.debug | bestFor: code completion, function generation, test cases |
| Cursor | code.assistant-ide, code.debug, code.website-builder (?) | bestFor: multi-file edits, codebase queries, agent mode |
| Claude Code (Anthropic) | code.agent-cli, code.debug | bestFor: terminal coding, code explanation |
| ElevenLabs | audio.tts-voiceover, audio.voice-clone, audio.cleanup (?), audio.transcribe (?) | bestFor: voice cloning, audiobooks, dubbing |
| Murf.ai | audio.tts-voiceover | bestFor: voiceovers, e-learning, ads |
| Sora 2 (OpenAI) | video.text-to-video, video.image-to-video (?) | bestFor: cinematic videos, storytelling |
| Google Veo 3 | video.text-to-video, video.image-to-video (?) | bestFor: fast generation, high quality |
| Perplexity AI | research.web, research.academic (?) | bestFor: research, fact-checking, cited answers |
| Elicit AI | research.academic | bestFor: literature review, data extraction |
| Tableau | data.dashboard | bestFor: dashboards, data visualization |
| Microsoft Power BI | data.dashboard | bestFor: business intelligence, corporate reporting |
| Gamma AI | slides.create, docs.create, code.website-builder (?) | bestFor: presentation, pitch deck, one-pager, proposal |
| Beautiful.ai | slides.create | bestFor: presentation, pitch deck |
| Tome | slides.create (?) | bestFor: presentation, storytelling, pitch deck |
| Suno AI | music.generate | bestFor: music, song, jingle |
| Udio | music.generate | bestFor: music, song, production |
| Runway Gen-3 | video.text-to-video, video.image-to-video, video.edit-short-social (?) | bestFor: video generation, montaj, b-roll |
| Pika Labs | video.text-to-video, video.image-to-video, video.edit-short-social (?) | bestFor: video generation, animation, social video |
| Grok 4.1 | chat.general-assistant, text.write-longform (?), research.web (?) | bestFor: creative-writing, reasoning, real-time-search |
| World Labs Marble | 3d.generate | bestFor: 3d-world-generation, text-to-3d |
| NotebookLM | research.document-qa, text.summarize (?) | bestFor: document-synthesis |
| OpenAI Atlas (AI Browser) | research.web (?) | bestFor: ai-browsing, research-automation |
| Synthesia 3.0 | video.avatar-presenter | bestFor: avatar-video, dubbing |
| n8n AI Workflow Builder | automation.workflow | bestFor: workflow-automation, no-code |
| Adcreative.ai | design.social-graphic, text.marketing-copy (?) | bestFor: ad-creative-generation, marketing-assets |
| Replit Agent | code.app-builder, code.website-builder | bestFor: app-generation, full-stack-development, deployment |
| Windsurf (Codeium) | code.assistant-ide, code.debug | bestFor: code-completion, code-chat, debugging |
| OpusClip (Video Repurposing) | video.repurpose-clips, video.edit-short-social, video.subtitles (?) | bestFor: short-form-video, content-repurposing; açıklamada altyazı |
| Fathom (Meeting Assistant) | audio.meeting-notes | bestFor: meeting-transcription, note-taking, action-items |
| Base44 (No-Code App Platform) | code.app-builder, code.website-builder (?) | bestFor: app-building, dashboard-creation |
| Anyword (Copy AI) | text.marketing-copy | bestFor: copywriting, ad-copy-generation |
| Writesonic (SEO Content) | text.write-longform, text.marketing-copy (?) | bestFor: long-form-content, seo-optimization |
| ClickUp Brain (Project AI) | — | bestFor: project-automation, task-generation — taksonomide proje yönetimi görevi yok |
| Simplified (Content & Design) | design.social-graphic, text.marketing-copy (?) | bestFor: content-generation, design-creation |
| Teal (Resume Builder AI) | docs.create | bestFor: resume-optimization |
| Kling AI 2.1 | video.text-to-video, video.image-to-video | bestFor: text-to-video, image-to-video |
| Luma Dream Machine (Ray2) | video.text-to-video, video.image-to-video | bestFor: text-to-video, image-to-video |
| Gemini 3 Pro Image | image.generate, image.logo, image.edit (?), design.social-graphic (?) | bestFor: image-generation, text-rendering |
| Microsoft Copilot Pro | chat.general-assistant, text.email, docs.create, data.spreadsheet-analysis, slides.create (?) | bestFor: document-drafting, data-analysis |
| Le Chat (Mistral) | chat.general-assistant, text.translate, research.web (?) | bestFor: coding, reasoning, multilingual |
| Grok Imagine v0.9 (xAI) | video.text-to-video, video.image-to-video (?) | bestFor: video-generation |

## Görev başına aktif ürün sayısı

| Görev | Aktif ürün |
| --- | --- |
| `text.write-longform` | 6 |
| `text.marketing-copy` | 8 |
| `text.email` | 4 |
| `text.summarize` | 4 |
| `text.translate` | 4 |
| `text.rewrite-edit` | 3 |
| `chat.general-assistant` | 6 |
| `research.web` | 6 |
| `research.academic` | 2 |
| `research.document-qa` | 4 |
| `slides.create` | 5 |
| `docs.create` | 6 |
| `image.generate` | 10 |
| `image.logo` | 5 |
| `image.edit` | 3 |
| `image.product-photo` | 5 |
| `image.background-remove` | 2 |
| `image.upscale` | 1 |
| `design.social-graphic` | 6 |
| `video.text-to-video` | 7 |
| `video.image-to-video` | 7 |
| `video.edit-short-social` | 4 |
| `video.subtitles` | 1 |
| `video.avatar-presenter` | 1 |
| `video.repurpose-clips` | 1 |
| `audio.tts-voiceover` | 2 |
| `audio.voice-clone` | 1 |
| `audio.transcribe` | 1 |
| `audio.cleanup` | 1 |
| `audio.meeting-notes` | 1 |
| `music.generate` | 2 |
| `code.assistant-ide` | 3 |
| `code.agent-cli` | 1 |
| `code.debug` | 7 |
| `code.app-builder` | 2 |
| `code.website-builder` | 4 |
| `data.spreadsheet-analysis` | 4 |
| `data.dashboard` | 2 |
| `automation.workflow` | 1 |
| `3d.generate` | 1 |

## Veri sorunları (göçte düzeltilmedi, aynen taşındı)

- İngilizce açıklaması boş olan 32 kaydın `description.en` alanı Türkçe açıklamanın çevirisiyle dolduruldu; yeni iddia eklenmedi.
- **Grok 4.1** açıklamasında kaynaksız sayılar var ("1483 Elo", "%4,22 halüsinasyon"). CLAUDE.md kuralına göre kaynaksız sayı hatadır; açıklama temizlenmeli.
- **NotebookLM** açıklaması ("otonom araştırma ajanı, yüzlerce siteyi tarar") ürünle uyuşmuyor; NotebookLM yüklenen kaynaklarla çalışır.
- **Tome**: sunum ürünü kapatılmış olabilir; kapandıysa emekliye ayrılmalı.
- **DALL-E 3**: ChatGPT içinde yerini GPT görsel modeline bırakmış olabilir; iki kayıt (DALL-E 3, ChatGPT (GPT-4o Image)) birleştirilmeli mi?
- `access` alanı 96 kayıtta da boş (v1'de yoktu). P4'teki platform filtresi bilinmeyeni geçirir ama kartta "bilinmiyor" görünür.
- `addedAt` = v1'deki `lastUpdated`; ürünün kataloğa gerçek giriş tarihi bilinmiyor.

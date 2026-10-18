# Prompt rehberleri — Ferit incelemesi

> **2026-10-18 — Görev rehberleri:** Aşağıdaki 10 araç/ortak rehbere ek olarak her prompt yazılan göreve özel **47 görev rehberi** eklendi (`data/prompt-guides/task-*.md`, bölüm sonundaki tablo). Araca özel rehberi olmayan HER araçta, kullanıcının işine göre bu rehber kullanılır. Hepsi **TASLAK** (`reviewedBy` boş). Önceki 10 rehberden farkı: kaynakları vardır (aşağıda) ve bölümleri doludur; ama araca özel sözdizimi içermez, çünkü hiçbir araca bağlı değildir.

10 rehberin hepsi **TASLAK** (`reviewedBy` boş) ve **kaynaksız**: yazılırken resmi dokümantasyon sitelerine erişilemedi. Kural gereği ("resmi dokümana erişemediğin rehberi UYDURMA") sözdizimi, yap/yapma ve örnek bölümlerinde `KAYNAK GEREKLİ` yazıyor. Şablon bölümü RouteAI'ın kendi iskeleti; araca özel sözdizimi içermiyor.

Taslak rehberle üretilen promptlar kartta "Taslak rehber" etiketiyle görünür. Üretici, KAYNAK GEREKLİ bölümlerde belgelenmemiş araç sözdizimine dayanmaz; sade ve yaygın uyumlu ifade kullanır.

> **2026-09-28:** Soru kartındaki soru ve seçenekler artık kullanıcının girişine göre üretiliyor. Rehberdeki `question` ve `options` alanları modele örnek olarak gidiyor ve üretilen soru geçersizse yedek olarak kullanılıyor. Seçenek değerleri yine iyi yazılmalı; model onları uyarlıyor.

## Her rehberde yapılacaklar

1. Resmi dokümandan `## Sözdizimi`, `## Yap / Yapma`, `## Örnekler` bölümlerini doldur; kullandığın sayfaları `sources`a URL olarak ekle.
2. Slotları ve seçenek değerlerini kontrol et (değer, prompta aynen giren metin).
3. Hazır iyileştirmeleri (4–8) kontrol et; `patch` değerleri slot seçeneklerinden biri olmalı ya da serbest metin.
4. `validators`: araca özel kural (ör. zorunlu parametre) varsa ekle. Şu an çoğunda sadece RouteAI'ın kendi uzunluk sınırı var.
5. `reviewedBy: ferit`, `reviewedAt: YYYY-MM-DD`, içerik değiştiyse `version`'ı artır; `npm run build:guides`.

## Rehber bazında

| Rehber | Ürünler | Slotlar (high kalın) | Doğrulayıcılar | Özellikle bak |
| --- | --- | --- | --- | --- |
| `chat-general` | chatgpt-gpt-5, claude-ai-claude-4, gemini-25-pro | **role**, **format**, audience, length, tone | maxLength 6000 | ChatGPT, Claude, Gemini ortak: rol + bağlam + görev + format + kısıtlar. Ürüne özel ipuçları (ör. XML etiketleri, sistem talimatı) kaynakla eklenmeli. |
| `cursor-task` | cursor | **goal**, **scope**, constraints, verification, context | maxLength 4000 | Kural dosyaları (ör. proje kuralları) ve ajan modu farkları doğrulanmalı. |
| `elevenlabs-voiceover` | elevenlabs | **language**, **tone**, voice, pace, use | maxLength 5000 | Ses ayarları (stabilite vb.) ve Türkçe desteği doğrulanmalı. Prompt dili kullanıcının dili (metin okunacak). |
| `gamma` | gamma-ai | **audience**, **length**, tone, visuals | maxLength 4000 | "Uydurma sayı yok" kuralı iyileştirmede de var (`more-data` yer tutucu ister). Gamma'nın içe aktarma/uzunluk seçenekleri doğrulanmalı. |
| `ideogram` | ideogram-20 | **text**, **style**, **subject**, aspect, palette | maxLength 1500 | Metnin tırnak içinde yazılması checklist'te; Ideogram'ın metin render kuralları doğrulanmalı. Magic Prompt vb. ayarlar eklenmedi. |
| `image-natural` | chatgpt-gpt-4o-image, dall-e-3, google-imagen-4, gemini-3-pro-image, flux1-pro | **subject**, **style**, **aspect**, mood, background | maxLength 2000 | Beş ürün için ortak rehber (GPT görsel, DALL-E 3, Imagen 4, Gemini 3 Pro Image, Flux.1 Pro). Ürünler arasında sözdizimi farkı varsa ayrı rehbere bölünmeli. DALL-E 3 kaydının güncelliği migration-review'da işaretli. |
| `midjourney` | midjourney-v7 | **subject**, **style**, **aspect**, mood, detail | regex --ar \d+:\d+; maxLength 1500 | `--ar` regex'i P7 promptundaki örnekten; parametre adı ve biçimi resmi dokümanla doğrulanmalı. Sürüm (`--v`), stil (`--style`, `--stylize`) gibi parametreler eklenmedi. |
| `runway` | runway-gen-3 | **subject**, **camera**, style, lighting, pace | maxLength 1000 | Süre, çözünürlük gibi ayarlar ürün iddiası olacağı için slot yapılmadı; `pace` RouteAI'ın kendi tercihi. |
| `suno` | suno-ai | **genre**, **mood**, **vocals**, tempo, theme | maxLength 3000 | Stil alanı ile söz alanının ayrımı, uzunluk sınırları ve etiket sözdizimi (ör. [Chorus]) doğrulanmalı. Ticari kullanım koşulu P2 facts ile netleşecek. |
| `text-to-video` | google-veo-3, sora-2-openai | **scene**, **camera**, **audio**, style, pace | maxLength 1500 | Veo 3 ve Sora 2 ortak. Ses (`audio`) slotu high: iki ürünün ses desteği resmi dokümanla doğrulanmalı. |

## Resmi kaynak adayları (2026-09-25)

Aşağıdaki sayfalar, resmi alan adlarıyla sınırlı web aramasıyla bulundu. Bu ortamın ağ politikası sayfaları doğrudan açmaya izin vermediği için **rehberlere eklenmedi ve gövdeler yazılmadı**. Ferit sayfaları açıp okuduktan sonra ilgili rehberin `sources` alanına ekler ve bölümleri doldurur. "Kontrol et" sütunu arama özetlerinden alındı; sayfada doğrulanmadan rehbere girmemeli.

| Rehber | Resmi sayfalar | Kontrol et (arama özetine göre) |
| --- | --- | --- |
| `midjourney` | [Parameter List](https://docs.midjourney.com/hc/en-us/articles/32859204029709-Parameter-List), [Prompt Basics](https://docs.midjourney.com/hc/en-us/articles/32023408776205-Prompt-Basics), [Aspect Ratio](https://docs.midjourney.com/hc/en-us/articles/31894244298125-Aspect-Ratio), [No](https://docs.midjourney.com/hc/en-us/articles/32173351982093-No) | Parametreler prompt sonunda. Oran için hem `--ar` hem `--aspect` geçerli; mevcut regex (`--ar \d+:\d+`) `--aspect` biçimini reddeder. |
| `ideogram` | [Prompting Guide](https://docs.ideogram.ai/using-ideogram/prompting-guide), [Text and Typography](https://docs.ideogram.ai/using-ideogram/getting-started/prompting-guide/2-prompting-fundamentals/text-and-typography), [Prompt Structure](https://docs.ideogram.ai/using-ideogram/prompting-guide/3-prompt-structure), [Magic Prompt](https://docs.ideogram.ai/using-ideogram/generation-settings/magic-prompt) | Yazılacak metin tırnak içinde ve promptun başına yakın. Sahne sade olursa metin daha temiz çıkar. |
| `image-natural` | OpenAI: [GPT Image prompting guide](https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide), [Image prompting](https://developers.openai.com/api/docs/guides/image-prompting) · Google: [Imagen prompt guide](https://ai.google.dev/gemini-api/docs/imagen#imagen-prompt-guide) · BFL: [FLUX Prompting Guide](https://docs.bfl.ml/guides/prompting_summary), [Working Without Negative Prompts](https://docs.bfl.ml/guides/prompting_guide_t2i_negative) | FLUX negatif promptu desteklemiyor; kelime sırası önemli. Imagen'de görsel içi metin 25 karakterle sınırlı tutulmalı. Beş ürün arasındaki bu farklar rehberi bölmeyi gerektirebilir. |
| `runway` | [Gen-3 Alpha Prompting Guide](https://help.runwayml.com/hc/en-us/articles/30586818553107-Gen-3-Alpha-Prompting-Guide), [Prompting Guides & Examples](https://help.runwayml.com/hc/en-us/sections/23989550580627-Prompting-Guides-Examples) | Gen-3 Alpha negatif promptu desteklemiyor ("kamera hareket etmiyor" gibi olumsuz ifadeler ters sonuç verebilir). Önerilen yapı: kamera hareketi + sahne + detaylar. |
| `text-to-video` | Veo: [Veo 3 prompt guide (DeepMind)](https://deepmind.google/models/veo/prompt-guide/), [Vertex AI video prompt guide](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/video/video-gen-prompt-guide) · Sora: [Sora 2 Prompting Guide](https://developers.openai.com/cookbook/examples/sora/sora2_prompting_guide) | Veo'da ses (diyalog, efekt) promptta tarif edilebiliyor; `audio` slotunun high olması Veo için uygun görünüyor. Sora'da kısa klipler talimatı daha iyi izliyor. |
| `suno` | [Better Prompts in Lyrics](https://help.suno.com/en/articles/5782977), [Detailed Style Instructions](https://help.suno.com/en/articles/5782849), [Music Glossary](https://help.suno.com/en/articles/9010177) | Söz alanında yapı etiketleri: `[Verse]`, `[Chorus]`, `[Bridge]`. Stil alanı serbest metin kabul ediyor. |
| `elevenlabs-voiceover` | [TTS best practices](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices), [Prompting Eleven v3](https://elevenlabs.io/docs/best-practices/prompting/eleven-v3) | Sayıları yazıyla yaz (çok dilli modellerde). v3'te köşeli ses etiketleri (ör. `[excited]`). Hız ayarı 0.7–1.2 aralığında. |
| `gamma` | [Yeni sunum oluşturma (Help Center)](https://help.gamma.app/en/articles/7838093-how-do-i-create-a-new-presentation-document-or-webpage-in-gamma), [AI presentation prompts rehberi](https://gamma.app/explore/content/guides/the-ultimate-guide-to-ai-presentation-prompts-how-to-get-better-slides-from-gamma) | Hedef kitle, amaç, ana noktalar ve uzunluk belirten promptlar daha iyi sonuç veriyor. Generate / Paste / Import modları var. |
| `cursor-task` | [Rules](https://cursor.com/docs/rules), [Agent best practices](https://cursor.com/blog/agent-best-practices), [Agent overview](https://cursor.com/docs/agent/overview) | Kurallar odaklı ve kısa (500 satır altı); dosya içeriğini kopyalamak yerine dosyaya referans ver; koda geçmeden önce plan. |
| `chat-general` | OpenAI: [Prompt engineering](https://developers.openai.com/api/docs/guides/prompt-engineering), [ChatGPT için en iyi uygulamalar](https://help.openai.com/en/articles/10032626-prompt-engineering-best-practices-for-chatgpt) · Anthropic: [Prompt engineering overview](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview), [Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) · Google: [Prompt design strategies](https://ai.google.dev/gemini-api/docs/prompting-strategies) | Üç kaynak da aynı iskeleti öneriyor: rol/persona + görev + bağlam + format. Claude için XML etiketleriyle yapı öneriliyor. |

## Atlananlar

- Katalogda olmayan ürün için rehber yazılmadı. İstenen 10 ailenin hepsinin katalogda aktif ürünü var; atlanan aile yok.
- Rehberi olmayan aktif ürünler (ör. Udio, Pika Labs, Kling, Luma, Murf.ai, Jasper) `build_prompt` çağrılırsa `no_guide` döner; ajan bunu kullanıcıya söyler.

## Eval

`npm run eval:prompts` (OPENAI_API_KEY gerekir): rehber başına 2 senaryo (`evals/prompts.jsonl`). Bu ortamda anahtar yok, 20/20 skipped (`evals/results/2026-09-24-prompts.json`).

## Görev rehberleri (47) — Ferit incelemesi

Kural: araca özel rehberi olan ürün kendi rehberini kullanır (yalnız işin türü rehberle aynıysa). Yoksa kullanıcının işi (`taskId`) için yazılmış görev rehberi, o da yoksa ortak iskelet, o da yoksa türün genel iskeleti kullanılır (`lib/promptBuilder/fallback.ts`). Görev rehberi, ortak iskeletten (`chat-general`, `image-natural`, `text-to-video`) **önce** gelir; ortak iskelet yalnızca görev rehberi olmayan işte (8 muaf görev) kullanılır.

**Muaf 8 görev** (araca yazılan prompt yok; dosya yükle, düğmeye bas, ayar seç): `image.background-remove`, `image.upscale`, `video.subtitles`, `video.repurpose-clips`, `audio.voice-clone`, `audio.transcribe`, `audio.cleanup`, `audio.meeting-notes`. Bunlar eskisi gibi tür/görev eşlemesine düşer (`FALLBACK_BY_MODALITY` / `FALLBACK_BY_TASK`).

### Nasıl yazıldı
- Kaynaklar: yalnız bu çalışmada GERÇEKTEN okunan sayfalar (OpenAI, Anthropic, Google genel prompt rehberleri; görev türüne göre OpenAI görsel, Midjourney, Veo, Sora, ElevenLabs, Cursor, Claude Code, Meshy, Gamma rehberleri). Sayfalar otomatik özetleyiciyle okundu; **kelimesi kelimesine alıntı değildir.** Ferit sayfalarla karşılaştırmalı.
- Kaynağı okunamayan ya da zayıf çıkan sayfalardan (Ideogram, Runway Gen-3 [kullanımdan kalkmış], Imagen [kapatılmış], Suno, BFL) kural alınmadı.
- Tüm rehberler aynı yapıda: ≥6 slot (≥2 'high'), 6–8 hazır iyileştirme, ≥6 maddelik kontrol listesi, uzunluk sınırı ≤3000 karakter, doldurulmamış `{ }` yasağı, 2 örnek (örnek promptlar rehberin kendi doğrulayıcılarından geçer; test kilitler).
- Uydurma koruması: bilgi uydurmanın zarar verdiği görevlerde (metin, CV, araştırma, muhasebe, satış, destek botu, proje, planlama, slayt) şablonda açık kural var; test kilitler.

### Ferit ne kontrol etmeli
1. Her rehberde `## Sözdizimi` bölümündeki genel öneriler doğru mu? Özellikle iddialı olanlar: Veo/Sora (tek eylem, kamera), ElevenLabs/TTS (rakamı yazıyla yaz, noktalama), Meshy/3D (tek nesne, A-pose), Gamma/slayt (kitle + amaç).
2. Slot seçeneklerinin `value` alanları prompta aynen girer; Türkçe/İngilizce karşılıkları ve değerleri oku.
3. Araç adı geçen yerler (örn. "Zapier, Make, n8n", "Intercom Fin", "Comet, Atlas") yalnız örnektir; ürün iddiası değildir. Kaldırmak istersen rehberden çıkarman yeterli.
4. Uygun bulunca: `reviewedBy: ferit`, `reviewedAt: YYYY-MM-DD`, içerik değiştiyse `version`'ı artır, `npm run build:guides`.
5. Görev rehberi bir araçta kötü sonuç veriyorsa o araca özel rehber yazılabilir; araca özel rehber (aynı türde) her zaman önce gelir.

### Bilinen sınırlar
- LLM üretimi gerçek anahtarla denenmedi (bu ortamda anahtar yok): şablonların gerçek çıktı kalitesi ÖLÇÜLMEDİ. Yayından önce en az 5 farklı görevde elle dene (`/dev/cards` yalnızca kartı gösterir).
- Rehber gövdesi her çağrıda sistem promptuna girer; görev rehberleri eski taslaklardan uzundur, çağrı başına token maliyeti artar. Çıktı sınırı (`maxTokensFor`) değişmedi.
- `video.edit-short-social` gibi bazı işlerde araçların çoğu prompt almaz; rehber "düzenleme özeti" yazar. Araç komut alanı yoksa kullanıcı özeti elle uygular.
- Sözdizimi bölümleri araç-bağımsızdır; araca özel parametreler (örn. `--ar`) görev rehberinde YOKTUR.

### Görev rehberi tablosu

| Rehber | Görev | Tür | Prompt dili | 'high' slotlar | Kaynak siteler |
| --- | --- | --- | --- | --- | --- |
| `task-3d-generate` | `3d.generate` | 3d | en | **object**, **style**, **purpose** | developers.openai.com, docs.meshy.ai |
| `task-audio-tts-voiceover` | `audio.tts-voiceover` | audio | user | **use**, **voice**, **length** | developers.openai.com, elevenlabs.io, platform.claude.com |
| `task-agent-browser` | `agent.browser` | automation | user | **job**, **scope**, **autonomy**, **sensitive** | ai.google.dev, developers.openai.com, platform.claude.com |
| `task-automation-workflow` | `automation.workflow` | automation | user | **trigger**, **action**, **safety** | ai.google.dev, developers.openai.com, platform.claude.com |
| `task-productivity-planning` | `productivity.planning` | automation | user | **need**, **tasks**, **fixed**, **hours** | ai.google.dev, developers.openai.com, platform.claude.com |
| `task-project-management` | `project.management` | automation | user | **need**, **project**, **level** | ai.google.dev, developers.openai.com, platform.claude.com |
| `task-sales-prospecting` | `sales.prospecting` | automation | user | **need**, **customer**, **offer**, **personalization** | ai.google.dev, developers.openai.com, platform.claude.com |
| `task-support-chatbot` | `support.chatbot` | automation | user | **business**, **scope**, **handoff** | ai.google.dev, developers.openai.com, platform.claude.com |
| `task-code-agent-cli` | `code.agent-cli` | code | user | **job**, **scope**, **autonomy**, **verify**, **safety** | code.claude.com, cursor.com, developers.openai.com, platform.claude.com |
| `task-code-app-builder` | `code.app-builder` | code | user | **app**, **users**, **features** | ai.google.dev, developers.openai.com, platform.claude.com |
| `task-code-assistant-ide` | `code.assistant-ide` | code | user | **job**, **scope**, **language**, **verify** | code.claude.com, cursor.com, developers.openai.com, platform.claude.com |
| `task-code-debug` | `code.debug` | code | user | **symptom**, **evidence**, **approach** | code.claude.com, cursor.com, developers.openai.com, platform.claude.com |
| `task-code-website-builder` | `code.website-builder` | code | user | **site**, **goal**, **pages**, **content** | ai.google.dev, developers.openai.com, platform.claude.com |
| `task-design-ui-prototype` | `design.ui-prototype` | code | user | **what**, **screens**, **goal** | ai.google.dev, developers.openai.com, platform.claude.com |
| `task-game-dev` | `game.dev` | code | user | **game**, **engine**, **job** | code.claude.com, cursor.com, developers.openai.com, platform.claude.com |
| `task-data-dashboard` | `data.dashboard` | data | user | **purpose**, **audience**, **kpis** | ai.google.dev, developers.openai.com, platform.claude.com |
| `task-data-spreadsheet-analysis` | `data.spreadsheet-analysis` | data | user | **question**, **data**, **output**, **rigor** | ai.google.dev, developers.openai.com, platform.claude.com |
| `task-finance-bookkeeping` | `finance.bookkeeping` | data | user | **need**, **data**, **categories**, **uncertain** | ai.google.dev, developers.openai.com, platform.claude.com |
| `task-design-social-graphic` | `design.social-graphic` | image | en | **format**, **message**, **style** | developers.openai.com, docs.midjourney.com |
| `task-game-asset-art` | `game.asset-art` | image | en | **asset-type**, **art-style**, **view**, **background** | developers.openai.com, docs.midjourney.com |
| `task-image-edit` | `image.edit` | image | en | **edit-type**, **preserve**, **target** | developers.openai.com |
| `task-image-generate` | `image.generate` | image | en | **subject**, **medium**, **purpose** | developers.openai.com, docs.midjourney.com |
| `task-image-logo` | `image.logo` | image | en | **logo-type**, **style** | developers.openai.com, docs.midjourney.com |
| `task-image-product-photo` | `image.product-photo` | image | en | **source**, **scene**, **background** | developers.openai.com, docs.midjourney.com |
| `task-music-generate` | `music.generate` | music | user | **kind**, **genre**, **mood** | developers.openai.com, help.suno.com, platform.claude.com |
| `task-research-academic` | `research.academic` | research | user | **need**, **field**, **scope**, **evidence** | ai.google.dev, developers.openai.com, platform.claude.com |
| `task-research-document-qa` | `research.document-qa` | research | user | **question**, **basis**, **citations**, **missing** | ai.google.dev, developers.openai.com, platform.claude.com |
| `task-research-web` | `research.web` | research | user | **question**, **scope**, **sources** | ai.google.dev, developers.openai.com, platform.claude.com |
| `task-slides-create` | `slides.create` | slides | user | **deck**, **audience**, **goal** | developers.openai.com, gamma.app, platform.claude.com |
| `task-career-resume` | `career.resume` | text | user | **need**, **level**, **facts** | ai.google.dev, developers.openai.com, platform.claude.com |
| `task-chat-general-assistant` | `chat.general-assistant` | text | user | **request**, **role**, **format** | ai.google.dev, developers.openai.com, platform.claude.com |
| `task-docs-create` | `docs.create` | text | user | **doc**, **audience**, **purpose** | ai.google.dev, developers.openai.com, platform.claude.com |
| `task-education-language-learning` | `education.language-learning` | text | user | **level**, **goal**, **mode** | ai.google.dev, developers.openai.com, platform.claude.com |
| `task-education-tutor` | `education.tutor` | text | user | **level**, **mode**, **method** | ai.google.dev, developers.openai.com, platform.claude.com |
| `task-marketing-seo` | `marketing.seo` | text | user | **need**, **intent**, **audience** | ai.google.dev, developers.openai.com, platform.claude.com |
| `task-productivity-inbox` | `productivity.inbox` | text | user | **need**, **priority**, **autonomy** | ai.google.dev, developers.openai.com, platform.claude.com |
| `task-productivity-notes` | `productivity.notes` | text | user | **need**, **source**, **structure** | ai.google.dev, developers.openai.com, platform.claude.com |
| `task-text-email` | `text.email` | text | user | **type**, **recipient**, **goal** | ai.google.dev, developers.openai.com, platform.claude.com |
| `task-text-marketing-copy` | `text.marketing-copy` | text | user | **channel**, **audience**, **angle** | ai.google.dev, developers.openai.com, platform.claude.com |
| `task-text-rewrite-edit` | `text.rewrite-edit` | text | user | **action**, **preserve** | ai.google.dev, developers.openai.com, platform.claude.com |
| `task-text-summarize` | `text.summarize` | text | user | **source**, **form**, **fidelity** | ai.google.dev, developers.openai.com, platform.claude.com |
| `task-text-translate` | `text.translate` | text | user | **register**, **domain**, **fidelity** | ai.google.dev, developers.openai.com, platform.claude.com |
| `task-text-write-longform` | `text.write-longform` | text | user | **kind**, **audience**, **purpose** | ai.google.dev, developers.openai.com, platform.claude.com |
| `task-video-avatar-presenter` | `video.avatar-presenter` | video | user | **purpose**, **audience**, **length** | developers.openai.com, elevenlabs.io, platform.claude.com |
| `task-video-edit-short-social` | `video.edit-short-social` | video | user | **platform**, **goal**, **source** | developers.openai.com, platform.claude.com |
| `task-video-image-to-video` | `video.image-to-video` | video | en | **motion**, **camera**, **keep** | deepmind.google, developers.openai.com |
| `task-video-text-to-video` | `video.text-to-video` | video | en | **subject**, **action**, **shot** | deepmind.google, developers.openai.com |

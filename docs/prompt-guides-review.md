# Prompt rehberleri — Ferit incelemesi

10 rehberin hepsi **TASLAK** (`reviewedBy` boş) ve **kaynaksız**: yazılırken resmi dokümantasyon sitelerine erişilemedi. Kural gereği ("resmi dokümana erişemediğin rehberi UYDURMA") sözdizimi, yap/yapma ve örnek bölümlerinde `KAYNAK GEREKLİ` yazıyor. Şablon bölümü RouteAI'ın kendi iskeleti; araca özel sözdizimi içermiyor.

Taslak rehberle üretilen promptlar kartta "Taslak rehber" etiketiyle görünür. Üretici, KAYNAK GEREKLİ bölümlerde belgelenmemiş araç sözdizimine dayanmaz; sade ve yaygın uyumlu ifade kullanır.

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

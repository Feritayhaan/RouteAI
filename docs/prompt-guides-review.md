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

## Atlananlar

- Katalogda olmayan ürün için rehber yazılmadı. İstenen 10 ailenin hepsinin katalogda aktif ürünü var; atlanan aile yok.
- Rehberi olmayan aktif ürünler (ör. Udio, Pika Labs, Kling, Luma, Murf.ai, Jasper) `build_prompt` çağrılırsa `no_guide` döner; ajan bunu kullanıcıya söyler.

## Eval

`npm run eval:prompts` (OPENAI_API_KEY gerekir): rehber başına 2 senaryo (`evals/prompts.jsonl`). Bu ortamda anahtar yok, 20/20 skipped (`evals/results/2026-09-24-prompts.json`).

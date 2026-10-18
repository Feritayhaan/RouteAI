---
# TASLAK — reviewedBy boş. Görev şablonu: araca özel sözdizimi içermez, hiçbir araca bağlı değildir.
# Araca özel rehberi olmayan HER araçta, "image.generate" işi için kullanılır (lib/promptBuilder/fallback.ts).
id: "task-image-generate"
version: 1
appliesTo: []
tasks: ["image.generate"]
modality: "image"
promptLanguage: "en"
sources: ["https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide", "https://docs.midjourney.com/hc/en-us/articles/32023408776205-Prompt-Basics"]
reviewedBy: ""
reviewedAt: ""
slots:
- id: "subject"
  impact: "high"
  question:
    en: "What is the main subject?"
    tr: "Ana konu ne?"
  options:
  - id: "person"
    label:
      en: "A person"
      tr: "Bir kişi"
    value: "a person"
  - id: "character"
    label:
      en: "A character"
      tr: "Bir karakter"
    value: "a character"
  - id: "animal"
    label:
      en: "An animal"
      tr: "Bir hayvan"
    value: "an animal"
  - id: "object"
    label:
      en: "An object or product"
      tr: "Bir nesne ya da ürün"
    value: "an object or product"
  - id: "place"
    label:
      en: "A place or landscape"
      tr: "Bir mekân ya da manzara"
    value: "a place or landscape"
  default: "infer"
- id: "medium"
  impact: "high"
  question:
    en: "What kind of image should it be?"
    tr: "Nasıl bir görsel olsun?"
  options:
  - id: "photo"
    label:
      en: "Photograph"
      tr: "Fotoğraf"
    value: "photorealistic photograph"
  - id: "illustration"
    label:
      en: "Illustration"
      tr: "İllüstrasyon"
    value: "illustration"
  - id: "render"
    label:
      en: "3D render"
      tr: "3D render"
    value: "3D render"
  - id: "painting"
    label:
      en: "Painting"
      tr: "Resim / tablo"
    value: "painting"
  - id: "flat"
    label:
      en: "Flat vector style"
      tr: "Düz vektör stil"
    value: "flat vector illustration"
  default: "infer"
- id: "purpose"
  impact: "high"
  question:
    en: "Where will you use it?"
    tr: "Nerede kullanacaksın?"
  options:
  - id: "social"
    label:
      en: "Social media post"
      tr: "Sosyal medya gönderisi"
    value: "for a social media post"
  - id: "poster"
    label:
      en: "Poster or print"
      tr: "Afiş ya da baskı"
    value: "as a poster for print"
  - id: "banner"
    label:
      en: "Website banner"
      tr: "Web sitesi başlık görseli"
    value: "as a website hero banner"
  - id: "slide"
    label:
      en: "Presentation slide"
      tr: "Sunum slaytı"
    value: "for a presentation slide"
  - id: "cover"
    label:
      en: "Cover art"
      tr: "Kapak görseli"
    value: "as cover art"
  default: "infer"
- id: "background"
  impact: "medium"
  question:
    en: "What should the background be?"
    tr: "Arka plan nasıl olsun?"
  options:
  - id: "plain"
    label:
      en: "Plain, clean backdrop"
      tr: "Sade, temiz fon"
    value: "a plain clean backdrop"
  - id: "real"
    label:
      en: "A real setting"
      tr: "Gerçek bir ortam"
    value: "a realistic setting that fits the subject"
  - id: "blurred"
    label:
      en: "Softly blurred"
      tr: "Yumuşak bulanık fon"
    value: "a softly blurred background"
  - id: "transparent"
    label:
      en: "Transparent"
      tr: "Saydam fon"
    value: "isolated on a fully transparent background"
  default: "infer"
- id: "composition"
  impact: "medium"
  question:
    en: "How should it be framed?"
    tr: "Kadraj nasıl olsun?"
  options:
  - id: "close"
    label:
      en: "Close-up"
      tr: "Yakın çekim"
    value: "close-up"
  - id: "medium"
    label:
      en: "Medium shot"
      tr: "Orta plan"
    value: "medium shot"
  - id: "wide"
    label:
      en: "Wide shot"
      tr: "Geniş plan"
    value: "wide shot"
  - id: "top"
    label:
      en: "Top-down view"
      tr: "Tepeden bakış"
    value: "top-down view"
  - id: "low"
    label:
      en: "Low angle"
      tr: "Alçak açı"
    value: "low-angle view"
  default: "infer"
- id: "lighting"
  impact: "medium"
  question:
    en: "What lighting?"
    tr: "Nasıl bir ışık?"
  options:
  - id: "natural"
    label:
      en: "Soft daylight"
      tr: "Yumuşak gün ışığı"
    value: "soft natural daylight"
  - id: "golden"
    label:
      en: "Golden hour"
      tr: "Gün batımı ışığı"
    value: "golden hour light"
  - id: "studio"
    label:
      en: "Studio light"
      tr: "Stüdyo ışığı"
    value: "clean studio lighting"
  - id: "neon"
    label:
      en: "Neon night"
      tr: "Neon gece"
    value: "neon night lighting"
  - id: "dramatic"
    label:
      en: "Dramatic contrast"
      tr: "Dramatik kontrast"
    value: "dramatic high-contrast lighting"
  default: "infer"
- id: "palette"
  impact: "medium"
  question:
    en: "Which colors and mood?"
    tr: "Hangi renkler ve hava?"
  options:
  - id: "bright"
    label:
      en: "Bright and cheerful"
      tr: "Aydınlık, neşeli"
    value: "bright and cheerful colors"
  - id: "moody"
    label:
      en: "Dark and moody"
      tr: "Karanlık, gizemli"
    value: "dark and moody colors"
  - id: "pastel"
    label:
      en: "Soft pastel"
      tr: "Yumuşak pastel"
    value: "soft pastel colors"
  - id: "earthy"
    label:
      en: "Muted earthy"
      tr: "Sönük, toprak tonları"
    value: "muted earthy tones"
  - id: "vivid"
    label:
      en: "Vivid, saturated"
      tr: "Canlı, doygun"
    value: "vivid saturated colors"
  default: "infer"
- id: "text"
  impact: "low"
  question:
    en: "Should there be written text in the image?"
    tr: "Görselde yazı olsun mu?"
  options:
  - id: "none"
    label:
      en: "No text"
      tr: "Yazı olmasın"
    value: "no text, letters or logos in the image"
  - id: "headline"
    label:
      en: "One short headline"
      tr: "Kısa bir başlık"
    value: "one short headline, rendered exactly as written"
  - id: "label"
    label:
      en: "A short label"
      tr: "Kısa bir etiket"
    value: "a short label, rendered exactly as written"
  default: "none"
refinements:
- id: "more-detail"
  label:
    en: "More detail"
    tr: "Daha detaylı"
  instruction: "Add concrete visual detail (materials, textures, small objects, expressions) without changing the subject or the style."
- id: "simpler"
  label:
    en: "Simpler"
    tr: "Daha sade"
  instruction: "Make it simpler and more minimal: fewer elements, a calmer background, one clear focal point."
- id: "photoreal"
  label:
    en: "Photorealistic"
    tr: "Fotogerçekçi"
  patch:
    medium: "photorealistic photograph"
- id: "illustration"
  label:
    en: "Illustration"
    tr: "İllüstrasyon"
  patch:
    medium: "illustration"
- id: "golden"
  label:
    en: "Warmer light"
    tr: "Daha sıcak ışık"
  patch:
    lighting: "golden hour light"
- id: "studio"
  label:
    en: "Studio light"
    tr: "Stüdyo ışığı"
  patch:
    lighting: "clean studio lighting"
- id: "moody"
  label:
    en: "Dark and moody"
    tr: "Karanlık ve gizemli"
  patch:
    palette: "dark and moody colors"
- id: "no-text"
  label:
    en: "No text"
    tr: "Yazısız"
  patch:
    text: "no text, letters or logos in the image"
checklist: ["One concrete main subject", "Medium or style stated", "Setting described before the details", "Framing or camera angle", "Lighting and mood", "Intended use stated", "Any text in quotes and spelled exactly", "Says what to show, not what to avoid"]
validators:
- id: "length"
  type: "maxLength"
  value: 2000
  message: "RouteAI limit: keep the prompt under 2000 characters."
- id: "min-length"
  type: "regex"
  value: "^[\\s\\S]{40,}$"
  message: "Too short: name the subject, the setting and the style."
- id: "no-braces"
  type: "regex"
  value: "^(?![\\s\\S]*(\\{\\{|\\}\\}))[\\s\\S]*$"
  message: "Remove unfilled {{placeholders}}; write the real content or a [clearly marked placeholder]."
---

## Sözdizimi

Resmî görsel istem rehberlerinin ortak önerisi: kısa, net, görünen şeyleri anlatan bir prompt. Karmaşık isteklerde tek uzun paragraf yerine kısa etiketli satırlar kullan.

Sıra: (1) kullanım amacı, (2) ortam/arka plan, (3) ana konu, (4) somut ayrıntılar (malzeme, doku, ifade), (5) ortam türü (fotoğraf, illüstrasyon, 3D render), (6) kadraj ve açı, (7) ışık ve hava, (8) renk paleti, (9) varsa görseldeki yazı.

- Sayıyı açık yaz ("üç kedi"), belirsiz sıfatlar ("güzel", "büyük") yerine görünen ayrıntı kullan ("ıslak asfalt, zebra geçidi").
- İstediğini anlat, istemediğini değil. Araç ayrı bir "hariç tut" alanı sunuyorsa onu `negativePrompt` alanına yaz.
- Görselde yazı varsa metni tırnak içine al, "tam olarak yazıldığı gibi" de ve zor yazılan kelimeleri harf harf yaz.
- En-boy oranı çoğu araçta prompt metninde değil ayar menüsünde seçilir: `settings` listesinde öner, prompta ise kadraj bilgisini yaz.
- Fotogerçekçi istiyorsan bunu açıkça yaz ("photorealistic photograph"); lens ve kamera adlarını kesin kural değil, görünüm ipucu say.

## Şablon

Kullanım: [amaç]. Ortam: [arka plan]. Ana konu: [somut konu + malzeme, doku, ifade]. Tür: [fotoğraf / illüstrasyon / 3D render]. Kadraj: [çerçeve, açı]. Işık: [ışık]. Renk ve hava: [palet, duygu]. Yazı (varsa): "[tam metin]", [yazı stili, yeri]. Hariç tutulacaklar: [negatif alana].

## Yap / Yapma

**Yap**
- Tek bir ana konu seç; sahne kalabalıksa önceliği belirt.
- Somut sözcük kullan: malzeme, şekil, doku, görünen eylem.
- Kullanıcının verdiği her ayrıntıyı (isim, renk, sayı, yazı) aynen koru.
- Kritik ayrıntıyı (kıyafet rengi, nesne sayısı) kısa bir cümleyle tekrarla.
- Karmaşık istekte kısa etiketli satırlar kullan; basit istekte kısa bir paragraf yeter.

**Yapma**
- Gerçek kişi, marka ya da telifli karakter adı yazma; benzer hissi veren özgün bir görünüm anlat.
- "X olmasın" cümleleriyle promptu doldurma.
- Birbiriyle çelişen stilleri ya da ışıkları (fotoğraf + sulu boya, gün batımı + stüdyo) aynı promptta toplama.
- Araca özel bayrak ya da parametre uydurma; bu şablon hiçbir araca bağlı değildir.

## Örnekler

**Örnek 1 — basit istek:** "Mahalle kafesi için sıcak bir afiş görseli"

```
Poster artwork for a small neighborhood coffee shop. Setting: cozy wooden counter by a window, morning light. Subject: a steaming ceramic cup of latte with leaf-shaped milk foam, a fresh croissant on a linen napkin beside it. Photorealistic photograph, shallow depth of field, medium shot. Warm golden-hour light, soft shadows, muted earthy tones. Leave empty space at the top for a headline. No text in the image.
```

**Örnek 2 — yazılı görsel:** "Yaz indirimi için kare gönderi"

```
Square social media post for a summer sale. Background: clean pastel-yellow backdrop with soft diagonal shapes. Subject: a pair of white sneakers on a low pedestal, three-quarter view. Bright, evenly lit product photo with a small flat sun graphic. Text, rendered exactly as written: "SUMMER SALE" in bold sans-serif capital letters, centered at the top. No other text or logos.
```

**Kötü → iyi:** "güzel bir manzara" → "Wide landscape photograph of a misty pine valley at sunrise, a narrow river in the foreground, soft pink light on the far ridge, calm and quiet mood."

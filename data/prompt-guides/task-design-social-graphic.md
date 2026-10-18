---
# TASLAK — reviewedBy boş. Görev şablonu: araca özel sözdizimi içermez, hiçbir araca bağlı değildir.
# Araca özel rehberi olmayan HER araçta, "design.social-graphic" işi için kullanılır (lib/promptBuilder/fallback.ts).
id: "task-design-social-graphic"
version: 1
appliesTo: []
tasks: ["design.social-graphic"]
modality: "image"
promptLanguage: "en"
sources: ["https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide", "https://docs.midjourney.com/hc/en-us/articles/32023408776205-Prompt-Basics"]
reviewedBy: ""
reviewedAt: ""
slots:
- id: "format"
  impact: "high"
  question:
    en: "Which format?"
    tr: "Hangi format?"
  options:
  - id: "square"
    label:
      en: "Square post"
      tr: "Kare gönderi"
    value: "a square social media post"
  - id: "portrait"
    label:
      en: "Portrait post"
      tr: "Dikey gönderi"
    value: "a vertical portrait post"
  - id: "story"
    label:
      en: "Story or reel cover"
      tr: "Hikâye / reel kapağı"
    value: "a full-screen vertical story"
  - id: "landscape"
    label:
      en: "Landscape banner"
      tr: "Yatay afiş"
    value: "a wide landscape banner"
  - id: "carousel"
    label:
      en: "Carousel slide"
      tr: "Kaydırmalı slayt"
    value: "one slide of a carousel post"
  default: "infer"
- id: "message"
  impact: "high"
  question:
    en: "What should the text say?"
    tr: "Yazı ne söylesin?"
  options:
  - id: "headline"
    label:
      en: "One short headline"
      tr: "Tek kısa başlık"
    value: "one short headline, rendered exactly as written"
  - id: "headline-sub"
    label:
      en: "Headline and subline"
      tr: "Başlık ve alt satır"
    value: "a short headline with a short subline, both rendered exactly as written"
  - id: "none"
    label:
      en: "No text"
      tr: "Yazısız"
    value: "no text, the visual only"
  default: "infer"
- id: "style"
  impact: "high"
  question:
    en: "Which style?"
    tr: "Hangi stil?"
  options:
  - id: "bold-type"
    label:
      en: "Bold typography"
      tr: "Cesur tipografi"
    value: "bold typographic design with large letters"
  - id: "minimal"
    label:
      en: "Minimal and clean"
      tr: "Minimal, temiz"
    value: "minimal and clean layout with lots of space"
  - id: "photo"
    label:
      en: "Photo-based"
      tr: "Fotoğraf ağırlıklı"
    value: "photo-based design with text overlay"
  - id: "illustrated"
    label:
      en: "Playful illustration"
      tr: "Eğlenceli illüstrasyon"
    value: "playful flat illustration style"
  - id: "retro"
    label:
      en: "Retro"
      tr: "Retro"
    value: "retro poster style"
  default: "infer"
- id: "palette"
  impact: "medium"
  question:
    en: "Which colors?"
    tr: "Hangi renkler?"
  options:
  - id: "brand"
    label:
      en: "My brand colors"
      tr: "Marka renklerim"
    value: "the brand colors given by the user"
  - id: "vibrant"
    label:
      en: "Vibrant"
      tr: "Canlı"
    value: "a vibrant, high-energy palette"
  - id: "pastel"
    label:
      en: "Soft pastel"
      tr: "Yumuşak pastel"
    value: "a soft pastel palette"
  - id: "dark"
    label:
      en: "Dark with a bright accent"
      tr: "Koyu + parlak vurgu"
    value: "a dark background with one bright accent color"
  - id: "mono"
    label:
      en: "Two-color"
      tr: "İki renk"
    value: "a strict two-color palette"
  default: "infer"
- id: "layout"
  impact: "medium"
  question:
    en: "How should it be laid out?"
    tr: "Yerleşim nasıl olsun?"
  options:
  - id: "centered"
    label:
      en: "Centered"
      tr: "Ortalı"
    value: "centered layout"
  - id: "split"
    label:
      en: "Text left, visual right"
      tr: "Solda yazı, sağda görsel"
    value: "split layout with the text on the left and the visual on the right"
  - id: "overlay"
    label:
      en: "Text over a full image"
      tr: "Tam görselin üstünde yazı"
    value: "text placed over a full-bleed image in a clear area"
  - id: "grid"
    label:
      en: "Grid or collage"
      tr: "Izgara / kolaj"
    value: "a tidy grid or collage layout"
  default: "infer"
- id: "visual"
  impact: "medium"
  question:
    en: "Main visual element?"
    tr: "Ana görsel öğe?"
  options:
  - id: "photo"
    label:
      en: "A photo"
      tr: "Bir fotoğraf"
    value: "a photograph as the main visual"
  - id: "icon"
    label:
      en: "Icon or simple graphic"
      tr: "Simge / basit grafik"
    value: "a simple icon or graphic shape"
  - id: "illustration"
    label:
      en: "An illustration"
      tr: "Bir illüstrasyon"
    value: "an illustration as the main visual"
  - id: "pattern"
    label:
      en: "Pattern or shapes only"
      tr: "Desen / şekiller"
    value: "abstract shapes or pattern only"
  default: "infer"
- id: "cta"
  impact: "low"
  question:
    en: "Add a call-to-action button?"
    tr: "Eylem çağrısı düğmesi olsun mu?"
  options:
  - id: "none"
    label:
      en: "No"
      tr: "Hayır"
    value: "no button"
  - id: "button"
    label:
      en: "Yes, a button"
      tr: "Evet"
    value: "a rounded call-to-action button with short exact text"
  default: "none"
refinements:
- id: "bolder"
  label:
    en: "Bolder text"
    tr: "Daha iri yazı"
  instruction: "Make the headline larger and bolder with high contrast against the background."
- id: "minimal"
  label:
    en: "More minimal"
    tr: "Daha minimal"
  patch:
    style: "minimal and clean layout with lots of space"
- id: "vibrant"
  label:
    en: "More vibrant"
    tr: "Daha canlı"
  patch:
    palette: "a vibrant, high-energy palette"
- id: "dark"
  label:
    en: "Dark version"
    tr: "Koyu versiyon"
  patch:
    palette: "a dark background with one bright accent color"
- id: "story"
  label:
    en: "Story format"
    tr: "Hikâye boyutu"
  patch:
    format: "a full-screen vertical story"
- id: "square"
  label:
    en: "Square"
    tr: "Kare"
  patch:
    format: "a square social media post"
- id: "no-text"
  label:
    en: "No text"
    tr: "Yazısız"
  patch:
    message: "no text, the visual only"
- id: "cta"
  label:
    en: "Add a button"
    tr: "Düğme ekle"
  patch:
    cta: "a rounded call-to-action button with short exact text"
checklist: ["Format and platform stated", "Exact text in quotes (short)", "Style named", "Colors named", "Layout and text placement", "Main visual described", "Safe margins and high contrast for readability", "Nothing misleading (fake discounts, fake endorsements)"]
validators:
- id: "length"
  type: "maxLength"
  value: 1800
  message: "RouteAI limit: keep the prompt under 1800 characters."
- id: "min-length"
  type: "regex"
  value: "^[\\s\\S]{40,}$"
  message: "Too short: state the format, the style and the text."
- id: "no-braces"
  type: "regex"
  value: "^(?![\\s\\S]*(\\{\\{|\\}\\}))[\\s\\S]*$"
  message: "Remove unfilled {{placeholders}}; write the real content or a [clearly marked placeholder]."
---

## Sözdizimi

Sosyal medya görseli bir tasarım işidir: format, yazı, yerleşim ve renk birlikte kurulur. Sıra: (1) format (kare, dikey, hikâye, yatay), (2) amaç/mesaj, (3) arka plan ve ana görsel, (4) yazı: tam metin, tırnak içinde, kısa, (5) yazı stili ve yeri, (6) renk paleti, (7) yerleşim, (8) okunabilirlik.

- Yazıyı kısa tut (bir başlık, en çok bir alt satır). Uzun metin hata riskini artırır; metni tırnak içinde ver ve "tam olarak yazıldığı gibi" iste, zor kelimeleri harf harf yaz.
- Yazı ve konum bir kısıttır: "başlık üstte ortada, kalın sans-serif, açık renk" gibi yaz.
- Kenarlarda güvenli boşluk bırak, yazı ile fon arasında yüksek kontrast iste.
- Marka renkleri verildiyse aynen yaz (renk adı ya da kodu kullanıcıdan gelmeliyse [yer tutucu] kullan); yoksa renk uydurma.
- İndirim oranı, fiyat, tarih gibi sayıları kullanıcı vermediyse yazma; yer tutucu kullan.

## Şablon

[Format] for [platform/amaç]. Style: [stil]. Palette: [renkler]. Layout: [yerleşim]. Main visual: [ana görsel]. Text, rendered exactly as written: "[başlık]" [stil, yer]; "[alt satır]" (varsa). High contrast, safe margins. No other text or logos.

## Yap / Yapma

**Yap**
- Formatı ilk cümlede söyle.
- Başlığı kısa ve tırnak içinde ver; yerini ve stilini yaz.
- Renkleri sınırlı tut; kontrastı vurgula.
- Kullanıcının verdiği metin, fiyat, tarih ve markayı aynen koru.

**Yapma**
- Kullanıcı vermediği indirim oranı, fiyat, sayı ya da iddia (ör. "en iyi", "%100 garanti") yazma.
- Gerçek marka logosu, ünlü kişi, sahte onay/yorum ekleme.
- Çok sayıda yazı bloğu ya da çok yazı tipi isteme.
- Tek görselde birden çok mesaj verme.

## Örnekler

**Örnek 1 — kare gönderi:** "Yeni açılan pastane için duyuru gönderisi"

```
Square social media post announcing a new bakery opening. Style: minimal and clean with lots of space. Palette: soft cream background with one warm terracotta accent. Layout: centered. Main visual: a simple flat illustration of a croissant. Text, rendered exactly as written: "NOW OPEN" in large bold sans-serif capital letters above the illustration, and "Fresh every morning" in a smaller light font below it. High contrast, safe margins, no other text or logos.
```

**Örnek 2 — hikâye:** "Webinar hatırlatması için dikey hikâye"

```
Full-screen vertical story reminding people about an online webinar. Bold typographic design on a dark background with one bright electric-blue accent. Text, rendered exactly as written: "LIVE WEBINAR" as the headline at the top, "[date and time]" as a subline in the middle. A rounded button near the bottom with the exact text "Save your seat". Large clean letters, high contrast, safe margins, no other text.
```

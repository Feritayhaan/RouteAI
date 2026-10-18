---
# TASLAK — reviewedBy boş. Resmi dokümana erişilemedi; sözdizimi bölümleri KAYNAK GEREKLİ.
id: "ideogram"
version: 1
appliesTo: ["ideogram-20"]
modality: "image"
promptLanguage: "en"
sources: []
reviewedBy: ""
reviewedAt: ""
slots:
- id: "text"
  impact: "high"
  question:
    en: "Which exact text should appear in the image?"
    tr: "Görselde tam olarak hangi yazı olmalı?"
  options:
  - id: "name"
    label:
      en: "A brand or shop name"
      tr: "Marka ya da dükkân adı"
    value: "the brand name"
  - id: "headline"
    label:
      en: "A headline"
      tr: "Bir başlık"
    value: "a short headline"
  - id: "none"
    label:
      en: "No text"
      tr: "Yazı yok"
    value: "no text"
  default: "infer"
- id: "style"
  impact: "high"
  question:
    en: "What kind of design?"
    tr: "Nasıl bir tasarım?"
  options:
  - id: "logo"
    label:
      en: "Logo"
      tr: "Logo"
    value: "logo"
  - id: "poster"
    label:
      en: "Typographic poster"
      tr: "Tipografik poster"
    value: "typographic poster"
  - id: "photo"
    label:
      en: "Photo with text"
      tr: "Yazılı fotoğraf"
    value: "photo with text"
  - id: "illustration"
    label:
      en: "Illustration"
      tr: "İllüstrasyon"
    value: "illustration"
  default: "infer"
- id: "subject"
  impact: "high"
  question:
    en: "What should the image show?"
    tr: "Görselde ne olmalı?"
  options:
  - id: "person"
    label:
      en: "A person"
      tr: "Bir kişi"
    value: "a person"
  - id: "product"
    label:
      en: "A product"
      tr: "Bir ürün"
    value: "a product"
  - id: "place"
    label:
      en: "A place"
      tr: "Bir mekân"
    value: "a place"
  - id: "character"
    label:
      en: "A character"
      tr: "Bir karakter"
    value: "a character"
  default: "infer"
- id: "aspect"
  impact: "medium"
  question:
    en: "Which format?"
    tr: "Hangi format?"
  options:
  - id: "square"
    label:
      en: "Square 1:1"
      tr: "Kare 1:1"
    value: "1:1"
  - id: "wide"
    label:
      en: "Wide 16:9"
      tr: "Yatay 16:9"
    value: "16:9"
  - id: "vertical"
    label:
      en: "Vertical 9:16"
      tr: "Dikey 9:16"
    value: "9:16"
  - id: "portrait"
    label:
      en: "Portrait 4:5"
      tr: "Portre 4:5"
    value: "4:5"
  default: "infer"
- id: "palette"
  impact: "low"
  question:
    en: "Which colors?"
    tr: "Hangi renkler?"
  options:
  - id: "mono"
    label:
      en: "Monochrome"
      tr: "Tek renk"
    value: "monochrome"
  - id: "brand"
    label:
      en: "My brand colors"
      tr: "Marka renklerim"
    value: "brand colors"
  - id: "vibrant"
    label:
      en: "Vibrant"
      tr: "Canlı"
    value: "vibrant colors"
  - id: "pastel"
    label:
      en: "Pastel"
      tr: "Pastel"
    value: "pastel colors"
  default: "infer"
refinements:
- id: "bigger-text"
  label:
    en: "Bigger text"
    tr: "Daha büyük yazı"
  instruction: "Make the text larger and the dominant element."
- id: "fewer-words"
  label:
    en: "Fewer words"
    tr: "Daha az kelime"
  instruction: "Reduce the text to the fewest words possible."
- id: "square"
  label:
    en: "Square"
    tr: "Kare"
  patch:
    aspect: "1:1"
- id: "poster"
  label:
    en: "Poster style"
    tr: "Poster stili"
  patch:
    style: "typographic poster"
- id: "minimal"
  label:
    en: "More minimal"
    tr: "Daha sade"
  instruction: "Remove secondary elements; keep only the essentials."
- id: "contrast"
  label:
    en: "More contrast"
    tr: "Daha yüksek kontrast"
  instruction: "Increase contrast between text and background."
checklist: ["Exact text written in quotes", "Design type stated", "Colors or palette stated", "Layout described"]
validators:
- id: "length"
  type: "maxLength"
  value: 1500
  message: "RouteAI limit: keep the prompt under 1500 characters."
---

## Sözdizimi

KAYNAK GEREKLİ — Ideogram resmi dokümantasyonuna bu rehber yazılırken erişilemedi. Ferit resmi dokümandan doldurup `sources` alanına sayfa URL'lerini eklemeli.

## Şablon

RouteAI iskeleti (doğrulanmadı, araca özel sözdizimi içermez): [tasarım türü], "[tam metin]", [konu], [renkler], [yerleşim], [format].

## Yap / Yapma

KAYNAK GEREKLİ — Ideogram resmi dokümantasyonuna bu rehber yazılırken erişilemedi. Ferit resmi dokümandan doldurup `sources` alanına sayfa URL'lerini eklemeli.

## Örnekler

KAYNAK GEREKLİ — Ideogram resmi dokümantasyonuna bu rehber yazılırken erişilemedi. Ferit resmi dokümandan doldurup `sources` alanına sayfa URL'lerini eklemeli.

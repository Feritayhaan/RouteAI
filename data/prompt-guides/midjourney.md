---
# TASLAK — reviewedBy boş. Resmi dokümana erişilemedi; sözdizimi bölümleri KAYNAK GEREKLİ.
# Not: `aspect-ratio` doğrulayıcısı P7 promptundaki örnekten; resmi dokümanla doğrulanmalı.
id: "midjourney"
version: 1
appliesTo: ["midjourney-v7"]
modality: "image"
promptLanguage: "en"
sources: []
reviewedBy: ""
reviewedAt: ""
slots:
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
- id: "style"
  impact: "high"
  question:
    en: "What visual style?"
    tr: "Nasıl bir görsel stil?"
  options:
  - id: "photo"
    label:
      en: "Photo"
      tr: "Fotoğraf"
    value: "photorealistic photo"
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
  default: "infer"
- id: "aspect"
  impact: "high"
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
- id: "mood"
  impact: "medium"
  question:
    en: "What mood?"
    tr: "Nasıl bir hava?"
  options:
  - id: "bright"
    label:
      en: "Bright"
      tr: "Aydınlık"
    value: "bright and cheerful"
  - id: "dramatic"
    label:
      en: "Dark, dramatic"
      tr: "Karanlık, dramatik"
    value: "dark and dramatic"
  - id: "soft"
    label:
      en: "Soft, pastel"
      tr: "Yumuşak, pastel"
    value: "soft pastel"
  - id: "vibrant"
    label:
      en: "Vibrant"
      tr: "Canlı"
    value: "vibrant"
  default: "infer"
- id: "detail"
  impact: "low"
  question:
    en: "How much detail?"
    tr: "Ne kadar detay?"
  options:
  - id: "minimal"
    label:
      en: "Minimal"
      tr: "Sade"
    value: "minimal"
  - id: "detailed"
    label:
      en: "Highly detailed"
      tr: "Çok detaylı"
    value: "highly detailed"
  default: "minimal"
refinements:
- id: "more-detail"
  label:
    en: "More detail"
    tr: "Daha detaylı"
  instruction: "Add concrete visual detail (materials, lighting, textures) without changing the subject."
- id: "simpler"
  label:
    en: "Simpler"
    tr: "Daha sade"
  instruction: "Make the image simpler and more minimal."
- id: "square"
  label:
    en: "Square"
    tr: "Kare"
  patch:
    aspect: "1:1"
- id: "vertical"
  label:
    en: "Vertical"
    tr: "Dikey"
  patch:
    aspect: "9:16"
- id: "warmer"
  label:
    en: "Warmer light"
    tr: "Daha sıcak ışık"
  instruction: "Shift palette and lighting warmer."
- id: "photoreal"
  label:
    en: "Photorealistic"
    tr: "Fotogerçekçi"
  patch:
    style: "photorealistic photo"
checklist: ["Concrete main subject", "Style or medium stated", "Lighting or mood stated", "Aspect ratio set"]
validators:
- id: "aspect-ratio"
  type: "regex"
  value: "--ar \\d+:\\d+"
  message: "Add an aspect ratio parameter, e.g. --ar 16:9."
- id: "length"
  type: "maxLength"
  value: 1500
  message: "RouteAI limit: keep the prompt under 1500 characters."
---

## Sözdizimi

KAYNAK GEREKLİ — Midjourney resmi dokümantasyonuna bu rehber yazılırken erişilemedi. Ferit resmi dokümandan doldurup `sources` alanına sayfa URL'lerini eklemeli.

## Şablon

RouteAI iskeleti (doğrulanmadı, araca özel sözdizimi içermez): [konu], [stil/araç], [kompozisyon], [ışık ve hava], [ayrıntılar], ardından en-boy oranı.

## Yap / Yapma

KAYNAK GEREKLİ — Midjourney resmi dokümantasyonuna bu rehber yazılırken erişilemedi. Ferit resmi dokümandan doldurup `sources` alanına sayfa URL'lerini eklemeli.

## Örnekler

KAYNAK GEREKLİ — Midjourney resmi dokümantasyonuna bu rehber yazılırken erişilemedi. Ferit resmi dokümandan doldurup `sources` alanına sayfa URL'lerini eklemeli.

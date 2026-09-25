---
# TASLAK — reviewedBy boş. Resmi dokümana erişilemedi; sözdizimi bölümleri KAYNAK GEREKLİ.
id: "image-natural"
version: 1
appliesTo: ["chatgpt-gpt-4o-image", "dall-e-3", "google-imagen-4", "gemini-3-pro-image", "flux1-pro"]
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
      en: "Square"
      tr: "Kare"
    value: "square"
  - id: "landscape"
    label:
      en: "Landscape"
      tr: "Yatay"
    value: "landscape"
  - id: "portrait"
    label:
      en: "Portrait"
      tr: "Dikey"
    value: "portrait"
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
- id: "background"
  impact: "low"
  question:
    en: "What background?"
    tr: "Arka plan nasıl olsun?"
  options:
  - id: "plain"
    label:
      en: "Plain"
      tr: "Düz"
    value: "plain background"
  - id: "scene"
    label:
      en: "In a scene"
      tr: "Bir sahnede"
    value: "in a natural scene"
  default: "infer"
refinements:
- id: "more-detail"
  label:
    en: "More detail"
    tr: "Daha detaylı"
  instruction: "Describe the scene in more concrete detail."
- id: "simpler"
  label:
    en: "Simpler"
    tr: "Daha sade"
  instruction: "Make the composition simpler with fewer elements."
- id: "photoreal"
  label:
    en: "Photorealistic"
    tr: "Fotogerçekçi"
  patch:
    style: "photorealistic photo"
- id: "plain-bg"
  label:
    en: "Plain background"
    tr: "Düz arka plan"
  patch:
    background: "plain background"
- id: "landscape"
  label:
    en: "Landscape"
    tr: "Yatay"
  patch:
    aspect: "landscape"
- id: "brighter"
  label:
    en: "Brighter"
    tr: "Daha aydınlık"
  patch:
    mood: "bright and cheerful"
checklist: ["Full-sentence description of the subject", "Style stated", "Composition and format stated", "Lighting or mood stated"]
validators:
- id: "length"
  type: "maxLength"
  value: 2000
  message: "RouteAI limit: keep the prompt under 2000 characters."
---

## Sözdizimi

KAYNAK GEREKLİ — GPT görsel, DALL-E 3, Imagen 4, Gemini 3 Pro Image ve Flux.1 Pro resmi dokümantasyonuna bu rehber yazılırken erişilemedi. Ferit resmi dokümandan doldurup `sources` alanına sayfa URL'lerini eklemeli.

## Şablon

RouteAI iskeleti (doğrulanmadı, araca özel sözdizimi içermez): Tam cümlelerle: [konu ve eylem]. [stil]. [kompozisyon ve format]. [ışık ve hava]. [arka plan].

## Yap / Yapma

KAYNAK GEREKLİ — GPT görsel, DALL-E 3, Imagen 4, Gemini 3 Pro Image ve Flux.1 Pro resmi dokümantasyonuna bu rehber yazılırken erişilemedi. Ferit resmi dokümandan doldurup `sources` alanına sayfa URL'lerini eklemeli.

## Örnekler

KAYNAK GEREKLİ — GPT görsel, DALL-E 3, Imagen 4, Gemini 3 Pro Image ve Flux.1 Pro resmi dokümantasyonuna bu rehber yazılırken erişilemedi. Ferit resmi dokümandan doldurup `sources` alanına sayfa URL'lerini eklemeli.

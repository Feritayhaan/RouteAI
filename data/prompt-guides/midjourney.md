---
# TASLAK — reviewedBy boş (rehberin tamamı incelenmedi).
# Kaynak: Ferit'in Aspect Ratio sayfasını okuması (2026-10-14); bu ortam sayfaya erişemedi.
# v5: oran prompt sonunda --ar G:Y (tam sayı). v4'ün sözdiziminden bağımsız kuralı oranı düz
# metin olarak ("square format 1:1") yazdırıyordu.
id: "midjourney"
version: 5
appliesTo: ["midjourney-v7"]
modality: "image"
promptLanguage: "en"
sources: ["https://docs.midjourney.com/hc/en-us/articles/31894244298125-Aspect-Ratio"]
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
  default: "infer"
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
checklist: ["Concrete main subject", "Setting stated", "Style or medium stated", "Composition or camera angle stated", "Lighting or mood stated", "Aspect ratio set once"]
validators:
- id: "aspect-ratio"
  type: "regex"
  value: "--(?:ar|aspect) \\d+:\\d+"
  message: "End the prompt with the aspect ratio parameter in whole numbers, e.g. --ar 16:9."
- id: "whole-numbers"
  type: "forbidRegex"
  value: "--(?:ar|aspect) \\d*[.,]\\d"
  criterion: "consistency"
  message: "Aspect ratio values must be whole numbers (e.g. --ar 16:9, not 1.5:1)."
- id: "length"
  type: "maxLength"
  value: 1500
  message: "RouteAI limit: keep the prompt under 1500 characters."
- id: "single-aspect"
  type: "forbidRegex"
  value: "--(?:ar|aspect)\\b[\\s\\S]*--(?:ar|aspect)\\b"
  criterion: "consistency"
  message: "Use a single aspect ratio parameter."
---

## Sözdizimi

Kaynak: [Aspect Ratio](https://docs.midjourney.com/hc/en-us/articles/31894244298125-Aspect-Ratio), Ferit'in okuması (2026-10-14).

- En-boy oranı promptun sonuna parametre olarak eklenir: `--ar genişlik:yükseklik` (ya da `--aspect`). Değerler tam sayıdır, ondalık kullanılamaz: `--ar 16:9`.
- Diğer parametreler (sürüm, stil vb.) için KAYNAK GEREKLİ: bu rehberde kullanılmaz.

## Şablon

RouteAI iskeleti: [konu ve eylem], [ortam], [stil/araç], [kompozisyon ve çekim açısı], [ışık ve hava], [renk paleti], [ayrıntılar] ve en sonda tek bir `--ar G:Y` parametresi. Virgülle ayrılmış kısa tarifler; tam cümle şart değil.

## Yap / Yapma

Kaynağa dayanan kurallar (yukarıdaki sayfa):

- Oranı düz metin olarak yazma ("square format 1:1" değil); promptun sonuna `--ar 1:1` ekle.
- Tek bir oran parametresi; değerler tam sayı.

RouteAI kuralları (hedef AI yeterlilik rubriği, lib/promptBuilder/sufficiency.ts):

- Hedef araç RouteAI konuşmasını görmez: kullanıcının verdiği adlar, tırnaklı metinler, sayılar ve kısıtlar promptta aynen yer alır.
- Sadece prompt metni: "Elbette", "İşte promptun" gibi giriş yok; konuşmaya atıf ("yukarıda konuştuğumuz") yok.
- Şablondaki köşeli yer tutucular doldurulur; kopyalanmaz.
- Muğlak ifade ("vb.", "etc.", "güzel bir şey") yerine somut tarif.
- Araca seslenme yok ("Please create an image of...", "Lütfen..."): doğrudan konu/sahne ile başla.
- negativePrompt promptta istenen bir şeyi dışlamaz; ayarlarda farklı bir oran yazılmaz.

## Örnekler

Kaynaktaki örnekler (Ferit'in notları):

- `a lighthouse at dusk, cinematic lighting --ar 16:9`
- `portrait of an astronaut, studio light --ar 2:3`

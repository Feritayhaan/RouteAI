---
# TASLAK — reviewedBy boş. Görev şablonu: araca özel sözdizimi içermez, hiçbir araca bağlı değildir.
# Araca özel rehberi olmayan HER araçta, "image.product-photo" işi için kullanılır (lib/promptBuilder/fallback.ts).
id: "task-image-product-photo"
version: 1
appliesTo: []
tasks: ["image.product-photo"]
modality: "image"
promptLanguage: "en"
sources: ["https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide", "https://docs.midjourney.com/hc/en-us/articles/32023408776205-Prompt-Basics"]
reviewedBy: ""
reviewedAt: ""
slots:
- id: "source"
  impact: "high"
  question:
    en: "Do you have a photo of the product?"
    tr: "Ürünün fotoğrafı var mı?"
  options:
  - id: "photo"
    label:
      en: "Yes, I have a photo"
      tr: "Evet, fotoğrafı var"
    value: "start from the supplied product photo and keep the product exactly as it is"
  - id: "describe"
    label:
      en: "No, describe it"
      tr: "Hayır, tarif edeceğim"
    value: "generate the product from the description only"
  default: "infer"
- id: "scene"
  impact: "high"
  question:
    en: "What kind of product shot?"
    tr: "Nasıl bir ürün çekimi?"
  options:
  - id: "studio"
    label:
      en: "Clean studio shot"
      tr: "Temiz stüdyo çekimi"
    value: "a clean studio product shot"
  - id: "lifestyle"
    label:
      en: "Lifestyle, in use"
      tr: "Kullanım sahnesi"
    value: "a lifestyle shot showing the product in use"
  - id: "flatlay"
    label:
      en: "Flat lay"
      tr: "Tepeden düzen"
    value: "a flat lay arrangement seen from above"
  - id: "context"
    label:
      en: "In a real setting"
      tr: "Gerçek ortamda"
    value: "the product placed in a realistic setting that fits it"
  - id: "hero"
    label:
      en: "Hero banner"
      tr: "Tanıtım afişi"
    value: "a hero image with generous empty space for text"
  default: "infer"
- id: "background"
  impact: "high"
  question:
    en: "Which background?"
    tr: "Hangi arka plan?"
  options:
  - id: "white"
    label:
      en: "Pure white"
      tr: "Saf beyaz"
    value: "a seamless pure white background"
  - id: "color"
    label:
      en: "Solid color"
      tr: "Tek renk fon"
    value: "a seamless solid color backdrop that complements the product"
  - id: "surface"
    label:
      en: "Natural surface"
      tr: "Doğal yüzey"
    value: "a natural surface such as wood or stone"
  - id: "blurred"
    label:
      en: "Blurred setting"
      tr: "Bulanık ortam"
    value: "a softly blurred setting"
  default: "infer"
- id: "angle"
  impact: "medium"
  question:
    en: "Which angle?"
    tr: "Hangi açı?"
  options:
  - id: "front"
    label:
      en: "Front"
      tr: "Önden"
    value: "front view"
  - id: "three-quarter"
    label:
      en: "Three-quarter"
      tr: "Üçte dört"
    value: "three-quarter view"
  - id: "top"
    label:
      en: "From above"
      tr: "Yukarıdan"
    value: "top-down view"
  - id: "detail"
    label:
      en: "Close-up detail"
      tr: "Yakın detay"
    value: "close-up of the key detail"
  default: "infer"
- id: "lighting"
  impact: "medium"
  question:
    en: "Which lighting?"
    tr: "Hangi ışık?"
  options:
  - id: "soft"
    label:
      en: "Soft and even"
      tr: "Yumuşak, dengeli"
    value: "soft even studio light with gentle shadows"
  - id: "window"
    label:
      en: "Natural window light"
      tr: "Pencere ışığı"
    value: "natural window light"
  - id: "directional"
    label:
      en: "Directional with shadows"
      tr: "Yönlü, belirgin gölge"
    value: "directional light with defined shadows"
  - id: "glow"
    label:
      en: "Warm glow"
      tr: "Sıcak parıltı"
    value: "warm glowing light"
  default: "infer"
- id: "props"
  impact: "medium"
  question:
    en: "Any props?"
    tr: "Yan öğe olsun mu?"
  options:
  - id: "none"
    label:
      en: "No props"
      tr: "Yan öğe yok"
    value: "no props, the product alone"
  - id: "few"
    label:
      en: "A few matching props"
      tr: "Birkaç uyumlu öğe"
    value: "a few simple props that match the product"
  - id: "context"
    label:
      en: "Props that show use"
      tr: "Kullanımı gösteren öğeler"
    value: "props that show how the product is used"
  default: "none"
- id: "fidelity"
  impact: "low"
  question:
    en: "How exact must the product look?"
    tr: "Ürün ne kadar birebir olmalı?"
  options:
  - id: "exact"
    label:
      en: "Exactly as it is"
      tr: "Birebir aynı"
    value: "keep the exact shape, proportions, colors, label text and logo of the product, unchanged"
  - id: "inspired"
    label:
      en: "Inspired by it"
      tr: "İlhamla"
    value: "a similar product, details may vary"
  default: "exact"
refinements:
- id: "white"
  label:
    en: "White background"
    tr: "Beyaz fon"
  patch:
    background: "a seamless pure white background"
- id: "lifestyle"
  label:
    en: "Lifestyle scene"
    tr: "Kullanım sahnesi"
  patch:
    scene: "a lifestyle shot showing the product in use"
- id: "flatlay"
  label:
    en: "Flat lay"
    tr: "Tepeden düzen"
  patch:
    scene: "a flat lay arrangement seen from above"
- id: "softer"
  label:
    en: "Softer light"
    tr: "Daha yumuşak ışık"
  patch:
    lighting: "soft even studio light with gentle shadows"
- id: "detail"
  label:
    en: "Detail close-up"
    tr: "Yakın detay"
  patch:
    angle: "close-up of the key detail"
- id: "no-props"
  label:
    en: "No props"
    tr: "Yan öğesiz"
  patch:
    props: "no props, the product alone"
- id: "exact"
  label:
    en: "Keep product exact"
    tr: "Ürün birebir kalsın"
  patch:
    fidelity: "keep the exact shape, proportions, colors, label text and logo of the product, unchanged"
- id: "space"
  label:
    en: "Space for text"
    tr: "Yazı için boşluk"
  instruction: "Leave generous clean empty space in the frame for headline text, without adding any text."
checklist: ["Product named concretely (material, color, shape)", "Shot type chosen", "Background stated", "Angle and framing", "Lighting described", "Product shape, label and logo protected", "No invented claims or text on the product", "Props limited and relevant"]
validators:
- id: "length"
  type: "maxLength"
  value: 1800
  message: "RouteAI limit: keep the prompt under 1800 characters."
- id: "min-length"
  type: "regex"
  value: "^[\\s\\S]{40,}$"
  message: "Too short: describe the product, the scene and the background."
- id: "no-braces"
  type: "regex"
  value: "^(?![\\s\\S]*(\\{\\{|\\}\\}))[\\s\\S]*$"
  message: "Remove unfilled {{placeholders}}; write the real content or a [clearly marked placeholder]."
---

## Sözdizimi

Ürün fotoğrafında en önemli kural, ürünün gerçekte nasılsa öyle görünmesidir: şekil, oran, renk, etiket ve logo değişmemeli. Fotoğraf varsa iş bir DÜZENLEME gibi kurulur: "ürünü aynen koru, yalnızca ortamı/ışığı değiştir". Fotoğraf yoksa ürün somut sözcüklerle (malzeme, renk, şekil, boyut hissi) anlatılır; ayrıntılar yaklaşık olur ve bu kullanıcıya `howToUse`ta söylenir.

Sıra: (1) kullanım (katalog, mağaza sayfası, reklam), (2) çekim türü, (3) arka plan, (4) ürün tarifi, (5) açı ve kadraj, (6) ışık ve gölge, (7) yan öğeler, (8) korunacaklar.

- Beyaz ya da düz fon istenirse "dikişsiz (seamless) düz fon, yumuşak doğal gölge" yaz.
- Afiş için yazı alanı gerekiyorsa "metin için boş alan bırak" de, yazıyı görsele ekletme.
- Ürünün üstüne okunabilir yazı gerekirse metni tırnak içinde ve kısa ver; yoksa "etiketi okunaksız bırak" yerine mevcut etiketi koru de.

## Şablon

[Çekim türü] of [somut ürün tarifi]. Background: [fon]. Angle: [açı]. Lighting: [ışık]. Props: [yan öğeler ya da none]. Keep the product's shape, proportions, colors, label text and logo exactly as they are. [Kullanım amacı].

## Yap / Yapma

**Yap**
- Ürünü malzeme, renk ve şekil sözcükleriyle somut anlat.
- Ürün fotoğrafı varsa ürünü korumaya ve sadece ortamı değiştirmeye odaklan.
- Işığı ve gölgeyi belirt; ürünü zeminden koparmayan yumuşak gölge iste.
- Yan öğeleri az ve ürünle ilgili tut.

**Yapma**
- Ürün üzerine olmayan özellik, rozet, sertifika ya da fiyat yazdırma.
- Gerçek markaların logosunu ekletme.
- Ürünün şeklini ya da oranını "daha güzel" diye değiştirtme.
- Aynı görselde birden çok farklı ışık stili isteme.

## Örnekler

**Örnek 1 — fotoğraf yok:** "Seramik kupa satışı için beyaz fonlu görsel"

```
Clean studio product shot of a handmade matte-white ceramic mug with a slim curved handle and a small speckled glaze. Background: a seamless pure white backdrop. Three-quarter view, centered. Soft even studio light with a gentle natural shadow under the mug. The product alone, no props. For an online store listing.
```

**Örnek 2 — fotoğraf var:** "Ürün fotoğrafımı bir mutfak tezgâhına yerleştir"

```
Place the product from the supplied photo on a light wooden kitchen counter by a window, with softly blurred shelves in the background. Keep the product's exact shape, proportions, colors, label text and logo unchanged. Natural window light from the left, soft shadow on the counter. Add no other products.
```

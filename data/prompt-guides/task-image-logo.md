---
# TASLAK — reviewedBy boş. Görev şablonu: araca özel sözdizimi içermez, hiçbir araca bağlı değildir.
# Araca özel rehberi olmayan HER araçta, "image.logo" işi için kullanılır (lib/promptBuilder/fallback.ts).
id: "task-image-logo"
version: 1
appliesTo: []
tasks: ["image.logo"]
modality: "image"
promptLanguage: "en"
sources: ["https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide", "https://docs.midjourney.com/hc/en-us/articles/32023408776205-Prompt-Basics"]
reviewedBy: ""
reviewedAt: ""
slots:
- id: "logo-type"
  impact: "high"
  question:
    en: "What kind of logo?"
    tr: "Nasıl bir logo?"
  options:
  - id: "wordmark"
    label:
      en: "Name only (wordmark)"
      tr: "Sadece isim (yazı logo)"
    value: "a wordmark logo showing only the brand name"
  - id: "lettermark"
    label:
      en: "Initials"
      tr: "Baş harfler"
    value: "a lettermark logo built from the initials"
  - id: "combo"
    label:
      en: "Icon with name"
      tr: "Simge + isim"
    value: "a combination logo with a simple icon and the brand name"
  - id: "icon"
    label:
      en: "Icon only"
      tr: "Sadece simge"
    value: "an icon-only logo mark with no text"
  - id: "emblem"
    label:
      en: "Emblem / badge"
      tr: "Arma / rozet"
    value: "an emblem-style badge logo"
  default: "infer"
- id: "style"
  impact: "high"
  question:
    en: "Which style?"
    tr: "Hangi stil?"
  options:
  - id: "minimal"
    label:
      en: "Minimal"
      tr: "Minimal"
    value: "minimal and clean"
  - id: "geometric"
    label:
      en: "Geometric"
      tr: "Geometrik"
    value: "geometric with simple shapes"
  - id: "handdrawn"
    label:
      en: "Hand-drawn"
      tr: "El çizimi"
    value: "hand-drawn with organic lines"
  - id: "retro"
    label:
      en: "Retro"
      tr: "Retro"
    value: "retro vintage style"
  - id: "elegant"
    label:
      en: "Elegant, premium"
      tr: "Zarif, premium"
    value: "elegant and premium"
  - id: "playful"
    label:
      en: "Playful"
      tr: "Eğlenceli"
    value: "playful and friendly"
  default: "infer"
- id: "motif"
  impact: "medium"
  question:
    en: "What should the icon suggest?"
    tr: "Simge neyi çağrıştırsın?"
  options:
  - id: "abstract"
    label:
      en: "Abstract shape"
      tr: "Soyut şekil"
    value: "an abstract shape"
  - id: "initial"
    label:
      en: "The first letter"
      tr: "İlk harf"
    value: "a stylized first letter"
  - id: "nature"
    label:
      en: "Nature motif"
      tr: "Doğa öğesi"
    value: "a simple nature motif"
  - id: "industry"
    label:
      en: "Something from the business"
      tr: "İşle ilgili bir nesne"
    value: "a simple object that relates to the business"
  - id: "animal"
    label:
      en: "An animal"
      tr: "Bir hayvan"
    value: "a simple stylized animal"
  default: "infer"
- id: "colors"
  impact: "medium"
  question:
    en: "Which colors?"
    tr: "Hangi renkler?"
  options:
  - id: "mono"
    label:
      en: "Black and white"
      tr: "Siyah beyaz"
    value: "black on white, a single color"
  - id: "two"
    label:
      en: "Two brand colors"
      tr: "İki marka rengi"
    value: "a limited palette of two colors"
  - id: "warm"
    label:
      en: "Warm tones"
      tr: "Sıcak tonlar"
    value: "a limited palette of warm tones"
  - id: "cool"
    label:
      en: "Cool tones"
      tr: "Soğuk tonlar"
    value: "a limited palette of cool tones"
  - id: "bold"
    label:
      en: "Bold and vivid"
      tr: "Canlı ve iddialı"
    value: "a limited palette of bold vivid colors"
  default: "infer"
- id: "feeling"
  impact: "medium"
  question:
    en: "What should it feel like?"
    tr: "Nasıl bir his versin?"
  options:
  - id: "trust"
    label:
      en: "Trustworthy"
      tr: "Güvenilir"
    value: "trustworthy and reliable"
  - id: "modern"
    label:
      en: "Modern, techy"
      tr: "Modern, teknolojik"
    value: "modern and innovative"
  - id: "friendly"
    label:
      en: "Warm, friendly"
      tr: "Samimi"
    value: "warm and approachable"
  - id: "energetic"
    label:
      en: "Energetic"
      tr: "Enerjik"
    value: "energetic and bold"
  - id: "luxury"
    label:
      en: "Luxurious"
      tr: "Lüks"
    value: "refined and luxurious"
  default: "infer"
- id: "background"
  impact: "low"
  question:
    en: "Which background?"
    tr: "Hangi fon?"
  options:
  - id: "white"
    label:
      en: "Plain white"
      tr: "Düz beyaz"
    value: "on a plain white background"
  - id: "transparent"
    label:
      en: "Transparent"
      tr: "Saydam"
    value: "on a transparent background"
  - id: "dark"
    label:
      en: "Dark"
      tr: "Koyu"
    value: "on a plain dark background"
  default: "white"
refinements:
- id: "simpler"
  label:
    en: "Simpler"
    tr: "Daha sade"
  instruction: "Simplify the mark: fewer shapes, fewer details, one focal idea. It must stay clear when very small."
- id: "bolder"
  label:
    en: "Bolder"
    tr: "Daha iddialı"
  instruction: "Make the shapes bolder and thicker so the logo reads well at small sizes."
- id: "mono"
  label:
    en: "One color"
    tr: "Tek renk"
  patch:
    colors: "black on white, a single color"
- id: "geometric"
  label:
    en: "More geometric"
    tr: "Daha geometrik"
  patch:
    style: "geometric with simple shapes"
- id: "handdrawn"
  label:
    en: "Hand-drawn"
    tr: "El çizimi"
  patch:
    style: "hand-drawn with organic lines"
- id: "icon-only"
  label:
    en: "Icon only"
    tr: "Sadece simge"
  patch:
    logo-type: "an icon-only logo mark with no text"
- id: "transparent"
  label:
    en: "Transparent background"
    tr: "Saydam fon"
  patch:
    background: "on a transparent background"
- id: "premium"
  label:
    en: "More premium"
    tr: "Daha premium"
  patch:
    style: "elegant and premium"
checklist: ["Says it is a logo", "Brand name copied exactly (if text is used)", "Logo type chosen", "Style and feeling stated", "Limited color palette", "Plain or transparent background", "Flat, simple, scalable shapes", "No mockup, no photo scene"]
validators:
- id: "length"
  type: "maxLength"
  value: 1200
  message: "RouteAI limit: keep the prompt under 1200 characters."
- id: "min-length"
  type: "regex"
  value: "^[\\s\\S]{40,}$"
  message: "Too short: say what kind of logo, its style and colors."
- id: "no-braces"
  type: "regex"
  value: "^(?![\\s\\S]*(\\{\\{|\\}\\}))[\\s\\S]*$"
  message: "Remove unfilled {{placeholders}}; write the real content or a [clearly marked placeholder]."
- id: "is-logo"
  type: "mustInclude"
  value: "logo"
  message: "Say that this is a logo design."
---

## Sözdizimi

Logo promptu fotoğraf promptundan farklıdır: sahne değil, sade ve ölçeklenebilir bir işaret anlatılır. Sıra: (1) "logo" olduğunu söyle ve türünü yaz (yazı logo, harf logosu, simge + isim, rozet), (2) marka adını TAM yazıldığı gibi, tırnak içinde ver, (3) stil ve his, (4) simge fikri, (5) sınırlı renk paleti, (6) düz fon, ortalanmış tek işaret.

- Marka adını tırnak içine al, tam yazıldığı gibi çizilmesini iste; zor yazılan kelimeleri harf harf yaz. Yapay zekâ yazıyı hatalı çizebilir: isim kısa tutulursa risk azalır.
- Düz, vektör benzeri, az renkli, kalın hatlı şekiller iste; küçük boyutta da okunmalı.
- Fotogerçekçi sahne, gölge, mockup (kartvizit, tabela üzerinde gösterim) isteme; ayrı bir görsel olarak üretilir.
- İstenmeyenleri (gradyan, ince detay) olumsuz cümle yerine, istediğin düz stili anlatarak ele al; araç "hariç tut" alanı sunuyorsa `negativePrompt` alanına yaz.

## Şablon

[Logo türü] for "[Marka adı]" ([sektör ya da iş]). Stil: [stil], his: [his]. Simge: [simge fikri]. Renkler: [sınırlı palet]. Düz, vektör benzeri, kalın hatlı şekiller, ortalanmış, [fon]. Marka adı tam olarak: "[Marka adı]".

## Yap / Yapma

**Yap**
- Tek bir güçlü fikir seç (tek simge, tek renk çifti).
- Marka adını aynen koru, tırnak içinde yaz.
- Sınırlı renk paleti ve düz fon iste; logo tek başına, ortada dursun.
- Kullanıcının sektörünü ve hissini (güven, enerji, lüks) sade sözcüklerle belirt.

**Yapma**
- Gerçek bir markanın logosuna benzetme isteme, marka adı anma; özgün bir işaret anlat.
- Birden çok fikri (hem hayvan hem harf hem doğa) aynı logoya doldurma.
- Gölge, doku, 3B ışık, mockup ya da fotoğraf sahnesi ekleme.
- Uzun slogan ya da çok kelime yazdırma; yazı hata riski taşır, sloganı sonradan tasarım aracında ekle.

## Örnekler

**Örnek 1 — simge + isim:** "Bisiklet kiralama işim için logo"

```
Combination logo for "PedalPal", a neighborhood bike rental. A simple geometric icon: a bicycle wheel built from two overlapping circles and a few straight spokes. Friendly and approachable, minimal style. Limited palette: teal and warm orange. Flat vector-like shapes with thick clean lines, centered, on a plain white background. The brand name appears exactly as "PedalPal" in a rounded sans-serif font below the icon.
```

**Örnek 2 — sadece harf:** "Mimarlık ofisi için baş harf logosu"

```
Lettermark logo for an architecture studio, the single capital letter "K" built from clean straight lines and one diagonal cut. Elegant, premium and minimal. Black on a plain white background, a single color, flat shapes, centered, no other text.
```

**Kötü → iyi:** "havalı bir logo yap" → tür, stil, renk, fon yok. Yukarıdaki yapıyı kullan.

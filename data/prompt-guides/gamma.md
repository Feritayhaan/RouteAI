---
# TASLAK — reviewedBy boş. Resmi dokümana erişilemedi; sözdizimi bölümleri KAYNAK GEREKLİ.
id: "gamma"
version: 2
appliesTo: ["gamma-ai"]
modality: "slides"
promptLanguage: "user"
sources: []
reviewedBy: ""
reviewedAt: ""
slots:
- id: "audience"
  impact: "high"
  question:
    en: "Who is the audience?"
    tr: "Sunum kime?"
  options:
  - id: "investors"
    label:
      en: "Investors"
      tr: "Yatırımcılar"
    value: "investors"
  - id: "team"
    label:
      en: "My team"
      tr: "Ekibim"
    value: "internal team"
  - id: "customers"
    label:
      en: "Customers"
      tr: "Müşteriler"
    value: "customers"
  - id: "students"
    label:
      en: "Students"
      tr: "Öğrenciler"
    value: "students"
  default: "infer"
- id: "length"
  impact: "high"
  question:
    en: "How many slides?"
    tr: "Kaç slayt?"
  options:
  - id: "short"
    label:
      en: "About 5"
      tr: "Yaklaşık 5"
    value: "5 slides"
  - id: "medium"
    label:
      en: "8-10"
      tr: "8-10"
    value: "8-10 slides"
  - id: "long"
    label:
      en: "15 or more"
      tr: "15 ve üzeri"
    value: "15 slides"
  default: "medium"
- id: "tone"
  impact: "medium"
  question:
    en: "What tone?"
    tr: "Nasıl bir ton?"
  options:
  - id: "formal"
    label:
      en: "Formal"
      tr: "Resmî"
    value: "formal"
  - id: "friendly"
    label:
      en: "Friendly"
      tr: "Samimi"
    value: "friendly"
  - id: "bold"
    label:
      en: "Bold"
      tr: "Cesur"
    value: "bold"
  default: "infer"
- id: "visuals"
  impact: "medium"
  question:
    en: "What visuals?"
    tr: "Hangi görseller?"
  options:
  - id: "photos"
    label:
      en: "Photos"
      tr: "Fotoğraflar"
    value: "photos"
  - id: "illustrations"
    label:
      en: "Illustrations"
      tr: "İllüstrasyonlar"
    value: "illustrations"
  - id: "minimal"
    label:
      en: "Minimal"
      tr: "Sade"
    value: "minimal visuals"
  - id: "charts"
    label:
      en: "Charts"
      tr: "Grafikler"
    value: "data charts"
  default: "infer"
refinements:
- id: "shorter"
  label:
    en: "Fewer slides"
    tr: "Daha az slayt"
  patch:
    length: "5 slides"
- id: "more-visual"
  label:
    en: "More visual"
    tr: "Daha görsel"
  patch:
    visuals: "photos"
- id: "more-data"
  label:
    en: "More data"
    tr: "Daha fazla veri"
  instruction: "Add a slide with key numbers as placeholders to fill in (do not invent figures)."
- id: "investors"
  label:
    en: "For investors"
    tr: "Yatırımcı odaklı"
  patch:
    audience: "investors"
- id: "simpler"
  label:
    en: "Simpler language"
    tr: "Daha sade dil"
  instruction: "Use shorter sentences and plain words."
- id: "notes"
  label:
    en: "Speaker notes"
    tr: "Konuşmacı notları"
  instruction: "Ask for short speaker notes on each slide."
checklist: ["Topic and goal of the deck", "Audience", "Slide count", "Outline of sections", "No invented numbers"]
validators:
- id: "length"
  type: "maxLength"
  value: 4000
  message: "RouteAI limit: keep the prompt under 4000 characters."
- id: "slide-count"
  type: "regex"
  value: "\\d+\\s*(-\\s*\\d+\\s*)?(slides?|slayt)"
  flags: "i"
  criterion: "toolReadiness"
  message: "State the number of slides (e.g. 8 slides)."
- id: "audience"
  type: "regex"
  value: "(audience|kitle|dinleyici|investor|yatırımcı|customer|müşteri|student|öğrenci|team|ekip|for )"
  flags: "i"
  criterion: "toolReadiness"
  message: "State who the deck is for."
- id: "outline"
  type: "regex"
  value: "(outline|section|agenda|structure|bölüm|akış|başlık|slide 1|slayt 1)"
  flags: "i"
  criterion: "actionability"
  message: "Give an outline of the sections or slides."
---

## Sözdizimi

KAYNAK GEREKLİ — Gamma resmi dokümantasyonuna bu rehber yazılırken erişilemedi. Ferit resmi dokümandan doldurup `sources` alanına sayfa URL'lerini eklemeli.

## Şablon

RouteAI iskeleti (doğrulanmadı, araca özel sözdizimi içermez): [konu] hakkında [kitle] için [slayt sayısı] slaytlık sunum. Amaç: [sunumdan beklenen sonuç]. Bölümler: [slayt slayt taslak]. Ton: [ton]. Görseller: [görseller]. Bilinmeyen rakamlar için açıkça işaretli yer tutucu.

## Yap / Yapma

KAYNAK GEREKLİ — Gamma resmi dokümantasyonuna bu rehber yazılırken erişilemedi. Ferit resmi dokümandan doldurup `sources` alanına sayfa URL'lerini eklemeli.

RouteAI kuralları (araç dokümanına dayanmaz; hedef AI yeterlilik rubriği, lib/promptBuilder/sufficiency.ts):

- Hedef araç RouteAI konuşmasını görmez: kullanıcının verdiği adlar, tırnaklı metinler, sayılar ve kısıtlar promptta aynen yer alır.
- Sadece prompt metni: "Elbette", "İşte promptun" gibi giriş yok; konuşmaya atıf ("yukarıda konuştuğumuz") yok.
- Şablondaki köşeli yer tutucular doldurulur; kopyalanmaz.
- Muğlak ifade ("vb.", "etc.", "güzel bir şey") yerine somut tarif.
- Bu tür araçta negatif prompt alanı yok: istenmeyenler promptta kısıt olarak yazılır, negativePrompt boş kalır.
- Slayt sayısı, kitle ve bölüm taslağı her zaman yazılır; rakam uydurulmaz.

## Örnekler

KAYNAK GEREKLİ — Gamma resmi dokümantasyonuna bu rehber yazılırken erişilemedi. Ferit resmi dokümandan doldurup `sources` alanına sayfa URL'lerini eklemeli.

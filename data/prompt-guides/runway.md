---
# TASLAK — reviewedBy boş. Resmi dokümana erişilemedi; sözdizimi bölümleri KAYNAK GEREKLİ.
id: "runway"
version: 2
appliesTo: ["runway-gen-3"]
modality: "video"
promptLanguage: "en"
sources: []
reviewedBy: ""
reviewedAt: ""
slots:
- id: "subject"
  impact: "high"
  question:
    en: "What is in the shot?"
    tr: "Çekimde ne var?"
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
  - id: "nature"
    label:
      en: "Nature"
      tr: "Doğa"
    value: "a natural landscape"
  - id: "abstract"
    label:
      en: "Abstract"
      tr: "Soyut"
    value: "abstract shapes"
  default: "infer"
- id: "camera"
  impact: "high"
  question:
    en: "How should the camera move?"
    tr: "Kamera nasıl hareket etsin?"
  options:
  - id: "static"
    label:
      en: "Static"
      tr: "Sabit"
    value: "static camera"
  - id: "push-in"
    label:
      en: "Slow push-in"
      tr: "Yavaş yaklaşma"
    value: "slow push-in"
  - id: "orbit"
    label:
      en: "Orbit"
      tr: "Etrafında dönme"
    value: "orbiting camera"
  - id: "handheld"
    label:
      en: "Handheld"
      tr: "Elde"
    value: "handheld camera"
  default: "infer"
- id: "style"
  impact: "medium"
  question:
    en: "What style?"
    tr: "Hangi stil?"
  options:
  - id: "cinematic"
    label:
      en: "Cinematic"
      tr: "Sinematik"
    value: "cinematic"
  - id: "documentary"
    label:
      en: "Documentary"
      tr: "Belgesel"
    value: "documentary"
  - id: "animation"
    label:
      en: "Animation"
      tr: "Animasyon"
    value: "animated"
  - id: "commercial"
    label:
      en: "Commercial"
      tr: "Reklam"
    value: "commercial"
  default: "infer"
- id: "lighting"
  impact: "medium"
  question:
    en: "What lighting?"
    tr: "Nasıl ışık?"
  options:
  - id: "golden"
    label:
      en: "Golden hour"
      tr: "Gün batımı"
    value: "golden hour light"
  - id: "night"
    label:
      en: "Night"
      tr: "Gece"
    value: "night"
  - id: "studio"
    label:
      en: "Studio"
      tr: "Stüdyo"
    value: "studio lighting"
  - id: "overcast"
    label:
      en: "Overcast"
      tr: "Kapalı hava"
    value: "overcast light"
  default: "infer"
- id: "pace"
  impact: "low"
  question:
    en: "What pace?"
    tr: "Tempo nasıl?"
  options:
  - id: "slow"
    label:
      en: "Slow"
      tr: "Yavaş"
    value: "slow"
  - id: "energetic"
    label:
      en: "Energetic"
      tr: "Enerjik"
    value: "energetic"
  default: "slow"
refinements:
- id: "slower"
  label:
    en: "Slower"
    tr: "Daha yavaş"
  patch:
    pace: "slow"
- id: "dynamic"
  label:
    en: "More dynamic camera"
    tr: "Daha hareketli kamera"
  patch:
    camera: "orbiting camera"
- id: "cinematic"
  label:
    en: "Cinematic"
    tr: "Sinematik"
  patch:
    style: "cinematic"
- id: "night"
  label:
    en: "Night"
    tr: "Gece"
  patch:
    lighting: "night"
- id: "simpler"
  label:
    en: "Simpler scene"
    tr: "Daha sade sahne"
  instruction: "Reduce the scene to one subject and one action."
- id: "motion-detail"
  label:
    en: "More motion detail"
    tr: "Hareketi detaylandır"
  instruction: "Describe the subject movement more precisely."
checklist: ["One clear subject and action", "Setting stated", "Camera movement stated", "Lighting stated", "Style stated"]
validators:
- id: "length"
  type: "maxLength"
  value: 1000
  message: "RouteAI limit: keep the prompt under 1000 characters."
- id: "camera"
  type: "regex"
  value: "\\b(camera|shot|pan|panning|tilt|zoom|dolly|push-in|pull-back|orbit|orbiting|tracking|handheld|static|crane|aerial|close-up|wide)\\b"
  flags: "i"
  criterion: "toolReadiness"
  message: "State the camera movement or framing (e.g. slow push-in, static wide shot)."
- id: "no-foreign-params"
  type: "forbidRegex"
  value: "(^|\\s)--[a-z]+"
  flags: "i"
  criterion: "toolReadiness"
  message: "Do not use Midjourney-style --parameters; describe the format in words or put it in settings."
---

## Sözdizimi

KAYNAK GEREKLİ — Runway resmi dokümantasyonuna bu rehber yazılırken erişilemedi. Ferit resmi dokümandan doldurup `sources` alanına sayfa URL'lerini eklemeli.

## Şablon

RouteAI iskeleti (doğrulanmadı, araca özel sözdizimi içermez): [kamera hareketi ve çekim]: [konu] [tek, net eylem], [ortam]. [ışık]. [stil]. [tempo].

## Yap / Yapma

KAYNAK GEREKLİ — Runway resmi dokümantasyonuna bu rehber yazılırken erişilemedi. Ferit resmi dokümandan doldurup `sources` alanına sayfa URL'lerini eklemeli.

RouteAI kuralları (araç dokümanına dayanmaz; hedef AI yeterlilik rubriği, lib/promptBuilder/sufficiency.ts):

- Hedef araç RouteAI konuşmasını görmez: kullanıcının verdiği adlar, tırnaklı metinler, sayılar ve kısıtlar promptta aynen yer alır.
- Sadece prompt metni: "Elbette", "İşte promptun" gibi giriş yok; konuşmaya atıf ("yukarıda konuştuğumuz") yok.
- Şablondaki köşeli yer tutucular doldurulur; kopyalanmaz.
- Muğlak ifade ("vb.", "etc.", "güzel bir şey") yerine somut tarif.
- Araca seslenme yok ("Please create an image of...", "Lütfen..."): doğrudan konu/sahne ile başla.
- negativePrompt promptta istenen bir şeyi dışlamaz; ayarlar (oran, format) promptla çelişmez.
- Tek sahne, tek ana eylem; kamera hareketi açıkça yazılır.

## Örnekler

KAYNAK GEREKLİ — Runway resmi dokümantasyonuna bu rehber yazılırken erişilemedi. Ferit resmi dokümandan doldurup `sources` alanına sayfa URL'lerini eklemeli.

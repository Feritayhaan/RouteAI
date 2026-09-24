---
# TASLAK — reviewedBy boş. Resmi dokümana erişilemedi; sözdizimi bölümleri KAYNAK GEREKLİ.
id: "text-to-video"
version: 1
appliesTo: ["google-veo-3", "sora-2-openai"]
modality: "video"
promptLanguage: "en"
sources: []
reviewedBy: ""
reviewedAt: ""
slots:
- id: "scene"
  impact: "high"
  question:
    en: "What happens in the scene?"
    tr: "Sahnede ne oluyor?"
  options:
  - id: "person"
    label:
      en: "A person doing something"
      tr: "Bir şey yapan bir kişi"
    value: "a person in action"
  - id: "product"
    label:
      en: "A product shot"
      tr: "Ürün çekimi"
    value: "a product shot"
  - id: "landscape"
    label:
      en: "A landscape"
      tr: "Bir manzara"
    value: "a landscape"
  - id: "story"
    label:
      en: "A short story moment"
      tr: "Kısa bir hikâye anı"
    value: "a short story moment"
  default: "infer"
- id: "camera"
  impact: "high"
  question:
    en: "How should it be filmed?"
    tr: "Nasıl çekilsin?"
  options:
  - id: "wide"
    label:
      en: "Wide shot"
      tr: "Geniş plan"
    value: "wide shot"
  - id: "close"
    label:
      en: "Close-up"
      tr: "Yakın plan"
    value: "close-up"
  - id: "tracking"
    label:
      en: "Tracking shot"
      tr: "Takip çekimi"
    value: "tracking shot"
  - id: "drone"
    label:
      en: "Aerial"
      tr: "Havadan"
    value: "aerial shot"
  default: "infer"
- id: "audio"
  impact: "high"
  question:
    en: "What should we hear?"
    tr: "Ne duyulsun?"
  options:
  - id: "dialogue"
    label:
      en: "Dialogue"
      tr: "Konuşma"
    value: "dialogue"
  - id: "ambient"
    label:
      en: "Ambient sound"
      tr: "Ortam sesi"
    value: "ambient sound"
  - id: "music"
    label:
      en: "Music"
      tr: "Müzik"
    value: "music"
  - id: "silent"
    label:
      en: "Nothing"
      tr: "Ses yok"
    value: "no audio"
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
  - id: "realistic"
    label:
      en: "Realistic"
      tr: "Gerçekçi"
    value: "realistic"
  - id: "animated"
    label:
      en: "Animated"
      tr: "Animasyon"
    value: "animated"
  - id: "vintage"
    label:
      en: "Vintage film"
      tr: "Eski film"
    value: "vintage film look"
  default: "infer"
- id: "pace"
  impact: "low"
  question:
    en: "What pace?"
    tr: "Tempo nasıl?"
  options:
  - id: "calm"
    label:
      en: "Calm"
      tr: "Sakin"
    value: "calm"
  - id: "fast"
    label:
      en: "Fast"
      tr: "Hızlı"
    value: "fast-paced"
  default: "calm"
refinements:
- id: "add-dialogue"
  label:
    en: "Add dialogue"
    tr: "Konuşma ekle"
  patch:
    audio: "dialogue"
- id: "silent"
  label:
    en: "No audio"
    tr: "Sessiz"
  patch:
    audio: "no audio"
- id: "cinematic"
  label:
    en: "Cinematic"
    tr: "Sinematik"
  patch:
    style: "cinematic"
- id: "close-up"
  label:
    en: "Close-up"
    tr: "Yakın plan"
  patch:
    camera: "close-up"
- id: "more-detail"
  label:
    en: "More detail"
    tr: "Daha detaylı"
  instruction: "Add concrete detail about setting, subject and light."
- id: "shorter"
  label:
    en: "Tighter scene"
    tr: "Daha kısa sahne"
  instruction: "Keep a single continuous moment; remove extra beats."
checklist: ["Subject and action", "Setting", "Camera framing", "Audio intent", "Style"]
validators:
- id: "length"
  type: "maxLength"
  value: 1500
  message: "RouteAI limit: keep the prompt under 1500 characters."
---

## Sözdizimi

KAYNAK GEREKLİ — Veo 3 ve Sora 2 resmi dokümantasyonuna bu rehber yazılırken erişilemedi. Ferit resmi dokümandan doldurup `sources` alanına sayfa URL'lerini eklemeli.

## Şablon

RouteAI iskeleti (doğrulanmadı, araca özel sözdizimi içermez): [çekim/kamera]: [konu] [eylem], [ortam], [ışık]. [stil]. Ses: [ses].

## Yap / Yapma

KAYNAK GEREKLİ — Veo 3 ve Sora 2 resmi dokümantasyonuna bu rehber yazılırken erişilemedi. Ferit resmi dokümandan doldurup `sources` alanına sayfa URL'lerini eklemeli.

## Örnekler

KAYNAK GEREKLİ — Veo 3 ve Sora 2 resmi dokümantasyonuna bu rehber yazılırken erişilemedi. Ferit resmi dokümandan doldurup `sources` alanına sayfa URL'lerini eklemeli.

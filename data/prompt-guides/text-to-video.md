---
# TASLAK — reviewedBy boş. Resmi dokümana erişilemedi; sözdizimi bölümleri KAYNAK GEREKLİ.
id: "text-to-video"
version: 3
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
  default: "infer"
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
checklist: ["Subject and action", "Setting", "Camera framing", "Lighting", "Audio intent", "Style"]
validators:
- id: "length"
  type: "maxLength"
  value: 1500
  message: "RouteAI limit: keep the prompt under 1500 characters."
- id: "camera"
  type: "regex"
  value: "\\b(camera|shot|pan|panning|tilt|zoom|dolly|push-in|pull-back|orbit|orbiting|tracking|handheld|static|crane|aerial|close-up|wide)\\b"
  flags: "i"
  criterion: "toolReadiness"
  message: "State the camera movement or framing (e.g. slow push-in, static wide shot)."
- id: "audio"
  type: "regex"
  value: "\\b(audio|sound|sounds|dialogue|dialog|music|silent|silence|ambient|ambience|voice|voiceover|narration|says)\\b"
  flags: "i"
  criterion: "toolReadiness"
  message: "State the audio intent (dialogue, ambient sound, music or silent)."
- id: "no-foreign-params"
  type: "forbidRegex"
  value: "(^|\\s)--[a-z]+"
  flags: "i"
  criterion: "toolReadiness"
  message: "Do not use Midjourney-style --parameters; describe the format in words or put it in settings."
---

## Sözdizimi

KAYNAK GEREKLİ — Veo 3 ve Sora 2 resmi dokümantasyonuna bu rehber yazılırken erişilemedi. Ferit resmi dokümandan doldurup `sources` alanına sayfa URL'lerini eklemeli.

## Şablon

RouteAI iskeleti (doğrulanmadı, araca özel sözdizimi içermez): [çekim/kamera]: [konu] [eylem], [ortam], [ışık]. [stil]. Ses: [diyalog, ortam sesi, müzik ya da sessiz].

## Yap / Yapma

KAYNAK GEREKLİ — Veo 3 ve Sora 2 resmi dokümantasyonuna bu rehber yazılırken erişilemedi. Ferit resmi dokümandan doldurup `sources` alanına sayfa URL'lerini eklemeli.

RouteAI kuralları (araç dokümanına dayanmaz; hedef AI yeterlilik rubriği, lib/promptBuilder/sufficiency.ts):

- Hedef araç RouteAI konuşmasını görmez: kullanıcının verdiği adlar, tırnaklı metinler, sayılar ve kısıtlar promptta aynen yer alır.
- Sadece prompt metni: "Elbette", "İşte promptun" gibi giriş yok; konuşmaya atıf ("yukarıda konuştuğumuz") yok.
- Şablondaki köşeli yer tutucular doldurulur; kopyalanmaz.
- Muğlak ifade ("vb.", "etc.", "güzel bir şey") yerine somut tarif.
- Araca seslenme yok ("Please create an image of...", "Lütfen..."): doğrudan konu/sahne ile başla.
- negativePrompt promptta istenen bir şeyi dışlamaz; ayarlar (oran, format) promptla çelişmez.
- Ses niyeti her zaman yazılır (diyalog varsa konuşan ve söylenen cümle).

## Örnekler

KAYNAK GEREKLİ — Veo 3 ve Sora 2 resmi dokümantasyonuna bu rehber yazılırken erişilemedi. Ferit resmi dokümandan doldurup `sources` alanına sayfa URL'lerini eklemeli.

---
# TASLAK — reviewedBy boş. Resmi dokümana erişilemedi; sözdizimi bölümleri KAYNAK GEREKLİ.
id: "suno"
version: 1
appliesTo: ["suno-ai"]
modality: "music"
promptLanguage: "user"
sources: []
reviewedBy: ""
reviewedAt: ""
slots:
- id: "genre"
  impact: "high"
  question:
    en: "Which genre?"
    tr: "Hangi tür?"
  options:
  - id: "pop"
    label:
      en: "Pop"
      tr: "Pop"
    value: "pop"
  - id: "rock"
    label:
      en: "Rock"
      tr: "Rock"
    value: "rock"
  - id: "hiphop"
    label:
      en: "Hip-hop"
      tr: "Hip-hop"
    value: "hip-hop"
  - id: "electronic"
    label:
      en: "Electronic"
      tr: "Elektronik"
    value: "electronic"
  - id: "acoustic"
    label:
      en: "Acoustic"
      tr: "Akustik"
    value: "acoustic"
  default: "infer"
- id: "mood"
  impact: "high"
  question:
    en: "What mood?"
    tr: "Nasıl bir duygu?"
  options:
  - id: "upbeat"
    label:
      en: "Upbeat"
      tr: "Neşeli"
    value: "upbeat"
  - id: "melancholic"
    label:
      en: "Melancholic"
      tr: "Hüzünlü"
    value: "melancholic"
  - id: "epic"
    label:
      en: "Epic"
      tr: "Destansı"
    value: "epic"
  - id: "calm"
    label:
      en: "Calm"
      tr: "Sakin"
    value: "calm"
  default: "infer"
- id: "vocals"
  impact: "high"
  question:
    en: "Vocals?"
    tr: "Vokal?"
  options:
  - id: "female"
    label:
      en: "Female vocals"
      tr: "Kadın vokal"
    value: "female vocals"
  - id: "male"
    label:
      en: "Male vocals"
      tr: "Erkek vokal"
    value: "male vocals"
  - id: "instrumental"
    label:
      en: "Instrumental"
      tr: "Enstrümantal"
    value: "instrumental"
  - id: "duet"
    label:
      en: "Duet"
      tr: "Düet"
    value: "duet"
  default: "infer"
- id: "tempo"
  impact: "medium"
  question:
    en: "Tempo?"
    tr: "Tempo?"
  options:
  - id: "slow"
    label:
      en: "Slow"
      tr: "Yavaş"
    value: "slow tempo"
  - id: "mid"
    label:
      en: "Medium"
      tr: "Orta"
    value: "mid tempo"
  - id: "fast"
    label:
      en: "Fast"
      tr: "Hızlı"
    value: "fast tempo"
  default: "mid"
- id: "theme"
  impact: "medium"
  question:
    en: "What is the song about?"
    tr: "Şarkı ne hakkında?"
  options:
  - id: "love"
    label:
      en: "Love"
      tr: "Aşk"
    value: "love"
  - id: "motivation"
    label:
      en: "Motivation"
      tr: "Motivasyon"
    value: "motivation"
  - id: "jingle"
    label:
      en: "A brand jingle"
      tr: "Marka jingle'ı"
    value: "brand jingle"
  - id: "story"
    label:
      en: "A story"
      tr: "Bir hikâye"
    value: "a story"
  default: "infer"
refinements:
- id: "instrumental"
  label:
    en: "Instrumental"
    tr: "Enstrümantal"
  patch:
    vocals: "instrumental"
- id: "faster"
  label:
    en: "Faster"
    tr: "Daha hızlı"
  patch:
    tempo: "fast tempo"
- id: "sadder"
  label:
    en: "Sadder"
    tr: "Daha hüzünlü"
  patch:
    mood: "melancholic"
- id: "energetic"
  label:
    en: "More energy"
    tr: "Daha enerjik"
  instruction: "Increase energy: stronger drums and a bigger chorus."
- id: "short-lyrics"
  label:
    en: "Shorter lyrics"
    tr: "Daha kısa sözler"
  instruction: "Shorten the lyrics to one verse and one chorus."
- id: "hook"
  label:
    en: "Catchier chorus"
    tr: "Akılda kalan nakarat"
  instruction: "Make the chorus a short, repeatable hook."
checklist: ["Genre", "Mood", "Vocal type", "Theme or lyrics"]
validators:
- id: "length"
  type: "maxLength"
  value: 3000
  message: "RouteAI limit: keep the prompt under 3000 characters."
---

## Sözdizimi

KAYNAK GEREKLİ — Suno resmi dokümantasyonuna bu rehber yazılırken erişilemedi. Ferit resmi dokümandan doldurup `sources` alanına sayfa URL'lerini eklemeli.

## Şablon

RouteAI iskeleti (doğrulanmadı, araca özel sözdizimi içermez): Stil: [tür], [duygu], [vokal], [tempo]. Sözler: [tema].

## Yap / Yapma

KAYNAK GEREKLİ — Suno resmi dokümantasyonuna bu rehber yazılırken erişilemedi. Ferit resmi dokümandan doldurup `sources` alanına sayfa URL'lerini eklemeli.

## Örnekler

KAYNAK GEREKLİ — Suno resmi dokümantasyonuna bu rehber yazılırken erişilemedi. Ferit resmi dokümandan doldurup `sources` alanına sayfa URL'lerini eklemeli.

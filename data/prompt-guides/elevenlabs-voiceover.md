---
# TASLAK — reviewedBy boş. Resmi dokümana erişilemedi; sözdizimi bölümleri KAYNAK GEREKLİ.
id: "elevenlabs-voiceover"
version: 1
appliesTo: ["elevenlabs"]
modality: "audio"
promptLanguage: "user"
sources: []
reviewedBy: ""
reviewedAt: ""
slots:
- id: "language"
  impact: "high"
  question:
    en: "Which language is the script in?"
    tr: "Metin hangi dilde?"
  options:
  - id: "tr"
    label:
      en: "Turkish"
      tr: "Türkçe"
    value: "Turkish"
  - id: "en"
    label:
      en: "English"
      tr: "İngilizce"
    value: "English"
  - id: "other"
    label:
      en: "Another language"
      tr: "Başka bir dil"
    value: "another language"
  default: "infer"
- id: "tone"
  impact: "high"
  question:
    en: "What tone?"
    tr: "Nasıl bir ton?"
  options:
  - id: "calm"
    label:
      en: "Calm"
      tr: "Sakin"
    value: "calm"
  - id: "energetic"
    label:
      en: "Energetic"
      tr: "Enerjik"
    value: "energetic"
  - id: "warm"
    label:
      en: "Warm"
      tr: "Sıcak"
    value: "warm"
  - id: "authoritative"
    label:
      en: "Authoritative"
      tr: "Otoriter"
    value: "authoritative"
  default: "infer"
- id: "voice"
  impact: "medium"
  question:
    en: "Which voice?"
    tr: "Hangi ses?"
  options:
  - id: "female"
    label:
      en: "Female"
      tr: "Kadın"
    value: "female voice"
  - id: "male"
    label:
      en: "Male"
      tr: "Erkek"
    value: "male voice"
  - id: "neutral"
    label:
      en: "Neutral"
      tr: "Nötr"
    value: "neutral voice"
  default: "infer"
- id: "pace"
  impact: "medium"
  question:
    en: "Speaking pace?"
    tr: "Konuşma hızı?"
  options:
  - id: "slow"
    label:
      en: "Slow"
      tr: "Yavaş"
    value: "slow"
  - id: "normal"
    label:
      en: "Normal"
      tr: "Normal"
    value: "normal"
  - id: "fast"
    label:
      en: "Fast"
      tr: "Hızlı"
    value: "fast"
  default: "normal"
- id: "use"
  impact: "low"
  question:
    en: "Where will it be used?"
    tr: "Nerede kullanılacak?"
  options:
  - id: "ad"
    label:
      en: "Ad"
      tr: "Reklam"
    value: "ad"
  - id: "course"
    label:
      en: "E-learning"
      tr: "E-öğrenme"
    value: "e-learning"
  - id: "audiobook"
    label:
      en: "Audiobook"
      tr: "Sesli kitap"
    value: "audiobook"
  - id: "social"
    label:
      en: "Social video"
      tr: "Sosyal medya videosu"
    value: "social video"
  default: "infer"
refinements:
- id: "slower"
  label:
    en: "Slower"
    tr: "Daha yavaş"
  patch:
    pace: "slow"
- id: "warmer"
  label:
    en: "Warmer"
    tr: "Daha sıcak"
  patch:
    tone: "warm"
- id: "energetic"
  label:
    en: "More energetic"
    tr: "Daha enerjik"
  patch:
    tone: "energetic"
- id: "pauses"
  label:
    en: "Add pauses"
    tr: "Duraklama ekle"
  instruction: "Split long sentences and mark natural pauses in the script."
- id: "shorter"
  label:
    en: "Shorter script"
    tr: "Daha kısa metin"
  instruction: "Shorten the script by about a third without losing key points."
- id: "formal"
  label:
    en: "More formal"
    tr: "Daha resmî"
  instruction: "Use a more formal register."
checklist: ["Final script text", "Tone and pace", "Voice choice", "Pronunciation notes for names or numbers"]
validators:
- id: "length"
  type: "maxLength"
  value: 5000
  message: "RouteAI limit: keep the prompt under 5000 characters."
---

## Sözdizimi

KAYNAK GEREKLİ — ElevenLabs resmi dokümantasyonuna bu rehber yazılırken erişilemedi. Ferit resmi dokümandan doldurup `sources` alanına sayfa URL'lerini eklemeli.

## Şablon

RouteAI iskeleti (doğrulanmadı, araca özel sözdizimi içermez): Ses ayarları: [ses], [ton], [hız]. Metin: [okunacak metin, kısa cümleler].

## Yap / Yapma

KAYNAK GEREKLİ — ElevenLabs resmi dokümantasyonuna bu rehber yazılırken erişilemedi. Ferit resmi dokümandan doldurup `sources` alanına sayfa URL'lerini eklemeli.

## Örnekler

KAYNAK GEREKLİ — ElevenLabs resmi dokümantasyonuna bu rehber yazılırken erişilemedi. Ferit resmi dokümandan doldurup `sources` alanına sayfa URL'lerini eklemeli.

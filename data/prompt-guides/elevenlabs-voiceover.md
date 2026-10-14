---
# TASLAK — reviewedBy boş (rehberin tamamı incelenmedi).
# Kaynak: Ferit'in TTS best practices sayfasını okuması (2026-10-14); bu ortam sayfaya erişemedi.
# v4: prompt sesli okunan metnin kendisi; etiket ve ses ayarları metne girmez (2026-10-14 eval:
# "Ses ayarları: kadın sesi… Metin: …" ElevenLabs'ta sesli okunuyordu; v3'teki "script" ve
# "delivery" doğrulayıcıları bu etiketleri zorunlu kılıyordu).
id: "elevenlabs-voiceover"
version: 4
appliesTo: ["elevenlabs"]
modality: "audio"
promptLanguage: "user"
sources: ["https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices"]
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
  instruction: "Split long sentences and mark natural pauses with ellipses (…) or dashes (—); do not use break tags."
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
checklist: ["Only the words to be spoken", "No labels, settings or stage notes in the text", "Voice, speed and model in settings", "Natural pauses with punctuation", "Symbols and abbreviations written as they are spoken", "Tone carried by the wording"]
validators:
- id: "length"
  type: "maxLength"
  value: 5000
  message: "RouteAI limit: keep the prompt under 5000 characters."
- id: "spoken-only"
  type: "forbidRegex"
  value: "(?:^|\\n|[.!?]\\s)\\s*(?:ses ayarları|voice settings|metin|script|telaffuz notları|pronunciation notes|ton|tone|hız|speed|pace|ses|voice)\\s*:"
  flags: "iu"
  criterion: "toolReadiness"
  message: "ElevenLabs reads the whole prompt aloud: no labels such as \"Script:\" or \"Voice settings:\". Keep only the words to be spoken; put voice, speed and model in settings."
- id: "no-break-tags"
  type: "forbidRegex"
  value: "<break\\b"
  flags: "i"
  criterion: "toolReadiness"
  message: "Break tags work only on some models: mark pauses with ellipses (…) or dashes (—)."
---

## Sözdizimi

Kaynak: [TTS best practices](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices), Ferit'in okuması (2026-10-14).

- Metin kutusundaki her şey sesli okunur; anlatı içindeki duygu ifadeleri de ("diye sordu, sesi titreyerek") okunur. Bu yüzden prompt sadece seslendirilecek metindir.
- Duraklama: `<break time="1.5s" />` etiketi yalnızca v2/Flash modellerinde çalışır (en fazla 3 sn); v3/v4'te çalışmaz. Her modelde çalışan yol noktalamadır: `…` ve `—`.
- Hız: Voice settings içindeki Speed kaydırıcısı; varsayılan 1.0, aralık 0.7–1.2. Uç değerler kaliteyi düşürür.
- Ses etiketleri (köşeli parantez, ör. `[whispers]`) yalnızca v3/v4 modellerinde; sesin niteliği açıkça tarif edilmeli (`[low, steady voice]`).
- Metin normalleştirme varsayılan olarak açık; küçük modeller (Flash v2.5) sayı, tarih ve kısaltmalarda zayıf, Multilingual v2 daha iyi okur.

## Şablon

RouteAI iskeleti. Prompt alanına yalnızca okunacak metin yazılır, başında ya da sonunda etiket olmadan. Kullanıcı metni verdiyse o metin aynen kullanılır; sadece kısa cümleler ve noktalamayla (… —) doğal duraklamalar eklenir. Metni vermediyse amacına ve tonuna uygun, kısa cümlelerden oluşan bir taslak metin yazılır. Ton kelime seçimiyle verilir; "sakin bir sesle" gibi tarifler metne yazılmaz. Ses, hız (Speed) ve model `settings` alanına yazılır.

## Yap / Yapma

Kaynağa dayanan kurallar (yukarıdaki sayfa):

- Prompt sesli okunur: "Metin:", "Script:", "Ses ayarları:" gibi etiket ya da yönetmen notu yazma.
- Ses, hız ve model `settings`'e yazılır: ör. `Speed: 0.9` (sakin anlatım). Speed 0.7–1.2 aralığında kalır.
- Duraklamayı `…` ve `—` ile ver; `<break>` etiketi kullanma (her modelde çalışmaz).
- Köşeli parantezli ses etiketlerini sadece kullanıcı v3/v4 kullandığını söylediyse kullan.
- Sembol ve kısaltmaları okunduğu gibi yaz (`Ctrl + Z` → "kontrol z").

RouteAI kuralları (hedef AI yeterlilik rubriği, lib/promptBuilder/sufficiency.ts):

- Hedef araç RouteAI konuşmasını görmez: kullanıcının verdiği adlar, tırnaklı metinler ve sayılar metinde aynen yer alır.
- Sadece okunacak metin: "Elbette", "İşte promptun" gibi giriş yok; konuşmaya atıf yok.
- Bu araçta negatif prompt alanı yok: negativePrompt boş kalır.

## Örnekler

Kaynaktaki örnekler (Ferit'in notları):

- Duraklama noktalamayla: `Bu… şey, işe yarayabilir. Dur — bu ses ne?`
- Sakin anlatım: `settings` içinde `Speed: 0.9`; metin: `Bu derste bütçe yapmayı öğreneceğiz. Önce gelirini yaz… sonra giderlerini.`

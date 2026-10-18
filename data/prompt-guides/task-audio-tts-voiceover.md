---
# TASLAK — reviewedBy boş. Görev şablonu: araca özel sözdizimi içermez, hiçbir araca bağlı değildir.
# Araca özel rehberi olmayan HER araçta, "audio.tts-voiceover" işi için kullanılır (lib/promptBuilder/fallback.ts).
id: "task-audio-tts-voiceover"
version: 1
appliesTo: []
tasks: ["audio.tts-voiceover"]
modality: "audio"
promptLanguage: "user"
sources: ["https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices", "https://developers.openai.com/api/docs/guides/prompt-engineering", "https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices"]
reviewedBy: ""
reviewedAt: ""
slots:
- id: "use"
  impact: "high"
  question:
    en: "What is the voiceover for?"
    tr: "Seslendirme ne için?"
  options:
  - id: "video"
    label:
      en: "Video narration"
      tr: "Video anlatımı"
    value: "video narration"
  - id: "ad"
    label:
      en: "Advert"
      tr: "Reklam"
    value: "an advert"
  - id: "course"
    label:
      en: "Course or tutorial"
      tr: "Kurs / eğitim"
    value: "a course or tutorial lesson"
  - id: "story"
    label:
      en: "Audiobook or story"
      tr: "Sesli kitap / hikâye"
    value: "an audiobook or story"
  - id: "podcast"
    label:
      en: "Podcast intro or outro"
      tr: "Podcast giriş / kapanış"
    value: "a podcast intro or outro"
  - id: "phone"
    label:
      en: "Phone menu or message"
      tr: "Telefon menüsü / mesaj"
    value: "a phone menu or message"
  default: "infer"
- id: "voice"
  impact: "high"
  question:
    en: "What voice style?"
    tr: "Nasıl bir ses?"
  options:
  - id: "warm"
    label:
      en: "Warm and friendly"
      tr: "Sıcak, samimi"
    value: "warm and friendly"
  - id: "authoritative"
    label:
      en: "Calm and authoritative"
      tr: "Sakin, güvenilir"
    value: "calm and authoritative"
  - id: "energetic"
    label:
      en: "Energetic"
      tr: "Enerjik"
    value: "energetic and upbeat"
  - id: "conversational"
    label:
      en: "Natural conversation"
      tr: "Doğal sohbet"
    value: "natural and conversational"
  - id: "dramatic"
    label:
      en: "Dramatic"
      tr: "Dramatik"
    value: "dramatic and expressive"
  default: "infer"
- id: "length"
  impact: "high"
  question:
    en: "How long?"
    tr: "Ne kadar uzun?"
  options:
  - id: "short"
    label:
      en: "Short, about 30 seconds"
      tr: "Kısa, yaklaşık 30 saniye"
    value: "a script that takes about 30 seconds to read aloud"
  - id: "medium"
    label:
      en: "Medium, about 1 to 2 minutes"
      tr: "Orta, yaklaşık 1–2 dakika"
    value: "a script that takes about 1 to 2 minutes to read aloud"
  - id: "long"
    label:
      en: "Longer"
      tr: "Uzun"
    value: "a longer script in clearly separated sections"
  default: "short"
- id: "pace"
  impact: "medium"
  question:
    en: "Pace?"
    tr: "Tempo?"
  options:
  - id: "slow"
    label:
      en: "Slow and clear"
      tr: "Yavaş, net"
    value: "slow and clear, with short sentences"
  - id: "normal"
    label:
      en: "Natural"
      tr: "Doğal"
    value: "natural pace"
  - id: "fast"
    label:
      en: "Quick"
      tr: "Hızlı"
    value: "quick but clear"
  default: "normal"
- id: "prep"
  impact: "medium"
  question:
    en: "Text preparation?"
    tr: "Metin hazırlığı?"
  options:
  - id: "spoken"
    label:
      en: "Write numbers and symbols as words"
      tr: "Rakam ve sembolleri kelimeyle yaz"
    value: "write numbers, dates, symbols, units and abbreviations out as they should be spoken"
  - id: "as-is"
    label:
      en: "Keep as written"
      tr: "Olduğu gibi bırak"
    value: "keep the user's text exactly as written"
  default: "spoken"
- id: "pauses"
  impact: "medium"
  question:
    en: "Pauses?"
    tr: "Duraklamalar?"
  options:
  - id: "punctuation"
    label:
      en: "Use punctuation and short paragraphs"
      tr: "Noktalama ve kısa paragraf"
    value: "use punctuation and short paragraphs to create natural pauses"
  - id: "minimal"
    label:
      en: "Minimal"
      tr: "Az"
    value: "minimal pauses"
  default: "punctuation"
- id: "facts"
  impact: "low"
  question:
    en: "Content?"
    tr: "İçerik?"
  options:
  - id: "mine"
    label:
      en: "Use my text"
      tr: "Benim metnimi kullan"
    value: "prepare the user's text for reading aloud without changing its meaning"
  - id: "write"
    label:
      en: "Write it for me"
      tr: "Benim için yaz"
    value: "write the script from the user's notes, using only the facts provided and [placeholders] for missing details"
  default: "mine"
refinements:
- id: "shorter"
  label:
    en: "Shorter"
    tr: "Daha kısa"
  patch:
    length: "a script that takes about 30 seconds to read aloud"
- id: "slower"
  label:
    en: "Slower"
    tr: "Daha yavaş"
  patch:
    pace: "slow and clear, with short sentences"
- id: "warm"
  label:
    en: "Warmer"
    tr: "Daha sıcak"
  patch:
    voice: "warm and friendly"
- id: "authority"
  label:
    en: "More authoritative"
    tr: "Daha güven verici"
  patch:
    voice: "calm and authoritative"
- id: "energy"
  label:
    en: "More energy"
    tr: "Daha enerjik"
  patch:
    voice: "energetic and upbeat"
- id: "spoken"
  label:
    en: "Numbers as words"
    tr: "Rakamları kelimeyle yaz"
  patch:
    prep: "write numbers, dates, symbols, units and abbreviations out as they should be spoken"
- id: "short-sent"
  label:
    en: "Shorter sentences"
    tr: "Daha kısa cümleler"
  instruction: "Split long sentences so each one can be said in one breath."
- id: "direction"
  label:
    en: "Add a voice note"
    tr: "Ses notu ekle"
  instruction: "After the script, add one short line describing the voice and pace to choose in the tool."
checklist: ["Use and voice style", "Written to be heard, not read", "Short sentences, one breath each", "Numbers, dates, symbols and abbreviations spoken out", "Pauses made with punctuation", "Hard names handled only with pronunciation the user gave", "No invented facts", "Only the script returned"]
validators:
- id: "length"
  type: "maxLength"
  value: 2500
  message: "RouteAI limit: keep the prompt under 2500 characters."
- id: "min-length"
  type: "regex"
  value: "^[\\s\\S]{40,}$"
  message: "Too short: write the script to be read aloud."
- id: "no-braces"
  type: "regex"
  value: "^(?![\\s\\S]*(\\{\\{|\\}\\}))[\\s\\S]*$"
  message: "Remove unfilled {{placeholders}}; write the real content or a [clearly marked placeholder]."
---

## Sözdizimi

Metinden sese çeviren araçlarda (ElevenLabs, OpenAI TTS, Azure, Murf vb.) yapay zekâ "prompt"u değil, **okunacak metnin kendisi** sonucu belirler. ElevenLabs'in rehberi de aynısını söyler: noktalama ve metin hazırlığı tonlamayı, tempoyu ve doğruluğu doğrudan etkiler. Bu görev bu yüzden metni SESLENDİRMEYE HAZIRLAR (ya da kullanıcının notundan okunacak metni yazar).

**Sıra:** (1) kullanım ve ses tarzı, (2) uzunluk ve tempo, (3) metin hazırlığı kuralları, (4) içerik kaynağı.

- **Konuşma diliyle, kısa cümlelerle yaz:** bir cümle tek nefeste söylenebilmeli.
- **Rakam, tarih, sembol, birim ve kısaltmaları okunacağı gibi yaz** ("%15" → "yüzde on beş"; "3 Ocak" → "üç Ocak"; "TL" → "Türk lirası"). Aksi halde araç yanlış okuyabilir.
- Duraklamayı noktalama ve kısa paragrafla yap (nokta, virgül, üç nokta, boş satır). Aracın özel işaret/etiket sözdizimini (ör. duygu etiketleri) bilmiyorsan KULLANMA; her araç farklı çalışır, yanlış etiket sesli okunabilir.
- Zor özel adlarda yalnızca kullanıcının verdiği telaffuz yazımını kullan; tahminle yeni yazım uydurma.
- Ses, duygu ve tempo çoğu araçta ayardan seçilir. Prompt çıktısının sonuna **tek satır ses notu** ekletmek ("sıcak, yavaş kadın/erkek ses") kullanıcının doğru sesi seçmesine yardım eder.
- Kullanıcı kendi metnini verdiyse **anlamını değiştirme**; yalnızca okunuş için hazırla.
- Gerçek bir kişinin sesini taklit eden içerik için kişinin izni gerekir; bunu yazma.

## Şablon

[Kullanım] için, [ses tarzı] tonda, [uzunluk], [tempo] bir seslendirme metni hazırla. İçerik: [kullanıcının metni veya notları]. Kurallar: konuşma diliyle, bir nefeste söylenebilecek kısa cümleler kur; rakam, tarih, sembol, birim ve kısaltmaları okunacağı gibi yaz; duraklamaları noktalama ve kısa paragrafla yap; yalnızca verilen bilgileri kullan, eksikleri [yer tutucu] yap; anlamı değiştirme. Çıktı: yalnızca okunacak metin, sonunda tek satır ses notu.

## Yap / Yapma

**Yap**
- Kısa, konuşma dilinde cümleler yaz.
- Rakam, tarih ve kısaltmaları kelimeyle yaz.
- Duraklamayı noktalama ve boş satırla yap.
- Ses notunu ayrı ve kısa tut.

**Yapma**
- Aracın tanımadığı özel etiket ve işaretleri kullanma.
- Zor adlar için kendi telaffuzunu uydurma.
- Kullanıcının metninin anlamını değiştirme.
- İzinsiz gerçek kişi sesi taklidi yazma.

## Örnekler

**Örnek 1 — reklam:** "Yerel bir fırının radyo reklamı"

```
Bir radyo reklamı için, sıcak ve samimi tonda, yaklaşık 30 saniyelik bir seslendirme metni hazırla. İçerik: [fırın adı], taze ekmek her sabah saat [saat]'te çıkıyor, adres [adres]. Kurallar: konuşma diliyle, bir nefeste söylenebilecek kısa cümleler kur; saat, rakam ve adresi okunacağı gibi yaz; yalnızca verilen bilgileri kullan, eksikleri [yer tutucu] yap. Çıktı: yalnızca okunacak metin, sonunda tek satır ses notu.
```

**Örnek 2 — kurs:** "Online kurs dersi seslendirmesi"

```
Aşağıdaki ders notlarını seslendirmeye hazırla. Ses: sakin ve güvenilir, yavaş ve net tempo. Notların anlamını değiştirme; rakam, sembol ve kısaltmaları okunacağı gibi yaz; uzun cümleleri böl; duraklamaları kısa paragraflarla yap. Yalnızca okunacak metni ver.

[Ders notları]
```

Örnekler Türkçe açıklandı; İngilizce yazılacak promptlar örneklerde İngilizce gösterilir.

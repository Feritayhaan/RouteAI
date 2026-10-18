---
# TASLAK — reviewedBy boş. Görev şablonu: araca özel sözdizimi içermez, hiçbir araca bağlı değildir.
# Araca özel rehberi olmayan HER araçta, "education.language-learning" işi için kullanılır (lib/promptBuilder/fallback.ts).
id: "task-education-language-learning"
version: 1
appliesTo: []
tasks: ["education.language-learning"]
modality: "text"
promptLanguage: "user"
sources: ["https://developers.openai.com/api/docs/guides/prompt-engineering", "https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices", "https://ai.google.dev/gemini-api/docs/prompting-strategies"]
reviewedBy: ""
reviewedAt: ""
slots:
- id: "level"
  impact: "high"
  question:
    en: "What is your level?"
    tr: "Seviyen ne?"
  options:
  - id: "beginner"
    label:
      en: "Beginner"
      tr: "Başlangıç"
    value: "beginner"
  - id: "elementary"
    label:
      en: "Elementary"
      tr: "Temel"
    value: "elementary"
  - id: "intermediate"
    label:
      en: "Intermediate"
      tr: "Orta"
    value: "intermediate"
  - id: "advanced"
    label:
      en: "Advanced"
      tr: "İleri"
    value: "advanced"
  default: "infer"
- id: "goal"
  impact: "high"
  question:
    en: "Why are you learning?"
    tr: "Neden öğreniyorsun?"
  options:
  - id: "travel"
    label:
      en: "Travel"
      tr: "Seyahat"
    value: "travel"
  - id: "work"
    label:
      en: "Work"
      tr: "İş"
    value: "work and professional use"
  - id: "exam"
    label:
      en: "An exam"
      tr: "Sınav"
    value: "preparing for an exam"
  - id: "chat"
    label:
      en: "Everyday conversation"
      tr: "Günlük sohbet"
    value: "everyday conversation"
  - id: "reading"
    label:
      en: "Reading and writing"
      tr: "Okuma / yazma"
    value: "reading and writing"
  default: "infer"
- id: "mode"
  impact: "high"
  question:
    en: "What kind of practice?"
    tr: "Nasıl bir pratik?"
  options:
  - id: "conversation"
    label:
      en: "Role-play conversation"
      tr: "Rol yaparak konuşma"
    value: "a role-play conversation"
  - id: "grammar"
    label:
      en: "Explain grammar"
      tr: "Dilbilgisi açıklama"
    value: "a short grammar explanation with examples"
  - id: "vocab"
    label:
      en: "Vocabulary practice"
      tr: "Kelime çalışması"
    value: "vocabulary practice in context"
  - id: "writing"
    label:
      en: "Correct my writing"
      tr: "Yazımı düzelt"
    value: "correction of the learner's writing"
  - id: "phrases"
    label:
      en: "Useful phrases"
      tr: "Faydalı kalıplar"
    value: "useful phrases for a situation"
  default: "infer"
- id: "scenario"
  impact: "medium"
  question:
    en: "Which situation?"
    tr: "Hangi durum?"
  options:
  - id: "cafe"
    label:
      en: "Café or restaurant"
      tr: "Kafe / restoran"
    value: "ordering at a café or restaurant"
  - id: "interview"
    label:
      en: "Job interview"
      tr: "İş görüşmesi"
    value: "a job interview"
  - id: "travel"
    label:
      en: "Airport or hotel"
      tr: "Havalimanı / otel"
    value: "an airport or hotel"
  - id: "smalltalk"
    label:
      en: "Small talk"
      tr: "Sohbet"
    value: "small talk with a new acquaintance"
  - id: "meeting"
    label:
      en: "Work meeting"
      tr: "İş toplantısı"
    value: "a work meeting"
  default: "infer"
- id: "correction"
  impact: "medium"
  question:
    en: "How to correct mistakes?"
    tr: "Hatalar nasıl düzeltilsin?"
  options:
  - id: "inline"
    label:
      en: "After each message"
      tr: "Her mesajdan sonra"
    value: "correct mistakes after each learner message, briefly"
  - id: "end"
    label:
      en: "At the end"
      tr: "Sonunda topluca"
    value: "collect corrections and show them at the end of the conversation"
  - id: "major"
    label:
      en: "Only major mistakes"
      tr: "Yalnız büyük hatalar"
    value: "correct only mistakes that block understanding"
  default: "inline"
- id: "support"
  impact: "medium"
  question:
    en: "Which language for explanations?"
    tr: "Açıklama dili?"
  options:
  - id: "mine"
    label:
      en: "My language"
      tr: "Benim dilim"
    value: "explain in the learner's own language"
  - id: "target"
    label:
      en: "Target language only"
      tr: "Sadece hedef dil"
    value: "use only the target language with simple words"
  - id: "mixed"
    label:
      en: "Mixed"
      tr: "Karışık"
    value: "use the target language and add short explanations in the learner's language when needed"
  default: "mixed"
- id: "pace"
  impact: "low"
  question:
    en: "Pace?"
    tr: "Tempo?"
  options:
  - id: "slow"
    label:
      en: "Slow"
      tr: "Yavaş"
    value: "slow and simple"
  - id: "normal"
    label:
      en: "Normal"
      tr: "Normal"
    value: "natural pace"
  default: "slow"
refinements:
- id: "easier"
  label:
    en: "Easier"
    tr: "Daha kolay"
  patch:
    pace: "slow and simple"
- id: "end-corrections"
  label:
    en: "Corrections at the end"
    tr: "Düzeltmeler sonda"
  patch:
    correction: "collect corrections and show them at the end of the conversation"
- id: "inline-corrections"
  label:
    en: "Correct as we go"
    tr: "Hemen düzelt"
  patch:
    correction: "correct mistakes after each learner message, briefly"
- id: "target-only"
  label:
    en: "Target language only"
    tr: "Sadece hedef dil"
  patch:
    support: "use only the target language with simple words"
- id: "interview"
  label:
    en: "Job interview"
    tr: "İş görüşmesi"
  patch:
    scenario: "a job interview"
- id: "cafe"
  label:
    en: "Café"
    tr: "Kafe"
  patch:
    scenario: "ordering at a café or restaurant"
- id: "vocab"
  label:
    en: "Vocabulary list"
    tr: "Kelime listesi"
  instruction: "End with a short list of the new words and phrases used, with simple example sentences."
- id: "quiz"
  label:
    en: "Mini quiz"
    tr: "Mini sınav"
  instruction: "End with a short quiz of a few questions on the new words and phrases."
checklist: ["Target language and level", "Goal and situation", "One practice mode", "How mistakes are corrected", "Language of explanations", "Short turns, one question at a time", "Summary of new words at the end"]
validators:
- id: "length"
  type: "maxLength"
  value: 3000
  message: "RouteAI limit: keep the prompt under 3000 characters."
- id: "no-braces"
  type: "regex"
  value: "^(?![\\s\\S]*(\\{\\{|\\}\\}))[\\s\\S]*$"
  message: "Remove unfilled {{placeholders}}; write the real content or a [clearly marked placeholder]."
---

## Sözdizimi

Üç resmî rehberin (OpenAI, Anthropic, Google) ortak önerisi: net ve belirli yaz; amacı, kitleyi ve çıktı biçimini söyle; bağlamı ayrı bir blokta ver; kısıtları "yap" diliyle yaz; stil önemliyse örnek ekle. Kural: bir iş arkadaşına verdiğinde kafası karışacak prompt yapay zekâyı da şaşırtır.

Dil öğrenme promptu bir PRATİK ORTAMI tanımlar. Sıra: (1) rol ("sabırlı bir dil partnerisin"), (2) hedef dil ve seviye, (3) hedef (seyahat, iş, sınav), (4) pratik türü ve durum, (5) hata düzeltme biçimi, (6) açıklama dili ve tempo.

- Konuşma pratiğinde her seferinde KISA tur ve tek soru iste; uzun monologlar öğrenciyi geride bırakır.
- Seviyeyi açık yaz; yapay zekânın cümle uzunluğunu ve kelime düzeyini ona göre ayarlamasını iste.
- Hata düzeltme biçimini seç: her mesajdan sonra, sonda topluca ya da yalnızca anlamayı engelleyenler.
- Telaffuz için yazıyla sınırlı kalındığını bil: sesli kalıpları yazıya dökmek yerine okunuş ipucu iste, ses doğrulaması uydurma.
- Dil/kültür bilgisi emin değilse "emin değilim" demesini iste.

## Şablon

Sen sabırlı bir [hedef dil] konuşma partnerisin. Öğrenci seviyesi: [seviye]. Hedef: [hedef]. Pratik: [pratik türü], durum: [durum]. Kurallar: kısa konuş ve her seferinde tek soru sor; seviyeye uygun basit kelime kullan; hataları [düzeltme biçimi]; açıklamaları [dil] yap; sonda yeni kelimeleri örnek cümlelerle listele.

## Yap / Yapma

**Yap**
- Hedef dili ve seviyeyi net yaz.
- Durumu (kafe, iş görüşmesi) seç; gerçekçi bir senaryo kur.
- Hata düzeltme biçimini belirt.
- Kısa tur ve tek soru iste.

**Yapma**
- Seviyeyi söylemeden bırakma; fazla zor ya da fazla kolay olur.
- Uzun ders anlatımı isteyip konuşma pratiğini kaybetme.
- Telaffuz doğrulaması iddia ettirme.
- Aynı oturumda birden çok dili karıştırma.

## Örnekler

**Örnek 1 — iş görüşmesi:** "İngilizce iş görüşmesi pratiği"

```
Sen sabırlı bir İngilizce konuşma partnerisin. Seviyem: orta. Hedefim: iş. Pratik: iş görüşmesi rol oyunu; sen işe alımcı ol. Kurallar: kısa konuş ve her seferinde tek soru sor; basit ve doğal cümleler kur; hatalarımı görüşme bitince topluca göster; açıklamaları Türkçe yap, sorular İngilizce olsun. Sonda yeni kelimeleri örnek cümlelerle listele.
```

**Örnek 2 — yazı düzeltme:** "Almanca yazdığım e-postayı düzelt"

```
Sen sabırlı bir Almanca öğretmenisin. Seviyem: başlangıç. Aşağıdaki Almanca e-postamı düzelt. Önce düzeltilmiş metni ver, sonra her hatayı kısa bir açıklamayla Türkçe listele. Bir sonraki adımda benden aynı cümleyi kendim yeniden yazmamı iste.

[Metin]
```

Örnekler Türkçe yazıldı; prompt her zaman kullanıcının dilinde yazılır.

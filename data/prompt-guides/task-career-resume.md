---
# TASLAK — reviewedBy boş. Görev şablonu: araca özel sözdizimi içermez, hiçbir araca bağlı değildir.
# Araca özel rehberi olmayan HER araçta, "career.resume" işi için kullanılır (lib/promptBuilder/fallback.ts).
id: "task-career-resume"
version: 1
appliesTo: []
tasks: ["career.resume"]
modality: "text"
promptLanguage: "user"
sources: ["https://developers.openai.com/api/docs/guides/prompt-engineering", "https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices", "https://ai.google.dev/gemini-api/docs/prompting-strategies"]
reviewedBy: ""
reviewedAt: ""
slots:
- id: "need"
  impact: "high"
  question:
    en: "What do you need?"
    tr: "Neye ihtiyacın var?"
  options:
  - id: "tailor"
    label:
      en: "Tailor my CV to a job posting"
      tr: "CV'mi ilana göre uyarlamak"
    value: "tailor the resume to the job posting"
  - id: "bullets"
    label:
      en: "Rewrite my bullet points"
      tr: "Madde cümlelerini güçlendirmek"
    value: "rewrite the experience bullet points to show impact"
  - id: "summary"
    label:
      en: "Write a profile summary"
      tr: "Profil özeti yazmak"
    value: "write a short professional summary"
  - id: "new"
    label:
      en: "Build a CV from scratch"
      tr: "Sıfırdan CV hazırlamak"
    value: "build a resume from the information provided"
  - id: "review"
    label:
      en: "Review my CV"
      tr: "CV'mi gözden geçirmek"
    value: "review the resume and point out what to improve"
  default: "infer"
- id: "level"
  impact: "high"
  question:
    en: "Your career stage?"
    tr: "Kariyer aşaman?"
  options:
  - id: "student"
    label:
      en: "Student or new graduate"
      tr: "Öğrenci / yeni mezun"
    value: "a student or new graduate"
  - id: "mid"
    label:
      en: "Mid-level"
      tr: "Orta kıdem"
    value: "a mid-level professional"
  - id: "senior"
    label:
      en: "Senior"
      tr: "Kıdemli"
    value: "a senior professional"
  - id: "switch"
    label:
      en: "Career changer"
      tr: "Kariyer değiştiren"
    value: "a career changer"
  default: "infer"
- id: "facts"
  impact: "high"
  question:
    en: "How should facts be handled?"
    tr: "Bilgiler nasıl ele alınsın?"
  options:
  - id: "only-mine"
    label:
      en: "Only what I wrote"
      tr: "Yalnız yazdıklarım"
    value: "use only the experience, skills, numbers and dates the user provided; never invent achievements, metrics, employers or dates"
  - id: "ask"
    label:
      en: "Only what I wrote, ask me for gaps"
      tr: "Yazdıklarım, eksikleri bana sor"
    value: "use only the facts the user provided; when a result, number or date is missing, list it as a question for the user instead of filling it in"
  default: "only-mine"
- id: "format"
  impact: "medium"
  question:
    en: "Which format?"
    tr: "Hangi biçim?"
  options:
  - id: "ats"
    label:
      en: "ATS-friendly, simple"
      tr: "ATS uyumlu, sade"
    value: "a simple single-column, ATS-friendly layout with standard section names"
  - id: "chrono"
    label:
      en: "Reverse-chronological"
      tr: "Ters kronolojik"
    value: "reverse-chronological"
  - id: "skills"
    label:
      en: "Skills-based"
      tr: "Beceri odaklı"
    value: "skills-based with a prominent skills section"
  default: "ats"
- id: "length"
  impact: "medium"
  question:
    en: "Length?"
    tr: "Uzunluk?"
  options:
  - id: "one"
    label:
      en: "One page"
      tr: "Tek sayfa"
    value: "one page"
  - id: "two"
    label:
      en: "Two pages"
      tr: "İki sayfa"
    value: "two pages"
  default: "one"
- id: "keywords"
  impact: "medium"
  question:
    en: "Keywords from the posting?"
    tr: "İlandaki anahtar kelimeler?"
  options:
  - id: "true"
    label:
      en: "Only where true for me"
      tr: "Yalnız doğruysa"
    value: "mirror the posting's wording only where it truthfully describes the user's experience"
  - id: "none"
    label:
      en: "Not needed"
      tr: "Gerekmez"
    value: "no keyword matching"
  default: "true"
- id: "tone"
  impact: "low"
  question:
    en: "Tone?"
    tr: "Ton?"
  options:
  - id: "professional"
    label:
      en: "Professional"
      tr: "Profesyonel"
    value: "professional"
  - id: "confident"
    label:
      en: "Confident"
      tr: "Kendinden emin"
    value: "confident and concrete"
  - id: "simple"
    label:
      en: "Plain"
      tr: "Sade"
    value: "plain and simple"
  default: "professional"
refinements:
- id: "one-page"
  label:
    en: "One page"
    tr: "Tek sayfa"
  patch:
    length: "one page"
- id: "ats"
  label:
    en: "ATS-friendly"
    tr: "ATS uyumlu"
  patch:
    format: "a simple single-column, ATS-friendly layout with standard section names"
- id: "impact"
  label:
    en: "Show more impact"
    tr: "Etkiyi öne çıkar"
  instruction: "Rewrite bullets in the form action verb + what you did + result, using only results the user gave; ask the user for missing results."
- id: "confident"
  label:
    en: "More confident"
    tr: "Daha kendinden emin"
  patch:
    tone: "confident and concrete"
- id: "skills"
  label:
    en: "Skills-based"
    tr: "Beceri odaklı"
  patch:
    format: "skills-based with a prominent skills section"
- id: "summary"
  label:
    en: "Add a summary"
    tr: "Özet ekle"
  instruction: "Start with a three-line professional summary built only from the facts given."
- id: "questions"
  label:
    en: "Ask me for gaps"
    tr: "Eksikleri sorsun"
  instruction: "List the missing details (results, dates, tools) as questions for the user instead of filling them in."
- id: "keywords"
  label:
    en: "Match the posting"
    tr: "İlana uydur"
  patch:
    keywords: "mirror the posting's wording only where it truthfully describes the user's experience"
checklist: ["Target role named", "Only the user's real experience, skills, numbers and dates", "No invented metrics or employers", "Strong action verbs and results from the user's facts", "Posting keywords only where true", "Simple layout with standard section names", "Missing results asked as questions"]
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

CV promptunun KIRMIZI ÇİZGİSİ: kullanıcının yazmadığı deneyim, rakam, işveren, unvan veya tarih ASLA uydurulmaz. Bu kural olmadan yapay zekâ "etkileyici" ama yalan CV yazar.

Sıra: (1) görev (ilana uyarla, madde güçlendir, özet yaz), (2) hedef rol ve ilan metni (ayrı blok), (3) kullanıcının mevcut CV'si/bilgileri (ayrı blok), (4) kariyer aşaması, (5) biçim ve uzunluk, (6) bilgi kuralı.

- Madde cümleleri: eylem fiili + ne yaptın + sonuç. Sonuç/rakam yalnızca kullanıcı verdiyse yazılır; yoksa yapay zekâ kullanıcıya sorar.
- İlan anahtar kelimelerini yalnızca kullanıcının deneyimi gerçekten karşılıyorsa kullan.
- Sade, tek sütun, standart bölüm adları (Deneyim, Eğitim, Beceriler) ATS programlarında daha güvenlidir; tablo ve süslü düzenlerden kaçın.
- Çıktı bir TASLAKTIR; kullanıcı tüm bilgileri kendisi doğrulamalıdır.

## Şablon

Görev: [CV görevi]. Hedef rol: [rol]. İlan metni: [ilan]. Mevcut bilgilerim: [CV / deneyim]. Aşama: [aşama]. Biçim: [biçim], uzunluk: [uzunluk]. Kurallar: yalnızca verdiğim deneyim, beceri, rakam ve tarihleri kullan; başarı, rakam, işveren ya da unvan uydurma; eksik sonuçları bana soru olarak listele; ilan sözcüklerini yalnızca benim için doğruysa kullan.

## Yap / Yapma

**Yap**
- Hedef rolü ve ilanı ver.
- Mevcut bilgileri eksiksiz yapıştır.
- "Uydurma yok, eksikleri sor" kuralını yaz.
- Sade ve standart biçim iste.

**Yapma**
- Rakam, başarı, unvan, işveren ya da mezuniyet bilgisi uydurtma.
- Sahip olmadığın beceriyi ilana uysun diye yazdırma.
- Fotoğraf, tablo ve süslü düzen isteme (ATS sorun çıkarabilir).
- Sonucu doğrulamadan göndermeyi önermesine izin verme.

## Örnekler

**Örnek 1 — ilana uyarlama:** "Pazarlama uzmanı ilanına CV'mi uyarla"

```
Görev: CV'mi aşağıdaki ilana uyarla. Hedef rol: dijital pazarlama uzmanı. Aşama: orta kıdem. Biçim: sade, tek sütun, ATS uyumlu; uzunluk: tek sayfa. Kurallar: yalnızca CV'mde yazan deneyim, beceri, rakam ve tarihleri kullan; hiçbir başarı, rakam, işveren ya da unvan uydurma; ilandaki sözcükleri yalnızca benim için doğruysa kullan; bir madde için sonuç eksikse bana soru olarak listele.

İlan: [ilan metni]
CV'm: [mevcut CV]
```

**Örnek 2 — madde güçlendirme:** "Deneyim cümlelerim zayıf"

```
Aşağıdaki deneyim maddelerimi "eylem fiili + ne yaptım + sonuç" biçiminde yeniden yaz. Sonuç ve rakamları yalnızca ben verdiysem ekle; vermediysem her madde için sana sormam gereken soruyu listele. Yeni bilgi, rakam ya da unvan uydurma.

[Maddelerim]
```

Örnekler Türkçe yazıldı; prompt her zaman kullanıcının dilinde yazılır.

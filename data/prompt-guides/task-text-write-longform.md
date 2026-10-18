---
# TASLAK — reviewedBy boş. Görev şablonu: araca özel sözdizimi içermez, hiçbir araca bağlı değildir.
# Araca özel rehberi olmayan HER araçta, "text.write-longform" işi için kullanılır (lib/promptBuilder/fallback.ts).
id: "task-text-write-longform"
version: 1
appliesTo: []
tasks: ["text.write-longform"]
modality: "text"
promptLanguage: "user"
sources: ["https://developers.openai.com/api/docs/guides/prompt-engineering", "https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices", "https://ai.google.dev/gemini-api/docs/prompting-strategies"]
reviewedBy: ""
reviewedAt: ""
slots:
- id: "kind"
  impact: "high"
  question:
    en: "What kind of text?"
    tr: "Nasıl bir metin?"
  options:
  - id: "blog"
    label:
      en: "Blog post"
      tr: "Blog yazısı"
    value: "a blog post"
  - id: "article"
    label:
      en: "Article"
      tr: "Makale"
    value: "an article"
  - id: "story"
    label:
      en: "Story"
      tr: "Hikâye"
    value: "a story"
  - id: "script"
    label:
      en: "Script"
      tr: "Senaryo"
    value: "a script"
  - id: "essay"
    label:
      en: "Essay"
      tr: "Deneme"
    value: "an essay"
  - id: "newsletter"
    label:
      en: "Newsletter"
      tr: "Bülten"
    value: "a newsletter"
  default: "infer"
- id: "audience"
  impact: "high"
  question:
    en: "Who will read it?"
    tr: "Kim okuyacak?"
  options:
  - id: "general"
    label:
      en: "General readers"
      tr: "Genel okur"
    value: "general readers"
  - id: "beginners"
    label:
      en: "Beginners"
      tr: "Yeni başlayanlar"
    value: "beginners with no background"
  - id: "experts"
    label:
      en: "Experts"
      tr: "Uzmanlar"
    value: "experts in the field"
  - id: "customers"
    label:
      en: "Customers"
      tr: "Müşteriler"
    value: "potential customers"
  - id: "students"
    label:
      en: "Students"
      tr: "Öğrenciler"
    value: "students"
  default: "infer"
- id: "purpose"
  impact: "high"
  question:
    en: "What should the text do?"
    tr: "Metin ne yapsın?"
  options:
  - id: "inform"
    label:
      en: "Inform"
      tr: "Bilgilendirsin"
    value: "inform"
  - id: "persuade"
    label:
      en: "Persuade"
      tr: "İkna etsin"
    value: "persuade"
  - id: "entertain"
    label:
      en: "Entertain"
      tr: "Eğlendirsin"
    value: "entertain"
  - id: "teach"
    label:
      en: "Teach step by step"
      tr: "Adım adım öğretsin"
    value: "teach step by step"
  - id: "inspire"
    label:
      en: "Inspire"
      tr: "İlham versin"
    value: "inspire"
  default: "infer"
- id: "tone"
  impact: "medium"
  question:
    en: "Which tone?"
    tr: "Hangi ton?"
  options:
  - id: "formal"
    label:
      en: "Formal"
      tr: "Resmî"
    value: "formal"
  - id: "professional"
    label:
      en: "Professional"
      tr: "Profesyonel"
    value: "professional"
  - id: "friendly"
    label:
      en: "Friendly"
      tr: "Samimi"
    value: "friendly and warm"
  - id: "persuasive"
    label:
      en: "Persuasive"
      tr: "İkna edici"
    value: "persuasive"
  - id: "neutral"
    label:
      en: "Neutral, factual"
      tr: "Nötr, bilgilendirici"
    value: "neutral and factual"
  default: "infer"
- id: "structure"
  impact: "medium"
  question:
    en: "How should it be structured?"
    tr: "Nasıl bir yapı?"
  options:
  - id: "headings"
    label:
      en: "Title, headings, short sections"
      tr: "Başlık, ara başlıklar, kısa bölümler"
    value: "a clear title with headings and short sections"
  - id: "flowing"
    label:
      en: "Flowing prose"
      tr: "Akıcı düz metin"
    value: "flowing prose without headings"
  - id: "steps"
    label:
      en: "Step-by-step guide"
      tr: "Adım adım rehber"
    value: "a step-by-step guide"
  - id: "list"
    label:
      en: "List format"
      tr: "Liste biçimi"
    value: "a numbered list article"
  - id: "narrative"
    label:
      en: "Narrative arc"
      tr: "Anlatı akışı"
    value: "a narrative with a beginning, middle and end"
  default: "infer"
- id: "length"
  impact: "medium"
  question:
    en: "How long?"
    tr: "Ne kadar uzun?"
  options:
  - id: "short"
    label:
      en: "Short"
      tr: "Kısa"
    value: "short"
  - id: "medium"
    label:
      en: "Medium"
      tr: "Orta"
    value: "medium length"
  - id: "long"
    label:
      en: "Long and detailed"
      tr: "Uzun ve ayrıntılı"
    value: "long and detailed"
  default: "infer"
- id: "facts"
  impact: "medium"
  question:
    en: "How should facts be handled?"
    tr: "Bilgiler nasıl ele alınsın?"
  options:
  - id: "mine"
    label:
      en: "Only my facts"
      tr: "Yalnız verdiğim bilgiler"
    value: "use only the facts the user provided and mark missing facts as [placeholders]"
  - id: "general"
    label:
      en: "General knowledge, no invented data"
      tr: "Genel bilgi, uydurma veri yok"
    value: "use well-known general knowledge and never invent statistics, quotes or sources"
  default: "general"
- id: "seo"
  impact: "low"
  question:
    en: "Should it be optimized for search?"
    tr: "Arama motoru için optimize edilsin mi?"
  options:
  - id: "no"
    label:
      en: "No"
      tr: "Hayır"
    value: "no search optimization"
  - id: "yes"
    label:
      en: "Yes, one main keyword"
      tr: "Evet, tek ana anahtar kelime"
    value: "use one main keyword naturally in the title, first paragraph and headings"
  default: "no"
refinements:
- id: "shorter"
  label:
    en: "Shorter"
    tr: "Daha kısa"
  patch:
    length: "short"
- id: "longer"
  label:
    en: "More detail"
    tr: "Daha ayrıntılı"
  patch:
    length: "long and detailed"
- id: "hook"
  label:
    en: "Stronger opening"
    tr: "Daha güçlü giriş"
  instruction: "Open with a strong hook (a concrete scene, a question or a surprising true fact the user provided) and end with a clear closing thought."
- id: "friendly"
  label:
    en: "Friendlier"
    tr: "Daha samimi"
  patch:
    tone: "friendly and warm"
- id: "formal"
  label:
    en: "More formal"
    tr: "Daha resmî"
  patch:
    tone: "formal"
- id: "headings"
  label:
    en: "Add headings"
    tr: "Başlık ekle"
  patch:
    structure: "a clear title with headings and short sections"
- id: "examples"
  label:
    en: "Add examples"
    tr: "Örnek ekle"
  instruction: "Add one concrete example or short story to each main section, using only details the user gave or clearly marked [placeholders]."
- id: "outline"
  label:
    en: "Outline first"
    tr: "Önce taslak"
  instruction: "Ask the AI to give an outline first and wait for approval before writing the full text."
checklist: ["Kind of text and length stated", "Reader and goal stated", "Tone or voice stated", "Structure stated", "User facts kept exactly", "No invented statistics, quotes or sources", "Output format stated"]
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

Uzun metin promptunun sırası: (1) rol ve amaç ("bu metin okuru X yapsın"), (2) metin türü ve uzunluk, (3) kitle, (4) ton/ses, (5) yapı (başlıklar, bölümler), (6) bağlam bloğu: kullanıcının verdiği konu, bilgi, anahtar noktalar (ayrı satırlarda ya da etiketlerle), (7) kısıtlar (yapılacaklar), (8) çıktı biçimi.

- Kullanıcının verdiği adları, rakamları, alıntıları AYNEN koru; vermediği istatistik, alıntı ve kaynak uydurma. Bilgi eksikse [yer tutucu] kullan.
- Uzun işlerde önce taslak (outline) isteyip onayladıktan sonra yazdırmak sapmayı azaltır.
- Üslup önemliyse kullanıcının verdiği örnek bir paragrafı tarif et: "bu örnekteki gibi kısa cümleler".
- Sonu açık bırak: "bitirdiğinde ana fikri tek cümleyle özetle" gibi bir kapanış kuralı ekle.

## Şablon

Sen [rol: deneyimli içerik yazarı]. Görev: [kitle] için, [amaç] amaçlı [metin türü] yaz. Ton: [ton]. Uzunluk: [uzunluk]. Yapı: [yapı]. Bağlam: [kullanıcının konusu ve bilgileri]. Kurallar: verilen bilgileri aynen kullan; olmayan istatistik, alıntı, kaynak yazma; eksik bilgiyi [yer tutucu] ile işaretle. Çıktı: yalnızca metin.

## Yap / Yapma

**Yap**
- Kitleyi ve amacı ilk cümlelerde söyle.
- Yapıyı (başlık, bölüm sayısı, giriş-gelişme-sonuç) açıkça yaz.
- Uzun isteklerde önce taslak, sonra metin iste.
- Kullanıcı verdiyse anahtar kelimeyi doğal biçimde başlıkta ve ilk paragrafta kullan.

**Yapma**
- "Hiçbir şeyi uydurma" yerine "yalnızca verilen bilgiyi kullan, eksikleri [yer tutucu] yap" de.
- Gerçek kişi adına uydurma alıntı ya da yorum yazdırma.
- Aynı promptta birbirine zıt tonlar isteme (hem resmî hem esprili).
- Uzunluğu belirsiz bırakma ("biraz uzun").

## Örnekler

**Örnek 1 — blog:** "Evde kahve demleme üzerine blog yazısı"

```
Sen deneyimli bir kahve yazarısın. Evde kahve demlemeye yeni başlayanlar için bilgilendirici bir blog yazısı yaz. Ton: samimi ve sade. Uzunluk: orta. Yapı: başlık, 4-5 ara başlık, kısa bölümler, sonda tek paragraflık özet. Yazı şunları kapsasın: kahve çekirdeği seçimi, öğütme boyutu, su sıcaklığı, demleme yöntemi seçimi. Kurallar: kesin sayı, istatistik ya da kaynak uydurma; emin olmadığın bilgiyi genel bir ifadeyle ver. Çıktı: yalnızca yazı.
```

**Örnek 2 — kısa hikâye:** "Çocuklar için deniz fenerinde geçen bir hikâye"

```
Sekiz-on yaş çocukları için eğlendirici, sıcak bir kısa hikâye yaz. Mekân: küçük bir deniz feneri. Ana karakter: merak eden bir fener bekçisi kızı. Anlatı: net bir başlangıç, küçük bir sorun, nazik bir çözüm. Dil: basit, kısa cümleler, canlı betimlemeler. Korkutucu öğe yok. Uzunluk: kısa. Sonunda tek cümlelik bir güzel söz.
```

Örnekler Türkçe yazıldı; prompt her zaman kullanıcının dilinde yazılır.

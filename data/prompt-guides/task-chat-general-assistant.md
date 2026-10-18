---
# TASLAK — reviewedBy boş. Görev şablonu: araca özel sözdizimi içermez, hiçbir araca bağlı değildir.
# Araca özel rehberi olmayan HER araçta, "chat.general-assistant" işi için kullanılır (lib/promptBuilder/fallback.ts).
id: "task-chat-general-assistant"
version: 1
appliesTo: []
tasks: ["chat.general-assistant"]
modality: "text"
promptLanguage: "user"
sources: ["https://developers.openai.com/api/docs/guides/prompt-engineering", "https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices", "https://ai.google.dev/gemini-api/docs/prompting-strategies"]
reviewedBy: ""
reviewedAt: ""
slots:
- id: "request"
  impact: "high"
  question:
    en: "What do you want from the assistant?"
    tr: "Asistandan ne istiyorsun?"
  options:
  - id: "explain"
    label:
      en: "Explain something"
      tr: "Bir şeyi açıklasın"
    value: "explain a topic"
  - id: "advise"
    label:
      en: "Help me decide"
      tr: "Karar vermeme yardım etsin"
    value: "help the user decide between options"
  - id: "brainstorm"
    label:
      en: "Brainstorm ideas"
      tr: "Fikir üretsin"
    value: "brainstorm ideas"
  - id: "plan"
    label:
      en: "Make a plan"
      tr: "Plan yapsın"
    value: "make a practical plan"
  - id: "analyze"
    label:
      en: "Analyze something"
      tr: "Bir şeyi analiz etsin"
    value: "analyze the situation or material provided"
  - id: "write"
    label:
      en: "Write something"
      tr: "Bir şey yazsın"
    value: "write a piece of text"
  default: "infer"
- id: "role"
  impact: "high"
  question:
    en: "Which role should it take?"
    tr: "Hangi rolde olsun?"
  options:
  - id: "expert"
    label:
      en: "Subject expert"
      tr: "Alan uzmanı"
    value: "an expert in the subject"
  - id: "coach"
    label:
      en: "Coach or mentor"
      tr: "Koç / mentor"
    value: "a supportive coach"
  - id: "editor"
    label:
      en: "Critical editor"
      tr: "Eleştirel editör"
    value: "a critical editor"
  - id: "analyst"
    label:
      en: "Analyst"
      tr: "Analist"
    value: "a careful analyst"
  - id: "friend"
    label:
      en: "Friendly explainer"
      tr: "Samimi anlatıcı"
    value: "a friendly explainer"
  default: "infer"
- id: "format"
  impact: "high"
  question:
    en: "Which answer format?"
    tr: "Cevap biçimi?"
  options:
  - id: "prose"
    label:
      en: "Short paragraphs"
      tr: "Kısa paragraflar"
    value: "short plain paragraphs"
  - id: "bullets"
    label:
      en: "Bullet points"
      tr: "Madde madde"
    value: "bullet points"
  - id: "steps"
    label:
      en: "Numbered steps"
      tr: "Numaralı adımlar"
    value: "numbered steps"
  - id: "table"
    label:
      en: "A table"
      tr: "Tablo"
    value: "a table"
  - id: "proscons"
    label:
      en: "Pros and cons"
      tr: "Artılar ve eksiler"
    value: "pros and cons for each option"
  default: "infer"
- id: "depth"
  impact: "medium"
  question:
    en: "How deep?"
    tr: "Ne kadar derin?"
  options:
  - id: "quick"
    label:
      en: "Quick answer"
      tr: "Hızlı cevap"
    value: "a quick, direct answer"
  - id: "standard"
    label:
      en: "Clear and complete"
      tr: "Açık ve eksiksiz"
    value: "a clear and complete answer"
  - id: "deep"
    label:
      en: "In depth"
      tr: "Derinlemesine"
    value: "an in-depth answer"
  default: "standard"
- id: "audience"
  impact: "medium"
  question:
    en: "Explain it for whom?"
    tr: "Kime anlatılsın?"
  options:
  - id: "beginner"
    label:
      en: "A beginner"
      tr: "Yeni başlayan"
    value: "a complete beginner"
  - id: "general"
    label:
      en: "General audience"
      tr: "Genel kitle"
    value: "a general audience"
  - id: "expert"
    label:
      en: "An expert"
      tr: "Uzman"
    value: "an expert"
  default: "general"
- id: "questions"
  impact: "medium"
  question:
    en: "Should it ask questions first?"
    tr: "Önce soru sorsun mu?"
  options:
  - id: "no"
    label:
      en: "No, answer directly"
      tr: "Hayır, direkt cevaplasın"
    value: "answer directly, stating any assumptions"
  - id: "yes"
    label:
      en: "Yes, if information is missing"
      tr: "Evet, bilgi eksikse"
    value: "ask up to three short clarifying questions first if key information is missing"
  default: "no"
- id: "honesty"
  impact: "medium"
  question:
    en: "When it is unsure?"
    tr: "Emin olmadığında?"
  options:
  - id: "say"
    label:
      en: "Say so clearly"
      tr: "Açıkça söylesin"
    value: "say clearly when unsure and separate facts from guesses; never invent facts, numbers or sources"
  - id: "mark"
    label:
      en: "Mark confidence per point"
      tr: "Her noktada güven düzeyi yazsın"
    value: "mark each key point as well established, likely or uncertain; never invent facts, numbers or sources"
  default: "say"
- id: "tone"
  impact: "low"
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
  default: "neutral"
refinements:
- id: "shorter"
  label:
    en: "Shorter"
    tr: "Daha kısa"
  patch:
    depth: "a quick, direct answer"
- id: "deeper"
  label:
    en: "In more depth"
    tr: "Daha derin"
  patch:
    depth: "an in-depth answer"
- id: "table"
  label:
    en: "As a table"
    tr: "Tablo olarak"
  patch:
    format: "a table"
- id: "steps"
  label:
    en: "Step by step"
    tr: "Adım adım"
  patch:
    format: "numbered steps"
- id: "simpler"
  label:
    en: "Simpler"
    tr: "Daha basit"
  patch:
    audience: "a complete beginner"
- id: "questions"
  label:
    en: "Ask me first"
    tr: "Önce bana sorsun"
  patch:
    questions: "ask up to three short clarifying questions first if key information is missing"
- id: "examples"
  label:
    en: "Add examples"
    tr: "Örnek ekle"
  instruction: "Add one concrete example for each main point."
- id: "sources"
  label:
    en: "Mark uncertainty"
    tr: "Belirsizliği işaretle"
  instruction: "Mark which statements are well established and which are uncertain."
checklist: ["Request type stated", "Role or point of view", "Context the user gave, in its own block", "Output format stated", "Depth and audience", "Says what to do when unsure", "No invented facts, numbers or sources"]
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

Genel asistan promptunun iskeleti (OpenAI "Kimlik – Talimat – Örnek – Bağlam" sırasıyla uyumlu): (1) rol ("sen … olarak"), (2) görev (tek cümle), (3) bağlam bloğu (kullanıcının durumu, verdiği veriler, kısıtları), (4) çıktı biçimi ve derinlik, (5) kurallar (emin değilsen söyle, uydurma).

- Görevi emir kipiyle yaz ("karşılaştır", "öner"); "yapabilir misin?" yerine doğrudan iste.
- Bağlamı ve veriyi ayrı bir blokta ver; neyin talimat, neyin veri olduğu karışmasın.
- "Yapma" yerine "yap" dilini tercih et: "madde işareti kullanma" yerine "akıcı paragraflarla yaz".
- Eksik bilgi önemliyse "önce en çok üç kısa soru sor" kuralı ekle; küçük işlerde varsayımı belirtip devam etmesini iste.
- Güvenilirlik kuralı: emin olmadığın yerleri belirt; gerçek ile tahmini ayır; sayı, kaynak ve alıntı uydurma.
- Stili örnekle yönlendirmek istiyorsan 3–5 çeşitli örnek ver (Anthropic rehberi).

## Şablon

Sen [rol]. Görev: [tek cümlelik istek]. Bağlam: [kullanıcının durumu ve verdiği bilgiler]. Kitle: [kitle]. Çıktı: [biçim], [derinlik]. Kurallar: emin olmadığın yerleri açıkça söyle; gerçek ile tahmini ayır; sayı, kaynak ve alıntı uydurma; bilgi eksikse [önce kısa sorular sor / varsayımını belirt].

## Yap / Yapma

**Yap**
- Tek bir net görevle başla; birden çok iş varsa numaralandır.
- Kullanıcının bağlamını aynen aktar.
- Çıktı biçimini ve derinliğini söyle.
- "Bilmiyorsan söyle" kuralını ekle.

**Yapma**
- Çok genel istekle bırakma ("bana yardım et").
- Birbirine zıt kısıtlar (hem çok kısa hem çok ayrıntılı) yazma.
- Kullanıcının vermediği veriyi (rakam, kaynak, alıntı) var sayma.
- Rolü gereksiz abartma; tek cümlelik rol yeter.

## Örnekler

**Örnek 1 — karar:** "Freelance mi tam zamanlı mı çalışayım?"

```
Sen kariyer konusunda dürüst ve dengeli bir danışmansın. Görev: freelance çalışmak ile tam zamanlı çalışmak arasında karar vermeme yardım et. Bağlam: [mevcut durumum, birikimim, sorumluluklarım]. Çıktı: her seçenek için artılar ve eksiler tablosu, ardından kararımı etkileyecek üç soru. Kurallar: bilmediğin bir şeyi tahmin etme, belirsiz yerleri belirt; kesin oran ya da maaş rakamı uydurma.
```

**Örnek 2 — açıklama:** "Enflasyon nedir, sade anlat"

```
Sen sabırlı bir öğretmensin. Enflasyonu yeni başlayan biri için anlat. Çıktı: kısa paragraflar, günlük hayattan bir örnek ve tek cümlelik özet. Dil sade olsun, terimleri ilk geçtiğinde açıkla. Emin olmadığın yerleri belirt.
```

Örnekler Türkçe yazıldı; prompt her zaman kullanıcının dilinde yazılır.

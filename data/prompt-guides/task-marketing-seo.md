---
# TASLAK — reviewedBy boş. Görev şablonu: araca özel sözdizimi içermez, hiçbir araca bağlı değildir.
# Araca özel rehberi olmayan HER araçta, "marketing.seo" işi için kullanılır (lib/promptBuilder/fallback.ts).
id: "task-marketing-seo"
version: 1
appliesTo: []
tasks: ["marketing.seo"]
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
  - id: "article"
    label:
      en: "An article for a keyword"
      tr: "Bir anahtar kelime için makale"
    value: "a full article for the keyword"
  - id: "brief"
    label:
      en: "A content brief / outline"
      tr: "İçerik özeti / taslak"
    value: "a content brief with an outline"
  - id: "meta"
    label:
      en: "Title and meta description"
      tr: "Başlık ve meta açıklama"
    value: "title tags and meta descriptions"
  - id: "ideas"
    label:
      en: "Keyword and topic ideas"
      tr: "Anahtar kelime / konu fikirleri"
    value: "keyword and topic ideas grouped by theme"
  - id: "optimize"
    label:
      en: "Improve an existing text"
      tr: "Mevcut metni iyileştir"
    value: "optimization suggestions for an existing text"
  default: "infer"
- id: "intent"
  impact: "high"
  question:
    en: "What does the searcher want?"
    tr: "Arayan ne istiyor?"
  options:
  - id: "info"
    label:
      en: "Learn something"
      tr: "Bir şey öğrenmek"
    value: "informational: wants to learn"
  - id: "compare"
    label:
      en: "Compare options"
      tr: "Seçenekleri karşılaştırmak"
    value: "commercial: comparing options before buying"
  - id: "buy"
    label:
      en: "Buy or sign up"
      tr: "Satın almak"
    value: "transactional: ready to buy or sign up"
  - id: "find"
    label:
      en: "Find a specific site or place"
      tr: "Belirli bir yeri bulmak"
    value: "navigational or local: looking for a specific place"
  default: "infer"
- id: "audience"
  impact: "high"
  question:
    en: "Who is the reader?"
    tr: "Okuyan kim?"
  options:
  - id: "beginner"
    label:
      en: "Beginners"
      tr: "Yeni başlayanlar"
    value: "beginners"
  - id: "buyers"
    label:
      en: "Buyers"
      tr: "Alıcılar"
    value: "people comparing products or services"
  - id: "pros"
    label:
      en: "Professionals"
      tr: "Profesyoneller"
    value: "professionals"
  - id: "local"
    label:
      en: "Local customers"
      tr: "Yerel müşteriler"
    value: "local customers"
  default: "infer"
- id: "structure"
  impact: "medium"
  question:
    en: "Structure?"
    tr: "Yapı?"
  options:
  - id: "headings"
    label:
      en: "H2/H3 headings"
      tr: "H2/H3 başlıkları"
    value: "a clear H1 with H2 and H3 headings"
  - id: "faq"
    label:
      en: "With an FAQ"
      tr: "SSS ile"
    value: "headings plus a short FAQ section based on real user questions"
  - id: "list"
    label:
      en: "List format"
      tr: "Liste biçimi"
    value: "a list-style article"
  default: "headings"
- id: "keywords"
  impact: "medium"
  question:
    en: "How to use the keyword?"
    tr: "Anahtar kelime nasıl kullanılsın?"
  options:
  - id: "natural"
    label:
      en: "Naturally"
      tr: "Doğal biçimde"
    value: "use the main keyword and close variants naturally in the title, first paragraph and some headings; never stuff keywords"
  - id: "light"
    label:
      en: "Lightly"
      tr: "Hafif"
    value: "use the main keyword once in the title and once in the first paragraph, otherwise write for the reader"
  default: "natural"
- id: "facts"
  impact: "medium"
  question:
    en: "Facts and data?"
    tr: "Bilgi ve veri?"
  options:
  - id: "given"
    label:
      en: "Only what I give"
      tr: "Yalnız verdiklerim"
    value: "use only facts the user provided and mark statistics or claims that need a source as [source needed]"
  - id: "general"
    label:
      en: "General knowledge"
      tr: "Genel bilgi"
    value: "use well-known general knowledge and never invent statistics or sources"
  default: "general"
- id: "tone"
  impact: "medium"
  question:
    en: "Tone?"
    tr: "Ton?"
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
  default: "professional"
- id: "length"
  impact: "low"
  question:
    en: "Length?"
    tr: "Uzunluk?"
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
  default: "long"
refinements:
- id: "faq"
  label:
    en: "Add an FAQ"
    tr: "SSS ekle"
  patch:
    structure: "headings plus a short FAQ section based on real user questions"
- id: "meta"
  label:
    en: "Add title and meta"
    tr: "Başlık ve meta ekle"
  instruction: "Add three title tag options and two meta description options for the page."
- id: "shorter"
  label:
    en: "Shorter"
    tr: "Daha kısa"
  patch:
    length: "short"
- id: "friendly"
  label:
    en: "Friendlier"
    tr: "Daha samimi"
  patch:
    tone: "friendly and warm"
- id: "local"
  label:
    en: "For local customers"
    tr: "Yerel müşteriler için"
  patch:
    audience: "local customers"
- id: "intent"
  label:
    en: "Match search intent"
    tr: "Arama niyetine uydur"
  instruction: "Check that the structure answers the searcher's main question in the first section."
- id: "links"
  label:
    en: "Suggest internal links"
    tr: "İç link öner"
  instruction: "Suggest where internal links could go, using [anchor text] placeholders."
- id: "buyers"
  label:
    en: "For buyers"
    tr: "Alıcılar için"
  patch:
    audience: "people comparing products or services"
checklist: ["Main keyword and search intent", "Reader named", "Structure with headings", "Keyword used naturally, no stuffing", "No invented statistics or sources", "Answers the main question early", "Title and meta description if asked"]
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

SEO içeriği için temel fikir: arayanın NİYETİ (öğrenmek, karşılaştırmak, satın almak, yer bulmak) metnin yapısını belirler. Sıra: (1) ihtiyaç (makale, taslak, meta), (2) ana anahtar kelime ve niyet, (3) okur, (4) yapı (H1 → H2/H3, SSS), (5) anahtar kelime kuralı, (6) bilgi kuralı, (7) ton ve uzunluk.

- Anahtar kelimeyi doğal yerleştir (başlık, ilk paragraf, bazı alt başlıklar); tekrarla doldurma.
- İlk bölümde arayanın ana sorusunu cevapla.
- İstatistik, sıralama iddiası ve kaynak uydurma; gereken yere [kaynak gerekli] yaz.
- SEO araçları (Surfer, Frase) genellikle anahtar kelime ve rakip analizi ister; bu araçlara yazılan prompt bir İÇERİK ÖZETİ gibi olmalı (anahtar kelime, niyet, okur, yapı).

## Şablon

Ana anahtar kelime: "[anahtar kelime]". Arama niyeti: [niyet]. Okur: [okur]. Hazırla: [makale / taslak / meta]. Yapı: [başlıklar, SSS]. Ton: [ton]. Uzunluk: [uzunluk]. Kurallar: anahtar kelimeyi doğal kullan, doldurma yapma; istatistik ve kaynak uydurma, gerekirse [kaynak gerekli] yaz; ilk bölümde arayanın ana sorusunu cevapla.

## Yap / Yapma

**Yap**
- Anahtar kelimeyi ve arama niyetini ilk satırda ver.
- Başlık hiyerarşisini (H1, H2, H3) iste.
- Gerçek kullanıcı soruları için SSS bölümü iste.
- Meta başlık ve açıklamayı ayrıca iste.

**Yapma**
- Anahtar kelimeyi sürekli tekrarlatma.
- Uydurma istatistik ve rakip karşılaştırması iste.
- Sıralama garantisi yazdırma.
- Başka sitenin metnini kopyalatma; özgün yazdır.

## Örnekler

**Örnek 1 — makale:** "Evde bitki yetiştirme" anahtar kelimesi için yazı

```
Ana anahtar kelime: "evde bitki yetiştirme". Arama niyeti: öğrenmek. Okur: yeni başlayanlar. Hazırla: eksiksiz bir blog makalesi. Yapı: H1, 5-6 H2 başlık, gerektiğinde H3, sonda gerçek kullanıcı sorularına dayalı kısa bir SSS. Ton: samimi ve sade. Anahtar kelimeyi başlıkta, ilk paragrafta ve bazı alt başlıklarda doğal kullan; doldurma yapma. İlk bölümde "nereden başlamalıyım?" sorusunu cevapla. İstatistik ve kaynak uydurma; gerekirse [kaynak gerekli] yaz.
```

**Örnek 2 — meta:** "Yerel bir diş kliniği için sayfa başlığı"

```
"[şehir] diş kliniği" anahtar kelimesi için ana sayfaya üç başlık (title) ve iki meta açıklama seçeneği yaz. Niyet: yerel, hizmet arayan. Başlıklar kısa ve net olsun; klinik adı: [klinik adı]. Abartılı vaat ve garanti kullanma; yalnızca verilen bilgileri yaz.
```

Örnekler Türkçe yazıldı; prompt her zaman kullanıcının dilinde yazılır.

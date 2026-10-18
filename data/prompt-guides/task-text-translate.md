---
# TASLAK — reviewedBy boş. Görev şablonu: araca özel sözdizimi içermez, hiçbir araca bağlı değildir.
# Araca özel rehberi olmayan HER araçta, "text.translate" işi için kullanılır (lib/promptBuilder/fallback.ts).
id: "task-text-translate"
version: 1
appliesTo: []
tasks: ["text.translate"]
modality: "text"
promptLanguage: "user"
sources: ["https://developers.openai.com/api/docs/guides/prompt-engineering", "https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices", "https://ai.google.dev/gemini-api/docs/prompting-strategies"]
reviewedBy: ""
reviewedAt: ""
slots:
- id: "register"
  impact: "high"
  question:
    en: "Which register?"
    tr: "Hangi hitap düzeyi?"
  options:
  - id: "formal"
    label:
      en: "Formal"
      tr: "Resmî"
    value: "formal"
  - id: "neutral"
    label:
      en: "Neutral"
      tr: "Nötr"
    value: "neutral"
  - id: "informal"
    label:
      en: "Informal"
      tr: "Samimi"
    value: "informal and conversational"
  default: "infer"
- id: "domain"
  impact: "high"
  question:
    en: "What field is the text from?"
    tr: "Metin hangi alandan?"
  options:
  - id: "general"
    label:
      en: "General"
      tr: "Genel"
    value: "general"
  - id: "business"
    label:
      en: "Business"
      tr: "İş / ticari"
    value: "business"
  - id: "technical"
    label:
      en: "Technical / IT"
      tr: "Teknik / yazılım"
    value: "technical or software"
  - id: "marketing"
    label:
      en: "Marketing"
      tr: "Pazarlama"
    value: "marketing"
  - id: "academic"
    label:
      en: "Academic"
      tr: "Akademik"
    value: "academic"
  - id: "creative"
    label:
      en: "Creative / literary"
      tr: "Yaratıcı / edebî"
    value: "creative or literary"
  - id: "legal"
    label:
      en: "Legal or contractual"
      tr: "Hukuki / sözleşme"
    value: "legal or contractual"
  - id: "medical"
    label:
      en: "Medical"
      tr: "Tıbbi"
    value: "medical"
  default: "infer"
- id: "fidelity"
  impact: "high"
  question:
    en: "How close to the original?"
    tr: "Orijinale ne kadar yakın?"
  options:
  - id: "literal"
    label:
      en: "Close to the original"
      tr: "Orijinale yakın"
    value: "stay close to the original wording and structure"
  - id: "natural"
    label:
      en: "Natural in the target language"
      tr: "Hedef dilde doğal"
    value: "translate for meaning so it reads naturally in the target language"
  - id: "localize"
    label:
      en: "Localize for the audience"
      tr: "Hedef kitleye uyarla"
    value: "localize idioms, units, dates and cultural references for the target audience"
  default: "natural"
- id: "terms"
  impact: "medium"
  question:
    en: "How should names and terms be handled?"
    tr: "Özel ad ve terimler?"
  options:
  - id: "keep"
    label:
      en: "Keep names, brands and code as is"
      tr: "Ad, marka ve kodu olduğu gibi bırak"
    value: "keep personal names, brand names, product names and code unchanged"
  - id: "glossary"
    label:
      en: "Use my glossary"
      tr: "Sözlüğümü kullan"
    value: "use the glossary provided by the user for these terms"
  default: "keep"
- id: "format"
  impact: "medium"
  question:
    en: "Formatting?"
    tr: "Biçim?"
  options:
  - id: "keep"
    label:
      en: "Keep formatting"
      tr: "Biçimi koru"
    value: "keep the original formatting, line breaks, markdown and tags"
  - id: "plain"
    label:
      en: "Plain text"
      tr: "Düz metin"
    value: "plain text output"
  default: "keep"
- id: "variant"
  impact: "medium"
  question:
    en: "Which regional variant?"
    tr: "Hangi bölgesel çeşit?"
  options:
  - id: "standard"
    label:
      en: "Standard"
      tr: "Standart"
    value: "the standard variant of the target language"
  - id: "audience"
    label:
      en: "The audience's region"
      tr: "Kitlenin bölgesi"
    value: "the regional variant that fits the audience"
  default: "standard"
- id: "notes"
  impact: "low"
  question:
    en: "Add translator notes?"
    tr: "Çevirmen notu eklensin mi?"
  options:
  - id: "no"
    label:
      en: "No"
      tr: "Hayır"
    value: "no notes, translation only"
  - id: "ambiguous"
    label:
      en: "Only for ambiguous parts"
      tr: "Yalnız belirsiz yerlerde"
    value: "add a short note after the translation only for ambiguous phrases"
  default: "no"
refinements:
- id: "formal"
  label:
    en: "More formal"
    tr: "Daha resmî"
  patch:
    register: "formal"
- id: "informal"
  label:
    en: "More casual"
    tr: "Daha samimi"
  patch:
    register: "informal and conversational"
- id: "literal"
  label:
    en: "Closer to original"
    tr: "Orijinale yakın"
  patch:
    fidelity: "stay close to the original wording and structure"
- id: "natural"
  label:
    en: "More natural"
    tr: "Daha doğal"
  patch:
    fidelity: "translate for meaning so it reads naturally in the target language"
- id: "localize"
  label:
    en: "Localize"
    tr: "Uyarla"
  patch:
    fidelity: "localize idioms, units, dates and cultural references for the target audience"
- id: "notes"
  label:
    en: "Add notes"
    tr: "Not ekle"
  patch:
    notes: "add a short note after the translation only for ambiguous phrases"
- id: "plain"
  label:
    en: "Plain text"
    tr: "Düz metin"
  patch:
    format: "plain text output"
- id: "alternatives"
  label:
    en: "Two options"
    tr: "İki seçenek"
  instruction: "For the hardest sentences, give two alternative translations and say how they differ."
checklist: ["Source and target language named", "Register stated", "Field stated", "Names, brands, numbers and code kept unchanged", "Formatting kept", "Only the translation returned", "Unclear parts flagged, not guessed"]
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

Çeviri promptu kısa olabilir ama dört şeyi mutlaka söylemelidir: KAYNAK ve HEDEF dil, HİTAP düzeyi (resmî/samimi), ALAN (hukuk, teknik, pazarlama), ne kadar SERBEST olacağı (birebir mi, doğal mı, uyarlama mı).

- Çevrilecek metni ayrı bir blokta, etiketle ya da üç ters tırnakla ver; talimatla karışmasın.
- Özel ad, marka, ürün adı, kod ve sayıları değiştirme kuralı yaz. Biçimi (satır sonu, markdown, etiket) koru de.
- Belirsiz bir ifade varsa tahmin ettirme: "emin değilsen çeviriden sonra kısa bir not düş" kuralı ekle.
- Hukuki, tıbbi ve resmî metinlerde çevirinin bilgi amaçlı olduğunu ve yetkili çeviri gerekebileceğini kullanıcıya `howToUse`ta söyle.
- Çıktıyı sınırla: "yalnızca çeviriyi ver".

## Şablon

Aşağıdaki metni [kaynak dil]'den [hedef dil]'e çevir. Hitap: [hitap]. Alan: [alan]. Yaklaşım: [birebir/doğal/uyarlama]. Kurallar: ad, marka, kod ve sayıları değiştirme; biçimi koru; belirsiz yerleri tahmin etme, çeviriden sonra kısa bir not düş; yalnızca çeviriyi ver.

[Metin]

## Yap / Yapma

**Yap**
- Kaynak ve hedef dili açıkça yaz; bölgesel çeşit önemliyse belirt.
- Metni talimattan ayrı blokta ver.
- Terim sözlüğü varsa ekle.
- Biçimin korunmasını iste.

**Yapma**
- Hitap düzeyini (siz/sen, resmî/samimi) belirtmeden bırakma.
- "İyi çevir" gibi belirsiz bir talimatla yetinme.
- Eksik ya da bozuk metni tamamlattırma; "olduğu gibi çevir, eksik yerleri işaretle" de.
- Sözleşme ve resmî belgelerde çeviriyi yetkili çeviri yerine koyma.

## Örnekler

**Örnek 1 — iş e-postası:** "Müşteriye gidecek e-postayı İngilizceye çevir"

```
Aşağıdaki metni Türkçe'den İngilizce'ye çevir. Hitap: resmî ama sıcak. Alan: iş yazışması. Yaklaşım: hedef dilde doğal okunsun. Kurallar: şirket ve ürün adlarını, sayıları ve tarihleri değiştirme; paragraf düzenini koru; emin olmadığın bir ifade varsa çeviriden sonra kısa bir not düş; yalnızca çeviriyi ver.

[Metin]
```

**Örnek 2 — uygulama metni:** "Mobil uygulama arayüz metinlerini Almancaya çevir"

```
Aşağıdaki arayüz metinlerini İngilizce'den Almanca'ya çevir. Hitap: samimi, "du" hitabı. Alan: mobil uygulama. Düğme metinlerini kısa tut. Yer tutucuları ({name} gibi) ve kodu aynen bırak. Her satırı ayrı satırda çevir, sırayı değiştirme.

[Metinler]
```

Örnekler Türkçe yazıldı; prompt her zaman kullanıcının dilinde yazılır.

---
# TASLAK — reviewedBy boş. Görev şablonu: araca özel sözdizimi içermez, hiçbir araca bağlı değildir.
# Araca özel rehberi olmayan HER araçta, "docs.create" işi için kullanılır (lib/promptBuilder/fallback.ts).
id: "task-docs-create"
version: 1
appliesTo: []
tasks: ["docs.create"]
modality: "text"
promptLanguage: "user"
sources: ["https://developers.openai.com/api/docs/guides/prompt-engineering", "https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices", "https://ai.google.dev/gemini-api/docs/prompting-strategies"]
reviewedBy: ""
reviewedAt: ""
slots:
- id: "doc"
  impact: "high"
  question:
    en: "What kind of document?"
    tr: "Nasıl bir belge?"
  options:
  - id: "report"
    label:
      en: "Report"
      tr: "Rapor"
    value: "a report"
  - id: "proposal"
    label:
      en: "Proposal"
      tr: "Teklif / öneri"
    value: "a proposal"
  - id: "sop"
    label:
      en: "Procedure / how-to"
      tr: "Prosedür / kılavuz"
    value: "a step-by-step procedure"
  - id: "letter"
    label:
      en: "Formal letter"
      tr: "Resmî mektup"
    value: "a formal letter"
  - id: "agenda"
    label:
      en: "Meeting agenda or notes template"
      tr: "Toplantı gündemi / not şablonu"
    value: "a meeting agenda and notes template"
  - id: "form"
    label:
      en: "Checklist or form"
      tr: "Kontrol listesi / form"
    value: "a checklist or form template"
  default: "infer"
- id: "audience"
  impact: "high"
  question:
    en: "Who will read it?"
    tr: "Kim okuyacak?"
  options:
  - id: "internal"
    label:
      en: "My team"
      tr: "Ekibim"
    value: "an internal team"
  - id: "manager"
    label:
      en: "Management"
      tr: "Yönetim"
    value: "management"
  - id: "client"
    label:
      en: "A client"
      tr: "Müşteri"
    value: "a client"
  - id: "public"
    label:
      en: "The public"
      tr: "Kamuoyu"
    value: "the general public"
  - id: "official"
    label:
      en: "An institution"
      tr: "Bir kurum"
    value: "an official institution"
  default: "infer"
- id: "purpose"
  impact: "high"
  question:
    en: "What is it for?"
    tr: "Ne için?"
  options:
  - id: "inform"
    label:
      en: "Inform"
      tr: "Bilgilendirmek"
    value: "inform"
  - id: "decide"
    label:
      en: "Get a decision"
      tr: "Karar çıkarmak"
    value: "get a decision"
  - id: "instruct"
    label:
      en: "Instruct"
      tr: "Talimat vermek"
    value: "give clear instructions"
  - id: "record"
    label:
      en: "Record"
      tr: "Kayıt tutmak"
    value: "keep a record"
  default: "infer"
- id: "structure"
  impact: "medium"
  question:
    en: "Which structure?"
    tr: "Hangi yapı?"
  options:
  - id: "sections"
    label:
      en: "Numbered sections"
      tr: "Numaralı bölümler"
    value: "numbered sections with clear headings"
  - id: "summary-first"
    label:
      en: "Summary first"
      tr: "Önce özet"
    value: "an executive summary first, then details"
  - id: "table"
    label:
      en: "Table-based template"
      tr: "Tablo tabanlı şablon"
    value: "a template built around tables to fill in"
  default: "sections"
- id: "placeholders"
  impact: "medium"
  question:
    en: "Missing details?"
    tr: "Eksik bilgiler?"
  options:
  - id: "brackets"
    label:
      en: "Mark with [brackets]"
      tr: "[köşeli parantezle] işaretle"
    value: "mark every missing detail as a [placeholder] and never invent it"
  - id: "ask"
    label:
      en: "Ask me first"
      tr: "Önce bana sorsun"
    value: "ask up to three short questions about the missing details first, then write the document"
  default: "brackets"
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
  default: "professional"
- id: "length"
  impact: "low"
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
  default: "medium"
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
- id: "formal"
  label:
    en: "More formal"
    tr: "Daha resmî"
  patch:
    tone: "formal"
- id: "summary"
  label:
    en: "Add a summary"
    tr: "Özet ekle"
  patch:
    structure: "an executive summary first, then details"
- id: "table"
  label:
    en: "Use tables"
    tr: "Tablo kullan"
  patch:
    structure: "a template built around tables to fill in"
- id: "checklist"
  label:
    en: "Add a checklist"
    tr: "Kontrol listesi ekle"
  instruction: "Add a short checklist at the end that lets the reader verify the document is complete."
- id: "fields"
  label:
    en: "List the fields to fill"
    tr: "Doldurulacak alanları listele"
  instruction: "List all [placeholders] in one list at the end so the user can fill them in."
- id: "plain"
  label:
    en: "Plainer language"
    tr: "Daha sade dil"
  patch:
    tone: "neutral and factual"
checklist: ["Document type and audience", "Purpose", "Sections in order", "Missing details as [placeholders]", "No invented facts, names, dates or figures", "Tone and length", "Ready to copy into a document"]
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

Belge promptunda yapı en önemli şeydir: bölümleri sırasıyla yaz ya da yapayzekanın önerip onaylatmasını iste. Sıra: (1) belge türü ve kitle, (2) amaç (bilgilendirme, karar, talimat, kayıt), (3) bölümler ve sırası, (4) bağlam bloğu (kullanıcının verdiği bilgi), (5) ton ve uzunluk, (6) eksik bilgi kuralı.

- Kullanıcı vermediği isim, tarih, tutar, mevzuat ve kurum bilgisi uydurulmaz; [yer tutucu] ile işaretlenir ve sonda tek listede toplanır.
- Şablon isteniyorsa doldurulacak alanları belirgin ([ ]) yazdır.
- Resmî ya da hukuki sonuç doğuracak belgelerde (sözleşme, dilekçe) çıktının taslak olduğunu ve gerekirse bir uzmana gösterilmesi gerektiğini `howToUse`ta söyle.

## Şablon

[Belge türü] hazırla. Kitle: [kitle]. Amaç: [amaç]. Bölümler: [bölüm listesi ya da "uygun bölümleri öner"]. Bağlam: [kullanıcının bilgileri]. Ton: [ton]. Uzunluk: [uzunluk]. Kurallar: bilmediğin isim, tarih, tutar ve kurumu uydurma, [yer tutucu] bırak; sonda tüm yer tutucuları listele.

## Yap / Yapma

**Yap**
- Belge türünü ve kitleyi ilk cümlede söyle.
- Bölüm sırasını yaz.
- Eksik bilgileri [yer tutucu] ile işaretlet ve sonda listeletsin.
- Kullanıcının verdiği bilgileri aynen kullan.

**Yapma**
- Kullanıcı vermediği isim, tarih, tutar, yasa maddesi uydurtma.
- Hukuki bağlayıcı sonuç doğuracak metni "nihai" gibi sunma.
- Belirsiz uzunluk bırakma.
- Birden çok farklı belgeyi tek promptta isteme.

## Örnekler

**Örnek 1 — rapor:** "Aylık satış raporu şablonu"

```
Küçük bir ekibin yönetime sunacağı aylık satış raporu için bir şablon hazırla. Amaç: karar çıkarmak. Bölümler: yönetici özeti, ana rakamlar (tablo), bir önceki aya göre değişim, öne çıkan müşteriler, riskler, sonraki ay öncelikleri. Ton: profesyonel ve sade. Doldurulacak tüm alanları [köşeli parantezle] bırak; rakam uydurma. Sonda yer tutucuları tek listede topla.
```

**Örnek 2 — mektup:** "Kira artışı hakkında ev sahibine mektup"

```
Ev sahibine, kira artış önerisi hakkında görüşmek isteyen resmî ama nazik bir mektup taslağı yaz. Bağlam: [kira başlangıcı], [mevcut kira], [ev sahibinin önerisi]. Amaç: görüşme talep etmek. Ton: saygılı. Kısa. Bilgi eksikse [yer tutucu] bırak; hukuki iddia yazma.
```

Örnekler Türkçe yazıldı; prompt her zaman kullanıcının dilinde yazılır.

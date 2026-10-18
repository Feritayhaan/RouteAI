---
# TASLAK — reviewedBy boş. Görev şablonu: araca özel sözdizimi içermez, hiçbir araca bağlı değildir.
# Araca özel rehberi olmayan HER araçta, "text.rewrite-edit" işi için kullanılır (lib/promptBuilder/fallback.ts).
id: "task-text-rewrite-edit"
version: 1
appliesTo: []
tasks: ["text.rewrite-edit"]
modality: "text"
promptLanguage: "user"
sources: ["https://developers.openai.com/api/docs/guides/prompt-engineering", "https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices", "https://ai.google.dev/gemini-api/docs/prompting-strategies"]
reviewedBy: ""
reviewedAt: ""
slots:
- id: "action"
  impact: "high"
  question:
    en: "What should be done to the text?"
    tr: "Metne ne yapılsın?"
  options:
  - id: "proofread"
    label:
      en: "Fix grammar and spelling only"
      tr: "Sadece yazım ve dil bilgisi"
    value: "fix only spelling, grammar and punctuation"
  - id: "clarity"
    label:
      en: "Make it clearer"
      tr: "Daha anlaşılır yap"
    value: "improve clarity and flow"
  - id: "shorten"
    label:
      en: "Make it shorter"
      tr: "Kısalt"
    value: "shorten it"
  - id: "expand"
    label:
      en: "Expand it"
      tr: "Genişlet"
    value: "expand it with more detail"
  - id: "tone"
    label:
      en: "Change the tone"
      tr: "Tonu değiştir"
    value: "change the tone"
  - id: "simplify"
    label:
      en: "Simplify the language"
      tr: "Dili sadeleştir"
    value: "simplify the language"
  - id: "rewrite"
    label:
      en: "Rewrite fully"
      tr: "Baştan yaz"
    value: "rewrite it fully"
  default: "infer"
- id: "preserve"
  impact: "high"
  question:
    en: "What must stay?"
    tr: "Neler aynı kalmalı?"
  options:
  - id: "meaning"
    label:
      en: "Meaning and facts"
      tr: "Anlam ve bilgiler"
    value: "the meaning, facts, names and numbers"
  - id: "voice"
    label:
      en: "My voice"
      tr: "Benim üslubum"
    value: "the author's voice and style"
  - id: "structure"
    label:
      en: "Structure and formatting"
      tr: "Yapı ve biçim"
    value: "the structure, headings and formatting"
  - id: "terms"
    label:
      en: "Key terms"
      tr: "Anahtar terimler"
    value: "the key terms and keywords"
  default: "meaning"
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
- id: "length"
  impact: "medium"
  question:
    en: "Target length?"
    tr: "Hedef uzunluk?"
  options:
  - id: "same"
    label:
      en: "About the same"
      tr: "Yaklaşık aynı"
    value: "about the same length"
  - id: "shorter"
    label:
      en: "Noticeably shorter"
      tr: "Belirgin kısa"
    value: "noticeably shorter"
  - id: "longer"
    label:
      en: "Longer"
      tr: "Daha uzun"
    value: "longer"
  default: "same"
- id: "audience"
  impact: "medium"
  question:
    en: "Who will read it?"
    tr: "Kim okuyacak?"
  options:
  - id: "general"
    label:
      en: "General readers"
      tr: "Genel okur"
    value: "general readers"
  - id: "experts"
    label:
      en: "Experts"
      tr: "Uzmanlar"
    value: "experts"
  - id: "customers"
    label:
      en: "Customers"
      tr: "Müşteriler"
    value: "customers"
  - id: "beginners"
    label:
      en: "Beginners"
      tr: "Yeni başlayanlar"
    value: "beginners"
  default: "infer"
- id: "output"
  impact: "medium"
  question:
    en: "How should the result be shown?"
    tr: "Sonuç nasıl gösterilsin?"
  options:
  - id: "clean"
    label:
      en: "Only the new text"
      tr: "Yalnız yeni metin"
    value: "return only the revised text"
  - id: "changes"
    label:
      en: "New text and a list of changes"
      tr: "Yeni metin + değişiklik listesi"
    value: "return the revised text followed by a short list of the main changes"
  - id: "compare"
    label:
      en: "Original and revised side by side"
      tr: "Önce–sonra karşılaştırma"
    value: "show the original and the revised version for each paragraph"
  default: "clean"
refinements:
- id: "proofread"
  label:
    en: "Only fix errors"
    tr: "Sadece hataları düzelt"
  patch:
    action: "fix only spelling, grammar and punctuation"
- id: "shorter"
  label:
    en: "Shorter"
    tr: "Daha kısa"
  patch:
    length: "noticeably shorter"
- id: "formal"
  label:
    en: "More formal"
    tr: "Daha resmî"
  patch:
    tone: "formal"
- id: "friendly"
  label:
    en: "Friendlier"
    tr: "Daha samimi"
  patch:
    tone: "friendly and warm"
- id: "simple"
  label:
    en: "Simpler words"
    tr: "Daha sade kelimeler"
  patch:
    action: "simplify the language"
- id: "keep-voice"
  label:
    en: "Keep my voice"
    tr: "Üslubum kalsın"
  patch:
    preserve: "the author's voice and style"
- id: "changes"
  label:
    en: "List the changes"
    tr: "Değişiklikleri listele"
  patch:
    output: "return the revised text followed by a short list of the main changes"
- id: "compare"
  label:
    en: "Show before and after"
    tr: "Önce–sonra göster"
  patch:
    output: "show the original and the revised version for each paragraph"
checklist: ["One kind of edit stated", "What must stay unchanged", "Facts, names and numbers kept exact", "Tone and audience stated", "Target length stated", "Output form stated", "Original text in a separate block"]
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

Düzenleme promptunun omurgası şu: NE yapılacak + NE korunacak + sonuç NASIL verilecek. Metni ayrı bir blokta ver (talimatla karışmasın).

- Tek tür düzeltme iste: "sadece yazım" ile "baştan yaz" aynı anda istenmez.
- Korunacakları yaz: anlam ve olgular, ad ve rakamlar, kullanıcının üslubu, yapı ve başlıklar. Aksi halde yapay zekâ içeriği değiştirebilir.
- Kısaltma/uzatmada hedefi kelimeyle söyle ("belirgin kısa", "yaklaşık aynı"); kesin kelime sayısı vermek istersen kullanıcıdan al.
- Hangi değişikliklerin yapıldığını görmek isteyen kullanıcı için "yeni metin + kısa değişiklik listesi" iste.
- Metinde eksik bilgi varsa uydurma; "[belirsiz]" ile işaretlemesini söyle.

## Şablon

Aşağıdaki metin için şunu yap: [yapılacak düzenleme]. Aynı kalsın: [korunacaklar]. Ton: [ton]. Kitle: [kitle]. Uzunluk: [hedef]. Çıktı: [yalnız yeni metin / yeni metin + değişiklik listesi]. Kurallar: anlamı ve bilgileri değiştirme; ad ve rakamları aynen koru; metinde olmayan bilgi ekleme.

[Metin]

## Yap / Yapma

**Yap**
- Düzenleme türünü tek bir cümleyle söyle.
- Korunacakları açıkça say.
- Metni talimattan ayrı bir blokta ver.
- Sonucun biçimini seç (sadece metin mi, değişiklik listesi mi).

**Yapma**
- "Daha iyi yap" gibi ölçütsüz talimat verme.
- Kullanıcının üslubunu bozmasına izin verme (korunacak listesine yaz).
- Yeni bilgi ya da örnek eklettirme (kullanıcı istemediyse).
- Aynı promptta hem kısalt hem genişlet deme.

## Örnekler

**Örnek 1 — sadece yazım:** "Bu e-postadaki yazım hatalarını düzelt"

```
Aşağıdaki e-postada yalnızca yazım, dil bilgisi ve noktalama hatalarını düzelt. Anlamı, ifadeleri, üslubu ve paragraf düzenini değiştirme. Çıktı: düzeltilmiş metin, ardından yaptığın düzeltmelerin kısa listesi.

[Metin]
```

**Örnek 2 — ton değiştirme:** "Serzenişli mesajı nazikleştir"

```
Aşağıdaki mesajı daha nazik ve yapıcı bir tonda yeniden yaz. Aynı kalsın: anlatılan olay, talep ve tarihler. Değişsin: suçlayıcı ifadeler. Uzunluk: yaklaşık aynı. Yalnızca yeni metni ver.

[Mesaj]
```

Örnekler Türkçe yazıldı; prompt her zaman kullanıcının dilinde yazılır.

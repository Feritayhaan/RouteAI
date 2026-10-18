---
# TASLAK — reviewedBy boş. Görev şablonu: araca özel sözdizimi içermez, hiçbir araca bağlı değildir.
# Araca özel rehberi olmayan HER araçta, "productivity.notes" işi için kullanılır (lib/promptBuilder/fallback.ts).
id: "task-productivity-notes"
version: 1
appliesTo: []
tasks: ["productivity.notes"]
modality: "text"
promptLanguage: "user"
sources: ["https://developers.openai.com/api/docs/guides/prompt-engineering", "https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices", "https://ai.google.dev/gemini-api/docs/prompting-strategies"]
reviewedBy: ""
reviewedAt: ""
slots:
- id: "need"
  impact: "high"
  question:
    en: "What do you want to do with your notes?"
    tr: "Notlarınla ne yapmak istiyorsun?"
  options:
  - id: "capture"
    label:
      en: "Turn raw input into notes"
      tr: "Ham girdiyi nota çevir"
    value: "turn raw input into clean notes"
  - id: "organize"
    label:
      en: "Clean up messy notes"
      tr: "Dağınık notları düzenle"
    value: "organize and clean up messy notes"
  - id: "study"
    label:
      en: "Study notes or flashcards"
      tr: "Ders notu / kartlar"
    value: "turn the material into study notes and flashcards"
  - id: "summarize"
    label:
      en: "Summarize notes"
      tr: "Notları özetle"
    value: "summarize the notes"
  - id: "actions"
    label:
      en: "Extract to-dos"
      tr: "Yapılacakları çıkar"
    value: "extract action items and open questions"
  - id: "link"
    label:
      en: "Link ideas"
      tr: "Fikirleri ilişkilendir"
    value: "connect related ideas and suggest tags and links"
  default: "infer"
- id: "source"
  impact: "high"
  question:
    en: "What is the material?"
    tr: "Malzeme ne?"
  options:
  - id: "typed"
    label:
      en: "My own notes"
      tr: "Kendi notlarım"
    value: "the user's own rough notes"
  - id: "transcript"
    label:
      en: "Meeting or lecture transcript"
      tr: "Toplantı / ders dökümü"
    value: "a transcript"
  - id: "article"
    label:
      en: "Article or book"
      tr: "Makale / kitap"
    value: "an article or book excerpt"
  - id: "voice"
    label:
      en: "Voice-memo text"
      tr: "Sesli not metni"
    value: "text from a voice memo"
  default: "infer"
- id: "structure"
  impact: "high"
  question:
    en: "Which note structure?"
    tr: "Not yapısı?"
  options:
  - id: "outline"
    label:
      en: "Headings and bullets"
      tr: "Başlıklar ve maddeler"
    value: "headings with short bullet points"
  - id: "atomic"
    label:
      en: "Short atomic notes with tags"
      tr: "Kısa tekil notlar + etiket"
    value: "short atomic notes, each with one idea and suggested tags"
  - id: "qa"
    label:
      en: "Questions and answers"
      tr: "Soru-cevap"
    value: "question and answer pairs"
  - id: "table"
    label:
      en: "Table"
      tr: "Tablo"
    value: "a table"
  - id: "cornell"
    label:
      en: "Key points and summary"
      tr: "Ana noktalar + özet"
    value: "key points on the left side of the page and a short summary at the end"
  default: "infer"
- id: "detail"
  impact: "medium"
  question:
    en: "How detailed?"
    tr: "Ne kadar ayrıntılı?"
  options:
  - id: "brief"
    label:
      en: "Brief"
      tr: "Kısa"
    value: "brief"
  - id: "standard"
    label:
      en: "Balanced"
      tr: "Dengeli"
    value: "balanced"
  - id: "thorough"
    label:
      en: "Thorough"
      tr: "Ayrıntılı"
    value: "thorough"
  default: "standard"
- id: "tags"
  impact: "medium"
  question:
    en: "Tags and links?"
    tr: "Etiket ve bağlantı?"
  options:
  - id: "yes"
    label:
      en: "Suggest tags"
      tr: "Etiket öner"
    value: "suggest a few tags and related topics"
  - id: "no"
    label:
      en: "No"
      tr: "Hayır"
    value: "no tags"
  default: "yes"
- id: "fidelity"
  impact: "medium"
  question:
    en: "How faithful?"
    tr: "Ne kadar sadık?"
  options:
  - id: "faithful"
    label:
      en: "Only what is in my notes"
      tr: "Yalnız notlarımdakiler"
    value: "add nothing that is not in the source; mark unclear parts as [unclear]"
  - id: "enrich"
    label:
      en: "You may add context"
      tr: "Bağlam ekleyebilirsin"
    value: "add short clearly labeled explanations for terms, without inventing facts"
  default: "faithful"
- id: "language"
  impact: "low"
  question:
    en: "Output language?"
    tr: "Çıktı dili?"
  options:
  - id: "same"
    label:
      en: "Same as the notes"
      tr: "Notlarla aynı"
    value: "the same language as the notes"
  - id: "mine"
    label:
      en: "My language"
      tr: "Benim dilim"
    value: "the user's own language"
  default: "same"
refinements:
- id: "shorter"
  label:
    en: "Shorter"
    tr: "Daha kısa"
  patch:
    detail: "brief"
- id: "thorough"
  label:
    en: "More thorough"
    tr: "Daha ayrıntılı"
  patch:
    detail: "thorough"
- id: "qa"
  label:
    en: "As Q&A cards"
    tr: "Soru-cevap kartı"
  patch:
    structure: "question and answer pairs"
- id: "atomic"
  label:
    en: "Atomic notes"
    tr: "Tekil notlar"
  patch:
    structure: "short atomic notes, each with one idea and suggested tags"
- id: "table"
  label:
    en: "As a table"
    tr: "Tablo olarak"
  patch:
    structure: "a table"
- id: "actions"
  label:
    en: "Add to-dos"
    tr: "Yapılacakları ekle"
  instruction: "Add a final section listing action items with owners and dates only if they appear in the source; otherwise write \"not specified\"."
- id: "faithful"
  label:
    en: "Stay faithful"
    tr: "Sadık kal"
  patch:
    fidelity: "add nothing that is not in the source; mark unclear parts as [unclear]"
- id: "tags"
  label:
    en: "Add tags"
    tr: "Etiket ekle"
  patch:
    tags: "suggest a few tags and related topics"
checklist: ["What to do with the notes", "Material type", "Structure of the result", "Nothing added that is not in the source", "Unclear parts marked, not guessed", "Tags or links if asked", "Action items only if in the source"]
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

Not alma araçlarında (ör. Notion AI, Mem, Reflect) yapay zekâ genellikle SENİN NOTLARIN üzerinde çalışır; prompt bir dönüştürme talimatıdır. Sıra: (1) yapılacak iş, (2) malzeme (ayrı blokta), (3) çıktı yapısı, (4) ayrıntı düzeyi, (5) sadakat kuralı.

- Ham notları talimattan ayır; blok içinde ver.
- Yapıyı seç: başlık+madde, tekil (atomik) notlar, soru-cevap kartı, tablo.
- Sadakat: "kaynakta olmayan bilgi ekleme; anlaşılmayanları [belirsiz] işaretle". Toplantıdan yapılacak çıkarılıyorsa sorumlu ve tarih yoksa "belirtilmemiş" yazılır.
- Bağlantı ve etiket istiyorsan "birkaç etiket öner" de; aracın bağlantı özelliğini adıyla uydurma.

## Şablon

Aşağıdaki [malzeme] için şunu yap: [iş]. Çıktı yapısı: [yapı]. Ayrıntı: [düzey]. Etiket: [evet/hayır]. Kurallar: yalnızca kaynaktaki bilgiyi kullan; anlaşılmayan yerleri [belirsiz] diye işaretle; sorumlu ya da tarih yoksa "belirtilmemiş" yaz.

[Notlar]

## Yap / Yapma

**Yap**
- Notları ayrı bir blokta ver.
- Çıktı yapısını açıkça seç.
- Etiket ve ilişkili konu iste (isteğe bağlı).
- Belirsiz yerleri işaretlet.

**Yapma**
- Notlarda olmayan bilgi, rakam ya da tarih eklettirme.
- Çok farklı konuyu tek nota doldurtma.
- Aracın özel komut adını bilmeden uydurma.
- Hassas notları (şifre, kimlik) isteme.

## Örnekler

**Örnek 1 — toplantı notu:** "Dağınık toplantı notlarını düzenle"

```
Aşağıdaki toplantı notlarını düzenle. Çıktı: başlıklar ve kısa maddeler; sonda "Yapılacaklar" bölümü (sorumlu ve tarih yalnızca notlarda varsa, yoksa "belirtilmemiş"). Ayrıntı: dengeli. Yalnızca notlardaki bilgiyi kullan; anlaşılmayan yerleri [belirsiz] diye işaretle.

[Notlar]
```

**Örnek 2 — ders notu:** "Ders metninden çalışma kartları"

```
Aşağıdaki ders metnini çalışma kartlarına çevir. Çıktı: soru-cevap çiftleri, her kart tek bir fikir. Ardından beş etiket öner. Metinde olmayan bilgi ekleme; terimleri metindeki gibi kullan.

[Ders metni]
```

Örnekler Türkçe yazıldı; prompt her zaman kullanıcının dilinde yazılır.

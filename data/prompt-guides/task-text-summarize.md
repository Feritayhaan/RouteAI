---
# TASLAK — reviewedBy boş. Görev şablonu: araca özel sözdizimi içermez, hiçbir araca bağlı değildir.
# Araca özel rehberi olmayan HER araçta, "text.summarize" işi için kullanılır (lib/promptBuilder/fallback.ts).
id: "task-text-summarize"
version: 1
appliesTo: []
tasks: ["text.summarize"]
modality: "text"
promptLanguage: "user"
sources: ["https://developers.openai.com/api/docs/guides/prompt-engineering", "https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices", "https://ai.google.dev/gemini-api/docs/prompting-strategies"]
reviewedBy: ""
reviewedAt: ""
slots:
- id: "source"
  impact: "high"
  question:
    en: "What are you summarizing?"
    tr: "Neyi özetliyoruz?"
  options:
  - id: "article"
    label:
      en: "Article or web page"
      tr: "Makale / web sayfası"
    value: "an article or web page"
  - id: "document"
    label:
      en: "Long document or report"
      tr: "Uzun belge / rapor"
    value: "a long document or report"
  - id: "meeting"
    label:
      en: "Meeting transcript"
      tr: "Toplantı dökümü"
    value: "a meeting transcript"
  - id: "thread"
    label:
      en: "Email thread"
      tr: "E-posta zinciri"
    value: "an email thread"
  - id: "paper"
    label:
      en: "Research paper"
      tr: "Araştırma makalesi"
    value: "a research paper"
  - id: "book"
    label:
      en: "Book chapter"
      tr: "Kitap bölümü"
    value: "a book chapter"
  default: "infer"
- id: "form"
  impact: "high"
  question:
    en: "What should the summary look like?"
    tr: "Özet nasıl olsun?"
  options:
  - id: "paragraph"
    label:
      en: "Short paragraph"
      tr: "Kısa paragraf"
    value: "one short paragraph"
  - id: "bullets"
    label:
      en: "Bullet points"
      tr: "Madde madde"
    value: "bullet points"
  - id: "exec"
    label:
      en: "Executive summary"
      tr: "Yönetici özeti"
    value: "an executive summary: main conclusion first, then key points"
  - id: "actions"
    label:
      en: "Key points and action items"
      tr: "Ana noktalar ve yapılacaklar"
    value: "key points followed by a list of decisions and action items"
  - id: "tldr"
    label:
      en: "TL;DR plus details"
      tr: "Tek cümle + ayrıntı"
    value: "a one-sentence TL;DR followed by a short detailed summary"
  default: "infer"
- id: "fidelity"
  impact: "high"
  question:
    en: "How faithful must it be?"
    tr: "Ne kadar sadık olsun?"
  options:
  - id: "faithful"
    label:
      en: "Only what the text says"
      tr: "Yalnız metindekiler"
    value: "add nothing that is not in the source; quote key figures and names exactly"
  - id: "interpretive"
    label:
      en: "Add implications"
      tr: "Çıkarımlar da eklensin"
    value: "summarize, then add a clearly labeled section with implications and open questions"
  default: "faithful"
- id: "focus"
  impact: "medium"
  question:
    en: "What should it focus on?"
    tr: "Neye odaklansın?"
  options:
  - id: "main"
    label:
      en: "Main points"
      tr: "Ana noktalar"
    value: "the main points"
  - id: "decisions"
    label:
      en: "Decisions and actions"
      tr: "Kararlar ve yapılacaklar"
    value: "decisions and action items"
  - id: "numbers"
    label:
      en: "Numbers and facts"
      tr: "Rakamlar ve olgular"
    value: "numbers, dates and facts"
  - id: "arguments"
    label:
      en: "Arguments and evidence"
      tr: "Argümanlar ve kanıtlar"
    value: "the arguments and the evidence"
  default: "infer"
- id: "audience"
  impact: "medium"
  question:
    en: "Who is it for?"
    tr: "Kimin için?"
  options:
  - id: "me"
    label:
      en: "Me"
      tr: "Kendim"
    value: "the user"
  - id: "exec"
    label:
      en: "A busy executive"
      tr: "Yoğun bir yönetici"
    value: "a busy executive"
  - id: "team"
    label:
      en: "My team"
      tr: "Ekibim"
    value: "a team that was not present"
  - id: "beginners"
    label:
      en: "A beginner"
      tr: "Yeni başlayan"
    value: "a beginner"
  default: "infer"
- id: "length"
  impact: "medium"
  question:
    en: "How long?"
    tr: "Ne kadar uzun?"
  options:
  - id: "very-short"
    label:
      en: "Very short"
      tr: "Çok kısa"
    value: "very short"
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
  default: "short"
- id: "quotes"
  impact: "low"
  question:
    en: "Include quotes?"
    tr: "Alıntı eklensin mi?"
  options:
  - id: "no"
    label:
      en: "No"
      tr: "Hayır"
    value: "no direct quotes"
  - id: "key"
    label:
      en: "Key quotes"
      tr: "Önemli alıntılar"
    value: "include a few short direct quotes that support the key points"
  default: "no"
refinements:
- id: "shorter"
  label:
    en: "Shorter"
    tr: "Daha kısa"
  patch:
    length: "very short"
- id: "bullets"
  label:
    en: "As bullets"
    tr: "Madde madde"
  patch:
    form: "bullet points"
- id: "actions"
  label:
    en: "Action items"
    tr: "Yapılacaklar"
  patch:
    form: "key points followed by a list of decisions and action items"
- id: "faithful"
  label:
    en: "Stay faithful"
    tr: "Metne sadık kal"
  patch:
    fidelity: "add nothing that is not in the source; quote key figures and names exactly"
- id: "numbers"
  label:
    en: "Numbers only"
    tr: "Rakamlara odaklan"
  patch:
    focus: "numbers, dates and facts"
- id: "simple"
  label:
    en: "Simpler language"
    tr: "Daha sade dil"
  patch:
    audience: "a beginner"
- id: "quotes"
  label:
    en: "Add quotes"
    tr: "Alıntı ekle"
  patch:
    quotes: "include a few short direct quotes that support the key points"
- id: "sections"
  label:
    en: "Section by section"
    tr: "Bölüm bölüm"
  instruction: "Summarize section by section, following the order of the source."
checklist: ["Source type and where the text is placed", "Summary form stated", "Faithful to the source, nothing added", "Figures, names and dates kept exact", "Audience and length stated", "Says what to do if something is missing", "Task stated after the document"]
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

Özetleme promptunda ÖNEMLİ kural yerleşimdir: uzun metni (belge, döküm) promptun BAŞINA, ayrı bir blokta koy; soruyu/talimatı sona yaz. Anthropic ve Google rehberleri uzun bağlamda talimatın sonda olmasını önerir; Anthropic ayrıca belgeyi etiketle (<document>) sarmayı önerir. Çok uzun belgede önce ilgili kısımları alıntılatıp sonra özetletmek hatayı azaltır.

Sıra: (1) belge bloğu, (2) özet türü, (3) kitle ve uzunluk, (4) odak, (5) sadakat kuralı.

- Sadakat kuralı yaz: "yalnız metindekileri kullan; metinde olmayan bilgi, rakam ya da yorum ekleme; belirsiz yerleri belirsiz bırak."
- Rakam, ad ve tarihleri "aynen koru" de.
- Özette bir şey eksikse (ör. toplantıda sorumlu belirtilmemiş) "belirtilmemiş" yazmasını iste, tahmin ettirme.

## Şablon

[Metin bloğu: belge / döküm / e-posta zinciri]

Yukarıdaki [kaynak türü] için [özet biçimi] hazırla. Kitle: [kitle]. Uzunluk: [uzunluk]. Odak: [odak]. Kurallar: yalnızca metindekileri kullan; rakam, ad ve tarihleri aynen koru; metinde olmayan bilgi ekleme; belirtilmemiş şeyleri "belirtilmemiş" diye yaz.

## Yap / Yapma

**Yap**
- Metni başa, talimatı sona koy.
- Özet biçimini ve uzunluğunu belirt.
- Sadakat kuralını açıkça yaz.
- Toplantı özetinde karar, sorumlu ve tarih alanları iste; yoksa "belirtilmemiş" de.

**Yapma**
- Metni özet isterken talimatsız bırakma ("özetle" tek başına yetmez).
- Özette kendi yorumunu "gerçek" gibi sunmasına izin verme.
- Kaynağı belirtmeden başka kaynaktan bilgi eklettirme.
- Çok uzun belgeyi tek kelimeyle "özetle" diye bırakma; odak ve biçim yaz.

## Örnekler

**Örnek 1 — toplantı:** "Toplantı dökümünden yapılacaklar listesi"

```
[Toplantı dökümü buraya yapıştırılacak]

Yukarıdaki toplantı dökümünü özetle. Önce üç cümleyi geçmeyen genel bir özet yaz, sonra "Kararlar" ve "Yapılacaklar" başlıklarıyla madde madde listele; her yapılacak için sorumlu kişiyi ve tarihi yaz. Kurallar: yalnızca dökümde geçenleri kullan; sorumlu ya da tarih söylenmediyse "belirtilmemiş" yaz; tahmin etme.
```

**Örnek 2 — makale:** "Uzun bir makaleyi yönetici için özetle"

```
[Makale metni]

Bu makaleyi meşgul bir yönetici için özetle: en önemli sonuç ilk cümlede, sonra en fazla beş madde ile ana bulgular. Rakamları ve isimleri aynen koru. Makalede olmayan hiçbir bilgi ya da yorum ekleme.
```

Örnekler Türkçe yazıldı; prompt her zaman kullanıcının dilinde yazılır.

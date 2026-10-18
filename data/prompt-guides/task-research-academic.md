---
# TASLAK — reviewedBy boş. Görev şablonu: araca özel sözdizimi içermez, hiçbir araca bağlı değildir.
# Araca özel rehberi olmayan HER araçta, "research.academic" işi için kullanılır (lib/promptBuilder/fallback.ts).
id: "task-research-academic"
version: 1
appliesTo: []
tasks: ["research.academic"]
modality: "research"
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
  - id: "find"
    label:
      en: "Find relevant papers"
      tr: "İlgili makaleleri bul"
    value: "find relevant academic papers"
  - id: "review"
    label:
      en: "Literature review"
      tr: "Literatür taraması"
    value: "a literature review that groups papers by theme"
  - id: "summarize"
    label:
      en: "Summarize a paper"
      tr: "Bir makaleyi özetle"
    value: "a structured summary of one paper"
  - id: "compare"
    label:
      en: "Compare studies"
      tr: "Çalışmaları karşılaştır"
    value: "a comparison of studies on the same question"
  - id: "extract"
    label:
      en: "Extract data from papers"
      tr: "Makalelerden veri çıkar"
    value: "extract specific data points from papers into a table"
  - id: "gap"
    label:
      en: "Find research gaps"
      tr: "Eksik alanları bul"
    value: "identify what is still unstudied or contested"
  default: "infer"
- id: "field"
  impact: "high"
  question:
    en: "Which field?"
    tr: "Hangi alan?"
  options:
  - id: "medicine"
    label:
      en: "Medicine and health"
      tr: "Tıp / sağlık"
    value: "medicine and health"
  - id: "science"
    label:
      en: "Natural sciences"
      tr: "Doğa bilimleri"
    value: "natural sciences"
  - id: "engineering"
    label:
      en: "Engineering and computing"
      tr: "Mühendislik / bilgisayar"
    value: "engineering and computer science"
  - id: "social"
    label:
      en: "Social sciences"
      tr: "Sosyal bilimler"
    value: "social sciences"
  - id: "humanities"
    label:
      en: "Humanities"
      tr: "Beşeri bilimler"
    value: "humanities"
  - id: "business"
    label:
      en: "Business and economics"
      tr: "İşletme / ekonomi"
    value: "business and economics"
  default: "infer"
- id: "scope"
  impact: "high"
  question:
    en: "Which papers count?"
    tr: "Hangi makaleler sayılsın?"
  options:
  - id: "recent"
    label:
      en: "Recent (last 5 years)"
      tr: "Son 5 yıl"
    value: "papers from roughly the last five years"
  - id: "foundational"
    label:
      en: "Foundational plus recent"
      tr: "Temel + güncel"
    value: "the foundational papers plus recent work"
  - id: "reviews"
    label:
      en: "Review articles"
      tr: "Derleme makaleler"
    value: "review articles and meta-analyses first"
  - id: "any"
    label:
      en: "Any year"
      tr: "Fark etmez"
    value: "any year"
  default: "recent"
- id: "evidence"
  impact: "high"
  question:
    en: "How strict about citations?"
    tr: "Atıflarda ne kadar sıkı?"
  options:
  - id: "real"
    label:
      en: "Real papers only, verify"
      tr: "Yalnız gerçek makaleler"
    value: "list only papers that you actually found; give title, authors, year, venue and link or DOI when available; never invent a paper, author, DOI or number"
  - id: "mark"
    label:
      en: "Mark what to verify"
      tr: "Doğrulanacakları işaretle"
    value: "list only papers that you actually found and mark any detail you are unsure about as [verify]; never invent a paper, author, DOI or number"
  default: "real"
- id: "output"
  impact: "medium"
  question:
    en: "Output form?"
    tr: "Çıktı biçimi?"
  options:
  - id: "table"
    label:
      en: "Table"
      tr: "Tablo"
    value: "a table with one row per paper: reference, question, method, sample, main finding, limitations"
  - id: "report"
    label:
      en: "Themed report"
      tr: "Temalı rapor"
    value: "a report grouped by theme, with the key finding and the limitation of each study"
  - id: "bullets"
    label:
      en: "Bullet list"
      tr: "Madde listesi"
    value: "a short bullet list, one paper per bullet"
  default: "table"
- id: "rigor"
  impact: "medium"
  question:
    en: "How critical?"
    tr: "Ne kadar eleştirel?"
  options:
  - id: "basic"
    label:
      en: "Report the findings"
      tr: "Bulguları aktar"
    value: "report the findings"
  - id: "critical"
    label:
      en: "Add limitations"
      tr: "Sınırlılıkları da yaz"
    value: "for each study note the sample size, the method and the main limitations, and say how strong the evidence is"
  default: "critical"
- id: "language"
  impact: "low"
  question:
    en: "Paper language?"
    tr: "Makale dili?"
  options:
  - id: "english"
    label:
      en: "English-language papers"
      tr: "İngilizce makaleler"
    value: "papers in English"
  - id: "any"
    label:
      en: "Any language"
      tr: "Fark etmez"
    value: "papers in any language, noting the language"
  default: "english"
refinements:
- id: "recent"
  label:
    en: "Recent only"
    tr: "Yalnız güncel"
  patch:
    scope: "papers from roughly the last five years"
- id: "reviews"
  label:
    en: "Reviews first"
    tr: "Önce derlemeler"
  patch:
    scope: "review articles and meta-analyses first"
- id: "table"
  label:
    en: "As a table"
    tr: "Tablo olarak"
  patch:
    output: "a table with one row per paper: reference, question, method, sample, main finding, limitations"
- id: "critical"
  label:
    en: "More critical"
    tr: "Daha eleştirel"
  patch:
    rigor: "for each study note the sample size, the method and the main limitations, and say how strong the evidence is"
- id: "strict"
  label:
    en: "Real papers only"
    tr: "Yalnız gerçek makale"
  patch:
    evidence: "list only papers that you actually found; give title, authors, year, venue and link or DOI when available; never invent a paper, author, DOI or number"
- id: "gaps"
  label:
    en: "Add research gaps"
    tr: "Eksikleri ekle"
  instruction: "End with a short section on what is still unstudied or contested."
- id: "plain"
  label:
    en: "Plain-language summary"
    tr: "Sade özet"
  instruction: "Add a plain-language summary a non-specialist can follow, after the academic version."
- id: "keywords"
  label:
    en: "Search keywords"
    tr: "Arama anahtar kelimeleri"
  instruction: "End with a list of search keywords and database queries the user can try to find more papers."
checklist: ["Research question and field", "Which papers count (years, types)", "Real papers only, never invented", "Title, authors, year, venue, link or DOI", "Method, sample and limitations noted", "Output form stated", "Unverified details marked"]
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

Üç resmî rehberin (OpenAI, Anthropic, Google) ortak önerisi: net ve belirli yaz; amacı, kitleyi ve çıktı biçimini söyle; bağlamı ayrı blokta ver; kısıtları "yap" diliyle yaz. Araştırmada ek kural: kaynağı olmayan bilgi, "bulamadım" demekten daha kötüdür.

Akademik araştırmanın en büyük riski UYDURMA ATIFTIR: dil modelleri gerçek gibi görünen ama var olmayan makale, yazar ve DOI üretebilir. Bu yüzden prompt'un çekirdeği kaynak kuralıdır.

Sıra: (1) araştırma sorusu (tek cümle) ve alan, (2) kapsam (yıl aralığı, makale türü, dil), (3) kaynak kuralı, (4) çıktı biçimi, (5) eleştirel değerlendirme.

- Kural: "yalnızca gerçekten bulduğun makaleleri listele; başlık, yazarlar, yıl, dergi ve bağlantı/DOI ver; bulamadığın bilgiyi [doğrula] diye işaretle; makale, yazar, DOI ve rakam uydurma."
- Her çalışma için yöntem, örneklem ve sınırlılık iste; "bulgu" ile "kanıt gücü"nü ayır.
- Literatür taramasında makaleleri TEMALARA göre grupla, tek tek sıralama.
- Kullanıcı bir makaleyi yükleyip özetletiyorsa özet yalnızca o metne dayansın.
- Çıktıdaki her atıf, kullanıcı tarafından asıl kaynaktan doğrulanmalıdır; bunu `howToUse`ta hatırlat.

## Şablon

Araştırma sorusu: [soru]. Alan: [alan]. Kapsam: [yıllar / makale türü / dil]. İstenen: [bulma / tarama / karşılaştırma / veri çıkarma]. Çıktı: [tablo / tema bazlı rapor]. Her çalışma için yöntem, örneklem ve sınırlılığı yaz. Kurallar: yalnızca gerçekten bulduğun makaleleri listele; başlık, yazarlar, yıl, dergi ve bağlantı/DOI ver; emin olmadığın ayrıntıyı [doğrula] diye işaretle; makale, yazar, DOI ve rakam uydurma.

## Yap / Yapma

**Yap**
- Soruyu tek cümle ve alanıyla yaz.
- Yıl aralığı ve makale türünü belirt.
- "Gerçek makale, uydurma yok" kuralını mutlaka ekle.
- Her çalışma için sınırlılık iste.

**Yapma**
- Atıfları kontrol etmeden kullanma.
- "Konu hakkında tüm makaleleri bul" gibi sınırsız istek yazma.
- Tek çalışmadan genel sonuç çıkarttırma.
- Özet isterken makale metnini vermeden ayrıntı bekleme.

## Örnekler

**Örnek 1 — literatür taraması:** "Uzaktan çalışma ve verimlilik"

```
Araştırma sorusu: uzaktan çalışma çalışan verimliliğini nasıl etkiliyor? Alan: işletme ve ekonomi. Kapsam: son beş yılın makaleleri, önce derleme ve meta-analizler. İstenen: literatür taraması. Çıktı: temalara göre gruplanmış rapor; her çalışma için yöntem, örneklem ve sınırlılık. Kurallar: yalnızca gerçekten bulduğun makaleleri listele; başlık, yazarlar, yıl, dergi ve bağlantı/DOI ver; emin olmadığın ayrıntıyı [doğrula] diye işaretle; makale, yazar, DOI ve rakam uydurma. Sonda eksik kalan konuları yaz.
```

**Örnek 2 — tek makale:** "Yüklediğim makaleyi özetle"

```
Yüklediğim makaleyi yapılandırılmış özetle: araştırma sorusu, yöntem, örneklem, ana bulgular, sınırlılıklar. Yalnızca makalenin metnine dayan; makalede olmayan bilgi ekleme; rakamları aynen aktar; anlaşılmayan yerleri [belirsiz] diye işaretle. Sonda üç cümlelik sade bir özet ekle.
```

Örnekler Türkçe yazıldı; prompt her zaman kullanıcının dilinde yazılır.

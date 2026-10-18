---
# TASLAK — reviewedBy boş. Görev şablonu: araca özel sözdizimi içermez, hiçbir araca bağlı değildir.
# Araca özel rehberi olmayan HER araçta, "research.document-qa" işi için kullanılır (lib/promptBuilder/fallback.ts).
id: "task-research-document-qa"
version: 1
appliesTo: []
tasks: ["research.document-qa"]
modality: "research"
promptLanguage: "user"
sources: ["https://developers.openai.com/api/docs/guides/prompt-engineering", "https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices", "https://ai.google.dev/gemini-api/docs/prompting-strategies"]
reviewedBy: ""
reviewedAt: ""
slots:
- id: "question"
  impact: "high"
  question:
    en: "What do you want to know?"
    tr: "Ne öğrenmek istiyorsun?"
  options:
  - id: "answer"
    label:
      en: "Answer a specific question"
      tr: "Belirli bir soruyu cevapla"
    value: "answer a specific question"
  - id: "find"
    label:
      en: "Find where something is said"
      tr: "Bir şeyin nerede geçtiğini bul"
    value: "find where something is stated in the documents"
  - id: "compare"
    label:
      en: "Compare documents"
      tr: "Belgeleri karşılaştır"
    value: "compare what the documents say about the same point"
  - id: "extract"
    label:
      en: "Extract details"
      tr: "Ayrıntıları çıkar"
    value: "extract specific details such as dates, amounts, names and obligations"
  - id: "overview"
    label:
      en: "Explain the document"
      tr: "Belgeyi açıkla"
    value: "explain the document in plain words"
  - id: "check"
    label:
      en: "Check a statement"
      tr: "Bir iddiayı kontrol et"
    value: "check whether a statement is supported by the documents"
  default: "infer"
- id: "basis"
  impact: "high"
  question:
    en: "What may the answer be based on?"
    tr: "Cevap neye dayansın?"
  options:
  - id: "only-doc"
    label:
      en: "Only my documents"
      tr: "Yalnız belgelerim"
    value: "answer only from the provided documents; do not use outside knowledge"
  - id: "doc-plus"
    label:
      en: "Documents, outside knowledge labeled"
      tr: "Belgeler + etiketli dış bilgi"
    value: "answer from the documents first; clearly label anything that comes from general knowledge instead"
  default: "only-doc"
- id: "citations"
  impact: "high"
  question:
    en: "How should it point to the source?"
    tr: "Kaynağı nasıl göstersin?"
  options:
  - id: "quote"
    label:
      en: "Short quote and location"
      tr: "Kısa alıntı + yer"
    value: "support every answer with a short exact quote and its location (page, section or heading)"
  - id: "location"
    label:
      en: "Location only"
      tr: "Yalnız yer"
    value: "name the page, section or heading for every answer"
  default: "quote"
- id: "missing"
  impact: "high"
  question:
    en: "If the answer is not in the documents?"
    tr: "Cevap belgede yoksa?"
  options:
  - id: "say"
    label:
      en: "Say it is not there"
      tr: "Yok desin"
    value: "if the documents do not contain the answer, say so plainly and do not guess"
  - id: "ask"
    label:
      en: "Say so and suggest what to check"
      tr: "Yok desin, nereye bakılacağını yazsın"
    value: "if the documents do not contain the answer, say so, and suggest what other document or section might contain it"
  default: "say"
- id: "format"
  impact: "medium"
  question:
    en: "Answer form?"
    tr: "Cevap biçimi?"
  options:
  - id: "short"
    label:
      en: "Short direct answer"
      tr: "Kısa ve net cevap"
    value: "a short direct answer first, then the supporting quotes"
  - id: "bullets"
    label:
      en: "Bullets"
      tr: "Madde madde"
    value: "bullet points"
  - id: "table"
    label:
      en: "Table"
      tr: "Tablo"
    value: "a table"
  default: "short"
- id: "scope"
  impact: "medium"
  question:
    en: "Which documents?"
    tr: "Hangi belgeler?"
  options:
  - id: "all"
    label:
      en: "All of them"
      tr: "Hepsi"
    value: "all provided documents"
  - id: "named"
    label:
      en: "Only the ones I name"
      tr: "Yalnız adını verdiklerim"
    value: "only the documents the user names"
  default: "all"
- id: "level"
  impact: "low"
  question:
    en: "Explain how?"
    tr: "Nasıl anlatılsın?"
  options:
  - id: "plain"
    label:
      en: "Plain language"
      tr: "Sade dil"
    value: "plain language, explaining technical terms"
  - id: "exact"
    label:
      en: "Exact wording"
      tr: "Belgedeki ifadeyle"
    value: "keep the document's own wording"
  default: "plain"
refinements:
- id: "only-doc"
  label:
    en: "Only from documents"
    tr: "Yalnız belgeden"
  patch:
    basis: "answer only from the provided documents; do not use outside knowledge"
- id: "quote"
  label:
    en: "Add quotes"
    tr: "Alıntı ekle"
  patch:
    citations: "support every answer with a short exact quote and its location (page, section or heading)"
- id: "table"
  label:
    en: "As a table"
    tr: "Tablo olarak"
  patch:
    format: "a table"
- id: "bullets"
  label:
    en: "As bullets"
    tr: "Madde madde"
  patch:
    format: "bullet points"
- id: "plain"
  label:
    en: "Plain language"
    tr: "Sade dil"
  patch:
    level: "plain language, explaining technical terms"
- id: "exact"
  label:
    en: "Exact wording"
    tr: "Aynı ifadelerle"
  patch:
    level: "keep the document's own wording"
- id: "conflicts"
  label:
    en: "Flag conflicts"
    tr: "Çelişkileri işaretle"
  instruction: "If two parts of the documents say different things, show both with their locations."
- id: "followups"
  label:
    en: "Suggest questions"
    tr: "Soru öner"
  instruction: "End with three more questions worth asking about these documents."
checklist: ["Question stated", "Answer only from the documents", "Short exact quote and location for each answer", "Says plainly when the answer is not in the documents", "No guessing, no outside facts presented as the document's", "Documents in scope named", "Answer form stated"]
validators:
- id: "length"
  type: "maxLength"
  value: 2500
  message: "RouteAI limit: keep the prompt under 2500 characters."
- id: "no-braces"
  type: "regex"
  value: "^(?![\\s\\S]*(\\{\\{|\\}\\}))[\\s\\S]*$"
  message: "Remove unfilled {{placeholders}}; write the real content or a [clearly marked placeholder]."
---

## Sözdizimi

Üç resmî rehberin (OpenAI, Anthropic, Google) ortak önerisi: net ve belirli yaz; amacı, kitleyi ve çıktı biçimini söyle; bağlamı ayrı blokta ver; kısıtları "yap" diliyle yaz. Araştırmada ek kural: kaynağı olmayan bilgi, "bulamadım" demekten daha kötüdür.

Belge soru-cevap araçları (NotebookLM, ChatPDF vb.) zaten belgeye bağlıdır; prompt'un işi cevabı BELGEYE KİLİTLEMEK ve belgede olmayanı uydurtmamaktır.

Sıra: (1) soru, (2) dayanak kuralı ("yalnız belgelerden"), (3) kaynak gösterme (kısa alıntı + yer), (4) cevap yoksa ne yapılacağı, (5) çıktı biçimi.

- Dayanak: "yalnızca verilen belgelere dayan; dış bilgi kullanma." Dış bilgi isteniyorsa "etiketle" de.
- Her cevabın yanında kısa, AYNEN alıntı ve yeri (sayfa, bölüm, başlık) iste; bu sayede kullanıcı doğrulayabilir.
- "Belgede yoksa yok de, tahmin etme" kuralı zorunludur; bu kural olmazsa model boşluğu doldurur.
- Birden fazla belge varsa hangisini kastettiğini adıyla belirt; çelişki varsa iki yeri de göster.
- Sözleşme, sağlık ve mali belgelerde cevap bilgi amaçlıdır; kararı uzmanla doğrula (`howToUse`ta söyle).

## Şablon

Yüklü belgelerime dayanarak şu soruyu cevapla: [soru]. Kapsam: [tüm belgeler / şu belgeler]. Kurallar: yalnızca belgelerdeki bilgiyi kullan; her cevabın yanına kısa ve aynen bir alıntı ile yerini (sayfa / bölüm) yaz; cevap belgelerde yoksa "belgelerde yok" de ve tahmin etme; belgeler çelişirse iki yeri de göster. Çıktı: [biçim].

## Yap / Yapma

**Yap**
- Soruyu tek ve net sor.
- "Yalnız belgelerden" kuralını yaz.
- Her cevap için alıntı ve yer iste.
- Belgede yoksa söylemesini iste.

**Yapma**
- "Bu belge ne diyor?" gibi belirsiz soru sorma.
- Belgede olmayan bilgiyi sorup cevabı doğru sayma.
- Alıntıları kontrol etmeden güvenme.
- Hukuki ya da tıbbi kararı yalnızca bu cevaba dayandırma.

## Örnekler

**Örnek 1 — sözleşme:** "Kira sözleşmemde fesih şartı ne?"

```
Yüklü kira sözleşmesine dayanarak şu soruyu cevapla: sözleşmeyi erken feshetmek için ne gerekiyor? Kurallar: yalnızca sözleşmedeki bilgiyi kullan; kısa bir cevap ver ve her cevabın yanına aynen kısa alıntı ile yerini (madde numarası) yaz; sözleşmede yoksa "sözleşmede yok" de, tahmin etme. Çıktı: önce kısa cevap, sonra alıntılar.
```

**Örnek 2 — rapor karşılaştırma:** "İki raporda gelir rakamı farklı mı?"

```
Yüklü iki raporu karşılaştır: [Rapor A] ve [Rapor B]. Soru: yıllık gelir ve gider rakamları aynı mı? Çıktı: tablo (rakam, rapor, sayfa). Yalnızca raporlardaki rakamları kullan; rakamları aynen aktar; raporlar çelişirse iki yeri de göster; bulunamayan rakam için "belgede yok" yaz.
```

Örnekler Türkçe yazıldı; prompt her zaman kullanıcının dilinde yazılır.

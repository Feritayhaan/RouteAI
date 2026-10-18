---
# TASLAK — reviewedBy boş. Görev şablonu: araca özel sözdizimi içermez, hiçbir araca bağlı değildir.
# Araca özel rehberi olmayan HER araçta, "research.web" işi için kullanılır (lib/promptBuilder/fallback.ts).
id: "task-research-web"
version: 1
appliesTo: []
tasks: ["research.web"]
modality: "research"
promptLanguage: "user"
sources: ["https://developers.openai.com/api/docs/guides/prompt-engineering", "https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices", "https://ai.google.dev/gemini-api/docs/prompting-strategies"]
reviewedBy: ""
reviewedAt: ""
slots:
- id: "question"
  impact: "high"
  question:
    en: "What kind of research question?"
    tr: "Nasıl bir araştırma sorusu?"
  options:
  - id: "facts"
    label:
      en: "Find facts"
      tr: "Bilgi bul"
    value: "find current, verifiable facts"
  - id: "compare"
    label:
      en: "Compare options"
      tr: "Seçenekleri karşılaştır"
    value: "compare options on the same criteria"
  - id: "overview"
    label:
      en: "Overview of a topic"
      tr: "Konuya genel bakış"
    value: "give a well-organized overview of the topic"
  - id: "news"
    label:
      en: "Latest developments"
      tr: "Son gelişmeler"
    value: "find the latest developments on the topic"
  - id: "market"
    label:
      en: "Market or competitor research"
      tr: "Pazar / rakip araştırması"
    value: "research the market or competitors"
  - id: "howto"
    label:
      en: "How to do something"
      tr: "Nasıl yapılır"
    value: "find reliable instructions"
  default: "infer"
- id: "scope"
  impact: "high"
  question:
    en: "How wide should it look?"
    tr: "Ne kadar geniş baksın?"
  options:
  - id: "narrow"
    label:
      en: "One specific point"
      tr: "Tek bir nokta"
    value: "one specific point"
  - id: "focused"
    label:
      en: "A focused topic"
      tr: "Odaklı bir konu"
    value: "a focused topic"
  - id: "broad"
    label:
      en: "A broad topic"
      tr: "Geniş bir konu"
    value: "a broad topic, split into sub-questions"
  default: "focused"
- id: "sources"
  impact: "high"
  question:
    en: "Which sources?"
    tr: "Hangi kaynaklar?"
  options:
  - id: "reliable"
    label:
      en: "Reliable sources"
      tr: "Güvenilir kaynaklar"
    value: "reliable sources: official sites, primary documents, established publications"
  - id: "official"
    label:
      en: "Official sources only"
      tr: "Yalnız resmî kaynaklar"
    value: "only official sources such as company, government or standards pages"
  - id: "mixed"
    label:
      en: "Mixed, label the type"
      tr: "Karışık, türü yazılsın"
    value: "a mix of sources, and label each source as official, press, expert or user opinion"
  default: "reliable"
- id: "time"
  impact: "medium"
  question:
    en: "How recent?"
    tr: "Ne kadar güncel?"
  options:
  - id: "latest"
    label:
      en: "Most recent only"
      tr: "Yalnız en güncel"
    value: "only the most recent sources; give the publication date of every source"
  - id: "year"
    label:
      en: "Within the last year"
      tr: "Son bir yıl"
    value: "sources from the last year; give the publication date of every source"
  - id: "any"
    label:
      en: "Any time"
      tr: "Fark etmez"
    value: "any time period, but state the date of each source"
  default: "latest"
- id: "output"
  impact: "medium"
  question:
    en: "Which answer form?"
    tr: "Cevap biçimi?"
  options:
  - id: "summary"
    label:
      en: "Short summary with sources"
      tr: "Kaynaklı kısa özet"
    value: "a short summary where every claim is followed by its source"
  - id: "report"
    label:
      en: "Structured report"
      tr: "Yapılandırılmış rapor"
    value: "a structured report with headings, key findings and a source list"
  - id: "table"
    label:
      en: "Comparison table"
      tr: "Karşılaştırma tablosu"
    value: "a comparison table with a source for each row"
  - id: "bullets"
    label:
      en: "Bullet points"
      tr: "Madde madde"
    value: "bullet points, each with its source"
  default: "report"
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
      en: "Balanced"
      tr: "Dengeli"
    value: "a balanced answer"
  - id: "deep"
    label:
      en: "In depth"
      tr: "Derinlemesine"
    value: "an in-depth answer that covers different viewpoints"
  default: "standard"
- id: "conflicts"
  impact: "medium"
  question:
    en: "When sources disagree?"
    tr: "Kaynaklar çelişirse?"
  options:
  - id: "show"
    label:
      en: "Show both sides"
      tr: "İki tarafı da göster"
    value: "show the disagreement and who says what, instead of picking one side silently"
  - id: "weigh"
    label:
      en: "Weigh and explain"
      tr: "Tartıp açıkla"
    value: "weigh the sources, say which is more reliable and why"
  default: "show"
- id: "region"
  impact: "low"
  question:
    en: "Region?"
    tr: "Bölge?"
  options:
  - id: "global"
    label:
      en: "Global"
      tr: "Küresel"
    value: "global"
  - id: "local"
    label:
      en: "My country"
      tr: "Benim ülkem"
    value: "the user's own country; say if the information may differ elsewhere"
  default: "global"
refinements:
- id: "shorter"
  label:
    en: "Shorter"
    tr: "Daha kısa"
  patch:
    depth: "a quick, direct answer"
- id: "deeper"
  label:
    en: "More depth"
    tr: "Daha derin"
  patch:
    depth: "an in-depth answer that covers different viewpoints"
- id: "table"
  label:
    en: "As a table"
    tr: "Tablo olarak"
  patch:
    output: "a comparison table with a source for each row"
- id: "official"
  label:
    en: "Official sources only"
    tr: "Yalnız resmî kaynaklar"
  patch:
    sources: "only official sources such as company, government or standards pages"
- id: "latest"
  label:
    en: "Only the latest"
    tr: "Yalnız en güncel"
  patch:
    time: "only the most recent sources; give the publication date of every source"
- id: "both-sides"
  label:
    en: "Show disagreement"
    tr: "Çelişkileri göster"
  patch:
    conflicts: "show the disagreement and who says what, instead of picking one side silently"
- id: "unknowns"
  label:
    en: "List what is unknown"
    tr: "Bilinmeyenleri yaz"
  instruction: "End with a short list of what could not be verified or found."
- id: "questions"
  label:
    en: "Suggest follow-ups"
    tr: "Devam soruları öner"
  instruction: "End with three follow-up questions worth researching next."
checklist: ["Question and scope", "Source quality rule", "Date of every source", "Each claim followed by its source", "Sources that disagree shown", "Unknowns listed, not guessed", "No invented sources, links, quotes or numbers", "Answer form stated"]
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

Web araştırması promptunun omurgası: SORU + KAPSAM + KAYNAK KURALI + ÇIKTI. Sıra: (1) soru (tek cümle) ve neden lazım, (2) kapsam (zaman, bölge, kıyaslanacak şeyler), (3) kaynak kuralı, (4) çıktı biçimi, (5) güvenilirlik kuralları.

- Büyük soruyu alt sorulara böl ("1. … 2. … 3. …"); tek koca soru yüzeysel cevap getirir.
- Güncel bilgi (fiyat, kural, kim hangi görevde) için her kaynağın TARİHİNİ iste; tarihsiz kaynak güncel sayılmaz.
- Her iddianın yanına kaynak adı ve bağlantısı yazılsın. Bağlantı, alıntı, rakam ve kaynak UYDURMA; bulunamayan şey "bulunamadı" diye yazılsın.
- Kaynaklar çelişirse sessizce birini seçme; çelişkiyi ve kimin ne dediğini göster.
- Gerçek ile yorumu ayır: "Kaynakta yazan" ve "Benim çıkarımım" etiketleri.
- Arama özelliği olmayan bir modele güncel bilgi sorulursa model eski bilgiden tahmin yürütür; araç arama yapıyorsa bunu açıkça kullan ("web'de ara").

## Şablon

Araştırma sorusu: [soru]. Neden: [amaç]. Kapsam: [zaman / bölge / kıyaslanacaklar]. Kaynaklar: [kaynak kuralı]. Her kaynağın yayın tarihini yaz. Çıktı: [çıktı biçimi], [derinlik]. Kurallar: her iddianın yanına kaynak adı ve bağlantısı yaz; kaynak, bağlantı, alıntı ve rakam uydurma; bulamadığını "bulunamadı" diye yaz; kaynaklar çelişirse ikisini de göster; "kaynakta yazan" ile "çıkarım"ı ayır.

## Yap / Yapma

**Yap**
- Soruyu tek cümleyle ve amacıyla yaz.
- Zaman, bölge ve kaynak türünü belirt.
- Her kaynağın tarihini ve bağlantısını iste.
- Bulunamayanları listelemesini söyle.

**Yapma**
- Tek promptta çok farklı konuları toplama.
- "Hakkında her şeyi anlat" gibi sınırsız istek yazma.
- Sayı, alıntı ve bağlantıyı kontrolsüz kabul etme; kritik bilgiyi kaynaktan doğrula.
- Kaynak istemeden güncel bilgi bekleme.

## Örnekler

**Örnek 1 — karşılaştırma:** "İki muhasebe programının fiyatlarını karşılaştır"

```
Araştırma sorusu: küçük bir işletme için [program A] ile [program B] fiyat ve özelliklerini karşılaştır. Kapsam: yalnızca şu anki resmî fiyat sayfaları ve yardım sayfaları. Her kaynağın yayın ya da son güncelleme tarihini yaz. Çıktı: aynı ölçütlerle karşılaştırma tablosu (aylık fiyat, kullanıcı sınırı, fatura özelliği, destek); her satırın yanında kaynak bağlantısı olsun. Kurallar: kaynak, bağlantı ve rakam uydurma; bir fiyat bulunamazsa "bulunamadı" yaz; "kaynakta yazan" ile "çıkarım"ı ayır.
```

**Örnek 2 — son gelişmeler:** "Bir teknolojide son bir yılda neler oldu"

```
Araştırma sorusu: [teknoloji] alanında son bir yılın önemli gelişmeleri. Alt sorular: 1) Hangi yeni ürün ya da standartlar çıktı? 2) Hangi düzenlemeler değişti? 3) Uzmanlar neyi tartışıyor? Kaynaklar: güvenilir yayınlar ve resmî sayfalar; her kaynağın tarihi yazılsın. Çıktı: başlıklı rapor, her paragrafta kaynak. Kaynaklar çelişirse iki tarafı da göster. Sonda doğrulanamayanları listele.
```

Örnekler Türkçe yazıldı; prompt her zaman kullanıcının dilinde yazılır.

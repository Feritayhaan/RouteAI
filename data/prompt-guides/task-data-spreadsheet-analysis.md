---
# TASLAK — reviewedBy boş. Görev şablonu: araca özel sözdizimi içermez, hiçbir araca bağlı değildir.
# Araca özel rehberi olmayan HER araçta, "data.spreadsheet-analysis" işi için kullanılır (lib/promptBuilder/fallback.ts).
id: "task-data-spreadsheet-analysis"
version: 1
appliesTo: []
tasks: ["data.spreadsheet-analysis"]
modality: "data"
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
  - id: "summary"
    label:
      en: "Summarize the data"
      tr: "Veriyi özetle"
    value: "summarize the data: size, columns, ranges and notable features"
  - id: "trend"
    label:
      en: "Trends over time"
      tr: "Zaman içindeki eğilim"
    value: "find trends over time"
  - id: "compare"
    label:
      en: "Compare groups"
      tr: "Grupları karşılaştır"
    value: "compare groups on the same measures"
  - id: "top"
    label:
      en: "Top and bottom items"
      tr: "En iyi / en kötü kalemler"
    value: "find the top and bottom items"
  - id: "clean"
    label:
      en: "Find errors and clean"
      tr: "Hataları bul, temizle"
    value: "find errors, duplicates and missing values and suggest how to clean them"
  - id: "formula"
    label:
      en: "Write a formula"
      tr: "Formül yaz"
    value: "write a spreadsheet formula"
  - id: "forecast"
    label:
      en: "Simple forecast"
      tr: "Basit tahmin"
    value: "make a simple, clearly labeled forecast"
  default: "infer"
- id: "data"
  impact: "high"
  question:
    en: "How will you give the data?"
    tr: "Veriyi nasıl vereceksin?"
  options:
  - id: "file"
    label:
      en: "I will upload the file"
      tr: "Dosyayı yükleyeceğim"
    value: "the uploaded file"
  - id: "paste"
    label:
      en: "I paste a sample"
      tr: "Örnek satırları yapıştıracağım"
    value: "the pasted header row and sample rows"
  - id: "described"
    label:
      en: "I describe the columns"
      tr: "Sütunları tarif edeceğim"
    value: "the described columns"
  default: "infer"
- id: "output"
  impact: "high"
  question:
    en: "Answer form?"
    tr: "Cevap biçimi?"
  options:
  - id: "answer-table"
    label:
      en: "Short answer and a table"
      tr: "Kısa cevap ve tablo"
    value: "a short plain answer first, then a table with the numbers behind it"
  - id: "steps"
    label:
      en: "Step-by-step"
      tr: "Adım adım"
    value: "step by step, showing how each number was calculated"
  - id: "chart"
    label:
      en: "With chart suggestions"
      tr: "Grafik önerisiyle"
    value: "the findings plus the best chart type for each, with the exact columns to use"
  - id: "formulas"
    label:
      en: "With formulas"
      tr: "Formüllerle"
    value: "the findings plus the spreadsheet formulas that reproduce them"
  default: "answer-table"
- id: "rigor"
  impact: "high"
  question:
    en: "How careful?"
    tr: "Ne kadar titiz?"
  options:
  - id: "show"
    label:
      en: "Show calculations, state assumptions"
      tr: "Hesabı göster, varsayımları yaz"
    value: "show the calculation behind every number, state every assumption, and say how many rows were used"
  - id: "basic"
    label:
      en: "Just the result"
      tr: "Yalnız sonuç"
    value: "give the results"
  default: "show"
- id: "missing"
  impact: "medium"
  question:
    en: "Missing or odd values?"
    tr: "Eksik / garip değerler?"
  options:
  - id: "flag"
    label:
      en: "Flag them, do not fill"
      tr: "İşaretle, doldurma"
    value: "flag missing or odd values and do not fill them in or guess"
  - id: "exclude"
    label:
      en: "Exclude and say how many"
      tr: "Hariç tut, sayısını yaz"
    value: "exclude missing values and say how many rows were excluded"
  default: "flag"
- id: "scope"
  impact: "medium"
  question:
    en: "Which part of the data?"
    tr: "Verinin hangi kısmı?"
  options:
  - id: "all"
    label:
      en: "All of it"
      tr: "Hepsi"
    value: "all rows"
  - id: "range"
    label:
      en: "A period or group I name"
      tr: "Belirttiğim dönem / grup"
    value: "only the period or group the user names"
  default: "all"
- id: "privacy"
  impact: "low"
  question:
    en: "Personal data?"
    tr: "Kişisel veri?"
  options:
  - id: "anon"
    label:
      en: "Remove or mask it"
      tr: "Maskele"
    value: "do not repeat names, emails or other personal data in the answer; refer to rows by number"
  - id: "ok"
    label:
      en: "No personal data"
      tr: "Kişisel veri yok"
    value: "the data has no personal information"
  default: "anon"
refinements:
- id: "steps"
  label:
    en: "Show the steps"
    tr: "Adımları göster"
  patch:
    output: "step by step, showing how each number was calculated"
- id: "formulas"
  label:
    en: "Add formulas"
    tr: "Formül ekle"
  patch:
    output: "the findings plus the spreadsheet formulas that reproduce them"
- id: "chart"
  label:
    en: "Suggest charts"
    tr: "Grafik öner"
  patch:
    output: "the findings plus the best chart type for each, with the exact columns to use"
- id: "careful"
  label:
    en: "More careful"
    tr: "Daha titiz"
  patch:
    rigor: "show the calculation behind every number, state every assumption, and say how many rows were used"
- id: "flag"
  label:
    en: "Flag odd values"
    tr: "Garip değerleri işaretle"
  patch:
    missing: "flag missing or odd values and do not fill them in or guess"
- id: "short"
  label:
    en: "Shorter answer"
    tr: "Daha kısa cevap"
  instruction: "Give only the key findings in at most five short points."
- id: "check"
  label:
    en: "Add a check"
    tr: "Doğrulama ekle"
  instruction: "Add a quick way for the user to double-check the main numbers in the spreadsheet."
- id: "questions"
  label:
    en: "Ask about the columns"
    tr: "Sütunları sorsun"
  instruction: "If the meaning of a column is unclear, ask the user instead of assuming."
checklist: ["Exact question", "Columns and their meaning", "Sample rows or the file", "Which rows count (period, group)", "Calculations shown, assumptions stated", "Missing values flagged, not guessed", "No numbers that are not in the data", "Original data kept unchanged"]
validators:
- id: "length"
  type: "maxLength"
  value: 3000
  message: "RouteAI limit: keep the prompt under 3000 characters."
- id: "min-length"
  type: "regex"
  value: "^[\\s\\S]{60,}$"
  message: "Too short: state the question and describe the data."
- id: "no-braces"
  type: "regex"
  value: "^(?![\\s\\S]*(\\{\\{|\\}\\}))[\\s\\S]*$"
  message: "Remove unfilled {{placeholders}}; write the real content or a [clearly marked placeholder]."
---

## Sözdizimi

Üç resmî rehberin (OpenAI, Anthropic, Google) ortak önerisi: net ve belirli yaz; amacı, kitleyi ve çıktı biçimini söyle; bağlamı ve veriyi ayrı blokta ver; kısıtları "yap" diliyle yaz.

Tablo analizinde (Excel Copilot, ChatGPT veri analizi, Julius, Rows vb.) prompt'un işi **soruyu kesinleştirmek** ve **verinin anlamını söylemektir.** Model sütun başlığına bakıp yanlış varsayım yapabilir; sütunun ne anlama geldiğini yazmak hatayı büyük ölçüde azaltır.

**Sıra:** (1) soru (tek ve ölçülebilir), (2) veri tarifi: dosya adı ya da başlık satırı + birkaç örnek satır, her sütunun anlamı ve birimi, (3) kapsam (dönem, grup), (4) çıktı biçimi, (5) titizlik kuralları.

- **Soru ölçülebilir olsun:** "satışlar nasıl?" yerine "2024'te ay bazında toplam satış, bir önceki aya göre değişim yüzdesiyle".
- **Sütunları açıkla:** "Tutar = KDV hariç TL", "Tarih = sipariş tarihi (gün/ay/yıl)". Para birimi, birim ve tarih biçimini yaz.
- **Titizlik kuralları:** "her sayının hesabını göster; varsayımı yaz; kaç satır kullanıldığını söyle; eksik değeri uydurma, işaretle; veride olmayan sayı üretme."
- Büyük farkları ve garip değerleri (negatif miktar, tekrar eden satır) işaretletmek, sessizce düzeltmesinden iyidir.
- **Orijinal veriyi değiştirtme;** temizlik önerilerini ayrı bir kopyada uygulat.
- Gizlilik: ad, e-posta, kimlik gibi kişisel verileri yapıştırmadan önce maskele; gerekirse "satır numarasıyla anlat" kuralı koy.
- Çıktıdaki kritik sayıları elektronik tabloda kendin hızlıca doğrula (toplam, ortalama); modeller büyük tablolarda yanlış toplayabilir.

## Şablon

Soru: [ölçülebilir soru]. Veri: [dosya / başlık satırı ve örnek satırlar]. Sütunlar: [sütun adı = anlamı ve birimi]. Kapsam: [dönem / grup]. Çıktı: [biçim]. Kurallar: her sayının hesabını göster; varsayımları yaz; kaç satır kullanıldığını söyle; eksik ya da garip değerleri işaretle, doldurma ve tahmin etme; veride olmayan sayı üretme; orijinal veriyi değiştirme.

## Yap / Yapma

**Yap**
- Soruyu ölçülebilir yaz.
- Sütunların anlamını, birimini ve tarih biçimini belirt.
- Hesabı göstermesini ve varsayımları yazmasını iste.
- Ana sayıları tabloda kendin kontrol et.

**Yapma**
- "Bu veriyi analiz et" gibi sınırsız istek verme.
- Eksik değerleri sessizce doldurtma.
- Kişisel veriyi maskelemeden yapıştırma.
- Büyük toplamlara körü körüne güvenme.

## Örnekler

**Örnek 1 — satış:** "Aylık satış değişimini bul"

```
Soru: 2024 yılında ay bazında toplam satış tutarı ve bir önceki aya göre yüzde değişim nedir? Veri: yüklediğim satış dosyası. Sütunlar: Tarih = sipariş tarihi (gün/ay/yıl), Tutar = KDV hariç TL, Ürün = ürün adı. Çıktı: önce kısa bir cevap, sonra aylık sayıların tablosu. Kurallar: her sayının hesabını göster; varsayımları yaz; kaç satır kullanıldığını söyle; eksik ya da garip değerleri işaretle, doldurma; veride olmayan sayı üretme.
```

**Örnek 2 — formül:** "Excel'de koşullu toplam formülü"

```
Excel formülü yaz: B sütunundaki bölge "Marmara" ve C sütunundaki tarih 2024 olan satırların D sütunundaki tutarlarını toplasın. Veri: A1 başlık satırı, veriler 2. satırdan başlıyor; C sütunu gerçek tarih biçiminde. Formülü yaz, nasıl çalıştığını kısaca açıkla ve örnek bir satırla nasıl doğrulayacağımı göster.
```

Örnekler Türkçe yazıldı; prompt her zaman kullanıcının dilinde yazılır.

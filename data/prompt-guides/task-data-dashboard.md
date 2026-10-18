---
# TASLAK — reviewedBy boş. Görev şablonu: araca özel sözdizimi içermez, hiçbir araca bağlı değildir.
# Araca özel rehberi olmayan HER araçta, "data.dashboard" işi için kullanılır (lib/promptBuilder/fallback.ts).
id: "task-data-dashboard"
version: 1
appliesTo: []
tasks: ["data.dashboard"]
modality: "data"
promptLanguage: "user"
sources: ["https://developers.openai.com/api/docs/guides/prompt-engineering", "https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices", "https://ai.google.dev/gemini-api/docs/prompting-strategies"]
reviewedBy: ""
reviewedAt: ""
slots:
- id: "purpose"
  impact: "high"
  question:
    en: "What decisions should it support?"
    tr: "Hangi kararlara yardım etsin?"
  options:
  - id: "sales"
    label:
      en: "Sales performance"
      tr: "Satış performansı"
    value: "tracking sales performance"
  - id: "marketing"
    label:
      en: "Marketing results"
      tr: "Pazarlama sonuçları"
    value: "tracking marketing results"
  - id: "finance"
    label:
      en: "Money in and out"
      tr: "Gelir–gider"
    value: "tracking income and expenses"
  - id: "ops"
    label:
      en: "Operations or support"
      tr: "Operasyon / destek"
    value: "tracking operations or support work"
  - id: "product"
    label:
      en: "Product usage"
      tr: "Ürün kullanımı"
    value: "tracking product usage"
  - id: "team"
    label:
      en: "Team progress"
      tr: "Ekip ilerlemesi"
    value: "tracking team progress"
  default: "infer"
- id: "audience"
  impact: "high"
  question:
    en: "Who looks at it?"
    tr: "Kim bakacak?"
  options:
  - id: "execs"
    label:
      en: "Executives"
      tr: "Yöneticiler"
    value: "executives who want the key numbers at a glance"
  - id: "team"
    label:
      en: "The team"
      tr: "Ekip"
    value: "a team that needs details to act on"
  - id: "me"
    label:
      en: "Just me"
      tr: "Yalnız ben"
    value: "the owner"
  - id: "client"
    label:
      en: "A client"
      tr: "Müşteri"
    value: "a client"
  default: "infer"
- id: "kpis"
  impact: "high"
  question:
    en: "How are the key numbers defined?"
    tr: "Ana göstergeler nasıl tanımlı?"
  options:
  - id: "given"
    label:
      en: "I will define them"
      tr: "Ben tanımlayacağım"
    value: "use only the metric definitions the user gives and write each formula next to its metric"
  - id: "suggest"
    label:
      en: "Suggest and I confirm"
      tr: "Sen öner, ben onaylayayım"
    value: "suggest a few common metrics for the purpose, write each formula, and mark them as suggestions for the user to confirm"
  default: "given"
- id: "visuals"
  impact: "medium"
  question:
    en: "Main visuals?"
    tr: "Ana görseller?"
  options:
  - id: "cards-trend"
    label:
      en: "Number cards and trend lines"
      tr: "Sayı kartları ve çizgi grafik"
    value: "number cards for the key figures and trend lines over time"
  - id: "compare"
    label:
      en: "Bar comparisons"
      tr: "Çubuk karşılaştırma"
    value: "bar charts that compare categories"
  - id: "table"
    label:
      en: "Detailed table"
      tr: "Ayrıntılı tablo"
    value: "a detailed table with sorting and search"
  - id: "mixed"
    label:
      en: "Mix"
      tr: "Karışık"
    value: "number cards on top, one trend chart, one comparison chart and a detail table at the bottom"
  default: "mixed"
- id: "filters"
  impact: "medium"
  question:
    en: "Filters?"
    tr: "Filtreler?"
  options:
  - id: "time"
    label:
      en: "Date range"
      tr: "Tarih aralığı"
    value: "a date range filter"
  - id: "category"
    label:
      en: "Date and category"
      tr: "Tarih ve kategori"
    value: "filters for date range and category"
  - id: "none"
    label:
      en: "None"
      tr: "Yok"
    value: "no filters"
  default: "time"
- id: "data"
  impact: "medium"
  question:
    en: "What data is there?"
    tr: "Veri ne durumda?"
  options:
  - id: "described"
    label:
      en: "I describe the columns"
      tr: "Sütunları tarif edeceğim"
    value: "the columns described by the user"
  - id: "sample"
    label:
      en: "Sample data"
      tr: "Örnek veri"
    value: "clearly labeled sample data until the real data is connected"
  default: "described"
- id: "refresh"
  impact: "low"
  question:
    en: "How fresh?"
    tr: "Ne sıklıkla güncellensin?"
  options:
  - id: "manual"
    label:
      en: "Manual refresh"
      tr: "Elle"
    value: "manual refresh"
  - id: "daily"
    label:
      en: "Daily"
      tr: "Günlük"
    value: "daily refresh"
  - id: "live"
    label:
      en: "As live as possible"
      tr: "Mümkün olduğunca canlı"
    value: "as close to live as the data source allows"
  default: "daily"
refinements:
- id: "execs"
  label:
    en: "For executives"
    tr: "Yöneticiler için"
  patch:
    audience: "executives who want the key numbers at a glance"
- id: "detail"
  label:
    en: "More detail"
    tr: "Daha ayrıntılı"
  patch:
    audience: "a team that needs details to act on"
- id: "table"
  label:
    en: "Add a table"
    tr: "Tablo ekle"
  patch:
    visuals: "a detailed table with sorting and search"
- id: "mixed"
  label:
    en: "Mixed layout"
    tr: "Karışık düzen"
  patch:
    visuals: "number cards on top, one trend chart, one comparison chart and a detail table at the bottom"
- id: "filters"
  label:
    en: "Add filters"
    tr: "Filtre ekle"
  patch:
    filters: "filters for date range and category"
- id: "simple"
  label:
    en: "Simpler"
    tr: "Daha sade"
  instruction: "Cut it to at most four visuals and the most important number cards."
- id: "defs"
  label:
    en: "Define metrics"
    tr: "Göstergeleri tanımla"
  instruction: "Add a short definition and formula under each metric so everyone reads it the same way."
- id: "alerts"
  label:
    en: "Highlight changes"
    tr: "Değişimi vurgula"
  instruction: "Highlight numbers that moved a lot compared with the previous period and say what threshold is used as a placeholder for the user to set."
checklist: ["Purpose and decisions", "Audience", "Each metric with its formula", "Layout from top to bottom", "Filters and time range", "Data columns described", "Sample data labeled as sample", "No invented numbers"]
validators:
- id: "length"
  type: "maxLength"
  value: 3000
  message: "RouteAI limit: keep the prompt under 3000 characters."
- id: "min-length"
  type: "regex"
  value: "^[\\s\\S]{80,}$"
  message: "Too short: state the purpose, the metrics and the layout."
- id: "no-braces"
  type: "regex"
  value: "^(?![\\s\\S]*(\\{\\{|\\}\\}))[\\s\\S]*$"
  message: "Remove unfilled {{placeholders}}; write the real content or a [clearly marked placeholder]."
---

## Sözdizimi

Üç resmî rehberin (OpenAI, Anthropic, Google) ortak önerisi: net ve belirli yaz; amacı, kitleyi ve çıktı biçimini söyle; bağlamı ve veriyi ayrı blokta ver; kısıtları "yap" diliyle yaz.

Dashboard araçlarında (Power BI Copilot, Looker, Hex, Julius, Tableau Pulse vb.) prompt bir **gösterge tablosu brifidir:** hangi karara yardım edecek, kim bakacak, hangi göstergeler (formülüyle), hangi düzen. Tasarım ve grafik türü seçimini araç yapar; ama gösterge **tanımı** insan işidir.

**Sıra:** (1) amaç ve karar, (2) izleyici, (3) göstergeler ve formülleri, (4) veri (tablo/sütunlar), (5) düzen (üstten alta), (6) filtreler ve zaman aralığı, (7) güncelleme sıklığı.

- **Her göstergenin formülünü yaz** ("Dönüşüm oranı = siparişler ÷ ziyaretçiler"). Aynı isimli göstergeler farklı hesaplanabilir; belirsizlik yanlış karar demek.
- **Düzeni anlat:** "Üstte 4 sayı kartı, ortada aylık eğilim çizgisi, altta kategori karşılaştırması ve ayrıntı tablosu."
- Yönetici paneli kısa (az gösterge), ekip paneli ayrıntılı olur; kitleyi söyle.
- **Gerçek veri bağlanana kadar örnek veriyi açıkça "ÖRNEK" diye etiketlet;** uydurma sayıyı gerçek gibi göstermesin.
- Eşik ve hedef değerleri (ör. "kırmızı yan") yalnızca kullanıcı verdiyse yaz; vermediyse [eşik] yer tutucusu bırak.
- Veri kaynağı bağlantısı, yetkiler ve yenileme ayarları genelde araç ayarlarındadır; prompt'a kaynak şifresi ya da anahtar yazma.

## Şablon

[Amaç] için bir gösterge tablosu hazırla. İzleyici: [kim]. Göstergeler (formülüyle): [gösterge = formül]. Veri: [tablo ve sütunlar]. Düzen: [üstten alta]. Filtreler: [filtreler]. Güncelleme: [sıklık]. Kurallar: göstergeleri yalnızca verdiğim formüllerle hesapla; hedef ve eşik yoksa [eşik] yer tutucusu bırak; örnek veri kullanıyorsan açıkça "ÖRNEK" diye etiketle; sayı uydurma.

## Yap / Yapma

**Yap**
- Karar ve izleyiciyi söyle.
- Her göstergenin formülünü yaz.
- Düzeni üstten alta anlat.
- Örnek veriyi açıkça etiketlet.

**Yapma**
- Çok göstergeyi tek ekrana yığdırma.
- Gösterge tanımını belirsiz bırakma.
- Hedef/eşik değerlerini tahminle yazdırma.
- Kaynak şifrelerini prompta yazma.

## Örnekler

**Örnek 1 — satış paneli:** "Satış ekibi için haftalık panel"

```
Satış performansı için bir gösterge tablosu hazırla. İzleyici: satış ekibi. Göstergeler: Toplam satış = onaylanan siparişlerin tutar toplamı; Ortalama sepet = toplam satış ÷ sipariş sayısı; Yeni müşteri sayısı = ilk siparişini veren benzersiz müşteri. Veri: Siparişler tablosu (tarih, müşteri, tutar, durum). Düzen: üstte üç sayı kartı, ortada haftalık satış eğilimi, altta temsilci bazlı karşılaştırma ve ayrıntı tablosu. Filtre: tarih aralığı ve temsilci. Güncelleme: günlük. Hedef değerleri bilmiyorum, [hedef] bırak; sayı uydurma.
```

**Örnek 2 — gelir–gider:** "Küçük işletme için basit panel"

```
Gelir–gider takibi için sade bir panel hazırla. İzleyici: yalnız ben. Göstergeler: Aylık gelir, aylık gider, net = gelir − gider. Veri: işlemler tablosu (tarih, tür, kategori, tutar). Düzen: üstte üç kart, altta aylık net çizgi grafiği ve kategori bazlı gider çubukları. Gerçek veri bağlanana kadar örnek veriyi "ÖRNEK" diye etiketle.
```

Örnekler Türkçe yazıldı; prompt her zaman kullanıcının dilinde yazılır.

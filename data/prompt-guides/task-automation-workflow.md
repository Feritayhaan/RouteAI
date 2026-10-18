---
# TASLAK — reviewedBy boş. Görev şablonu: araca özel sözdizimi içermez, hiçbir araca bağlı değildir.
# Araca özel rehberi olmayan HER araçta, "automation.workflow" işi için kullanılır (lib/promptBuilder/fallback.ts).
id: "task-automation-workflow"
version: 1
appliesTo: []
tasks: ["automation.workflow"]
modality: "automation"
promptLanguage: "user"
sources: ["https://developers.openai.com/api/docs/guides/prompt-engineering", "https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices", "https://ai.google.dev/gemini-api/docs/prompting-strategies"]
reviewedBy: ""
reviewedAt: ""
slots:
- id: "trigger"
  impact: "high"
  question:
    en: "What starts it?"
    tr: "Ne başlatsın?"
  options:
  - id: "email"
    label:
      en: "A new email"
      tr: "Yeni e-posta"
    value: "a new email arrives"
  - id: "form"
    label:
      en: "A form is submitted"
      tr: "Form gönderilince"
    value: "a form is submitted"
  - id: "row"
    label:
      en: "A new spreadsheet row"
      tr: "Tabloya yeni satır"
    value: "a new row is added to a spreadsheet"
  - id: "schedule"
    label:
      en: "A schedule"
      tr: "Zamanlama"
    value: "a schedule such as every weekday morning"
  - id: "message"
    label:
      en: "A new chat message"
      tr: "Yeni sohbet mesajı"
    value: "a new chat message arrives"
  - id: "webhook"
    label:
      en: "An event from another system"
      tr: "Başka sistemden olay"
    value: "an event arrives from another system"
  default: "infer"
- id: "action"
  impact: "high"
  question:
    en: "What should happen?"
    tr: "Ne olsun?"
  options:
  - id: "notify"
    label:
      en: "Send a notification"
      tr: "Bildirim gönder"
    value: "send a notification"
  - id: "record"
    label:
      en: "Create or update a record"
      tr: "Kayıt oluştur / güncelle"
    value: "create or update a record in another app"
  - id: "ai"
    label:
      en: "Use AI to read, classify or write"
      tr: "Yapay zekâ okusun, sınıflasın, yazsın"
    value: "use an AI step to read, classify or write something"
  - id: "file"
    label:
      en: "Save or move a file"
      tr: "Dosya kaydet / taşı"
    value: "save or move a file"
  - id: "report"
    label:
      en: "Send a regular report"
      tr: "Düzenli rapor gönder"
    value: "compile and send a regular report"
  default: "infer"
- id: "safety"
  impact: "high"
  question:
    en: "Should a person approve first?"
    tr: "Önce insan onaylasın mı?"
  options:
  - id: "approve"
    label:
      en: "Yes, before anything is sent outside"
      tr: "Evet, dışarıya bir şey gitmeden"
    value: "a person approves before anything is sent to customers or other outside people"
  - id: "internal"
    label:
      en: "Only for outside messages"
      tr: "Yalnız dış mesajlarda"
    value: "automatic for internal steps; a person approves anything sent outside"
  - id: "automatic"
    label:
      en: "Fully automatic"
      tr: "Tam otomatik"
    value: "fully automatic, with a log of every run"
  default: "approve"
- id: "apps"
  impact: "medium"
  question:
    en: "Which apps?"
    tr: "Hangi uygulamalar?"
  options:
  - id: "named"
    label:
      en: "I will name them"
      tr: "Ben yazacağım"
    value: "only the apps the user names"
  - id: "suggest"
    label:
      en: "Suggest common ones"
      tr: "Yaygın olanları öner"
    value: "suggest common apps for each step, labeled as suggestions"
  default: "named"
- id: "conditions"
  impact: "medium"
  question:
    en: "Any conditions?"
    tr: "Koşullar?"
  options:
  - id: "none"
    label:
      en: "Run every time"
      tr: "Her seferinde çalışsın"
    value: "run every time"
  - id: "filter"
    label:
      en: "Only when a rule is met"
      tr: "Yalnız kural sağlanınca"
    value: "run only when the rule the user gives is met"
  - id: "branch"
    label:
      en: "Different paths"
      tr: "Farklı yollar"
    value: "follow different paths depending on the rule the user gives"
  default: "none"
- id: "errors"
  impact: "medium"
  question:
    en: "If a step fails?"
    tr: "Bir adım hata verirse?"
  options:
  - id: "notify"
    label:
      en: "Tell me"
      tr: "Bana haber ver"
    value: "notify the owner with the error and the data that failed"
  - id: "retry"
    label:
      en: "Retry, then tell me"
      tr: "Tekrar dene, sonra haber ver"
    value: "retry once, then notify the owner"
  default: "notify"
- id: "output"
  impact: "medium"
  question:
    en: "Result form?"
    tr: "Sonuç biçimi?"
  options:
  - id: "steps"
    label:
      en: "Numbered steps"
      tr: "Numaralı adımlar"
    value: "numbered steps in the form When X happens, then do Y, then Z, with the data fields passed between steps"
  - id: "diagram"
    label:
      en: "Steps and a test plan"
      tr: "Adımlar ve test planı"
    value: "numbered steps plus a short test plan using a sample item"
  default: "steps"
refinements:
- id: "approve"
  label:
    en: "Require approval"
    tr: "Onay iste"
  patch:
    safety: "a person approves before anything is sent to customers or other outside people"
- id: "filter"
  label:
    en: "Add a condition"
    tr: "Koşul ekle"
  patch:
    conditions: "run only when the rule the user gives is met"
- id: "retry"
  label:
    en: "Retry on error"
    tr: "Hatada tekrar dene"
  patch:
    errors: "retry once, then notify the owner"
- id: "test"
  label:
    en: "Add a test plan"
    tr: "Test planı ekle"
  patch:
    output: "numbered steps plus a short test plan using a sample item"
- id: "simple"
  label:
    en: "Fewer steps"
    tr: "Daha az adım"
  instruction: "Reduce it to the fewest steps that still do the job."
- id: "fields"
  label:
    en: "List the data fields"
    tr: "Veri alanlarını listele"
  instruction: "For every step list which data fields come in and which go out."
- id: "log"
  label:
    en: "Add a log"
    tr: "Kayıt tut"
  instruction: "Add a step that logs each run (time, item, result) in a spreadsheet or log tool the user names."
- id: "limits"
  label:
    en: "Mention limits"
    tr: "Sınırları belirt"
  instruction: "Note which steps might hit rate limits or need extra permissions, without inventing exact numbers."
checklist: ["One clear trigger", "Actions in order", "Data fields passed between steps", "Conditions stated", "Human approval for anything sent outside", "What happens when a step fails", "Test with a sample item", "No secrets or invented app features"]
validators:
- id: "length"
  type: "maxLength"
  value: 3000
  message: "RouteAI limit: keep the prompt under 3000 characters."
- id: "min-length"
  type: "regex"
  value: "^[\\s\\S]{80,}$"
  message: "Too short: say what starts the workflow and what it should do."
- id: "no-braces"
  type: "regex"
  value: "^(?![\\s\\S]*(\\{\\{|\\}\\}))[\\s\\S]*$"
  message: "Remove unfilled {{placeholders}}; write the real content or a [clearly marked placeholder]."
---

## Sözdizimi

Üç resmî rehberin (OpenAI, Anthropic, Google) ortak önerisi: net ve belirli yaz; amacı, kitleyi ve çıktı biçimini söyle; bağlamı ve veriyi ayrı blokta ver; kısıtları "yap" diliyle yaz.

Otomasyon araçlarında (Zapier, Make, n8n, IFTTT vb.) prompt bir **iş akışı tarifidir:** "X olunca → Y yap → sonra Z". Araçların yapay zekâ düzenleyicileri bu tarifi akışa çevirmeye çalışır; tarif ne kadar net ise o kadar az düzeltme gerekir.

**Sıra:** (1) tetikleyici (tek), (2) adımlar (sırayla), (3) her adımda hangi veri alanı kullanılır, (4) koşullar/dallar, (5) onay noktaları, (6) hata durumu, (7) test planı.

- **Tek tetikleyici** seç; birden çok tetikleyici ayrı akışlar olur.
- Adımları numaralı yaz ve her adımın girdi/çıktı alanlarını adlandır ("e-postanın konusu → görev başlığı").
- **İnsan onayı:** müşteriye ya da dışarıya giden her mesaj, ödeme ve silme işlemi için onay adımı iste; tam otomatik yalnızca iç ve geri alınabilir adımlarda.
- **Yapay zekâ adımı** varsa ne yapacağını ve çıktı biçimini ayrıca yaz ("e-postayı 'acil / normal / önemsiz' diye sınıfla; yalnızca bu üç kelimeden birini ver").
- **Hata durumu:** ne olacağını söyle (sahibine haber ver, bir kez tekrar dene).
- **Test:** akışı açmadan önce örnek bir kayıtla denemeyi iste.
- Bir uygulamanın özelliği ya da bağlayıcısı olduğundan emin değilsen uydurma; "bu uygulamada böyle bir bağlayıcı yoksa alternatifi öner" kuralı ekle. Şifre, API anahtarı ve gizli bilgiyi prompt'a yazma; araçta bağlantı olarak kur.
- Sınır ve fiyat rakamı uydurma.

## Şablon

Bir otomasyon akışı tasarla. Tetikleyici: [tek tetikleyici]. Adımlar (sırayla): 1) [adım], 2) [adım], 3) [adım]. Her adımda kullanılan veri alanları: [alanlar]. Koşullar: [koşul]. Onay: [hangi adımlarda insan onayı]. Hata olursa: [ne yapılsın]. Uygulamalar: [uygulamalar]. Çıktı: numaralı adımlar ve örnek kayıtla test planı. Kurallar: bir uygulamanın özelliğinden emin değilsen uydurma, söyle ve alternatif öner; şifre ve anahtar yazma; sınır ya da fiyat rakamı uydurma.

## Yap / Yapma

**Yap**
- "X olunca → Y yap" biçiminde yaz.
- Adımlar arası veri alanlarını adlandır.
- Dışarıya giden mesaj ve ödeme için onay adımı koy.
- Örnek kayıtla test iste.

**Yapma**
- Birden çok tetikleyiciyi tek akışta toplama.
- Gizli anahtarları prompta yazma.
- Müşteriye otomatik mesajı onaysız kurma.
- Aracın olmayan bağlayıcılarını varsayma.

## Örnekler

**Örnek 1 — form:** "Web sitesi formundan gelen talepleri takip et"

```
Bir otomasyon akışı tasarla. Tetikleyici: web sitemdeki iletişim formu gönderildiğinde. Adımlar: 1) Form alanlarını (ad, e-posta, mesaj) al. 2) Mesajı bir yapay zekâ adımıyla "satış / destek / diğer" diye sınıfla; yalnızca bu üç kelimeden birini ver. 3) Bir tabloya yeni satır ekle (ad, e-posta, mesaj, sınıf, tarih). 4) Sınıf "satış" ise bana bildirim gönder. Onay: müşteriye giden bir mesaj yok, o yüzden onay gerekmiyor. Hata olursa bir kez tekrar dene, sonra bana haber ver. Çıktı: numaralı adımlar ve örnek bir form kaydıyla test planı. Bir uygulamada bağlayıcıdan emin değilsen söyle.
```

**Örnek 2 — rapor:** "Her pazartesi haftalık özet e-postası"

```
Tetikleyici: her pazartesi sabahı. Adımlar: 1) Geçen haftanın satırlarını tablodan al. 2) Toplam ve ortalamayı hesapla. 3) Kısa bir özet metni yaz. 4) Özeti taslak olarak bana gönder; ben onaylamadan ekibe gitmesin. Hata olursa bana haber ver.
```

Örnekler Türkçe yazıldı; prompt her zaman kullanıcının dilinde yazılır.

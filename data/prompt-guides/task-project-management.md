---
# TASLAK — reviewedBy boş. Görev şablonu: araca özel sözdizimi içermez, hiçbir araca bağlı değildir.
# Araca özel rehberi olmayan HER araçta, "project.management" işi için kullanılır (lib/promptBuilder/fallback.ts).
id: "task-project-management"
version: 1
appliesTo: []
tasks: ["project.management"]
modality: "automation"
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
  - id: "breakdown"
    label:
      en: "Break the project into tasks"
      tr: "Projeyi görevlere böl"
    value: "break the project into milestones and tasks"
  - id: "brief"
    label:
      en: "Project brief"
      tr: "Proje özeti"
    value: "write a one-page project brief"
  - id: "plan"
    label:
      en: "Plan with timeline"
      tr: "Zaman çizelgeli plan"
    value: "make a plan with a timeline"
  - id: "status"
    label:
      en: "Status update"
      tr: "Durum raporu"
    value: "write a status update"
  - id: "risks"
    label:
      en: "Risks and blockers"
      tr: "Riskler ve engeller"
    value: "list risks and how to reduce each one"
  - id: "meeting"
    label:
      en: "Tasks from meeting notes"
      tr: "Toplantı notlarından görevler"
    value: "turn meeting notes into tasks with owners"
  default: "infer"
- id: "project"
  impact: "high"
  question:
    en: "What kind of project?"
    tr: "Nasıl bir proje?"
  options:
  - id: "software"
    label:
      en: "Software or product"
      tr: "Yazılım / ürün"
    value: "a software or product project"
  - id: "marketing"
    label:
      en: "Marketing campaign"
      tr: "Pazarlama kampanyası"
    value: "a marketing campaign"
  - id: "event"
    label:
      en: "Event"
      tr: "Etkinlik"
    value: "an event"
  - id: "content"
    label:
      en: "Content production"
      tr: "İçerik üretimi"
    value: "a content production project"
  - id: "personal"
    label:
      en: "Personal project"
      tr: "Kişisel proje"
    value: "a personal project"
  - id: "operations"
    label:
      en: "Process improvement"
      tr: "Süreç iyileştirme"
    value: "a process improvement project"
  default: "infer"
- id: "level"
  impact: "high"
  question:
    en: "How detailed?"
    tr: "Ne kadar ayrıntılı?"
  options:
  - id: "milestones"
    label:
      en: "Milestones only"
      tr: "Yalnız aşamalar"
    value: "milestones only"
  - id: "tasks"
    label:
      en: "Milestones and tasks"
      tr: "Aşamalar ve görevler"
    value: "milestones with tasks under each"
  - id: "subtasks"
    label:
      en: "Tasks and subtasks"
      tr: "Görevler ve alt görevler"
    value: "milestones, tasks and subtasks"
  default: "tasks"
- id: "time"
  impact: "medium"
  question:
    en: "How should dates be handled?"
    tr: "Tarihler nasıl ele alınsın?"
  options:
  - id: "relative"
    label:
      en: "Relative (week 1, week 2)"
      tr: "Göreli (1. hafta, 2. hafta)"
    value: "relative timing such as week 1 and week 2, unless the user gives real dates"
  - id: "given"
    label:
      en: "Use my deadline"
      tr: "Teslim tarihimi kullan"
    value: "plan backwards from the deadline the user gives"
  default: "relative"
- id: "team"
  impact: "medium"
  question:
    en: "Who is on the team?"
    tr: "Ekipte kim var?"
  options:
  - id: "solo"
    label:
      en: "Just me"
      tr: "Yalnız ben"
    value: "one person doing everything"
  - id: "named"
    label:
      en: "People I name"
      tr: "Adını vereceklerim"
    value: "only the people and roles the user names"
  default: "solo"
- id: "fields"
  impact: "medium"
  question:
    en: "What should each task include?"
    tr: "Her görevde ne olsun?"
  options:
  - id: "basic"
    label:
      en: "Title, owner, priority"
      tr: "Başlık, sorumlu, öncelik"
    value: "title, owner, priority and a clear \"done when\" line"
  - id: "full"
    label:
      en: "Plus estimate and dependencies"
      tr: "Tahmin ve bağımlılık da"
    value: "title, owner, priority, a \"done when\" line, a time estimate if the user gives one, and dependencies"
  default: "basic"
- id: "output"
  impact: "low"
  question:
    en: "Result form?"
    tr: "Sonuç biçimi?"
  options:
  - id: "list"
    label:
      en: "Numbered list"
      tr: "Numaralı liste"
    value: "a numbered list ready to paste into a task tool"
  - id: "table"
    label:
      en: "Table"
      tr: "Tablo"
    value: "a table ready to paste into a task tool"
  default: "list"
refinements:
- id: "subtasks"
  label:
    en: "Add subtasks"
    tr: "Alt görev ekle"
  patch:
    level: "milestones, tasks and subtasks"
- id: "milestones"
  label:
    en: "Milestones only"
    tr: "Yalnız aşamalar"
  patch:
    level: "milestones only"
- id: "table"
  label:
    en: "As a table"
    tr: "Tablo olarak"
  patch:
    output: "a table ready to paste into a task tool"
- id: "full"
  label:
    en: "Add estimates"
    tr: "Tahmin ve bağımlılık ekle"
  patch:
    fields: "title, owner, priority, a \"done when\" line, a time estimate if the user gives one, and dependencies"
- id: "deadline"
  label:
    en: "Plan from my deadline"
    tr: "Teslim tarihimden planla"
  patch:
    time: "plan backwards from the deadline the user gives"
- id: "risks"
  label:
    en: "Add risks"
    tr: "Risk ekle"
  instruction: "Add a short list of the main risks and a first step to reduce each."
- id: "simple"
  label:
    en: "Simpler"
    tr: "Daha sade"
  instruction: "Cut it to the smallest set of tasks that still delivers the result."
- id: "assume"
  label:
    en: "List assumptions"
    tr: "Varsayımları yaz"
  instruction: "List every assumption you made at the end, so the user can correct them."
checklist: ["Project goal and what \"done\" means", "Deadline or relative timing", "Team and roles named by the user", "Milestones then tasks", "Each task has a clear done-when line", "Only the user's dates and names", "Assumptions listed", "Ready to paste into a task tool"]
validators:
- id: "length"
  type: "maxLength"
  value: 3000
  message: "RouteAI limit: keep the prompt under 3000 characters."
- id: "min-length"
  type: "regex"
  value: "^[\\s\\S]{60,}$"
  message: "Too short: state the project, the goal and the timeline."
- id: "no-braces"
  type: "regex"
  value: "^(?![\\s\\S]*(\\{\\{|\\}\\}))[\\s\\S]*$"
  message: "Remove unfilled {{placeholders}}; write the real content or a [clearly marked placeholder]."
---

## Sözdizimi

Üç resmî rehberin (OpenAI, Anthropic, Google) ortak önerisi: net ve belirli yaz; amacı, kitleyi ve çıktı biçimini söyle; bağlamı ve veriyi ayrı blokta ver; kısıtları "yap" diliyle yaz.

Proje yönetimi araçlarında (Asana, ClickUp, Notion AI, Monday, Linear vb.) yapay zekâ en çok **işi görevlere bölme, plan ve özet** için kullanılır. İyi bir prompt **"bitti" tanımını** ve kısıtları (süre, ekip) verir.

**Sıra:** (1) iş, (2) proje ve hedef ("bitti" ne demek), (3) süre/teslim, (4) ekip ve roller, (5) ayrıntı düzeyi, (6) her görevde bulunacak alanlar, (7) çıktı biçimi.

- **Hedefi ve "bitti" ölçütünü yaz:** "Mart sonunda yayında olan, ilk 50 kullanıcıyla denenmiş bir sürüm."
- **Tarih kuralı:** kullanıcı gerçek tarih vermediyse göreli zaman ("1. hafta") kullan; takvim tarihi uydurma. Teslim tarihi varsa ondan geriye doğru planla.
- **Sorumlular:** yalnızca kullanıcının verdiği kişi ve rolleri kullan; olmayan kişi ya da sorumlu uydurma. Yoksa [sorumlu] bırak.
- **Süre tahmini:** kullanıcı vermediyse sayı uydurma; "küçük/orta/büyük" gibi göreli boyut ya da [tahmin] kullan.
- Her görev için kısa bir **"bitti ölçütü"** iste; belirsiz görevler (ör. "pazarlamayı hallet") ilerlemeyi ölçülemez yapar.
- Toplantı notundan görev çıkarırken yalnızca notta geçen görev ve kişileri kullan; belirsiz olanı "belirtilmemiş" yaz.
- Çıktıyı aracın içe aktarma biçimine uygun (numaralı liste ya da tablo) iste. **Varsayımları sonda listelet.**

## Şablon

İş: [proje görevleri / plan / durum raporu]. Proje: [tür ve hedef]; "bitti" şu demek: [ölçüt]. Süre: [teslim tarihi / göreli süre]. Ekip: [kişiler ve roller]. Ayrıntı: [aşamalar / görevler / alt görevler]. Her görevde: başlık, sorumlu, öncelik, "bitti ölçütü". Çıktı: [numaralı liste / tablo]. Kurallar: tarih, kişi ve süre tahmini uydurma, yoksa [yer tutucu] bırak; sonda varsayımları listele.

## Yap / Yapma

**Yap**
- Hedefi ve "bitti" ölçütünü yaz.
- Teslim tarihini ya da göreli süreyi belirt.
- Ekip ve rolleri ver.
- Her görev için bitti ölçütü iste.

**Yapma**
- Takvim tarihi, kişi ya da süre uydurtma.
- "Projeyi planla" gibi hedefsiz istek verme.
- Çok ayrıntılı alt görevlerle küçük işi şişirme.
- Varsayımları gizli bırakma.

## Örnekler

**Örnek 1 — görev listesi:** "Yeni web sitesi lansmanı"

```
İş: projeyi aşamalara ve görevlere böl. Proje: küçük işletmem için yeni web sitesi; "bitti" şu demek: yayında, mobilde denenmiş ve iletişim formu çalışıyor. Süre: göreli (1. hafta, 2. hafta…), yaklaşık altı hafta. Ekip: yalnız ben, bir freelance tasarımcı destek veriyor. Ayrıntı: aşamalar ve altlarında görevler. Her görevde: başlık, sorumlu, öncelik, "bitti ölçütü". Çıktı: yapıştırılabilir numaralı liste. Takvim tarihi, kişi ve süre tahmini uydurma; sonda varsayımlarını listele.
```

**Örnek 2 — toplantıdan görev:** "Toplantı notlarını görevlere çevir"

```
Aşağıdaki toplantı notlarını görevlere çevir. Her görev için: başlık, sorumlu, son tarih, bitti ölçütü. Yalnızca notlarda geçen görev, kişi ve tarihleri kullan; belirtilmeyeni "belirtilmemiş" yaz. Çıktı: tablo.

[Notlar]
```

Örnekler Türkçe yazıldı; prompt her zaman kullanıcının dilinde yazılır.

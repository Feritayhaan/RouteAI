---
# TASLAK — reviewedBy boş. Görev şablonu: araca özel sözdizimi içermez, hiçbir araca bağlı değildir.
# Araca özel rehberi olmayan HER araçta, "productivity.planning" işi için kullanılır (lib/promptBuilder/fallback.ts).
id: "task-productivity-planning"
version: 1
appliesTo: []
tasks: ["productivity.planning"]
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
  - id: "day"
    label:
      en: "Plan my day"
      tr: "Günümü planla"
    value: "plan the user's day"
  - id: "week"
    label:
      en: "Plan my week"
      tr: "Haftamı planla"
    value: "plan the user's week"
  - id: "prioritize"
    label:
      en: "Prioritize my tasks"
      tr: "Görevlerimi önceliklendir"
    value: "prioritize the task list"
  - id: "replan"
    label:
      en: "Fix a plan that fell apart"
      tr: "Bozulan planı düzelt"
    value: "rebuild the plan after changes"
  - id: "focus"
    label:
      en: "Protect focus time"
      tr: "Odak zamanı ayır"
    value: "schedule protected focus blocks around the meetings"
  default: "infer"
- id: "tasks"
  impact: "high"
  question:
    en: "Tasks and durations?"
    tr: "Görevler ve süreler?"
  options:
  - id: "given"
    label:
      en: "I list them with durations"
      tr: "Süreleriyle ben listeleyeceğim"
    value: "the tasks and durations the user lists"
  - id: "no-duration"
    label:
      en: "Tasks without durations"
      tr: "Süresiz görevler"
    value: "the tasks the user lists; ask for or mark missing durations instead of guessing them"
  default: "given"
- id: "fixed"
  impact: "high"
  question:
    en: "Fixed commitments?"
    tr: "Sabit programlar?"
  options:
  - id: "listed"
    label:
      en: "I list meetings and appointments"
      tr: "Toplantı ve randevuları yazacağım"
    value: "the meetings and appointments the user lists, which cannot move"
  - id: "none"
    label:
      en: "Nothing fixed"
      tr: "Sabit program yok"
    value: "no fixed commitments"
  default: "listed"
- id: "hours"
  impact: "high"
  question:
    en: "Working hours?"
    tr: "Çalışma saatleri?"
  options:
  - id: "stated"
    label:
      en: "I state them"
      tr: "Ben yazacağım"
    value: "the working hours the user states"
  - id: "standard"
    label:
      en: "A normal day"
      tr: "Normal gün"
    value: "a normal working day; ask the user to confirm the hours"
  default: "stated"
- id: "energy"
  impact: "medium"
  question:
    en: "When are you at your best?"
    tr: "En verimli olduğun zaman?"
  options:
  - id: "morning"
    label:
      en: "Morning"
      tr: "Sabah"
    value: "put demanding work in the morning"
  - id: "afternoon"
    label:
      en: "Afternoon"
      tr: "Öğleden sonra"
    value: "put demanding work in the afternoon"
  - id: "evening"
    label:
      en: "Evening"
      tr: "Akşam"
    value: "put demanding work in the evening"
  default: "morning"
- id: "buffer"
  impact: "medium"
  question:
    en: "Breaks and buffers?"
    tr: "Mola ve tampon?"
  options:
  - id: "some"
    label:
      en: "Short breaks and buffers"
      tr: "Kısa mola ve tampon"
    value: "short breaks and a buffer between tasks, plus slack for the unexpected"
  - id: "tight"
    label:
      en: "Tight schedule"
      tr: "Sıkı program"
    value: "a tight schedule with minimal breaks"
  default: "some"
- id: "output"
  impact: "medium"
  question:
    en: "Result form?"
    tr: "Sonuç biçimi?"
  options:
  - id: "blocks"
    label:
      en: "Time-blocked schedule"
      tr: "Saat saat program"
    value: "a time-blocked schedule listing time, task and why it is there"
  - id: "list"
    label:
      en: "Ordered list"
      tr: "Sıralı liste"
    value: "an ordered priority list with suggested time estimates the user can adjust"
  default: "blocks"
- id: "overload"
  impact: "low"
  question:
    en: "If it does not fit?"
    tr: "Sığmazsa?"
  options:
  - id: "say"
    label:
      en: "Tell me and propose what to move"
      tr: "Söyle, neyin ertelenebileceğini öner"
    value: "say clearly that it does not fit and propose which tasks to move or drop, without squeezing them in"
  - id: "compress"
    label:
      en: "Shorten low-priority tasks first"
      tr: "Önce düşük öncelikleri kısalt"
    value: "shorten breaks and low-priority tasks first, and say exactly what was shortened"
  default: "say"
refinements:
- id: "week"
  label:
    en: "Plan the week"
    tr: "Haftayı planla"
  patch:
    need: "plan the user's week"
- id: "focus"
  label:
    en: "More focus time"
    tr: "Daha çok odak zamanı"
  patch:
    need: "schedule protected focus blocks around the meetings"
- id: "buffer"
  label:
    en: "Add buffers"
    tr: "Tampon ekle"
  patch:
    buffer: "short breaks and a buffer between tasks, plus slack for the unexpected"
- id: "tight"
  label:
    en: "Tighter"
    tr: "Daha sıkı"
  patch:
    buffer: "a tight schedule with minimal breaks"
- id: "list"
  label:
    en: "As a list"
    tr: "Liste olarak"
  patch:
    output: "an ordered priority list with suggested time estimates the user can adjust"
- id: "top3"
  label:
    en: "Top 3 first"
    tr: "Önce 3 öncelik"
  instruction: "Start by picking the three most important tasks and put them in the best time slots first."
- id: "reasons"
  label:
    en: "Explain choices"
    tr: "Seçimleri açıkla"
  instruction: "For each block add one short reason why it is at that time."
- id: "later"
  label:
    en: "What can wait"
    tr: "Neler beklesin"
  instruction: "End with a short list of tasks that can safely wait, and why."
checklist: ["Tasks with durations from the user", "Fixed meetings that cannot move", "Working hours", "Top priorities first", "Buffers and breaks", "Says clearly when it does not fit", "No invented meetings, tasks or durations", "Demanding work at the user's best time"]
validators:
- id: "length"
  type: "maxLength"
  value: 3000
  message: "RouteAI limit: keep the prompt under 3000 characters."
- id: "min-length"
  type: "regex"
  value: "^[\\s\\S]{60,}$"
  message: "Too short: list the tasks, the fixed commitments and the working hours."
- id: "no-braces"
  type: "regex"
  value: "^(?![\\s\\S]*(\\{\\{|\\}\\}))[\\s\\S]*$"
  message: "Remove unfilled {{placeholders}}; write the real content or a [clearly marked placeholder]."
---

## Sözdizimi

Üç resmî rehberin (OpenAI, Anthropic, Google) ortak önerisi: net ve belirli yaz; amacı, kitleyi ve çıktı biçimini söyle; bağlamı ve veriyi ayrı blokta ver; kısıtları "yap" diliyle yaz.

Planlama araçlarında (Motion, Reclaim, Sunsama, Akiflow, Todoist, Notion Calendar vb.) yapay zekâ görevleri takvime yerleştirir. Güvenilir sonuç için üç şeyi bilmesi gerekir: **görevler ve süreleri**, **sabit programlar**, **çalışma saatleri.** Biri eksikse model tahmin eder ve plan çöker.

**Sıra:** (1) iş (gün/hafta/öncelik), (2) görevler ve süreleri, (3) sabit programlar (kaydırılamaz), (4) çalışma saatleri, (5) en verimli zaman, (6) mola/tampon, (7) sığmama kuralı, (8) çıktı biçimi.

- **Görev + süre:** "Rapor taslağı — 90 dk", "Müşteri e-postaları — 30 dk". Süre yoksa model tahmin etmesin; "süresi olmayanlar için bana sor" de.
- **Sabit programları** başlangıç–bitiş saatiyle yaz; modelin toplantı ya da görev UYDURMASINA izin verme.
- **Öncelik:** önce en önemli 1–3 görev en iyi saate konsun. Zor işleri kullanıcının en verimli saatine yerleştirt.
- **Tampon ve mola** ekle: dolu plan, ilk aksamada bozulur.
- **Sığmazsa** söylesin ve neyin ertelenebileceğini önersin; her şeyi sıkıştırarak "başarılı" gösterme.
- Çıktı: saat saat program, her blokta kısa bir neden. Aracın takvim bağlantısı varsa onay almadan takvime yazmasına izin verme.
- Saat dilimini ve günün tarihini kullanıcı vermediyse varsayma.

## Şablon

İş: [günü / haftayı planla / öncelik sırala]. Görevler (süreleriyle): [liste]. Sabit programlar (kaydırılamaz): [toplantılar ve saatleri]. Çalışma saatleri: [saatler]. En verimli zamanım: [zaman]; zor işleri oraya koy. Mola ve tampon: [tercih]. Çıktı: [saat saat program, her blokta kısa neden]. Kurallar: yalnızca verdiğim görev, toplantı ve süreleri kullan; süresi olmayanlar için bana sor; sığmazsa söyle ve neyin ertelenebileceğini öner; toplantı ya da görev uydurma.

## Yap / Yapma

**Yap**
- Görevleri süreleriyle ver.
- Sabit programları saatleriyle yaz.
- Çalışma saatlerini ve verimli zamanı belirt.
- Sığmayan durumda ne yapılacağını söyle.

**Yapma**
- Süresiz görevleri modelin tahminine bırakma.
- Her dakikayı doldurtma; tampon bırak.
- Toplantı ya da görev uydurtma.
- Takvime onaysız yazmasına izin verme.

## Örnekler

**Örnek 1 — gün planı:** "Yarın için gün planı"

```
İş: yarınki günümü planla. Görevler (süreleriyle): Rapor taslağı — 90 dk; Müşteri e-postaları — 30 dk; Fatura kontrolü — 45 dk; Haftalık plan — 20 dk. Sabit programlar: 11:00–12:00 ekip toplantısı; 15:00–15:30 müşteri görüşmesi. Çalışma saatleri: 09:00–18:00, 12:30–13:30 öğle arası. En verimli zamanım: sabah; zor işleri oraya koy. Mola ve tampon: kısa mola ve görevler arası tampon. Çıktı: saat saat program, her blokta kısa neden. Kurallar: yalnızca verdiğim görev ve programları kullan; sığmazsa söyle ve neyin ertelenebileceğini öner; toplantı ya da görev uydurma.
```

**Örnek 2 — öncelik:** "Görev listemi önceliklendir"

```
Aşağıdaki görev listesini önceliklendir. Önce en önemli üç görevi seç ve nedenini yaz; sonra kalanları sırala. Süresi olmayan görevler için bana sor; süre uydurma. Beklemesi sorun olmayanları ayrı bir listede göster.

[Görev listesi]
```

Örnekler Türkçe yazıldı; prompt her zaman kullanıcının dilinde yazılır.

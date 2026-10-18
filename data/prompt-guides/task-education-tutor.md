---
# TASLAK — reviewedBy boş. Görev şablonu: araca özel sözdizimi içermez, hiçbir araca bağlı değildir.
# Araca özel rehberi olmayan HER araçta, "education.tutor" işi için kullanılır (lib/promptBuilder/fallback.ts).
id: "task-education-tutor"
version: 1
appliesTo: []
tasks: ["education.tutor"]
modality: "text"
promptLanguage: "user"
sources: ["https://developers.openai.com/api/docs/guides/prompt-engineering", "https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices", "https://ai.google.dev/gemini-api/docs/prompting-strategies"]
reviewedBy: ""
reviewedAt: ""
slots:
- id: "level"
  impact: "high"
  question:
    en: "What is your level?"
    tr: "Seviyen ne?"
  options:
  - id: "primary"
    label:
      en: "Primary school"
      tr: "İlkokul"
    value: "primary school"
  - id: "middle"
    label:
      en: "Middle school"
      tr: "Ortaokul"
    value: "middle school"
  - id: "high"
    label:
      en: "High school"
      tr: "Lise"
    value: "high school"
  - id: "university"
    label:
      en: "University"
      tr: "Üniversite"
    value: "university"
  - id: "adult"
    label:
      en: "Self-learner"
      tr: "Kendi kendine öğrenen"
    value: "an adult self-learner"
  default: "infer"
- id: "mode"
  impact: "high"
  question:
    en: "How should it help?"
    tr: "Nasıl yardım etsin?"
  options:
  - id: "explain"
    label:
      en: "Explain the concept"
      tr: "Konuyu anlatsın"
    value: "explain the concept"
  - id: "solve"
    label:
      en: "Solve step by step"
      tr: "Adım adım çözsün"
    value: "solve the problem step by step and explain each step"
  - id: "quiz"
    label:
      en: "Quiz me"
      tr: "Beni sınasın"
    value: "quiz the learner with questions, one at a time"
  - id: "check"
    label:
      en: "Check my answer"
      tr: "Cevabımı kontrol etsin"
    value: "check the learner's answer and explain mistakes"
  - id: "plan"
    label:
      en: "Make a study plan"
      tr: "Çalışma planı yapsın"
    value: "make a study plan"
  default: "infer"
- id: "method"
  impact: "high"
  question:
    en: "Hints or direct answers?"
    tr: "İpucu mu, direkt cevap mı?"
  options:
  - id: "hints"
    label:
      en: "Hints first (Socratic)"
      tr: "Önce ipucu"
    value: "guide with hints and questions first; give the full answer only if the learner asks"
  - id: "direct"
    label:
      en: "Direct explanation"
      tr: "Direkt anlatım"
    value: "explain directly and clearly"
  default: "hints"
- id: "style"
  impact: "medium"
  question:
    en: "Which explanation style?"
    tr: "Anlatım biçimi?"
  options:
  - id: "analogy"
    label:
      en: "Everyday analogies"
      tr: "Günlük benzetmeler"
    value: "everyday analogies"
  - id: "examples"
    label:
      en: "Worked examples"
      tr: "Çözümlü örnekler"
    value: "worked examples"
  - id: "visual"
    label:
      en: "Described visuals"
      tr: "Tarif edilen görseller"
    value: "verbal descriptions of diagrams"
  - id: "stories"
    label:
      en: "Short stories"
      tr: "Kısa hikâyeler"
    value: "short stories"
  default: "infer"
- id: "pace"
  impact: "medium"
  question:
    en: "Pace?"
    tr: "Tempo?"
  options:
  - id: "slow"
    label:
      en: "Slow, small steps"
      tr: "Yavaş, küçük adımlar"
    value: "slow, in small steps"
  - id: "normal"
    label:
      en: "Normal"
      tr: "Normal"
    value: "a normal pace"
  - id: "fast"
    label:
      en: "Fast, concise"
      tr: "Hızlı, öz"
    value: "fast and concise"
  default: "normal"
- id: "check"
  impact: "medium"
  question:
    en: "Check understanding?"
    tr: "Anlayıp anlamadığımı kontrol etsin mi?"
  options:
  - id: "yes"
    label:
      en: "Yes, end with a question"
      tr: "Evet, soruyla bitirsin"
    value: "end with one short question that checks understanding"
  - id: "no"
    label:
      en: "No"
      tr: "Hayır"
    value: "no comprehension question"
  default: "yes"
- id: "language"
  impact: "low"
  question:
    en: "Language?"
    tr: "Dil?"
  options:
  - id: "mine"
    label:
      en: "My language"
      tr: "Benim dilim"
    value: "the user's own language"
  - id: "simple"
    label:
      en: "Very simple words"
      tr: "Çok sade sözcükler"
    value: "very simple words"
  default: "mine"
refinements:
- id: "hints"
  label:
    en: "Hints only"
    tr: "Sadece ipucu"
  patch:
    method: "guide with hints and questions first; give the full answer only if the learner asks"
- id: "direct"
  label:
    en: "Explain directly"
    tr: "Direkt anlat"
  patch:
    method: "explain directly and clearly"
- id: "slower"
  label:
    en: "Slower"
    tr: "Daha yavaş"
  patch:
    pace: "slow, in small steps"
- id: "analogy"
  label:
    en: "With analogies"
    tr: "Benzetmelerle"
  patch:
    style: "everyday analogies"
- id: "examples"
  label:
    en: "Worked examples"
    tr: "Çözümlü örneklerle"
  patch:
    style: "worked examples"
- id: "quiz"
  label:
    en: "Quiz me"
    tr: "Beni sına"
  patch:
    mode: "quiz the learner with questions, one at a time"
- id: "simpler"
  label:
    en: "Simpler words"
    tr: "Daha sade"
  patch:
    language: "very simple words"
- id: "summary"
  label:
    en: "Summary card"
    tr: "Özet kartı"
  instruction: "End with a short summary card of the key ideas and one common mistake to avoid."
checklist: ["Level and topic", "Mode: explain, solve, quiz or check", "Hints before answers when learning", "Step by step, small steps", "Checks understanding", "Does not state wrong facts confidently", "Language fitting the level"]
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

Öğretmen/özel ders promptu bir ROL + YÖNTEM tanımıdır. Sıra: (1) rol ("sabırlı bir öğretmensin"), (2) öğrencinin seviyesi ve konu, (3) mod (anlat, çöz, sına, kontrol et), (4) yöntem (önce ipucu mu, direkt cevap mı), (5) anlatım biçimi ve tempo, (6) anlama kontrolü.

- Ödev ve öğrenme için "önce ipucu ver, tam cevabı yalnızca isteyince ver" yöntemi öğrenmeyi destekler; kullanıcı doğrudan cevap istiyorsa onu seç.
- Sorunu/konuyu ve öğrencinin kendi çözümünü ayrı bloklarda ver: yapay zekâ hatayı bulabilsin.
- "Emin değilsen söyle, yanlış bilgiyi kesin gibi söyleme" kuralını ekle; matematik ve sayısal işlemlerde adımları göstermesini iste.
- Seviyeye uygun dil iste; tek seferde tek kavram anlatılsın.

## Şablon

Sen sabırlı bir [alan] öğretmenisin. Öğrenci: [seviye]. Konu: [konu]. Mod: [anlat/çöz/sına/kontrol et]. Yöntem: [önce ipucu / direkt anlatım]. Tempo: [tempo]. Anlatım: [benzetme/örnek]. Kurallar: tek seferde tek kavram; adımları göster; emin olmadığın yerleri söyle, yanlış bilgiyi kesin gibi verme; sonunda anlayıp anlamadığımı tek bir soruyla kontrol et.

[Öğrencinin sorusu ya da çözümü]

## Yap / Yapma

**Yap**
- Seviyeyi ve konuyu açıkça yaz.
- Modu seç: anlat, çöz, sına ya da kontrol et.
- Öğrencinin kendi çözümünü ayrı blokta ver.
- İşlem adımlarını göstermesini iste.

**Yapma**
- Ödevi tek seferde bitirtip öğrenmeyi atlatma (öğrenmek istiyorsan ipucu yöntemini seç).
- Seviyeye uymayan terimlerle anlattırma.
- Kaynak ve kesin bilgi uydurtma.
- Tek promptta çok farklı konuları toplama.

## Örnekler

**Örnek 1 — ipucu yöntemi:** "İkinci derece denklem çözemiyorum"

```
Sen sabırlı bir matematik öğretmenisin. Öğrenci: lise düzeyi. Konu: ikinci derece denklemler. Mod: adım adım çöz. Yöntem: önce ipucu ver ve bana sorular sor; tam çözümü yalnızca istersem göster. Tempo: yavaş, küçük adımlar. Tek seferde tek adım ilerle ve her adımın sonunda anladığımı kontrol et.

Denklem: [denklem]
Şu ana kadar yaptığım: [çözümüm]
```

**Örnek 2 — sınav:** "Fotosentez konusundan beni sına"

```
Sen bir biyoloji öğretmenisin. Öğrenci: ortaokul düzeyi. Konu: fotosentez. Mod: beni sına; her seferinde tek soru sor, cevabımı değerlendir, yanlışsa nedenini basitçe açıkla, sonra bir sonraki soruya geç. Kolaydan zora ilerle. Emin olmadığın bilgiyi kesinmiş gibi söyleme.
```

Örnekler Türkçe yazıldı; prompt her zaman kullanıcının dilinde yazılır.

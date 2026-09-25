---
# TASLAK — reviewedBy boş. Resmi dokümana erişilemedi; sözdizimi bölümleri KAYNAK GEREKLİ.
id: "chat-general"
version: 1
appliesTo: ["chatgpt-gpt-5", "claude-ai-claude-4", "gemini-25-pro"]
modality: "text"
promptLanguage: "user"
sources: []
reviewedBy: ""
reviewedAt: ""
slots:
- id: "role"
  impact: "high"
  question:
    en: "Which role should the assistant take?"
    tr: "Asistan hangi rolde olsun?"
  options:
  - id: "expert"
    label:
      en: "Subject expert"
      tr: "Konu uzmanı"
    value: "a subject-matter expert"
  - id: "editor"
    label:
      en: "Editor"
      tr: "Editör"
    value: "an editor"
  - id: "teacher"
    label:
      en: "Teacher"
      tr: "Öğretmen"
    value: "a patient teacher"
  - id: "analyst"
    label:
      en: "Analyst"
      tr: "Analist"
    value: "an analyst"
  default: "infer"
- id: "format"
  impact: "high"
  question:
    en: "What output format?"
    tr: "Çıktı nasıl olsun?"
  options:
  - id: "bullets"
    label:
      en: "Bullet list"
      tr: "Madde listesi"
    value: "a bullet list"
  - id: "table"
    label:
      en: "Table"
      tr: "Tablo"
    value: "a table"
  - id: "paragraph"
    label:
      en: "Short text"
      tr: "Kısa metin"
    value: "a short paragraph"
  - id: "steps"
    label:
      en: "Step by step"
      tr: "Adım adım"
    value: "numbered steps"
  default: "infer"
- id: "audience"
  impact: "medium"
  question:
    en: "Who is it for?"
    tr: "Kimin için?"
  options:
  - id: "beginner"
    label:
      en: "Beginner"
      tr: "Yeni başlayan"
    value: "a beginner"
  - id: "pro"
    label:
      en: "Professional"
      tr: "Profesyonel"
    value: "a professional"
  - id: "exec"
    label:
      en: "Executive"
      tr: "Yönetici"
    value: "an executive"
  default: "infer"
- id: "length"
  impact: "medium"
  question:
    en: "How long?"
    tr: "Ne uzunlukta?"
  options:
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
  - id: "long"
    label:
      en: "Detailed"
      tr: "Detaylı"
    value: "detailed"
  default: "medium"
- id: "tone"
  impact: "low"
  question:
    en: "What tone?"
    tr: "Nasıl bir ton?"
  options:
  - id: "neutral"
    label:
      en: "Neutral"
      tr: "Nötr"
    value: "neutral"
  - id: "friendly"
    label:
      en: "Friendly"
      tr: "Samimi"
    value: "friendly"
  - id: "formal"
    label:
      en: "Formal"
      tr: "Resmî"
    value: "formal"
  default: "neutral"
refinements:
- id: "shorter"
  label:
    en: "Shorter"
    tr: "Daha kısa"
  patch:
    length: "short"
- id: "more-detail"
  label:
    en: "More detail"
    tr: "Daha detaylı"
  patch:
    length: "detailed"
- id: "table"
  label:
    en: "As a table"
    tr: "Tablo olarak"
  patch:
    format: "a table"
- id: "simpler"
  label:
    en: "Simpler"
    tr: "Daha basit"
  patch:
    audience: "a beginner"
- id: "formal"
  label:
    en: "More formal"
    tr: "Daha resmî"
  patch:
    tone: "formal"
- id: "examples"
  label:
    en: "Add examples"
    tr: "Örnek ekle"
  instruction: "Ask for one concrete example per point."
- id: "steps"
  label:
    en: "Step by step"
    tr: "Adım adım"
  patch:
    format: "numbered steps"
checklist: ["Role", "Context", "Task", "Output format", "Constraints"]
validators:
- id: "length"
  type: "maxLength"
  value: 6000
  message: "RouteAI limit: keep the prompt under 6000 characters."
---

## Sözdizimi

KAYNAK GEREKLİ — ChatGPT, Claude ve Gemini resmi dokümantasyonuna bu rehber yazılırken erişilemedi. Ferit resmi dokümandan doldurup `sources` alanına sayfa URL'lerini eklemeli.

## Şablon

RouteAI iskeleti (doğrulanmadı, araca özel sözdizimi içermez): Rol: [rol]. Bağlam: [bağlam]. Görev: [görev]. Format: [format], [uzunluk]. Kısıtlar: [kısıtlar]. Kitle: [kitle]. Ton: [ton].

## Yap / Yapma

KAYNAK GEREKLİ — ChatGPT, Claude ve Gemini resmi dokümantasyonuna bu rehber yazılırken erişilemedi. Ferit resmi dokümandan doldurup `sources` alanına sayfa URL'lerini eklemeli.

## Örnekler

KAYNAK GEREKLİ — ChatGPT, Claude ve Gemini resmi dokümantasyonuna bu rehber yazılırken erişilemedi. Ferit resmi dokümandan doldurup `sources` alanına sayfa URL'lerini eklemeli.

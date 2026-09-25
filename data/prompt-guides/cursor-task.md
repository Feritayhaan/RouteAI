---
# TASLAK — reviewedBy boş. Resmi dokümana erişilemedi; sözdizimi bölümleri KAYNAK GEREKLİ.
id: "cursor-task"
version: 1
appliesTo: ["cursor"]
modality: "code"
promptLanguage: "user"
sources: []
reviewedBy: ""
reviewedAt: ""
slots:
- id: "goal"
  impact: "high"
  question:
    en: "What kind of change?"
    tr: "Nasıl bir değişiklik?"
  options:
  - id: "feature"
    label:
      en: "New feature"
      tr: "Yeni özellik"
    value: "add a feature"
  - id: "bugfix"
    label:
      en: "Bug fix"
      tr: "Hata düzeltme"
    value: "fix a bug"
  - id: "refactor"
    label:
      en: "Refactor"
      tr: "Yeniden düzenleme"
    value: "refactor"
  - id: "tests"
    label:
      en: "Tests"
      tr: "Testler"
    value: "write tests"
  default: "infer"
- id: "scope"
  impact: "high"
  question:
    en: "How big is the change?"
    tr: "Değişiklik ne kadar büyük?"
  options:
  - id: "single"
    label:
      en: "One file"
      tr: "Tek dosya"
    value: "a single file"
  - id: "few"
    label:
      en: "A few files"
      tr: "Birkaç dosya"
    value: "a few related files"
  - id: "project"
    label:
      en: "Across the project"
      tr: "Projenin geneli"
    value: "across the project"
  default: "infer"
- id: "constraints"
  impact: "medium"
  question:
    en: "Any hard constraint?"
    tr: "Uyulması gereken kural?"
  options:
  - id: "api"
    label:
      en: "Don't change the public API"
      tr: "Dış API değişmesin"
    value: "do not change the public API"
  - id: "style"
    label:
      en: "Follow existing style"
      tr: "Mevcut stile uy"
    value: "follow the existing code style"
  - id: "deps"
    label:
      en: "No new dependencies"
      tr: "Yeni bağımlılık yok"
    value: "no new dependencies"
  default: "infer"
- id: "verification"
  impact: "medium"
  question:
    en: "How do we know it works?"
    tr: "Çalıştığını nasıl anlarız?"
  options:
  - id: "tests"
    label:
      en: "Run tests"
      tr: "Testleri çalıştır"
    value: "run the test suite"
  - id: "typecheck"
    label:
      en: "Typecheck + lint"
      tr: "Tip kontrolü + lint"
    value: "run typecheck and lint"
  - id: "manual"
    label:
      en: "Manual check"
      tr: "Elle kontrol"
    value: "describe a manual check"
  default: "infer"
- id: "context"
  impact: "low"
  question:
    en: "What context can you give?"
    tr: "Hangi bağlamı verebilirsin?"
  options:
  - id: "error"
    label:
      en: "Error message"
      tr: "Hata mesajı"
    value: "the error message"
  - id: "files"
    label:
      en: "File paths"
      tr: "Dosya yolları"
    value: "relevant file paths"
  - id: "none"
    label:
      en: "Nothing yet"
      tr: "Henüz yok"
    value: "no extra context"
  default: "infer"
refinements:
- id: "add-tests"
  label:
    en: "Require tests"
    tr: "Test şart"
  patch:
    verification: "run the test suite"
- id: "small-steps"
  label:
    en: "Smaller steps"
    tr: "Küçük adımlar"
  instruction: "Break the task into small, reviewable steps."
- id: "narrow"
  label:
    en: "Narrower scope"
    tr: "Kapsamı daralt"
  patch:
    scope: "a single file"
- id: "acceptance"
  label:
    en: "Acceptance criteria"
    tr: "Kabul kriterleri"
  instruction: "Add explicit acceptance criteria as a checklist."
- id: "no-deps"
  label:
    en: "No new dependencies"
    tr: "Yeni bağımlılık yok"
  patch:
    constraints: "no new dependencies"
- id: "plan-first"
  label:
    en: "Plan first"
    tr: "Önce plan"
  instruction: "Ask the agent to propose a plan and wait before editing."
checklist: ["Goal in one sentence", "Scope and files", "Constraints", "How to verify", "Acceptance criteria"]
validators:
- id: "length"
  type: "maxLength"
  value: 4000
  message: "RouteAI limit: keep the prompt under 4000 characters."
---

## Sözdizimi

KAYNAK GEREKLİ — Cursor resmi dokümantasyonuna bu rehber yazılırken erişilemedi. Ferit resmi dokümandan doldurup `sources` alanına sayfa URL'lerini eklemeli.

## Şablon

RouteAI iskeleti (doğrulanmadı, araca özel sözdizimi içermez): Görev: [amaç]. Kapsam: [kapsam]. Bağlam: [bağlam]. Kurallar: [kısıtlar]. Doğrulama: [doğrulama]. Kabul kriterleri: [liste].

## Yap / Yapma

KAYNAK GEREKLİ — Cursor resmi dokümantasyonuna bu rehber yazılırken erişilemedi. Ferit resmi dokümandan doldurup `sources` alanına sayfa URL'lerini eklemeli.

## Örnekler

KAYNAK GEREKLİ — Cursor resmi dokümantasyonuna bu rehber yazılırken erişilemedi. Ferit resmi dokümandan doldurup `sources` alanına sayfa URL'lerini eklemeli.

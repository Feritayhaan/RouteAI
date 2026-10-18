---
# TASLAK — reviewedBy boş. Görev şablonu: araca özel sözdizimi içermez, hiçbir araca bağlı değildir.
# Araca özel rehberi olmayan HER araçta, "code.assistant-ide" işi için kullanılır (lib/promptBuilder/fallback.ts).
id: "task-code-assistant-ide"
version: 1
appliesTo: []
tasks: ["code.assistant-ide"]
modality: "code"
promptLanguage: "user"
sources: ["https://cursor.com/blog/agent-best-practices", "https://code.claude.com/docs/en/best-practices.md", "https://developers.openai.com/api/docs/guides/prompt-engineering", "https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices"]
reviewedBy: ""
reviewedAt: ""
slots:
- id: "job"
  impact: "high"
  question:
    en: "What do you want the assistant to do?"
    tr: "Asistan ne yapsın?"
  options:
  - id: "new"
    label:
      en: "Write new code"
      tr: "Yeni kod yaz"
    value: "write new code"
  - id: "change"
    label:
      en: "Change existing code"
      tr: "Mevcut kodu değiştir"
    value: "change existing code"
  - id: "refactor"
    label:
      en: "Refactor"
      tr: "Yeniden düzenle"
    value: "refactor without changing behavior"
  - id: "explain"
    label:
      en: "Explain code"
      tr: "Kodu açıkla"
    value: "explain how the code works"
  - id: "tests"
    label:
      en: "Write tests"
      tr: "Test yaz"
    value: "write tests"
  - id: "review"
    label:
      en: "Review code"
      tr: "Kodu gözden geçir"
    value: "review the code and point out problems"
  default: "infer"
- id: "scope"
  impact: "high"
  question:
    en: "How big is the job?"
    tr: "İş ne kadar büyük?"
  options:
  - id: "function"
    label:
      en: "One function"
      tr: "Tek fonksiyon"
    value: "one function"
  - id: "file"
    label:
      en: "One file"
      tr: "Tek dosya"
    value: "one file"
  - id: "few"
    label:
      en: "A few related files"
      tr: "Birkaç ilgili dosya"
    value: "a few related files"
  - id: "feature"
    label:
      en: "A whole feature"
      tr: "Bütün bir özellik"
    value: "a whole feature, in small steps"
  default: "file"
- id: "language"
  impact: "high"
  question:
    en: "Which language?"
    tr: "Hangi dil?"
  options:
  - id: "python"
    label:
      en: "Python"
      tr: "Python"
    value: "Python"
  - id: "js"
    label:
      en: "JavaScript / TypeScript"
      tr: "JavaScript / TypeScript"
    value: "JavaScript or TypeScript"
  - id: "csharp"
    label:
      en: "C#"
      tr: "C#"
    value: "C#"
  - id: "java"
    label:
      en: "Java / Kotlin"
      tr: "Java / Kotlin"
    value: "Java or Kotlin"
  - id: "go"
    label:
      en: "Go"
      tr: "Go"
    value: "Go"
  - id: "other"
    label:
      en: "Another language"
      tr: "Başka bir dil"
    value: "the language the user names"
  default: "infer"
- id: "verify"
  impact: "high"
  question:
    en: "How will you check it works?"
    tr: "Çalıştığını nasıl kontrol edeceksin?"
  options:
  - id: "tests"
    label:
      en: "Run tests"
      tr: "Testleri çalıştırırım"
    value: "include tests the user can run, plus the exact command to run them"
  - id: "cases"
    label:
      en: "Example inputs and outputs"
      tr: "Örnek girdi–çıktılar"
    value: "include example inputs and the expected outputs to check by hand"
  - id: "manual"
    label:
      en: "Manual steps"
      tr: "Elle deneme adımları"
    value: "include short manual steps to try it and what to expect"
  default: "tests"
- id: "constraints"
  impact: "medium"
  question:
    en: "Any rules to follow?"
    tr: "Uyulacak kurallar?"
  options:
  - id: "style"
    label:
      en: "Follow existing style"
      tr: "Mevcut stile uy"
    value: "follow the existing code style, naming and patterns of the project"
  - id: "no-deps"
    label:
      en: "No new dependencies"
      tr: "Yeni bağımlılık ekleme"
    value: "do not add new dependencies"
  - id: "api"
    label:
      en: "Keep public API unchanged"
      tr: "Genel arayüz değişmesin"
    value: "keep the public interfaces and behavior that other code uses unchanged"
  - id: "minimal"
    label:
      en: "Smallest change"
      tr: "En küçük değişiklik"
    value: "make the smallest change that solves the problem and nothing unrelated"
  default: "style"
- id: "plan"
  impact: "medium"
  question:
    en: "Plan first?"
    tr: "Önce plan mı?"
  options:
  - id: "direct"
    label:
      en: "Just do it"
      tr: "Direkt yap"
    value: "implement directly"
  - id: "plan"
    label:
      en: "Plan first, then wait"
      tr: "Önce plan, onay bekle"
    value: "first write a short plan and wait for approval before changing code"
  default: "direct"
- id: "output"
  impact: "medium"
  question:
    en: "Result form?"
    tr: "Sonuç biçimi?"
  options:
  - id: "code"
    label:
      en: "Code only"
      tr: "Yalnız kod"
    value: "the code only"
  - id: "explained"
    label:
      en: "Code and a short explanation"
      tr: "Kod ve kısa açıklama"
    value: "the code and a short explanation of what changed and why"
  - id: "diff"
    label:
      en: "Only the changed parts"
      tr: "Yalnız değişen kısımlar"
    value: "only the changed parts, with the file name for each"
  default: "explained"
- id: "edge"
  impact: "low"
  question:
    en: "Edge cases?"
    tr: "Uç durumlar?"
  options:
  - id: "handle"
    label:
      en: "Handle them"
      tr: "Ele alsın"
    value: "handle empty input, invalid input and errors, and say how"
  - id: "basic"
    label:
      en: "Happy path first"
      tr: "Önce normal akış"
    value: "cover the normal case first"
  default: "handle"
refinements:
- id: "plan"
  label:
    en: "Plan first"
    tr: "Önce plan"
  patch:
    plan: "first write a short plan and wait for approval before changing code"
- id: "minimal"
  label:
    en: "Smaller change"
    tr: "Daha küçük değişiklik"
  patch:
    constraints: "make the smallest change that solves the problem and nothing unrelated"
- id: "tests"
  label:
    en: "Add tests"
    tr: "Test ekle"
  patch:
    verify: "include tests the user can run, plus the exact command to run them"
- id: "explain"
  label:
    en: "Explain more"
    tr: "Daha çok açıkla"
  patch:
    output: "the code and a short explanation of what changed and why"
- id: "diff"
  label:
    en: "Only changes"
    tr: "Yalnız değişenler"
  patch:
    output: "only the changed parts, with the file name for each"
- id: "no-deps"
  label:
    en: "No new libraries"
    tr: "Yeni kütüphane yok"
  patch:
    constraints: "do not add new dependencies"
- id: "edge"
  label:
    en: "Handle edge cases"
    tr: "Uç durumları ele al"
  patch:
    edge: "handle empty input, invalid input and errors, and say how"
- id: "unsure"
  label:
    en: "Say when unsure"
    tr: "Emin değilse söylesin"
  instruction: "If you are not sure a function, option or library exists, say so instead of guessing, and name the part to check in the documentation."
checklist: ["Clear goal in one sentence", "Language and framework named", "Relevant files or code pasted", "Existing style or pattern to follow", "Constraints (dependencies, public interfaces)", "How to verify it works", "Unrelated changes ruled out", "Says when unsure instead of guessing an API"]
validators:
- id: "length"
  type: "maxLength"
  value: 3000
  message: "RouteAI limit: keep the prompt under 3000 characters."
- id: "min-length"
  type: "regex"
  value: "^[\\s\\S]{60,}$"
  message: "Too short: state the goal, the language and how to check the result."
- id: "no-braces"
  type: "regex"
  value: "^(?![\\s\\S]*(\\{\\{|\\}\\}))[\\s\\S]*$"
  message: "Remove unfilled {{placeholders}}; write the real content or a [clearly marked placeholder]."
---

## Sözdizimi

IDE içindeki yapay zekâ asistanları (Cursor, GitHub Copilot, JetBrains AI vb.) için en iyi sonuç, görevi **belirli, küçük ve doğrulanabilir** vermekten gelir. Cursor ve Claude Code rehberlerinin ortak önerisi: bağlamı somut ver (dosya, desen), işin nasıl doğrulanacağını söyle, büyük işi küçük adımlara böl.

**Sıra:** (1) hedef (tek cümle), (2) dil/çerçeve ve ilgili dosyalar, (3) uyulacak mevcut desen veya stil, (4) kısıtlar, (5) doğrulama yolu, (6) çıktı biçimi.

- **Bağlam ver:** ilgili kodu yapıştır ya da dosya adlarıyla göster; kodu görmeden yazılan çözüm tahmindir. Projedeki benzer bir örneği "bu dosyadaki deseni izle" diye işaret et.
- **Doğrulama ekle:** test, örnek girdi–çıktı ya da elle deneme adımı. Doğrulanamayan kod, kullanıcıyı tek denetçi bırakır.
- **Kapsamı sınırla:** "yalnızca X'i değiştir; ilgisiz refactor yapma; yeni bağımlılık ekleme" kuralları gereksiz değişiklikleri önler.
- **Uydurma API'ye karşı kural:** "Bir fonksiyon, parametre ya da kütüphane özelliğinden emin değilsen söyle; uydurma, dokümanda bakılacak yeri yaz."
- Büyük işte önce kısa plan iste ve onaydan sonra uygulat.
- Hata varsa tam hata iletisini ve ilgili kodu ver (hata ayıklama için ayrı görev rehberi vardır).
- Gizli anahtar, şifre ve kişisel veri yapıştırma; yer tutucu kullan.

## Şablon

Hedef: [tek cümle]. Dil/çerçeve: [dil]. İlgili kod/dosyalar: [yapıştırılan kod veya dosya adları]. Uy: [mevcut desen/stil]. Kısıtlar: [bağımlılık, genel arayüz]. Doğrulama: [test / örnek girdi–çıktı / elle adımlar]. Kurallar: yalnızca istenen değişikliği yap, ilgisiz düzenleme yapma; emin olmadığın bir API ya da seçeneği uydurma, söyle. Çıktı: [biçim].

## Yap / Yapma

**Yap**
- Hedefi tek cümleyle, kapsamı küçük ver.
- İlgili kodu ya da dosya adlarını ekle.
- Nasıl doğrulanacağını yaz (test, örnek, adımlar).
- Büyük işte önce plan iste.

**Yapma**
- "Uygulamamı düzelt" gibi belirsiz iş verme.
- Kodu görmeden değişiklik isteme.
- Yeni bağımlılık ve ilgisiz düzenlemeye izin verme.
- Şifre, anahtar ve gizli veriyi yapıştırma.

## Örnekler

**Örnek 1 — yeni fonksiyon:** "Kullanıcı girdisini temizleyen fonksiyon"

```
Hedef: kullanıcıdan gelen ad-soyad metnini temizleyen bir fonksiyon yaz (baş/son boşlukları sil, ardışık boşlukları teke indir, her kelimeyi büyük harfle başlat). Dil: Python. Uy: projedeki mevcut isimlendirme ve tip ipuçları stili. Kısıtlar: yeni bağımlılık ekleme. Doğrulama: beş örnek girdi ve beklenen çıktıyı ver; bunları çalıştıran bir pytest testi ekle ve çalıştırma komutunu yaz. Boş ve geçersiz girdiyi ele al. Emin olmadığın bir fonksiyonu uydurma. Çıktı: kod ve kısa açıklama.
```

**Örnek 2 — refactor:** "Uzun bir fonksiyonu böl"

```
Hedef: aşağıdaki fonksiyonu davranışını değiştirmeden daha küçük fonksiyonlara böl. Dil: TypeScript. Kısıtlar: dışarıdan çağrılan fonksiyon adı ve parametreleri aynı kalsın; yeni bağımlılık yok; ilgisiz düzenleme yok. Önce kısa bir plan yaz ve onayımı bekle. Doğrulama: mevcut testler geçmeli; geçmesi gereken komutu yaz.

[Fonksiyon kodu]
```

Örnekler Türkçe yazıldı; prompt her zaman kullanıcının dilinde yazılır (kod ve hata iletileri olduğu gibi kalır).

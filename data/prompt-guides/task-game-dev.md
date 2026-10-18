---
# TASLAK — reviewedBy boş. Görev şablonu: araca özel sözdizimi içermez, hiçbir araca bağlı değildir.
# Araca özel rehberi olmayan HER araçta, "game.dev" işi için kullanılır (lib/promptBuilder/fallback.ts).
id: "task-game-dev"
version: 1
appliesTo: []
tasks: ["game.dev"]
modality: "code"
promptLanguage: "user"
sources: ["https://cursor.com/blog/agent-best-practices", "https://code.claude.com/docs/en/best-practices.md", "https://developers.openai.com/api/docs/guides/prompt-engineering", "https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices"]
reviewedBy: ""
reviewedAt: ""
slots:
- id: "game"
  impact: "high"
  question:
    en: "What kind of game?"
    tr: "Nasıl bir oyun?"
  options:
  - id: "platformer"
    label:
      en: "2D platformer"
      tr: "2D platform"
    value: "a 2D platformer"
  - id: "topdown"
    label:
      en: "Top-down"
      tr: "Kuşbakışı"
    value: "a top-down game"
  - id: "puzzle"
    label:
      en: "Puzzle"
      tr: "Bulmaca"
    value: "a puzzle game"
  - id: "runner"
    label:
      en: "Endless runner"
      tr: "Sonsuz koşu"
    value: "an endless runner"
  - id: "cards"
    label:
      en: "Card or board game"
      tr: "Kart / masa oyunu"
    value: "a card or board game"
  - id: "shooter"
    label:
      en: "Simple shooter"
      tr: "Basit nişancı"
    value: "a simple shooter"
  - id: "3d"
    label:
      en: "Simple 3D game"
      tr: "Basit 3D oyun"
    value: "a simple 3D game"
  default: "infer"
- id: "engine"
  impact: "high"
  question:
    en: "Where will it run?"
    tr: "Nerede çalışacak?"
  options:
  - id: "browser"
    label:
      en: "In the browser (JavaScript)"
      tr: "Tarayıcıda (JavaScript)"
    value: "in the browser using plain JavaScript"
  - id: "unity"
    label:
      en: "Unity (C#)"
      tr: "Unity (C#)"
    value: "Unity with C#; ask which Unity version if unknown"
  - id: "godot"
    label:
      en: "Godot (GDScript)"
      tr: "Godot (GDScript)"
    value: "Godot with GDScript; ask which Godot version if unknown"
  - id: "unreal"
    label:
      en: "Unreal Engine"
      tr: "Unreal Engine"
    value: "Unreal Engine; ask which version if unknown"
  default: "browser"
- id: "job"
  impact: "high"
  question:
    en: "What do you need now?"
    tr: "Şimdi ne lazım?"
  options:
  - id: "prototype"
    label:
      en: "The first playable prototype"
      tr: "İlk oynanabilir prototip"
    value: "a first playable prototype of the core loop"
  - id: "feature"
    label:
      en: "Add a feature"
      tr: "Özellik ekle"
    value: "add one feature to the existing game"
  - id: "bug"
    label:
      en: "Fix a bug"
      tr: "Hata düzelt"
    value: "find and fix a bug"
  - id: "systems"
    label:
      en: "Build a system"
      tr: "Bir sistem kur"
    value: "build one game system (for example inventory, enemies or levels)"
  default: "infer"
- id: "mechanic"
  impact: "medium"
  question:
    en: "Core mechanic?"
    tr: "Ana mekanik?"
  options:
  - id: "move"
    label:
      en: "Move and jump"
      tr: "Hareket ve zıplama"
    value: "moving and jumping"
  - id: "collect"
    label:
      en: "Collect items"
      tr: "Eşya toplama"
    value: "collecting items"
  - id: "avoid"
    label:
      en: "Avoid obstacles"
      tr: "Engellerden kaçma"
    value: "avoiding obstacles"
  - id: "combat"
    label:
      en: "Fight enemies"
      tr: "Düşmanlarla savaş"
    value: "fighting enemies"
  - id: "match"
    label:
      en: "Match or solve"
      tr: "Eşleştir / çöz"
    value: "matching or solving"
  default: "infer"
- id: "controls"
  impact: "medium"
  question:
    en: "Controls?"
    tr: "Kontroller?"
  options:
  - id: "keyboard"
    label:
      en: "Keyboard"
      tr: "Klavye"
    value: "keyboard"
  - id: "touch"
    label:
      en: "Touch"
      tr: "Dokunmatik"
    value: "touch"
  - id: "gamepad"
    label:
      en: "Gamepad"
      tr: "Oyun kolu"
    value: "gamepad"
  - id: "mouse"
    label:
      en: "Mouse"
      tr: "Fare"
    value: "mouse"
  default: "keyboard"
- id: "art"
  impact: "medium"
  question:
    en: "Art for now?"
    tr: "Şimdilik görsel?"
  options:
  - id: "shapes"
    label:
      en: "Simple shapes as placeholders"
      tr: "Basit şekiller (yer tutucu)"
    value: "simple colored shapes as placeholders so the game is playable without art"
  - id: "assets"
    label:
      en: "I will provide assets"
      tr: "Görselleri ben vereceğim"
    value: "the assets the user provides"
  default: "shapes"
- id: "structure"
  impact: "medium"
  question:
    en: "How should the code be organized?"
    tr: "Kod nasıl düzenlensin?"
  options:
  - id: "separate"
    label:
      en: "Separate files for each system"
      tr: "Her sistem ayrı dosya"
    value: "separate files or scripts for each system (input, player, enemies, UI), with short comments"
  - id: "single"
    label:
      en: "One file for now"
      tr: "Şimdilik tek dosya"
    value: "a single file kept simple"
  default: "separate"
- id: "verify"
  impact: "low"
  question:
    en: "How to try it?"
    tr: "Nasıl denenecek?"
  options:
  - id: "steps"
    label:
      en: "Give me the steps to run it"
      tr: "Çalıştırma adımlarını ver"
    value: "include the exact steps to run the game and what to expect"
  - id: "checklist"
    label:
      en: "Steps and a play-test checklist"
      tr: "Adımlar ve deneme listesi"
    value: "include the exact steps to run the game, what to expect, and a short checklist of things to try while playing"
  default: "steps"
refinements:
- id: "smaller"
  label:
    en: "Smaller scope"
    tr: "Daha küçük kapsam"
  instruction: "Reduce the scope: keep only the core loop and remove everything else for now."
- id: "shapes"
  label:
    en: "Placeholder art"
    tr: "Yer tutucu görsel"
  patch:
    art: "simple colored shapes as placeholders so the game is playable without art"
- id: "separate"
  label:
    en: "Separate files"
    tr: "Ayrı dosyalar"
  patch:
    structure: "separate files or scripts for each system (input, player, enemies, UI), with short comments"
- id: "touch"
  label:
    en: "Touch controls"
    tr: "Dokunmatik kontrol"
  patch:
    controls: "touch"
- id: "keyboard"
  label:
    en: "Keyboard controls"
    tr: "Klavye kontrolü"
  patch:
    controls: "keyboard"
- id: "comments"
  label:
    en: "More comments"
    tr: "Daha çok yorum"
  instruction: "Add short comments that explain each part for a beginner."
- id: "version"
  label:
    en: "Ask for the version"
    tr: "Sürümü sor"
  instruction: "If the engine version matters, ask which version the user has instead of guessing."
- id: "juice"
  label:
    en: "Add game feel"
    tr: "Oyun hissi ekle"
  instruction: "After the core loop works, suggest small additions for game feel (screen shake, sound, simple particles), one at a time."
checklist: ["Game type and engine named", "Engine version asked or stated", "Core loop in one sentence", "Smallest playable first", "Placeholder art, no assets needed to run", "Controls named", "Code split by system", "Steps to run and what to expect", "No invented engine functions"]
validators:
- id: "length"
  type: "maxLength"
  value: 3000
  message: "RouteAI limit: keep the prompt under 3000 characters."
- id: "min-length"
  type: "regex"
  value: "^[\\s\\S]{80,}$"
  message: "Too short: say the game type, the engine and the core mechanic."
- id: "no-braces"
  type: "regex"
  value: "^(?![\\s\\S]*(\\{\\{|\\}\\}))[\\s\\S]*$"
  message: "Remove unfilled {{placeholders}}; write the real content or a [clearly marked placeholder]."
---

## Sözdizimi

Oyun geliştirmede en sık hata kapsamı büyük tutmaktır. Kod asistanına (Cursor, Copilot, Claude Code vb. ya da oyun motoruna gömülü asistan) **önce en küçük oynanabilir döngüyü** yazdır, sonra ekle. Kod asistanı rehberlerinin ortak önerisi de budur: küçük adımlar, doğrulanabilir sonuç, somut bağlam.

**Sıra:** (1) oyun türü + motor + sürüm, (2) bu adımın hedefi (prototip / özellik / hata), (3) ana mekanik, (4) kontroller, (5) görsel (yer tutucu), (6) kod düzeni, (7) nasıl denenir.

- **Motor ve sürümü yaz.** Unity, Godot ve Unreal'da API'ler sürümden sürüme değişir; bilmiyorsan asistana "hangi sürümü kullandığımı sor" de. Motor işlevi uydurma kuralını ekle: "emin olmadığın bir sınıf ya da fonksiyonu uydurma; söyle."
- **Yer tutucu görsel:** renkli kare/daire ile oynanabilir olsun; sanat sonra gelir. Görselleri sen veriyorsan dosya adlarını ve boyutlarını yaz.
- **Kod düzeni:** girdi, oyuncu, düşman, arayüz gibi sistemleri ayrı dosya/betik yap; kısa yorumlar iste. Büyük tek dosya sonraki ekleme/hata ayıklamayı zorlaştırır.
- Her adımın sonunda **çalıştırma adımlarını ve beklenen davranışı** iste.
- Yeni özelliği mevcut kodu bozmadan ekletmek için ilgili betiği yapıştır ve "yalnızca bunu değiştir" kuralı koy.
- Telifli karakter, müzik ve görsel isteme; özgün ya da yer tutucu kullan.

## Şablon

Oyun: [tür]. Motor: [motor ve sürüm]. Şimdiki hedef: [prototip / özellik / hata]. Ana mekanik: [mekanik]. Kontroller: [kontroller]. Görsel: şimdilik basit renkli şekiller. Kod düzeni: her sistem ayrı dosya, kısa yorumlarla. Önce sadece çekirdek döngüyü oynanabilir yap, başka özellik ekleme. Kurallar: emin olmadığın motor fonksiyonunu uydurma, söyle; sonunda oyunu çalıştırma adımlarını ve beklenen davranışı yaz.

## Yap / Yapma

**Yap**
- Motor ve sürümü söyle.
- Önce tek bir oynanabilir döngü iste.
- Yer tutucu görsel kullandır.
- Çalıştırma adımlarını iste.

**Yapma**
- Tek promptta "komple oyun yap" deme.
- Motor sürümünü belirtmeden ayrıntılı API bekleme.
- Telifli karakter, ses ya da görsel isteme.
- Tüm kodu tek dosyada yığdırma.

## Örnekler

**Örnek 1 — prototip:** "Tarayıcıda basit platform oyunu"

```
Oyun: 2D platform oyunu. Motor: tarayıcıda düz JavaScript. Şimdiki hedef: ilk oynanabilir prototip. Ana mekanik: sağa-sola hareket ve zıplama, bir seviye, toplanacak 5 madeni para. Kontroller: klavye (ok tuşları ve boşluk). Görsel: şimdilik renkli kareler ve daireler. Kod düzeni: girdi, oyuncu ve seviye için ayrı dosyalar, kısa yorumlarla. Başka özellik ekleme. Emin olmadığın bir tarayıcı özelliğini uydurma. Sonunda dosyaları nasıl açıp oynayacağımı ve neyi görmem gerektiğini yaz.
```

**Örnek 2 — özellik:** "Oyuna düşman ekle"

```
Oyun: Unity (C#). Sürümü bilmiyorsan önce hangi sürümü kullandığımı sor. Hedef: mevcut oyuncu betiğini bozmadan sağa-sola devriye gezen bir düşman ekle; oyuncuya değerse can azalsın. Yalnızca düşman betiğini ve gereken küçük değişiklikleri yaz. Görsel: basit kırmızı kare. Emin olmadığın bir fonksiyonu uydurma. Nasıl deneyeceğimi yaz.
```

Örnekler Türkçe yazıldı; prompt her zaman kullanıcının dilinde yazılır (kod ve hata iletileri olduğu gibi kalır).

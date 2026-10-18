---
# TASLAK — reviewedBy boş. Görev şablonu: araca özel sözdizimi içermez, hiçbir araca bağlı değildir.
# Araca özel rehberi olmayan HER araçta, "game.asset-art" işi için kullanılır (lib/promptBuilder/fallback.ts).
id: "task-game-asset-art"
version: 1
appliesTo: []
tasks: ["game.asset-art"]
modality: "image"
promptLanguage: "en"
sources: ["https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide", "https://docs.midjourney.com/hc/en-us/articles/32023408776205-Prompt-Basics"]
reviewedBy: ""
reviewedAt: ""
slots:
- id: "asset-type"
  impact: "high"
  question:
    en: "What kind of game asset?"
    tr: "Nasıl bir oyun varlığı?"
  options:
  - id: "character"
    label:
      en: "Character sprite"
      tr: "Karakter sprite'ı"
    value: "a character sprite"
  - id: "enemy"
    label:
      en: "Enemy or creature"
      tr: "Düşman / yaratık"
    value: "an enemy creature"
  - id: "item"
    label:
      en: "Item or icon"
      tr: "Eşya / simge"
    value: "an item icon"
  - id: "tile"
    label:
      en: "Environment tile or prop"
      tr: "Çevre karosu / nesne"
    value: "an environment tile or prop"
  - id: "background"
    label:
      en: "Background scene"
      tr: "Arka plan sahnesi"
    value: "a background scene"
  - id: "portrait"
    label:
      en: "Character portrait"
      tr: "Karakter portresi"
    value: "a character portrait for dialogue"
  default: "infer"
- id: "art-style"
  impact: "high"
  question:
    en: "Which art style?"
    tr: "Hangi sanat stili?"
  options:
  - id: "pixel"
    label:
      en: "Pixel art"
      tr: "Piksel sanatı"
    value: "pixel art"
  - id: "handpainted"
    label:
      en: "Hand-painted"
      tr: "El boyaması"
    value: "hand-painted 2D art"
  - id: "vector"
    label:
      en: "Flat vector"
      tr: "Düz vektör"
    value: "flat vector art"
  - id: "cartoon"
    label:
      en: "Cartoon"
      tr: "Çizgi film"
    value: "cartoon style with clean outlines"
  - id: "lowpoly"
    label:
      en: "Low-poly 3D look"
      tr: "Düşük poligon 3B görünüm"
    value: "low-poly 3D look"
  default: "infer"
- id: "view"
  impact: "high"
  question:
    en: "Which view?"
    tr: "Hangi bakış açısı?"
  options:
  - id: "side"
    label:
      en: "Side view"
      tr: "Yandan"
    value: "side view"
  - id: "topdown"
    label:
      en: "Top-down"
      tr: "Tepeden"
    value: "top-down view"
  - id: "isometric"
    label:
      en: "Isometric"
      tr: "İzometrik"
    value: "isometric view"
  - id: "front"
    label:
      en: "Front-facing"
      tr: "Önden"
    value: "front-facing view"
  default: "infer"
- id: "theme"
  impact: "medium"
  question:
    en: "What setting or theme?"
    tr: "Hangi tema?"
  options:
  - id: "fantasy"
    label:
      en: "Fantasy"
      tr: "Fantastik"
    value: "fantasy"
  - id: "scifi"
    label:
      en: "Sci-fi"
      tr: "Bilim kurgu"
    value: "sci-fi"
  - id: "cute"
    label:
      en: "Cute and cozy"
      tr: "Sevimli, sıcak"
    value: "cute and cozy"
  - id: "dark"
    label:
      en: "Dark and gritty"
      tr: "Karanlık, sert"
    value: "dark and gritty"
  - id: "modern"
    label:
      en: "Modern / urban"
      tr: "Modern / kentsel"
    value: "modern urban"
  default: "infer"
- id: "palette"
  impact: "medium"
  question:
    en: "Which palette?"
    tr: "Hangi palet?"
  options:
  - id: "limited"
    label:
      en: "Small retro palette"
      tr: "Küçük retro palet"
    value: "a small limited retro color palette"
  - id: "vibrant"
    label:
      en: "Vibrant"
      tr: "Canlı"
    value: "vibrant saturated colors"
  - id: "muted"
    label:
      en: "Muted"
      tr: "Sönük"
    value: "muted desaturated colors"
  - id: "dark"
    label:
      en: "Dark with bright accents"
      tr: "Koyu + parlak vurgu"
    value: "dark tones with bright accent colors"
  default: "infer"
- id: "background"
  impact: "high"
  question:
    en: "Which background for the asset?"
    tr: "Varlığın arka planı?"
  options:
  - id: "transparent"
    label:
      en: "Transparent"
      tr: "Saydam"
    value: "on a transparent background"
  - id: "plain"
    label:
      en: "Plain solid color"
      tr: "Düz tek renk"
    value: "on a plain solid-color background"
  - id: "scene"
    label:
      en: "In a scene"
      tr: "Sahne içinde"
    value: "inside a complete scene"
  default: "transparent"
- id: "layout"
  impact: "low"
  question:
    en: "Single image or a set?"
    tr: "Tek görsel mi, set mi?"
  options:
  - id: "single"
    label:
      en: "One asset"
      tr: "Tek varlık"
    value: "a single asset, centered"
  - id: "set"
    label:
      en: "A matching set"
      tr: "Uyumlu set"
    value: "a set of matching assets in a tidy grid with consistent style and scale"
  - id: "frames"
    label:
      en: "Animation frames"
      tr: "Animasyon kareleri"
    value: "a row of animation frames of the same character in a consistent grid"
  default: "single"
refinements:
- id: "pixel"
  label:
    en: "Pixel art"
    tr: "Piksel sanatı"
  patch:
    art-style: "pixel art"
- id: "vector"
  label:
    en: "Flat vector"
    tr: "Düz vektör"
  patch:
    art-style: "flat vector art"
- id: "transparent"
  label:
    en: "Transparent background"
    tr: "Saydam fon"
  patch:
    background: "on a transparent background"
- id: "set"
  label:
    en: "Make a matching set"
    tr: "Uyumlu set yap"
  patch:
    layout: "a set of matching assets in a tidy grid with consistent style and scale"
- id: "frames"
  label:
    en: "Animation frames"
    tr: "Animasyon kareleri"
  patch:
    layout: "a row of animation frames of the same character in a consistent grid"
- id: "topdown"
  label:
    en: "Top-down view"
    tr: "Tepeden bakış"
  patch:
    view: "top-down view"
- id: "cute"
  label:
    en: "Cuter"
    tr: "Daha sevimli"
  patch:
    theme: "cute and cozy"
- id: "simple"
  label:
    en: "Simpler shapes"
    tr: "Daha basit şekiller"
  instruction: "Use simpler shapes and fewer details so the asset stays readable at a small size."
checklist: ["Asset type named", "Art style named", "Viewpoint stated", "Background stated (plain or transparent)", "Limited palette", "Consistent style across a set", "Readable at small size", "No copyrighted characters"]
validators:
- id: "length"
  type: "maxLength"
  value: 1500
  message: "RouteAI limit: keep the prompt under 1500 characters."
- id: "min-length"
  type: "regex"
  value: "^[\\s\\S]{40,}$"
  message: "Too short: name the asset, the art style and the view."
- id: "no-braces"
  type: "regex"
  value: "^(?![\\s\\S]*(\\{\\{|\\}\\}))[\\s\\S]*$"
  message: "Remove unfilled {{placeholders}}; write the real content or a [clearly marked placeholder]."
- id: "background"
  type: "regex"
  value: "[Bb]ackground|[Tt]ransparent|[Ii]solated|scene"
  message: "State the background (plain, transparent or a scene) so the asset can be used."
---

## Sözdizimi

Oyun varlığı (sprite, simge, karo, arka plan) bir tasarım parçasıdır: oyunda tekrar kullanılacağı için TUTARLILIK ve KESİLEBİLİRLİK en önemli iki şeydir.

Sıra: (1) varlık türü, (2) sanat stili, (3) bakış açısı, (4) ana özellikler (renk, kıyafet, silüet), (5) tema, (6) palet, (7) arka plan (saydam ya da düz), (8) tek varlık mı set mi.

- Stili ve bakış açısını her varlıkta AYNI yaz; set istenirse "aynı stil, aynı ölçek, aynı ışık yönü" de.
- Okunur silüet: basit şekiller, kalın ana hatlar, sınırlı palet; küçük boyutta da anlaşılmalı.
- Arka planı belirt: saydam ya da düz tek renk (kesip kullanmak için). Sahne arka planı istenmişse oyun alanını boş bırak.
- Sprite sayfası için kareleri "aynı karakter, aynı ölçek, düzenli ızgara" diye tarif et. Tam piksel boyutu ve kare sayısı aracın ayarlarıdır: `settings`te öner, uydurma.
- Telifli karakter ya da oyun adı kullanma; özgün bir tasarım anlat.

## Şablon

[Varlık türü]: [somut tarif: silüet, renk, öne çıkan özellik]. Style: [sanat stili], [bakış açısı]. Theme: [tema]. Palette: [palet]. [Arka plan]. [Tek varlık / uyumlu set]. Simple readable shapes, consistent style.

## Yap / Yapma

**Yap**
- Stil, bakış açısı ve paleti her varlıkta aynı yaz.
- Silüeti ve ana rengi belirt.
- Saydam ya da düz arka plan iste.
- Set için tutarlılığı açıkça iste.

**Yapma**
- Bilinen oyun/film karakteri ya da markalı eşya adı yazma; özgün bir tasarım anlat.
- Aynı varlıkta birden çok sanat stili karıştırma.
- Çok ince ayrıntı isteme; küçük boyutta kaybolur.
- Piksel boyutu ya da kare sayısı uydurma; kullanıcı vermediyse ayar olarak öner.

## Örnekler

**Örnek 1 — piksel karakter:** "Platform oyunum için küçük bir şövalye sprite'ı"

```
Character sprite of a small knight with a round blue helmet, a red scarf and a short sword. Pixel art, side view, facing right, a small limited retro color palette, thick dark outline, simple readable shapes. Cute and cozy fantasy theme. On a transparent background, a single character centered.
```

**Örnek 2 — eşya seti:** "RPG için 6 iksir simgesi"

```
A set of six matching potion item icons for a fantasy RPG: red, blue, green, yellow, purple and clear glass bottles, each with a different bottle shape and a cork. Flat vector art, front-facing, thick clean outlines, vibrant saturated colors, same style, scale and light direction for all icons, arranged in a tidy grid on a plain solid-color background.
```

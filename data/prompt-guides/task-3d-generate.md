---
# TASLAK — reviewedBy boş. Görev şablonu: araca özel sözdizimi içermez, hiçbir araca bağlı değildir.
# Araca özel rehberi olmayan HER araçta, "3d.generate" işi için kullanılır (lib/promptBuilder/fallback.ts).
id: "task-3d-generate"
version: 1
appliesTo: []
tasks: ["3d.generate"]
modality: "3d"
promptLanguage: "en"
sources: ["https://docs.meshy.ai/en/webapp/text-to-3d", "https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide"]
reviewedBy: ""
reviewedAt: ""
slots:
- id: "object"
  impact: "high"
  question:
    en: "What should be made?"
    tr: "Ne üretilecek?"
  options:
  - id: "character"
    label:
      en: "A character"
      tr: "Bir karakter"
    value: "a character"
  - id: "creature"
    label:
      en: "A creature or animal"
      tr: "Bir yaratık / hayvan"
    value: "a creature or animal"
  - id: "prop"
    label:
      en: "A prop or object"
      tr: "Bir nesne / eşya"
    value: "a prop or everyday object"
  - id: "vehicle"
    label:
      en: "A vehicle"
      tr: "Bir araç"
    value: "a vehicle"
  - id: "building"
    label:
      en: "A building"
      tr: "Bir bina"
    value: "a building"
  - id: "weapon"
    label:
      en: "A tool or weapon"
      tr: "Alet / silah"
    value: "a tool or weapon"
  default: "infer"
- id: "style"
  impact: "high"
  question:
    en: "Which style?"
    tr: "Hangi stil?"
  options:
  - id: "realistic"
    label:
      en: "Realistic"
      tr: "Gerçekçi"
    value: "realistic"
  - id: "stylized"
    label:
      en: "Stylized"
      tr: "Stilize"
    value: "stylized"
  - id: "lowpoly"
    label:
      en: "Low-poly"
      tr: "Low-poly"
    value: "low-poly"
  - id: "cartoon"
    label:
      en: "Cartoon"
      tr: "Çizgi film"
    value: "cartoon"
  - id: "scifi"
    label:
      en: "Sci-fi"
      tr: "Bilim kurgu"
    value: "sci-fi"
  - id: "fantasy"
    label:
      en: "Fantasy"
      tr: "Fantastik"
    value: "fantasy"
  default: "infer"
- id: "purpose"
  impact: "high"
  question:
    en: "What will you use it for?"
    tr: "Ne için kullanacaksın?"
  options:
  - id: "game"
    label:
      en: "Game asset"
      tr: "Oyun varlığı"
    value: "a game-ready asset with clean, simple geometry"
  - id: "print"
    label:
      en: "3D printing"
      tr: "3D baskı"
    value: "a model suitable for 3D printing: a solid closed shape with sturdy parts and no thin fragile details"
  - id: "ar"
    label:
      en: "AR or web"
      tr: "AR / web"
    value: "an asset for AR or the web, simple and light"
  - id: "render"
    label:
      en: "Rendering or animation"
      tr: "Render / animasyon"
    value: "a detailed model for rendering or animation"
  - id: "concept"
    label:
      en: "Concept exploration"
      tr: "Fikir denemesi"
    value: "a quick concept model"
  default: "infer"
- id: "pose"
  impact: "medium"
  question:
    en: "Pose or shape?"
    tr: "Poz / duruş?"
  options:
  - id: "rig"
    label:
      en: "Neutral A-pose or T-pose"
      tr: "Nötr A / T duruşu"
    value: "a neutral standing A-pose with arms slightly away from the body, so it can be rigged later"
  - id: "static"
    label:
      en: "Natural static pose"
      tr: "Doğal sabit duruş"
    value: "a natural static pose"
  - id: "na"
    label:
      en: "Not a character"
      tr: "Karakter değil"
    value: "a single object resting naturally"
  default: "na"
- id: "material"
  impact: "medium"
  question:
    en: "Main materials?"
    tr: "Ana malzemeler?"
  options:
  - id: "metal"
    label:
      en: "Metal"
      tr: "Metal"
    value: "metal"
  - id: "wood"
    label:
      en: "Wood"
      tr: "Ahşap"
    value: "wood"
  - id: "fabric"
    label:
      en: "Fabric or leather"
      tr: "Kumaş / deri"
    value: "fabric and leather"
  - id: "stone"
    label:
      en: "Stone"
      tr: "Taş"
    value: "stone"
  - id: "plastic"
    label:
      en: "Plastic"
      tr: "Plastik"
    value: "plastic"
  - id: "mixed"
    label:
      en: "Mixed"
      tr: "Karışık"
    value: "a mix of materials, named clearly"
  default: "infer"
- id: "color"
  impact: "medium"
  question:
    en: "Colors?"
    tr: "Renkler?"
  options:
  - id: "natural"
    label:
      en: "Natural colors"
      tr: "Doğal renkler"
    value: "natural colors"
  - id: "bright"
    label:
      en: "Bright colors"
      tr: "Parlak renkler"
    value: "bright, saturated colors"
  - id: "muted"
    label:
      en: "Muted tones"
      tr: "Sönük tonlar"
    value: "muted tones"
  - id: "mono"
    label:
      en: "One color family"
      tr: "Tek renk ailesi"
    value: "one color family"
  default: "natural"
- id: "detail"
  impact: "medium"
  question:
    en: "Level of detail?"
    tr: "Detay düzeyi?"
  options:
  - id: "simple"
    label:
      en: "Simple shapes"
      tr: "Sade biçimler"
    value: "simple, clean shapes"
  - id: "moderate"
    label:
      en: "Moderate detail"
      tr: "Orta detay"
    value: "moderate detail"
  - id: "high"
    label:
      en: "High detail"
      tr: "Yüksek detay"
    value: "high detail"
  default: "moderate"
- id: "texture"
  impact: "low"
  question:
    en: "Textures?"
    tr: "Doku?"
  options:
  - id: "textured"
    label:
      en: "With textures"
      tr: "Dokulu"
    value: "with textures and colors"
  - id: "clay"
    label:
      en: "Plain clay look"
      tr: "Düz kil görünümü"
    value: "plain untextured clay look to judge the shape first"
  default: "textured"
refinements:
- id: "simpler"
  label:
    en: "Simpler shapes"
    tr: "Daha sade biçim"
  patch:
    detail: "simple, clean shapes"
- id: "detail"
  label:
    en: "More detail"
    tr: "Daha detaylı"
  patch:
    detail: "high detail"
- id: "lowpoly"
  label:
    en: "Low-poly"
    tr: "Low-poly"
  patch:
    style: "low-poly"
- id: "realistic"
  label:
    en: "More realistic"
    tr: "Daha gerçekçi"
  patch:
    style: "realistic"
- id: "rig"
  label:
    en: "Neutral pose"
    tr: "Nötr duruş"
  patch:
    pose: "a neutral standing A-pose with arms slightly away from the body, so it can be rigged later"
- id: "clay"
  label:
    en: "Clay look"
    tr: "Kil görünümü"
  patch:
    texture: "plain untextured clay look to judge the shape first"
- id: "print"
  label:
    en: "For 3D printing"
    tr: "3D baskıya uygun"
  patch:
    purpose: "a model suitable for 3D printing: a solid closed shape with sturdy parts and no thin fragile details"
- id: "palette"
  label:
    en: "Fewer colors"
    tr: "Daha az renk"
  patch:
    color: "one color family"
checklist: ["One object only", "Shape and proportions described", "Materials and colors", "Style stated", "Pose for characters", "Purpose stated", "No scene, no background, no text", "No copyrighted characters or brands"]
validators:
- id: "length"
  type: "maxLength"
  value: 1000
  message: "RouteAI limit: keep the prompt under 1000 characters."
- id: "min-length"
  type: "regex"
  value: "^[\\s\\S]{40,}$"
  message: "Too short: describe one object, its style and its materials."
- id: "no-braces"
  type: "regex"
  value: "^(?![\\s\\S]*(\\{\\{|\\}\\}))[\\s\\S]*$"
  message: "Remove unfilled {{placeholders}}; write the real content or a [clearly marked placeholder]."
---

## Sözdizimi

3D üretim araçları (Meshy, Tripo, Rodin, Hunyuan3D vb.) metinden ya da görselden **tek bir model** üretir. Meshy'nin metinden 3D rehberi de aynı yönde: tek ve net bir nesneyi biçimi, malzemesi ve stiliyle tarif et; karmaşık sahneleri değil.

**Sıra (kısa, İngilizce, tek akıcı cümle grubu):** (1) nesne ve stil, (2) biçim/oran, (3) malzeme ve renk, (4) belirgin ayrıntılar, (5) duruş (karakterse), (6) amaç.

- **Tek nesne.** "Bir kasaba meydanı ve etrafında yürüyen insanlar" yerine tek bir ağaç evi, tek bir kılıç. Sahne istersen parçalara ayırıp tek tek üret.
- **Biçimi ve oranı söyle:** "tombul gövdeli", "uzun ve ince saplı", "kalın tekerlekli". Malzemeleri adıyla yaz (fırçalanmış metal, eskimiş ahşap).
- **Karakter:** nötr ayakta duruş (A veya T pozu), kollar gövdeden hafif açık; sonradan iskelet (rig) bağlamak kolaylaşır. Aksiyon pozu ve çok karmaşık ekipman ağ yapısını bozabilir.
- **3D baskı:** kapalı ve katı bir şekil, kalın parçalar; çok ince ya da havada duran detay yazma.
- **Oyun varlığı:** sade, temiz geometri iste; "yüksek poligon" gibi sayı vermeden "low-poly" ya da "sade" yaz. Poligon sayısı ve dosya biçimi çoğu araçta AYARDAN seçilir; sayı uydurma.
- Arka plan, zemin, yazı ve logo yazma; model üzerindeki yazılar bozuk çıkar.
- Telifli karakter, marka ya da gerçek kişi isteme; özgün tasarım tarif et.
- Görselden 3D'de (tek net nesne, düz arka plan fotoğrafı) prompt'u kısa tut; görsel zaten biçimi verir.

## Şablon

[Stil] [nesne], [biçim ve oran]. Malzeme: [malzemeler]. Renk: [renkler]. Ayrıntılar: [belirgin 2–3 ayrıntı]. [Karakterse: nötr A-pose, kollar gövdeden hafif açık]. Amaç: [amaç]. Tek nesne, zemin ve arka plan yok, yazı yok.

## Yap / Yapma

**Yap**
- Tek bir nesneyi tarif et.
- Biçim, oran, malzeme ve renk söyle.
- Karakterde nötr duruş iste.
- Amaca göre (oyun / baskı) sade ya da katı şekil iste.

**Yapma**
- Sahne, kalabalık ya da arka plan yazma.
- Yazı ve logo isteme.
- Telifli karakter ya da marka isteme.
- Poligon sayısı gibi rakamları uydurma; ayarlardan seç.

## Örnekler

**Örnek 1 — oyun varlığı:** "Fantastik oyun için ahşap sandık"

```
Stylized fantasy wooden treasure chest, chunky proportions, slightly domed lid. Weathered dark wood planks with worn brass corners and a simple iron lock. Warm brown and muted gold colors. A few visible nail heads and a small scratch pattern on the lid. A game-ready asset with clean, simple geometry. Single object, no ground or background, no text.
```

**Örnek 2 — karakter:** "Çizgi film tarzı küçük bir robot"

```
Cartoon small friendly robot, round head, short rounded body, thin arms and legs. Painted light-blue metal with orange accents, two large round eyes. A neutral standing A-pose with arms slightly away from the body, so it can be rigged later. Moderate detail. Single object, no ground or background, no text.
```

Örnekler Türkçe yazıldı; prompt her zaman kullanıcının dilinde yazılır.

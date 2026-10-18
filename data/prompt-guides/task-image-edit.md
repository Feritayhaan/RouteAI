---
# TASLAK — reviewedBy boş. Görev şablonu: araca özel sözdizimi içermez, hiçbir araca bağlı değildir.
# Araca özel rehberi olmayan HER araçta, "image.edit" işi için kullanılır (lib/promptBuilder/fallback.ts).
id: "task-image-edit"
version: 1
appliesTo: []
tasks: ["image.edit"]
modality: "image"
promptLanguage: "en"
sources: ["https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide"]
reviewedBy: ""
reviewedAt: ""
slots:
- id: "edit-type"
  impact: "high"
  question:
    en: "What should change?"
    tr: "Ne değişsin?"
  options:
  - id: "background"
    label:
      en: "Change the background"
      tr: "Arka planı değiştir"
    value: "change the background"
  - id: "remove"
    label:
      en: "Remove something"
      tr: "Bir şeyi kaldır"
    value: "remove an unwanted object"
  - id: "add"
    label:
      en: "Add something"
      tr: "Bir şey ekle"
    value: "add a new element"
  - id: "style"
    label:
      en: "Change the style"
      tr: "Stili değiştir"
    value: "restyle the image"
  - id: "color"
    label:
      en: "Colors or lighting"
      tr: "Renk ya da ışık"
    value: "adjust colors and lighting"
  - id: "outfit"
    label:
      en: "Clothing or object"
      tr: "Kıyafet ya da nesne"
    value: "change a specific item"
  default: "infer"
- id: "preserve"
  impact: "high"
  question:
    en: "What must stay exactly the same?"
    tr: "Neyin aynı kalması şart?"
  options:
  - id: "identity"
    label:
      en: "The person or subject"
      tr: "Kişi / ana konu"
    value: "the subject's identity, face and proportions"
  - id: "composition"
    label:
      en: "Composition and angle"
      tr: "Kompozisyon ve açı"
    value: "the composition, framing and camera angle"
  - id: "lighting"
    label:
      en: "Lighting and colors"
      tr: "Işık ve renkler"
    value: "the lighting and color palette"
  - id: "text"
    label:
      en: "Text and logos"
      tr: "Yazılar ve logolar"
    value: "all text, logos and brand elements"
  - id: "everything"
    label:
      en: "Everything else"
      tr: "Geri kalan her şey"
    value: "everything else in the image"
  default: "everything"
- id: "target"
  impact: "high"
  question:
    en: "Where in the image?"
    tr: "Görselin neresinde?"
  options:
  - id: "whole"
    label:
      en: "The whole image"
      tr: "Tüm görsel"
    value: "the whole image"
  - id: "background"
    label:
      en: "The background"
      tr: "Arka plan"
    value: "the background"
  - id: "subject"
    label:
      en: "The main subject"
      tr: "Ana konu"
    value: "the main subject"
  - id: "region"
    label:
      en: "A specific area"
      tr: "Belirli bir bölge"
    value: "one specific area, described by position"
  default: "infer"
- id: "inputs"
  impact: "medium"
  question:
    en: "How many images are involved?"
    tr: "Kaç görsel var?"
  options:
  - id: "one"
    label:
      en: "One image"
      tr: "Tek görsel"
    value: "one input image"
  - id: "several"
    label:
      en: "Several images"
      tr: "Birden çok görsel"
    value: "several input images, each referred to by its number"
  default: "one"
- id: "strength"
  impact: "medium"
  question:
    en: "How strong should the change be?"
    tr: "Değişiklik ne kadar güçlü olsun?"
  options:
  - id: "subtle"
    label:
      en: "Subtle"
      tr: "Hafif"
    value: "a subtle change"
  - id: "clear"
    label:
      en: "Clearly visible"
      tr: "Belirgin"
    value: "a clearly visible change"
  - id: "dramatic"
    label:
      en: "Dramatic"
      tr: "Çarpıcı"
    value: "a dramatic change"
  default: "clear"
- id: "realism"
  impact: "medium"
  question:
    en: "Should the result look natural?"
    tr: "Sonuç doğal görünsün mü?"
  options:
  - id: "match"
    label:
      en: "Match lighting and shadows"
      tr: "Işık ve gölgeye uysun"
    value: "match the original lighting, perspective, scale and shadows"
  - id: "stylized"
    label:
      en: "Stylized is fine"
      tr: "Stilize olabilir"
    value: "a stylized look is fine"
  default: "match"
refinements:
- id: "subtle"
  label:
    en: "More subtle"
    tr: "Daha hafif"
  patch:
    strength: "a subtle change"
- id: "dramatic"
  label:
    en: "More dramatic"
    tr: "Daha çarpıcı"
  patch:
    strength: "a dramatic change"
- id: "keep-identity"
  label:
    en: "Keep the person identical"
    tr: "Kişi aynı kalsın"
  patch:
    preserve: "the subject's identity, face and proportions"
- id: "keep-composition"
  label:
    en: "Keep the composition"
    tr: "Kompozisyon aynı kalsın"
  patch:
    preserve: "the composition, framing and camera angle"
- id: "keep-text"
  label:
    en: "Keep text and logos"
    tr: "Yazılar aynı kalsın"
  patch:
    preserve: "all text, logos and brand elements"
- id: "natural"
  label:
    en: "Make it blend in"
    tr: "Doğal otursun"
  patch:
    realism: "match the original lighting, perspective, scale and shadows"
- id: "background-only"
  label:
    en: "Background only"
    tr: "Sadece arka plan"
  patch:
    target: "the background"
- id: "repeat-preserve"
  label:
    en: "Repeat the keep-list"
    tr: "Koruma listesini tekrarla"
  instruction: "Restate the list of things that must not change, once, at the end of the prompt."
checklist: ["One clear change stated", "Says what must stay unchanged", "Which image and which area", "Identity, geometry, layout, text and lighting protected when relevant", "Natural blending (light, perspective, scale, shadows) when adding or replacing", "Several images referred to by number", "One change per prompt"]
validators:
- id: "length"
  type: "maxLength"
  value: 1500
  message: "RouteAI limit: keep the prompt under 1500 characters."
- id: "no-braces"
  type: "regex"
  value: "^(?![\\s\\S]*(\\{\\{|\\}\\}))[\\s\\S]*$"
  message: "Remove unfilled {{placeholders}}; write the real content or a [clearly marked placeholder]."
- id: "keep-list"
  type: "regex"
  value: "(?:[Kk]eep|[Pp]reserve|[Uu]nchanged|[Dd]o not change|[Dd]on't change|[Ss]ame as|stay the same|remain the same)"
  message: "State what must stay unchanged, e.g. \"Change only X; keep everything else the same.\""
---

## Sözdizimi

Düzenleme promptunun özü iki cümledir: NEYİ değiştir ve NEYİ koru. Resmî görsel rehberin önerdiği kalıp: "yalnızca X'i değiştir, geri kalan her şeyi aynı bırak".

- Tek seferde tek değişiklik iste; çok değişiklik gerekiyorsa adım adım ilerle.
- Korunacakları açıkça say: kişinin kimliği/yüzü, nesnenin şekli, kompozisyon ve açı, ışık, yazılar ve logolar. Her yeni denemede bu listeyi tekrarla; aksi halde görsel sürüklenir.
- Birden çok görsel varsa her birine numarasıyla ve kısa tarifiyle değin ("görsel 1: ürün, görsel 2: yeni arka plan") ve nasıl birleşeceklerini yaz.
- Nesne eklerken ya da yerleştirirken ışığı, perspektifi, ölçeği ve gölgeyi ana görselle eşleştirmesini iste.
- Alan belirtirken konumla tarif et ("sol alttaki", "masanın üstündeki").
- Saydam fon gerekirse "tamamen saydam arka plan, tek nesne" yaz ve çıktı biçiminin saydamlığı desteklemesi gerektiğini `settings`te not et.

## Şablon

Change only [değişiklik] in [bölge / görsel]. Keep [korunacaklar] exactly the same. [Yeni içerik tarifi]. Match the original lighting, perspective, scale and shadows. Do not add anything else.

## Yap / Yapma

**Yap**
- "Sadece şunu değiştir, her şeyi koru" kalıbıyla başla.
- Korunacak listeyi her denemede yinele.
- Birden çok görselde numara ver.
- Kullanıcının istediği yeni içeriği somut anlat (renk, malzeme, konum).

**Yapma**
- Aynı promptta birden çok bağımsız değişiklik isteme.
- Belirsiz sözler ("daha güzel yap") kullanma; neyin nasıl değişeceğini yaz.
- Gerçek bir kişinin yüzünü başka birine benzetme ya da yanıltıcı sahte görsel (sahte belge, sahte onay) isteme.
- Korunacakları söylemeden sadece "değiştir" deme.

## Örnekler

**Örnek 1 — arka plan değiştirme:** "Ürün fotoğrafımın arkasını düz açık gri yap"

```
Change only the background: replace it with a plain, seamless light-gray studio backdrop. Keep the product, its shape, color, label text, angle and position exactly the same. Match the original soft lighting and keep a natural soft shadow under the product. Do not add any other objects.
```

**Örnek 2 — iki görseli birleştirme:** "Görsel 2'deki ceketi görsel 1'deki kişiye giydir"

```
Using image 1 (the person) and image 2 (the jacket): dress the person from image 1 in the jacket from image 2. Keep the person's face, pose, hairstyle and the background from image 1 exactly the same. The jacket must keep its color and details from image 2 and fit naturally, matching the lighting, perspective and shadows of image 1.
```

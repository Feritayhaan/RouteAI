---
# TASLAK — reviewedBy boş. Görev şablonu: araca özel sözdizimi içermez, hiçbir araca bağlı değildir.
# Araca özel rehberi olmayan HER araçta, "video.image-to-video" işi için kullanılır (lib/promptBuilder/fallback.ts).
id: "task-video-image-to-video"
version: 1
appliesTo: []
tasks: ["video.image-to-video"]
modality: "video"
promptLanguage: "en"
sources: ["https://deepmind.google/models/veo/prompt-guide/", "https://developers.openai.com/cookbook/examples/sora/sora2_prompting_guide"]
reviewedBy: ""
reviewedAt: ""
slots:
- id: "motion"
  impact: "high"
  question:
    en: "What should move?"
    tr: "Ne hareket etsin?"
  options:
  - id: "subtle"
    label:
      en: "Subtle life: breathing, blinking, hair, cloth"
      tr: "Hafif canlılık: nefes, göz kırpma, saç, kumaş"
    value: "subtle natural life: gentle breathing, blinking, hair and cloth moving slightly"
  - id: "environment"
    label:
      en: "The environment: clouds, water, smoke, leaves"
      tr: "Ortam: bulut, su, duman, yaprak"
    value: "the environment moves: clouds, water, smoke or leaves"
  - id: "subject"
    label:
      en: "The subject does one action"
      tr: "Konu tek bir eylem yapsın"
    value: "the subject performs one simple action"
  - id: "camera-only"
    label:
      en: "Only the camera moves"
      tr: "Yalnız kamera hareket etsin"
    value: "only the camera moves; the scene itself stays still"
  - id: "product"
    label:
      en: "Product reveal / rotation"
      tr: "Ürün açılışı / dönüşü"
    value: "the product slowly turns or is revealed"
  default: "infer"
- id: "camera"
  impact: "high"
  question:
    en: "Camera movement?"
    tr: "Kamera hareketi?"
  options:
  - id: "static"
    label:
      en: "Static"
      tr: "Sabit"
    value: "static camera"
  - id: "push"
    label:
      en: "Slow push in"
      tr: "Yavaş yaklaşma"
    value: "slow push-in"
  - id: "pull"
    label:
      en: "Slow pull back"
      tr: "Yavaş uzaklaşma"
    value: "slow pull-back"
  - id: "pan"
    label:
      en: "Slow pan"
      tr: "Yavaş yan çevirme"
    value: "slow pan"
  - id: "orbit"
    label:
      en: "Slow orbit"
      tr: "Yavaş yörünge"
    value: "slow orbit around the subject"
  default: "static"
- id: "keep"
  impact: "high"
  question:
    en: "What must stay the same?"
    tr: "Neler aynı kalsın?"
  options:
  - id: "identity"
    label:
      en: "Face and identity"
      tr: "Yüz ve kimlik"
    value: "the face, identity, clothing and proportions of the subject exactly as in the image"
  - id: "product"
    label:
      en: "Product shape and label"
      tr: "Ürün şekli ve etiketi"
    value: "the product shape, colors, label and logo exactly as in the image"
  - id: "scene"
    label:
      en: "Whole composition"
      tr: "Tüm kompozisyon"
    value: "the composition, colors and style of the image"
  - id: "background"
    label:
      en: "Background"
      tr: "Arka plan"
    value: "the background exactly as in the image"
  default: "scene"
- id: "intensity"
  impact: "medium"
  question:
    en: "How strong is the motion?"
    tr: "Hareket ne kadar güçlü?"
  options:
  - id: "gentle"
    label:
      en: "Gentle"
      tr: "Hafif"
    value: "gentle, slow motion"
  - id: "moderate"
    label:
      en: "Moderate"
      tr: "Orta"
    value: "moderate natural motion"
  - id: "dynamic"
    label:
      en: "Dynamic"
      tr: "Dinamik"
    value: "more dynamic motion while staying natural"
  default: "gentle"
- id: "ending"
  impact: "medium"
  question:
    en: "How should it end?"
    tr: "Nasıl bitsin?"
  options:
  - id: "hold"
    label:
      en: "Settle and hold"
      tr: "Dursun, sabitlensin"
    value: "the motion settles and holds at the end"
  - id: "loop"
    label:
      en: "Loop-friendly"
      tr: "Döngüye uygun"
    value: "the motion returns close to the starting pose so it can loop"
  - id: "open"
    label:
      en: "Keep moving"
      tr: "Hareket sürsün"
    value: "the motion continues to the end"
  default: "hold"
- id: "sound"
  impact: "low"
  question:
    en: "Sound?"
    tr: "Ses?"
  options:
  - id: "none"
    label:
      en: "No sound described"
      tr: "Ses tarif etme"
    value: "no sound description"
  - id: "ambient"
    label:
      en: "Ambient sound"
      tr: "Ortam sesi"
    value: "natural ambient sound that fits the scene"
  default: "none"
- id: "style-keep"
  impact: "low"
  question:
    en: "Look?"
    tr: "Görünüm?"
  options:
  - id: "same"
    label:
      en: "Same as the image"
      tr: "Görselle aynı"
    value: "the same look as the image"
  - id: "film"
    label:
      en: "Add a film feel"
      tr: "Film hissi ekle"
    value: "a subtle cinematic film feel while keeping the image look"
  default: "same"
refinements:
- id: "gentler"
  label:
    en: "Gentler"
    tr: "Daha hafif"
  patch:
    intensity: "gentle, slow motion"
- id: "more"
  label:
    en: "More motion"
    tr: "Daha çok hareket"
  patch:
    intensity: "more dynamic motion while staying natural"
- id: "static"
  label:
    en: "Fixed camera"
    tr: "Sabit kamera"
  patch:
    camera: "static camera"
- id: "push"
  label:
    en: "Slow push in"
    tr: "Yavaş yaklaşma"
  patch:
    camera: "slow push-in"
- id: "loop"
  label:
    en: "Make it loop"
    tr: "Döngü yap"
  patch:
    ending: "the motion returns close to the starting pose so it can loop"
- id: "identity"
  label:
    en: "Keep the face"
    tr: "Yüzü koru"
  patch:
    keep: "the face, identity, clothing and proportions of the subject exactly as in the image"
- id: "only-camera"
  label:
    en: "Camera only"
    tr: "Yalnız kamera"
  patch:
    motion: "only the camera moves; the scene itself stays still"
- id: "ambient"
  label:
    en: "Add ambient sound"
    tr: "Ortam sesi ekle"
  patch:
    sound: "natural ambient sound that fits the scene"
checklist: ["Describes only the motion, not the whole image again", "One main movement", "Camera movement stated", "What must stay unchanged stated", "Speed of motion stated", "No new objects or people introduced", "Ending stated"]
validators:
- id: "length"
  type: "maxLength"
  value: 900
  message: "RouteAI limit: keep the prompt under 900 characters."
- id: "min-length"
  type: "regex"
  value: "^[\\s\\S]{40,}$"
  message: "Too short: say what moves and how the camera behaves."
- id: "no-braces"
  type: "regex"
  value: "^(?![\\s\\S]*(\\{\\{|\\}\\}))[\\s\\S]*$"
  message: "Remove unfilled {{placeholders}}; write the real content or a [clearly marked placeholder]."
- id: "keep"
  type: "regex"
  value: "[Ss]ame|[Uu]nchanged|[Kk]eep|[Ss]tay|[Ee]xactly|[Cc]onsisten"
  message: "Say what must stay the same as in the image."
---

## Sözdizimi

Görselden videoya çevirmede görsel ZATEN sahneyi, konuyu, ışığı ve stili verir. Prompt'un işi yalnızca HAREKETİ anlatmaktır; görseli baştan tarif etmek araca çelişen bilgi vermek demektir ve kimliğin/ürünün değişmesine yol açar.

**Sıra (kısa, İngilizce, 2–4 cümle):** (1) ne hareket eder, (2) hareketin hızı, (3) kamera hareketi, (4) ne aynı kalır, (5) bitiş.

- **Tek ana hareket.** "Hafif nefes ve saç hareketi + yavaş yaklaşma" gibi küçük, doğal hareketler en güvenlisidir; büyük dönüşler yüzü ve ürünü bozar.
- **Korunacakları yaz:** yüz, kıyafet, ürün şekli, etiket, renkler, arka plan. "Exactly as in the image" kalıbı işe yarar.
- Görselde olmayan yeni nesne, kişi ya da yazı ekleme; araç bunları uydurur ve tutarlılık bozulur.
- Ürün videolarında etiket/logo yazıları hareketle bozulabilir; ürünü sabit tutup yalnızca kamerayı hareket ettirmek daha güvenlidir.
- Ses destekleyen araçta ortam sesini tek cümleyle yaz; konuşma yazma (kullanıcı vermedikçe).
- Süre ve en-boy oranı çoğu araçta ayardan seçilir; görselin oranı genelde korunur.
- Gerçek kişi fotoğrafıyla çalışırken kişinin izni olmalı; kimlik taklidi amaçlı kullanımı reddet.

## Şablon

[Ne hareket eder: tek ana hareket], [hız]. Camera: [kamera hareketi]. Keep [korunacaklar] exactly as in the image. [Bitiş]. [Ortam sesi].

## Yap / Yapma

**Yap**
- Yalnız hareketi anlat.
- Tek ana hareket ve tek kamera hareketi seç.
- Korunacak şeyleri açıkça yaz.
- Hızı söyle ("slow", "gentle").

**Yapma**
- Görseli baştan tarif etme.
- Yeni nesne, kişi ya da yazı ekletme.
- Büyük dönüşüm ve hızlı kamera isteme (yüz/ürün bozulur).
- İzinsiz gerçek kişi fotoğrafını canlandırma.

## Örnekler

**Örnek 1 — portre:** "Portre fotoğrafını hafif canlandır"

```
Subtle natural life: gentle breathing, a slow blink and a slight movement of the hair in a light breeze. Slow push-in. Keep the face, identity, clothing and proportions exactly as in the image. The motion settles and holds at the end. No new objects or people.
```

**Örnek 2 — manzara:** "Dağ manzarasına hareket kat"

```
The clouds drift slowly across the sky and the lake surface ripples gently; the mountains stay still. Slow pan to the right. Keep the composition, colors and style exactly as in the image. Natural ambient sound of wind and water.
```

Örnekler Türkçe açıklandı; İngilizce yazılacak promptlar örneklerde İngilizce gösterilir.

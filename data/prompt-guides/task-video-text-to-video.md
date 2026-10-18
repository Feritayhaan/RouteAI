---
# TASLAK — reviewedBy boş. Görev şablonu: araca özel sözdizimi içermez, hiçbir araca bağlı değildir.
# Araca özel rehberi olmayan HER araçta, "video.text-to-video" işi için kullanılır (lib/promptBuilder/fallback.ts).
id: "task-video-text-to-video"
version: 1
appliesTo: []
tasks: ["video.text-to-video"]
modality: "video"
promptLanguage: "en"
sources: ["https://deepmind.google/models/veo/prompt-guide/", "https://developers.openai.com/cookbook/examples/sora/sora2_prompting_guide"]
reviewedBy: ""
reviewedAt: ""
slots:
- id: "subject"
  impact: "high"
  question:
    en: "Who or what is in the video?"
    tr: "Videoda kim ya da ne var?"
  options:
  - id: "person"
    label:
      en: "A person"
      tr: "Bir kişi"
    value: "a person"
  - id: "animal"
    label:
      en: "An animal"
      tr: "Bir hayvan"
    value: "an animal"
  - id: "product"
    label:
      en: "A product"
      tr: "Bir ürün"
    value: "a product"
  - id: "vehicle"
    label:
      en: "A vehicle"
      tr: "Bir araç"
    value: "a vehicle"
  - id: "landscape"
    label:
      en: "A landscape or place"
      tr: "Bir manzara ya da mekân"
    value: "a landscape or place"
  - id: "character"
    label:
      en: "An original character"
      tr: "Özgün bir karakter"
    value: "an original character"
  default: "infer"
- id: "action"
  impact: "high"
  question:
    en: "What happens?"
    tr: "Ne oluyor?"
  options:
  - id: "still"
    label:
      en: "Almost still, subtle motion"
      tr: "Neredeyse sabit, hafif hareket"
    value: "almost still with subtle natural motion"
  - id: "walk"
    label:
      en: "Moves through the scene"
      tr: "Sahnede ilerliyor"
    value: "moves through the scene"
  - id: "interact"
    label:
      en: "Does one simple action"
      tr: "Tek bir basit eylem yapıyor"
    value: "performs one simple clear action"
  - id: "reveal"
    label:
      en: "A reveal"
      tr: "Bir açılış / ortaya çıkış"
    value: "a gradual reveal"
  - id: "transform"
    label:
      en: "A transformation"
      tr: "Bir dönüşüm"
    value: "a transformation"
  default: "infer"
- id: "shot"
  impact: "high"
  question:
    en: "Which shot?"
    tr: "Hangi plan?"
  options:
  - id: "wide"
    label:
      en: "Wide establishing shot"
      tr: "Geniş plan"
    value: "wide establishing shot"
  - id: "medium"
    label:
      en: "Medium shot"
      tr: "Orta plan"
    value: "medium shot"
  - id: "close"
    label:
      en: "Close-up"
      tr: "Yakın çekim"
    value: "close-up"
  - id: "aerial"
    label:
      en: "Aerial view"
      tr: "Kuş bakışı"
    value: "aerial view"
  - id: "pov"
    label:
      en: "First-person view"
      tr: "Birinci kişi bakış"
    value: "first-person point of view"
  default: "infer"
- id: "camera"
  impact: "medium"
  question:
    en: "Camera movement?"
    tr: "Kamera hareketi?"
  options:
  - id: "static"
    label:
      en: "Static"
      tr: "Sabit"
    value: "static camera on a tripod"
  - id: "push"
    label:
      en: "Slow push in"
      tr: "Yavaş yaklaşma"
    value: "slow push-in"
  - id: "pan"
    label:
      en: "Slow pan"
      tr: "Yavaş yan çevirme"
    value: "slow pan"
  - id: "track"
    label:
      en: "Tracking the subject"
      tr: "Konuyu takip"
    value: "camera tracks the subject smoothly"
  - id: "orbit"
    label:
      en: "Orbit around"
      tr: "Etrafında dönme"
    value: "camera orbits slowly around the subject"
  - id: "handheld"
    label:
      en: "Handheld"
      tr: "Elde çekim"
    value: "gentle handheld camera"
  default: "static"
- id: "setting"
  impact: "medium"
  question:
    en: "Where and when?"
    tr: "Nerede ve ne zaman?"
  options:
  - id: "city"
    label:
      en: "City street"
      tr: "Şehir sokağı"
    value: "a city street"
  - id: "nature"
    label:
      en: "Nature"
      tr: "Doğa"
    value: "outdoor nature"
  - id: "interior"
    label:
      en: "Interior"
      tr: "İç mekân"
    value: "a real interior"
  - id: "studio"
    label:
      en: "Studio backdrop"
      tr: "Stüdyo fonu"
    value: "a clean studio backdrop"
  - id: "fantasy"
    label:
      en: "Imaginary world"
      tr: "Hayali dünya"
    value: "an imaginary world"
  default: "infer"
- id: "light"
  impact: "medium"
  question:
    en: "Light and mood?"
    tr: "Işık ve hava?"
  options:
  - id: "golden"
    label:
      en: "Golden hour"
      tr: "Gün batımı ışığı"
    value: "warm golden hour light"
  - id: "daylight"
    label:
      en: "Soft daylight"
      tr: "Yumuşak gün ışığı"
    value: "soft natural daylight"
  - id: "night"
    label:
      en: "Night, neon"
      tr: "Gece, neon"
    value: "night scene with neon light"
  - id: "moody"
    label:
      en: "Moody, low key"
      tr: "Karanlık, gizemli"
    value: "moody low-key lighting"
  - id: "studio"
    label:
      en: "Clean studio light"
      tr: "Temiz stüdyo ışığı"
    value: "clean studio lighting"
  default: "infer"
- id: "style"
  impact: "medium"
  question:
    en: "Which look?"
    tr: "Hangi görünüm?"
  options:
  - id: "cinematic"
    label:
      en: "Cinematic, realistic"
      tr: "Sinematik, gerçekçi"
    value: "cinematic and realistic"
  - id: "doc"
    label:
      en: "Documentary"
      tr: "Belgesel"
    value: "documentary style"
  - id: "ad"
    label:
      en: "Polished commercial"
      tr: "Reklam filmi"
    value: "polished commercial look"
  - id: "anim3d"
    label:
      en: "3D animation"
      tr: "3D animasyon"
    value: "3D animated look"
  - id: "anim2d"
    label:
      en: "2D animation"
      tr: "2D animasyon"
    value: "2D hand-drawn animation look"
  - id: "vintage"
    label:
      en: "Vintage film"
      tr: "Eski film"
    value: "vintage film look"
  default: "cinematic"
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
      en: "Ambient sound and effects"
      tr: "Ortam sesi ve efekt"
    value: "natural ambient sound and sound effects"
  - id: "dialogue"
    label:
      en: "Short spoken line"
      tr: "Kısa bir konuşma cümlesi"
    value: "one short spoken line, written in quotes exactly as given by the user"
  default: "none"
- id: "format"
  impact: "low"
  question:
    en: "Format?"
    tr: "Format?"
  options:
  - id: "wide"
    label:
      en: "Wide 16:9"
      tr: "Yatay 16:9"
    value: "16:9 horizontal"
  - id: "vertical"
    label:
      en: "Vertical 9:16"
      tr: "Dikey 9:16"
    value: "9:16 vertical"
  - id: "square"
    label:
      en: "Square 1:1"
      tr: "Kare 1:1"
    value: "1:1 square"
  default: "wide"
refinements:
- id: "slower"
  label:
    en: "Slower, calmer"
    tr: "Daha yavaş, sakin"
  instruction: "Make the motion slower and calmer: one gentle movement only."
- id: "simpler"
  label:
    en: "Simpler scene"
    tr: "Daha sade sahne"
  instruction: "Simplify the scene: one subject, one action, one setting."
- id: "cinematic"
  label:
    en: "More cinematic"
    tr: "Daha sinematik"
  patch:
    style: "cinematic and realistic"
- id: "close"
  label:
    en: "Closer shot"
    tr: "Daha yakın plan"
  patch:
    shot: "close-up"
- id: "vertical"
  label:
    en: "Vertical"
    tr: "Dikey"
  patch:
    format: "9:16 vertical"
- id: "static"
  label:
    en: "Steady camera"
    tr: "Sabit kamera"
  patch:
    camera: "static camera on a tripod"
- id: "golden"
  label:
    en: "Golden light"
    tr: "Altın ışık"
  patch:
    light: "warm golden hour light"
- id: "ambient"
  label:
    en: "Add ambient sound"
    tr: "Ortam sesi ekle"
  patch:
    sound: "natural ambient sound and sound effects"
checklist: ["Subject described concretely", "One clear action", "Shot type and camera movement", "Setting and light", "Style stated", "Format stated", "No real people, brands or copyrighted characters", "No written text in the scene unless needed"]
validators:
- id: "length"
  type: "maxLength"
  value: 1500
  message: "RouteAI limit: keep the prompt under 1500 characters."
- id: "min-length"
  type: "regex"
  value: "^[\\s\\S]{60,}$"
  message: "Too short: describe the subject, the action and the setting."
- id: "no-braces"
  type: "regex"
  value: "^(?![\\s\\S]*(\\{\\{|\\}\\}))[\\s\\S]*$"
  message: "Remove unfilled {{placeholders}}; write the real content or a [clearly marked placeholder]."
- id: "camera"
  type: "regex"
  value: "[Cc]amera|[Ss]hot|[Cc]lose-up|[Aa]erial|[Tt]racking|[Pp]an\\b|[Pp]ush-in|[Dd]olly|[Oo]rbit|[Ss]tatic|[Pp]oint of view"
  message: "Describe the shot or camera movement."
---

## Sözdizimi

Video üretim araçları (Veo, Sora, Runway, Kling, Pika vb.) kısa bir "çekim tarifi" ister. Google'ın Veo ve OpenAI'nin Sora rehberleri aynı yöndedir: konu, eylem, ortam, kamera, ışık ve görünüm somut anlatılır; araç boşlukları kendisi doldurur ve ne kadar az belirtirsen sonuç o kadar rastgele olur.

**Sıra (tek akıcı paragraf, İngilizce):** (1) plan + kamera hareketi, (2) konu (somut: yaş, kıyafet, renk, nesne), (3) TEK ana eylem, (4) ortam ve zaman, (5) ışık ve hava, (6) görünüm/stil, (7) (varsa) ses, (8) format.

- **Bir sahne, bir eylem, bir kamera hareketi.** Aynı klipte birden çok olay, ışınlanan konu ve karmaşık hareket tutarlılığı bozar. Hikâye için ayrı klipler üret.
- Konuyu görülebilir ayrıntıyla anlat ("a woman in a red wool coat"), soyut sıfatlarla değil ("beautiful").
- Kamera: plan türü (geniş, orta, yakın) + hareket (sabit, yaklaşma, yan çevirme, takip, yörünge). Hareket yavaş ve tek olsun.
- Ses destekleyen araçlarda: ortam sesi/efekt yaz; konuşma varsa kullanıcının verdiği cümleyi tırnak içinde AYNEN koy, cümleyi sen uydurma. Ses desteklemeyen araçta sesi yazma.
- Yap diliyle yaz: "no people in the background" yerine "an empty street".
- Gerçek kişi, ünlü, marka, logo ve telifli karakter yazma; özgün karakter ve genel tarifler kullan. Videoya yazı (tabela, altyazı) istersen kısa ve tırnak içinde yaz; yazılar sık bozulur, çoğu zaman yazı yerine boş bırakıp sonradan eklemek daha güvenlidir.
- Süre, çözünürlük ve en-boy oranı çoğu araçta prompt'tan değil ARAÇ AYARINDAN seçilir; prompt'a yalnızca kompozisyonu etkiliyorsa yaz ve ayarı `howToUse`ta hatırlat. Kesin süre ya da sınır rakamı uydurma.

## Şablon

[Plan], [kamera hareketi]. [Konu: somut görünüm] [tek ana eylem]. Ortam: [yer, zaman]. Işık: [ışık]. Görünüm: [stil]. [Ses: ortam sesi / kullanıcının verdiği cümle]. [Format].

## Yap / Yapma

**Yap**
- Tek sahne, tek eylem, tek kamera hareketi yaz.
- Konuyu görülebilir ayrıntılarla anlat.
- Işığı ve görünümü adıyla söyle.
- Süre ve çözünürlüğü araç ayarından seç.

**Yapma**
- Aynı klipte birden çok olay anlatma.
- Gerçek kişi, ünlü, marka ya da telifli karakter yazma.
- "Güzel, harika" gibi soyut sıfatlarla yetinme.
- Konuşma cümlesi uydurma; kullanıcı vermediyse ses tarif etme.

## Örnekler

**Örnek 1 — ürün:** "Kahve fincanından yükselen buhar, reklam gibi"

```
Close-up shot, slow push-in. A white ceramic cup of black coffee on a dark wooden table, thin steam rising and curling in the light. Warm golden light from a window on the left, soft shadows, shallow depth of field. Polished commercial look, cozy morning mood. Natural ambient sound of a quiet kitchen. 16:9 horizontal.
```

**Örnek 2 — doğa:** "Sisli ormanda yürüyen yaşlı bir adam"

```
Wide establishing shot, camera tracks the subject smoothly from behind. An elderly man in a green raincoat walks along a narrow dirt path through a foggy pine forest. Soft diffused daylight, cool green tones, light mist between the trees. Cinematic and realistic, calm quiet mood. Sound of footsteps and birds. 16:9 horizontal.
```

Örnekler Türkçe açıklandı; İngilizce yazılacak promptlar örneklerde İngilizce gösterilir.

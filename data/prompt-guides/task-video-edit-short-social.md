---
# TASLAK — reviewedBy boş. Görev şablonu: araca özel sözdizimi içermez, hiçbir araca bağlı değildir.
# Araca özel rehberi olmayan HER araçta, "video.edit-short-social" işi için kullanılır (lib/promptBuilder/fallback.ts).
id: "task-video-edit-short-social"
version: 1
appliesTo: []
tasks: ["video.edit-short-social"]
modality: "video"
promptLanguage: "user"
sources: ["https://developers.openai.com/api/docs/guides/prompt-engineering", "https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices"]
reviewedBy: ""
reviewedAt: ""
slots:
- id: "platform"
  impact: "high"
  question:
    en: "Where will it be posted?"
    tr: "Nerede yayınlanacak?"
  options:
  - id: "reels"
    label:
      en: "Instagram Reels"
      tr: "Instagram Reels"
    value: "Instagram Reels"
  - id: "shorts"
    label:
      en: "YouTube Shorts"
      tr: "YouTube Shorts"
    value: "YouTube Shorts"
  - id: "tiktok"
    label:
      en: "TikTok"
      tr: "TikTok"
    value: "TikTok"
  - id: "any"
    label:
      en: "Any vertical platform"
      tr: "Herhangi bir dikey platform"
    value: "a vertical short-video platform"
  default: "infer"
- id: "goal"
  impact: "high"
  question:
    en: "What should the video do?"
    tr: "Video ne yapsın?"
  options:
  - id: "promote"
    label:
      en: "Promote a product or service"
      tr: "Ürün / hizmet tanıtsın"
    value: "promote a product or service"
  - id: "teach"
    label:
      en: "Teach one thing"
      tr: "Tek bir şey öğretsin"
    value: "teach one thing quickly"
  - id: "entertain"
    label:
      en: "Entertain"
      tr: "Eğlendirsin"
    value: "entertain"
  - id: "story"
    label:
      en: "Tell a story"
      tr: "Hikâye anlatsın"
    value: "tell a short story"
  - id: "recap"
    label:
      en: "Recap an event"
      tr: "Bir etkinliği özetlesin"
    value: "recap an event"
  default: "infer"
- id: "source"
  impact: "high"
  question:
    en: "What footage do you have?"
    tr: "Elinde ne var?"
  options:
  - id: "own"
    label:
      en: "My own clips"
      tr: "Kendi çektiğim klipler"
    value: "the user's own clips"
  - id: "long"
    label:
      en: "A longer video to cut down"
      tr: "Kısaltılacak uzun video"
    value: "a longer video to be cut down"
  - id: "photos"
    label:
      en: "Photos and text"
      tr: "Fotoğraf ve yazı"
    value: "photos and text"
  - id: "none"
    label:
      en: "Nothing yet, need a plan"
      tr: "Henüz yok, plan lazım"
    value: "nothing yet, so a shooting and editing plan is needed"
  default: "infer"
- id: "length"
  impact: "medium"
  question:
    en: "Target length?"
    tr: "Hedef süre?"
  options:
  - id: "s15"
    label:
      en: "About 15 seconds"
      tr: "Yaklaşık 15 saniye"
    value: "about 15 seconds"
  - id: "s30"
    label:
      en: "About 30 seconds"
      tr: "Yaklaşık 30 saniye"
    value: "about 30 seconds"
  - id: "s60"
    label:
      en: "About 60 seconds"
      tr: "Yaklaşık 60 saniye"
    value: "about 60 seconds"
  default: "s30"
- id: "pace"
  impact: "medium"
  question:
    en: "Pacing?"
    tr: "Tempo?"
  options:
  - id: "fast"
    label:
      en: "Fast cuts"
      tr: "Hızlı kesmeler"
    value: "fast cuts"
  - id: "medium"
    label:
      en: "Steady"
      tr: "Dengeli"
    value: "steady pacing"
  - id: "calm"
    label:
      en: "Calm, slower"
      tr: "Sakin, yavaş"
    value: "calm and slower pacing"
  default: "fast"
- id: "captions"
  impact: "medium"
  question:
    en: "Captions?"
    tr: "Altyazı?"
  options:
  - id: "yes"
    label:
      en: "Large on-screen captions"
      tr: "Büyük ekran altyazıları"
    value: "large, easy-to-read on-screen captions"
  - id: "key"
    label:
      en: "Only key words"
      tr: "Yalnız anahtar kelimeler"
    value: "on-screen text only for key words"
  - id: "none"
    label:
      en: "None"
      tr: "Yok"
    value: "no captions"
  default: "yes"
- id: "audio"
  impact: "medium"
  question:
    en: "Audio?"
    tr: "Ses?"
  options:
  - id: "music"
    label:
      en: "Background music"
      tr: "Fon müziği"
    value: "background music under the voice"
  - id: "voice"
    label:
      en: "Voiceover"
      tr: "Seslendirme"
    value: "voiceover"
  - id: "original"
    label:
      en: "Original sound"
      tr: "Orijinal ses"
    value: "the original sound of the footage"
  default: "music"
- id: "cta"
  impact: "low"
  question:
    en: "Closing?"
    tr: "Kapanış?"
  options:
  - id: "follow"
    label:
      en: "Follow or subscribe"
      tr: "Takip et / abone ol"
    value: "follow or subscribe"
  - id: "visit"
    label:
      en: "Visit or buy"
      tr: "Ziyaret et / satın al"
    value: "visit or buy"
  - id: "comment"
    label:
      en: "Comment"
      tr: "Yorum yaz"
    value: "comment"
  - id: "none"
    label:
      en: "None"
      tr: "Yok"
    value: "no closing call"
  default: "none"
refinements:
- id: "shorter"
  label:
    en: "Shorter"
    tr: "Daha kısa"
  patch:
    length: "about 15 seconds"
- id: "longer"
  label:
    en: "Longer"
    tr: "Daha uzun"
  patch:
    length: "about 60 seconds"
- id: "faster"
  label:
    en: "Faster"
    tr: "Daha hızlı"
  patch:
    pace: "fast cuts"
- id: "calmer"
  label:
    en: "Calmer"
    tr: "Daha sakin"
  patch:
    pace: "calm and slower pacing"
- id: "captions"
  label:
    en: "Big captions"
    tr: "Büyük altyazı"
  patch:
    captions: "large, easy-to-read on-screen captions"
- id: "hook"
  label:
    en: "Stronger hook"
    tr: "Daha güçlü açılış"
  instruction: "Make the first seconds stronger: open with the most interesting moment or a clear promise of what the viewer will get."
- id: "shotlist"
  label:
    en: "Shot list with timing"
    tr: "Zamanlı çekim listesi"
  instruction: "Give the plan as a shot list with approximate timing for each beat."
- id: "cta"
  label:
    en: "Add a closing call"
    tr: "Kapanış çağrısı ekle"
  patch:
    cta: "follow or subscribe"
checklist: ["Platform and goal", "Footage described", "Strong opening in the first seconds", "Beat-by-beat plan with rough timing", "Captions and audio decided", "One closing call at most", "No copyrighted music or footage requested", "Only what is in the footage or what the user gave"]
validators:
- id: "length"
  type: "maxLength"
  value: 2500
  message: "RouteAI limit: keep the prompt under 2500 characters."
- id: "min-length"
  type: "regex"
  value: "^[\\s\\S]{60,}$"
  message: "Too short: give the edit plan beat by beat."
- id: "no-braces"
  type: "regex"
  value: "^(?![\\s\\S]*(\\{\\{|\\}\\}))[\\s\\S]*$"
  message: "Remove unfilled {{placeholders}}; write the real content or a [clearly marked placeholder]."
---

## Sözdizimi

Kısa sosyal video araçları (CapCut, OpusClip, Canva, Runway, Pika vb.) iki türdür: (a) komutla düzenleyenler, (b) yalnız ayarla çalışanlar. İkisinde de iyi bir **düzenleme özeti** işe yarar: ne anlatılacak, hangi sırayla, ne kadar sürede, hangi ses ve altyazıyla.

**Sıra:** (1) platform ve amaç, (2) eldeki görüntü, (3) hedef süre, (4) vuruş vuruş plan (açılış → gelişme → kapanış, kabaca zamanıyla), (5) tempo, (6) altyazı, (7) ses/müzik, (8) kapanış çağrısı.

- **Açılış belirleyicidir:** ilk saniyelerde en ilginç anı ya da net bir vaadi göster. Giriş uzatma.
- Her vuruş için kabaca zaman yaz (ör. "0–3 sn: …"). Kullanıcının hedef süresine uy; kesin platform sınırı rakamı uydurma.
- Elde görüntü varsa yalnızca onda olanı kullan; olmayan çekimi, sahneyi ya da kişiyi uydurma. Görüntü yoksa plan bir **çekim listesi** olsun.
- Altyazı: büyük, kısa, okunaklı; ekranın güvenli bölgesinde olması gerektiğini hatırlat (arayüz öğeleri üstünü kapatabilir).
- Müziği telifli parça adıyla isteme; "enerjik fon müziği" gibi tarif et ve platformun/aracın kendi müzik kütüphanesini kullanmayı öner.
- Aracın özel komut adlarını bilmeden uydurma; planı düz cümlelerle yaz.
- Dikey format (9:16) çoğu platformda varsayımdır; kullanıcı başka oran istiyorsa belirt.

## Şablon

[Platform] için [amaç] amaçlı yaklaşık [süre] bir kısa video planla. Eldeki görüntü: [görüntü]. Plan: vuruş vuruş, kabaca zamanıyla (açılış, gelişme, kapanış). Tempo: [tempo]. Altyazı: [altyazı]. Ses: [ses]. Kapanış: [çağrı]. Kurallar: ilk saniyelerde en güçlü anı göster; yalnızca eldeki görüntü ve verilen bilgileri kullan; olmayan çekim ya da kişi uydurma; telifli müzik adı isteme.

## Yap / Yapma

**Yap**
- İlk saniyelere güçlü bir açılış koy.
- Planı zamanıyla vuruş vuruş iste.
- Altyazı ve sesi önceden seç.
- Eldeki görüntüyü açıkça yaz.

**Yapma**
- Uzun girişle başlama.
- Telifli şarkı ya da görüntü isteme.
- Olmayan çekim ya da kişi uydurtma.
- Tek videoda birden çok mesaj toplama.

## Örnekler

**Örnek 1 — tanıtım:** "Kafemin yeni menüsü için 30 saniyelik Reels"

```
Instagram Reels için, yeni menüyü tanıtan yaklaşık 30 saniyelik bir kısa video planla. Eldeki görüntü: kendi çektiğim kısa klipler (kahve hazırlama, tabaklar, müşteri gülümsemesi). Plan: vuruş vuruş, kabaca zamanıyla; ilk 3 saniyede en iştah açıcı görüntü. Tempo: hızlı kesmeler. Altyazı: büyük ve kısa. Ses: enerjik fon müziği (telifli şarkı adı yok). Kapanış: "Menüyü gelip dene". Yalnızca eldeki görüntüleri kullan; olmayan sahne uydurma.
```

**Örnek 2 — uzun videodan kısa:** "Podcast bölümünden kısa video"

```
Uzun bir podcast bölümünden YouTube Shorts için yaklaşık 45 saniyelik bir kısa video planla. Konuşmanın en ilgi çekici tek fikrini seç; açılışı bu fikirle yap. Altyazı: büyük, kısa satırlar. Tempo: dengeli. Ses: orijinal ses. Sonda tek bir çağrı: abone ol. Yalnızca konuşmada geçen bilgiyi kullan.
```

Örnekler Türkçe açıklandı; İngilizce yazılacak promptlar örneklerde İngilizce gösterilir.

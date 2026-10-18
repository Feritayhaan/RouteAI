---
# TASLAK — reviewedBy boş. Görev şablonu: araca özel sözdizimi içermez, hiçbir araca bağlı değildir.
# Araca özel rehberi olmayan HER araçta, "video.avatar-presenter" işi için kullanılır (lib/promptBuilder/fallback.ts).
id: "task-video-avatar-presenter"
version: 1
appliesTo: []
tasks: ["video.avatar-presenter"]
modality: "video"
promptLanguage: "user"
sources: ["https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices", "https://developers.openai.com/api/docs/guides/prompt-engineering", "https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices"]
reviewedBy: ""
reviewedAt: ""
slots:
- id: "purpose"
  impact: "high"
  question:
    en: "What is the video for?"
    tr: "Video ne için?"
  options:
  - id: "explainer"
    label:
      en: "Product or service explainer"
      tr: "Ürün / hizmet tanıtımı"
    value: "a product or service explainer"
  - id: "training"
    label:
      en: "Training or onboarding"
      tr: "Eğitim / işe alıştırma"
    value: "a training or onboarding video"
  - id: "ad"
    label:
      en: "Marketing message"
      tr: "Pazarlama mesajı"
    value: "a short marketing message"
  - id: "announce"
    label:
      en: "Announcement"
      tr: "Duyuru"
    value: "an announcement"
  - id: "tutorial"
    label:
      en: "Tutorial intro"
      tr: "Eğitim girişi"
    value: "the introduction of a tutorial"
  - id: "social"
    label:
      en: "Social media update"
      tr: "Sosyal medya paylaşımı"
    value: "a social media update"
  default: "infer"
- id: "audience"
  impact: "high"
  question:
    en: "Who is watching?"
    tr: "Kim izleyecek?"
  options:
  - id: "customers"
    label:
      en: "Customers"
      tr: "Müşteriler"
    value: "customers"
  - id: "employees"
    label:
      en: "Employees"
      tr: "Çalışanlar"
    value: "employees"
  - id: "students"
    label:
      en: "Students"
      tr: "Öğrenciler"
    value: "students"
  - id: "public"
    label:
      en: "General audience"
      tr: "Genel izleyici"
    value: "a general audience"
  default: "infer"
- id: "length"
  impact: "high"
  question:
    en: "How long is the script?"
    tr: "Metin ne kadar uzun?"
  options:
  - id: "short"
    label:
      en: "Short, about 30 seconds"
      tr: "Kısa, yaklaşık 30 saniye"
    value: "a short script that takes about 30 seconds to read aloud"
  - id: "medium"
    label:
      en: "Medium, about 1 minute"
      tr: "Orta, yaklaşık 1 dakika"
    value: "a script that takes about 1 minute to read aloud"
  - id: "long"
    label:
      en: "Longer, about 2 minutes"
      tr: "Uzun, yaklaşık 2 dakika"
    value: "a script that takes about 2 minutes to read aloud"
  default: "medium"
- id: "tone"
  impact: "medium"
  question:
    en: "Delivery tone?"
    tr: "Anlatım tonu?"
  options:
  - id: "friendly"
    label:
      en: "Friendly and warm"
      tr: "Samimi, sıcak"
    value: "friendly and warm"
  - id: "professional"
    label:
      en: "Professional and calm"
      tr: "Profesyonel, sakin"
    value: "professional and calm"
  - id: "energetic"
    label:
      en: "Energetic"
      tr: "Enerjik"
    value: "energetic"
  - id: "reassuring"
    label:
      en: "Reassuring"
      tr: "Güven verici"
    value: "reassuring and steady"
  default: "friendly"
- id: "structure"
  impact: "medium"
  question:
    en: "Structure?"
    tr: "Yapı?"
  options:
  - id: "hook"
    label:
      en: "Hook, main points, call to action"
      tr: "Giriş cümlesi, ana noktalar, çağrı"
    value: "a short hook, the main points, then one call to action"
  - id: "steps"
    label:
      en: "Step by step"
      tr: "Adım adım"
    value: "step by step in order"
  - id: "story"
    label:
      en: "Short story"
      tr: "Kısa hikâye"
    value: "a short story with a clear point"
  default: "hook"
- id: "facts"
  impact: "medium"
  question:
    en: "Facts?"
    tr: "Bilgiler?"
  options:
  - id: "given"
    label:
      en: "Only my facts"
      tr: "Yalnız verdiğim bilgiler"
    value: "use only the facts the user provided; put [placeholders] where details are missing"
  - id: "general"
    label:
      en: "Safe general wording"
      tr: "Genel, güvenli ifade"
    value: "use general, verifiable wording and no invented numbers or claims"
  default: "given"
- id: "cta"
  impact: "low"
  question:
    en: "Closing call?"
    tr: "Kapanış çağrısı?"
  options:
  - id: "visit"
    label:
      en: "Visit or learn more"
      tr: "Ziyaret et / öğren"
    value: "visit or learn more"
  - id: "contact"
    label:
      en: "Get in touch"
      tr: "İletişime geç"
    value: "get in touch"
  - id: "start"
    label:
      en: "Get started"
      tr: "Başla"
    value: "get started"
  - id: "none"
    label:
      en: "None"
      tr: "Yok"
    value: "no call to action"
  default: "none"
refinements:
- id: "shorter"
  label:
    en: "Shorter"
    tr: "Daha kısa"
  patch:
    length: "a short script that takes about 30 seconds to read aloud"
- id: "longer"
  label:
    en: "Longer"
    tr: "Daha uzun"
  patch:
    length: "a script that takes about 2 minutes to read aloud"
- id: "warm"
  label:
    en: "Warmer"
    tr: "Daha sıcak"
  patch:
    tone: "friendly and warm"
- id: "calm"
  label:
    en: "Calmer"
    tr: "Daha sakin"
  patch:
    tone: "professional and calm"
- id: "energy"
  label:
    en: "More energy"
    tr: "Daha enerjik"
  patch:
    tone: "energetic"
- id: "simple"
  label:
    en: "Simpler words"
    tr: "Daha sade kelimeler"
  instruction: "Use simpler everyday words and shorter sentences."
- id: "scenes"
  label:
    en: "Split into scenes"
    tr: "Sahnelere böl"
  instruction: "Split the script into short scenes separated by a blank line, one idea per scene."
- id: "cta"
  label:
    en: "Add a call to action"
    tr: "Çağrı ekle"
  patch:
    cta: "get in touch"
checklist: ["Purpose and audience", "Written to be spoken, not read", "Short sentences, one idea each", "Numbers, symbols and abbreviations written as words", "Only the user's facts", "Length matches the target", "One closing call at most", "Only the spoken script returned"]
validators:
- id: "length"
  type: "maxLength"
  value: 2500
  message: "RouteAI limit: keep the prompt under 2500 characters."
- id: "min-length"
  type: "regex"
  value: "^[\\s\\S]{60,}$"
  message: "Too short: write the script that the avatar will speak."
- id: "no-braces"
  type: "regex"
  value: "^(?![\\s\\S]*(\\{\\{|\\}\\}))[\\s\\S]*$"
  message: "Remove unfilled {{placeholders}}; write the real content or a [clearly marked placeholder]."
---

## Sözdizimi

Avatar sunucu videosunda (HeyGen, Synthesia, D-ID vb.) araca yazılan "prompt" aslında avatarın SESLİ OKUYACAĞI METİNDİR (senaryo). Avatarın görünümü, sesi ve arka planı genellikle araçta seçilir; metin ise sonucun kalitesini belirler. Bu nedenle çıktı, **okunmaya hazır senaryodur**, çekim tarifi değildir.

**Sıra:** (1) amaç ve kitle, (2) yapı (giriş cümlesi → ana noktalar → tek çağrı), (3) ton, (4) uzunluk, (5) bilgi kuralı.

- **Konuşulacak dille yaz**, yazı diliyle değil: kısa cümleler, tek cümlede tek fikir, günlük kelimeler.
- Rakam, kısaltma, sembol ve URL'leri **okunacağı gibi yaz** ("%20" yerine "yüzde yirmi", "www…" yerine "sitemizi ziyaret edin"). Zor adlarda, kullanıcı telaffuzu verdiyse onu kullan; vermediyse tahmin etme.
- Duraklama için noktalama ve kısa paragraflar kullan; sahneleri boş satırla ayır. Aracın özel işaret/etiket sözdizimini bilmiyorsan uydurma.
- Süre için kabaca okuma hızı kullan: kullanıcının hedef süresini söylerse metni ona göre kısa tut; kesin kelime sayısı uydurma, "yaklaşık" de.
- Müşteri sayısı, ödül, yüzde ve fiyat gibi bilgiyi yalnızca kullanıcı verdiyse yaz; eksik olanı [yer tutucu] yap.
- **Gerçek bir kişinin avatarını/sesini** yalnızca kişinin izniyle kullan; başkasının kimliğini taklit eden metin yazma.
- Çıktı: yalnızca konuşulacak metin (sahne etiketleri ve notlar hariç).

## Şablon

[Amaç] için, [kitle] izleyicisine yönelik, avatar sunucunun sesli okuyacağı bir senaryo yaz. Uzunluk: [süre]. Ton: [ton]. Yapı: [yapı]. Bilgiler: [kullanıcının bilgileri]. Kurallar: konuşma diliyle, kısa cümlelerle yaz; rakam ve kısaltmaları okunacağı gibi yaz; yalnızca verilen bilgileri kullan, eksikleri [yer tutucu] yap; sonda en fazla bir çağrı olsun; yalnızca okunacak metni ver.

## Yap / Yapma

**Yap**
- Konuşma diliyle, kısa cümlelerle yaz.
- Rakam ve kısaltmaları okunacağı gibi yaz.
- Sahneleri boş satırla ayır.
- Sonda tek bir çağrı koy.

**Yapma**
- Yazı dilinde uzun, iç içe cümleler kurma.
- URL, sembol ve kısaltmayı olduğu gibi bırakma.
- Kullanıcının vermediği rakam ve iddiaları ekleme.
- İzinsiz gerçek kişinin kimliğini taklit etme.

## Örnekler

**Örnek 1 — tanıtım:** "Yeni yazılım özelliğini tanıtan 1 dakikalık video"

```
[Amaç]: yeni özellik tanıtımı. Kitle: mevcut müşteriler. Uzunluk: yaklaşık 1 dakika. Ton: samimi ve sıcak. Yapı: kısa giriş cümlesi, üç ana nokta, tek çağrı. Bilgiler: [özellik adı], [üç fayda]. Avatar sunucunun sesli okuyacağı senaryoyu yaz: kısa cümleler, konuşma dili, rakamlar ve kısaltmalar okunacağı gibi yazılsın. Yalnızca verilen bilgileri kullan, eksikleri [yer tutucu] yap. Yalnızca okunacak metni ver.
```

**Örnek 2 — eğitim:** "Yeni çalışanlara hoş geldin videosu"

```
Yeni çalışanlar için kısa bir hoş geldin videosunun senaryosunu yaz. Ton: güven verici ve sıcak. Yapı: karşılama, ilk haftada neler olacak (üç madde), kime ulaşılır, kapanış. Bilgiler: [şirket adı], [ilk hafta programı], [iletişim kişisi]. Kısa cümleler kullan; eksik bilgileri [yer tutucu] yap; yalnızca okunacak metni ver.
```

Örnekler Türkçe açıklandı; İngilizce yazılacak promptlar örneklerde İngilizce gösterilir.

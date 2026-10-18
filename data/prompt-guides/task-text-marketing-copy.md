---
# TASLAK — reviewedBy boş. Görev şablonu: araca özel sözdizimi içermez, hiçbir araca bağlı değildir.
# Araca özel rehberi olmayan HER araçta, "text.marketing-copy" işi için kullanılır (lib/promptBuilder/fallback.ts).
id: "task-text-marketing-copy"
version: 1
appliesTo: []
tasks: ["text.marketing-copy"]
modality: "text"
promptLanguage: "user"
sources: ["https://developers.openai.com/api/docs/guides/prompt-engineering", "https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices", "https://ai.google.dev/gemini-api/docs/prompting-strategies"]
reviewedBy: ""
reviewedAt: ""
slots:
- id: "channel"
  impact: "high"
  question:
    en: "Where will the copy appear?"
    tr: "Metin nerede yayınlanacak?"
  options:
  - id: "ad"
    label:
      en: "Paid ad"
      tr: "Reklam"
    value: "a short paid ad"
  - id: "product"
    label:
      en: "Product description"
      tr: "Ürün açıklaması"
    value: "a product description"
  - id: "landing"
    label:
      en: "Landing page"
      tr: "Açılış sayfası"
    value: "landing page copy"
  - id: "social"
    label:
      en: "Social media caption"
      tr: "Sosyal medya metni"
    value: "a social media caption"
  - id: "slogan"
    label:
      en: "Slogan or tagline"
      tr: "Slogan"
    value: "a slogan or tagline"
  - id: "sms"
    label:
      en: "SMS or push notification"
      tr: "SMS / bildirim"
    value: "a short SMS or push notification"
  default: "infer"
- id: "audience"
  impact: "high"
  question:
    en: "Who is it for?"
    tr: "Kime yönelik?"
  options:
  - id: "consumers"
    label:
      en: "Everyday consumers"
      tr: "Bireysel tüketiciler"
    value: "everyday consumers"
  - id: "business"
    label:
      en: "Business buyers"
      tr: "Kurumsal alıcılar"
    value: "business buyers"
  - id: "young"
    label:
      en: "Young audience"
      tr: "Genç kitle"
    value: "a young audience"
  - id: "pros"
    label:
      en: "Professionals"
      tr: "Profesyoneller"
    value: "professionals"
  default: "infer"
- id: "angle"
  impact: "high"
  question:
    en: "What is the main angle?"
    tr: "Ana yaklaşım ne?"
  options:
  - id: "benefit"
    label:
      en: "Lead with the benefit"
      tr: "Faydayı öne çıkar"
    value: "lead with the main benefit for the customer"
  - id: "problem"
    label:
      en: "Problem and solution"
      tr: "Sorun ve çözüm"
    value: "problem and solution"
  - id: "offer"
    label:
      en: "Lead with an offer"
      tr: "Kampanyayı öne çıkar"
    value: "lead with the offer given by the user"
  - id: "story"
    label:
      en: "Short story"
      tr: "Kısa hikâye"
    value: "a short story that leads to the product"
  - id: "feature"
    label:
      en: "Key features"
      tr: "Öne çıkan özellikler"
    value: "highlight the key features"
  default: "infer"
- id: "tone"
  impact: "medium"
  question:
    en: "Which tone?"
    tr: "Hangi ton?"
  options:
  - id: "friendly"
    label:
      en: "Friendly"
      tr: "Samimi"
    value: "friendly and warm"
  - id: "bold"
    label:
      en: "Bold and energetic"
      tr: "Cesur, enerjik"
    value: "bold and energetic"
  - id: "premium"
    label:
      en: "Premium, refined"
      tr: "Premium, rafine"
    value: "refined and premium"
  - id: "witty"
    label:
      en: "Witty"
      tr: "Esprili"
    value: "witty and light"
  - id: "trust"
    label:
      en: "Trustworthy"
      tr: "Güven veren"
    value: "trustworthy and calm"
  default: "infer"
- id: "cta"
  impact: "medium"
  question:
    en: "What should the reader do?"
    tr: "Okuyan ne yapsın?"
  options:
  - id: "buy"
    label:
      en: "Buy now"
      tr: "Satın al"
    value: "buy"
  - id: "learn"
    label:
      en: "Learn more"
      tr: "Daha fazla öğren"
    value: "learn more"
  - id: "signup"
    label:
      en: "Sign up"
      tr: "Kayıt ol"
    value: "sign up"
  - id: "contact"
    label:
      en: "Get in touch"
      tr: "İletişime geç"
    value: "get in touch"
  - id: "none"
    label:
      en: "No call to action"
      tr: "Eylem çağrısı yok"
    value: "no call to action"
  default: "infer"
- id: "variants"
  impact: "medium"
  question:
    en: "How many versions?"
    tr: "Kaç versiyon?"
  options:
  - id: "one"
    label:
      en: "One"
      tr: "Bir"
    value: "one version"
  - id: "three"
    label:
      en: "Three"
      tr: "Üç"
    value: "three different versions"
  - id: "five"
    label:
      en: "Five"
      tr: "Beş"
    value: "five different versions"
  default: "three"
- id: "claims"
  impact: "medium"
  question:
    en: "How should claims be handled?"
    tr: "İddialar nasıl ele alınsın?"
  options:
  - id: "given"
    label:
      en: "Only claims I gave"
      tr: "Yalnız verdiğim iddialar"
    value: "use only the product facts, numbers and claims the user provided"
  - id: "safe"
    label:
      en: "Soft, safe wording"
      tr: "Yumuşak, güvenli dil"
    value: "use soft, verifiable wording and no absolute claims"
  default: "given"
- id: "length"
  impact: "low"
  question:
    en: "How long?"
    tr: "Ne kadar uzun?"
  options:
  - id: "short"
    label:
      en: "Short"
      tr: "Kısa"
    value: "short"
  - id: "medium"
    label:
      en: "Medium"
      tr: "Orta"
    value: "medium length"
  - id: "long"
    label:
      en: "Long and detailed"
      tr: "Uzun ve ayrıntılı"
    value: "long and detailed"
  default: "short"
refinements:
- id: "shorter"
  label:
    en: "Shorter"
    tr: "Daha kısa"
  patch:
    length: "short"
- id: "bolder"
  label:
    en: "Bolder"
    tr: "Daha cesur"
  patch:
    tone: "bold and energetic"
- id: "premium"
  label:
    en: "More premium"
    tr: "Daha premium"
  patch:
    tone: "refined and premium"
- id: "witty"
  label:
    en: "Wittier"
    tr: "Daha esprili"
  patch:
    tone: "witty and light"
- id: "five"
  label:
    en: "Five versions"
    tr: "Beş versiyon"
  patch:
    variants: "five different versions"
- id: "benefit"
  label:
    en: "Lead with benefit"
    tr: "Faydayı öne çıkar"
  patch:
    angle: "lead with the main benefit for the customer"
- id: "cta"
  label:
    en: "Stronger call to action"
    tr: "Daha güçlü eylem çağrısı"
  instruction: "Make the call to action more specific and easy to act on, without adding urgency the user did not state."
- id: "headline"
  label:
    en: "Add headlines"
    tr: "Başlık seçenekleri ekle"
  instruction: "Add three short headline options before the body copy."
checklist: ["Channel and length stated", "Audience stated", "One main angle", "Tone stated", "Call to action stated", "Only facts and claims the user gave", "No invented discounts, reviews or awards", "Number of versions stated"]
validators:
- id: "length"
  type: "maxLength"
  value: 3000
  message: "RouteAI limit: keep the prompt under 3000 characters."
- id: "no-braces"
  type: "regex"
  value: "^(?![\\s\\S]*(\\{\\{|\\}\\}))[\\s\\S]*$"
  message: "Remove unfilled {{placeholders}}; write the real content or a [clearly marked placeholder]."
---

## Sözdizimi

Üç resmî rehberin (OpenAI, Anthropic, Google) ortak önerisi: net ve belirli yaz; amacı, kitleyi ve çıktı biçimini söyle; bağlamı ayrı bir blokta ver; kısıtları "yap" diliyle yaz; stil önemliyse örnek ekle. Kural: bir iş arkadaşına verdiğinde kafası karışacak prompt yapay zekâyı da şaşırtır.

Pazarlama metninde dört şey sonucu belirler: KİME (kitle), NE VAAT (fayda), NEREDE (kanal ve uzunluk), NE YAPSIN (eylem çağrısı). Sıra: (1) kanal ve uzunluk, (2) ürün/hizmet bilgisi (kullanıcıdan gelen gerçekler, ayrı blokta), (3) kitle, (4) ana yaklaşım, (5) ton, (6) eylem çağrısı, (7) kaç versiyon.

- Kullanıcının verdiği fiyat, indirim, süre, özellik ve rakamları aynen kullan. Vermediği değerlendirme, ödül, "en çok satan", yüzde ve garanti uydurma; eksik olanı [yer tutucu] yap.
- "İlk 100 müşteriye" gibi aciliyeti yalnızca kullanıcı verdiyse yaz.
- Kanal sınırı varsa (kısa reklam, SMS) metni o sınıra göre kısa tut; platformun karakter sınırını bilmiyorsan uydurma, "kısa" de.
- Birden çok versiyon iste ve her birinin farklı bir yaklaşım kullanmasını söyle.

## Şablon

Sen [rol: deneyimli metin yazarı]. [Kanal] için [kitle] hedefli, [ana yaklaşım] yaklaşımıyla, [ton] tonda [uzunluk] bir metin yaz. Ürün bilgisi: [kullanıcının verdiği gerçekler]. Eylem çağrısı: [eylem]. [Kaç versiyon] ver; her biri farklı yaklaşım kullansın. Kurallar: yalnızca verilen gerçekleri kullan, olmayan indirim/yorum/ödül uydurma.

## Yap / Yapma

**Yap**
- Faydayı özellikten önce yaz (müşteri ne kazanır).
- Her versiyonu farklı yaklaşımla iste.
- Eylem çağrısını tek ve net yaz.
- Kanal kısıtını (kısa, uzun, tek cümle) belirt.

**Yapma**
- Kullanıcının vermediği yüzde, fiyat, ödül, müşteri yorumu uydurma.
- Rakip adı verip karşılaştırmalı üstünlük iddiası yazdırma.
- Sağlık, finans gibi iddialı vaatler ("kesin sonuç") yazdırma.
- Aynı metinde birden çok eylem çağrısı isteme.

## Örnekler

**Örnek 1 — reklam:** "El yapımı sabun markam için sosyal medya reklamı"

```
Sen deneyimli bir metin yazarısın. Instagram'da yayınlanacak kısa bir reklam metni yaz. Kitle: doğal ürünleri seven bireysel tüketiciler. Yaklaşım: faydayı öne çıkar. Ton: samimi ve sıcak. Ürün bilgisi: zeytinyağı bazlı, el yapımı sabun, kokusuz seçenek de var. Eylem çağrısı: "Siparişini ver". Üç farklı versiyon yaz; her biri farklı bir yaklaşım kullansın. Kurallar: yalnızca verilen bilgileri kullan; indirim, ödül ya da müşteri yorumu uydurma.
```

**Örnek 2 — ürün açıklaması:** "Bluetooth kulaklık için mağaza açıklaması"

```
Bir online mağaza için ürün açıklaması yaz. Ürün: Bluetooth kulaklık. Verilen özellikler: [özellik listesi], pil süresi: [süre], fiyat: [fiyat]. Kitle: günlük kullanıcılar. Yapı: tek cümlelik fayda başlığı, üç maddelik özellik listesi, kısa kapanış. Ton: sade ve güven veren. Yalnızca verilen özellikleri kullan, eksik bilgi için [yer tutucu] bırak.
```

Örnekler Türkçe yazıldı; prompt her zaman kullanıcının dilinde yazılır.

---
# TASLAK — reviewedBy boş. Görev şablonu: araca özel sözdizimi içermez, hiçbir araca bağlı değildir.
# Araca özel rehberi olmayan HER araçta, "code.website-builder" işi için kullanılır (lib/promptBuilder/fallback.ts).
id: "task-code-website-builder"
version: 1
appliesTo: []
tasks: ["code.website-builder"]
modality: "code"
promptLanguage: "user"
sources: ["https://developers.openai.com/api/docs/guides/prompt-engineering", "https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices", "https://ai.google.dev/gemini-api/docs/prompting-strategies"]
reviewedBy: ""
reviewedAt: ""
slots:
- id: "site"
  impact: "high"
  question:
    en: "What kind of site?"
    tr: "Nasıl bir site?"
  options:
  - id: "landing"
    label:
      en: "One-page landing page"
      tr: "Tek sayfa tanıtım"
    value: "a one-page landing page"
  - id: "business"
    label:
      en: "Small business site"
      tr: "Küçük işletme sitesi"
    value: "a small business website"
  - id: "portfolio"
    label:
      en: "Portfolio"
      tr: "Portfolyo"
    value: "a portfolio site"
  - id: "blog"
    label:
      en: "Blog"
      tr: "Blog"
    value: "a blog"
  - id: "store"
    label:
      en: "Simple online store"
      tr: "Basit online mağaza"
    value: "a simple online store"
  - id: "event"
    label:
      en: "Event page"
      tr: "Etkinlik sayfası"
    value: "an event page"
  default: "infer"
- id: "goal"
  impact: "high"
  question:
    en: "What should visitors do?"
    tr: "Ziyaretçi ne yapsın?"
  options:
  - id: "contact"
    label:
      en: "Contact me"
      tr: "Bana ulaşsın"
    value: "contact the owner"
  - id: "buy"
    label:
      en: "Buy"
      tr: "Satın alsın"
    value: "buy a product"
  - id: "book"
    label:
      en: "Book"
      tr: "Randevu / rezervasyon"
    value: "book a service"
  - id: "signup"
    label:
      en: "Sign up"
      tr: "Kaydolsun"
    value: "sign up"
  - id: "learn"
    label:
      en: "Learn about us"
      tr: "Bizi tanısın"
    value: "learn about the business"
  default: "infer"
- id: "pages"
  impact: "high"
  question:
    en: "Which pages or sections?"
    tr: "Hangi sayfa / bölümler?"
  options:
  - id: "minimal"
    label:
      en: "Hero, about, contact"
      tr: "Giriş, hakkımızda, iletişim"
    value: "a hero section, an about section and a contact section"
  - id: "services"
    label:
      en: "Plus services or products"
      tr: "Hizmet / ürünler de olsun"
    value: "a hero, services or products, about, and contact"
  - id: "full"
    label:
      en: "Plus gallery, reviews and FAQ"
      tr: "Galeri, yorum ve SSS de olsun"
    value: "a hero, services or products, gallery, a section for reviews, FAQ, about and contact"
  default: "services"
- id: "style"
  impact: "medium"
  question:
    en: "Look and feel?"
    tr: "Görünüm?"
  options:
  - id: "minimal"
    label:
      en: "Minimal and airy"
      tr: "Sade, ferah"
    value: "minimal and airy with lots of white space"
  - id: "bold"
    label:
      en: "Bold and colorful"
      tr: "Cesur, renkli"
    value: "bold and colorful"
  - id: "elegant"
    label:
      en: "Elegant"
      tr: "Zarif"
    value: "elegant and refined"
  - id: "playful"
    label:
      en: "Playful"
      tr: "Eğlenceli"
    value: "playful and friendly"
  - id: "corporate"
    label:
      en: "Professional"
      tr: "Kurumsal"
    value: "professional and trustworthy"
  default: "minimal"
- id: "content"
  impact: "high"
  question:
    en: "Where does the text come from?"
    tr: "Metinler nereden?"
  options:
  - id: "given"
    label:
      en: "I provide the content"
      tr: "İçeriği ben veriyorum"
    value: "use only the content the user provides and put clearly marked placeholder text where content is missing"
  - id: "draft"
    label:
      en: "Draft it, I will edit"
      tr: "Taslak yaz, ben düzenlerim"
    value: "write draft text from the information the user gave, mark every invented-looking detail as a placeholder, and invent no names, numbers, reviews or logos"
  default: "given"
- id: "device"
  impact: "medium"
  question:
    en: "Which devices?"
    tr: "Hangi cihazlar?"
  options:
  - id: "mobile-first"
    label:
      en: "Mobile first"
      tr: "Önce mobil"
    value: "designed mobile first and working well on desktop"
  - id: "both"
    label:
      en: "Both equally"
      tr: "İkisi de"
    value: "working well on both mobile and desktop"
  default: "mobile-first"
- id: "features"
  impact: "medium"
  question:
    en: "Extra features?"
    tr: "Ek özellikler?"
  options:
  - id: "form"
    label:
      en: "Contact form"
      tr: "İletişim formu"
    value: "a contact form"
  - id: "map"
    label:
      en: "Map and address"
      tr: "Harita ve adres"
    value: "a map and address block"
  - id: "social"
    label:
      en: "Social links"
      tr: "Sosyal medya bağlantıları"
    value: "social media links"
  - id: "none"
    label:
      en: "None"
      tr: "Yok"
    value: "no extra features"
  default: "form"
- id: "lang"
  impact: "low"
  question:
    en: "Language?"
    tr: "Dil?"
  options:
  - id: "one"
    label:
      en: "One language"
      tr: "Tek dil"
    value: "one language, the same as the prompt"
  - id: "two"
    label:
      en: "Two languages"
      tr: "İki dil"
    value: "two languages with a language switch"
  default: "one"
refinements:
- id: "minimal"
  label:
    en: "Simpler page"
    tr: "Daha sade sayfa"
  patch:
    pages: "a hero section, an about section and a contact section"
- id: "full"
  label:
    en: "More sections"
    tr: "Daha çok bölüm"
  patch:
    pages: "a hero, services or products, gallery, a section for reviews, FAQ, about and contact"
- id: "bold"
  label:
    en: "Bolder"
    tr: "Daha cesur"
  patch:
    style: "bold and colorful"
- id: "elegant"
  label:
    en: "More elegant"
    tr: "Daha zarif"
  patch:
    style: "elegant and refined"
- id: "mobile"
  label:
    en: "Mobile first"
    tr: "Önce mobil"
  patch:
    device: "designed mobile first and working well on desktop"
- id: "form"
  label:
    en: "Add a contact form"
    tr: "İletişim formu ekle"
  patch:
    features: "a contact form"
- id: "seo"
  label:
    en: "Basic SEO"
    tr: "Temel SEO"
  instruction: "Add a clear page title, a short description and headings in a logical order for search engines."
- id: "access"
  label:
    en: "Accessible"
    tr: "Erişilebilir"
  instruction: "Use readable font sizes, enough color contrast and descriptive labels for buttons and images."
checklist: ["What the business is and who visits", "One main goal for visitors", "Pages or sections in order", "Style described in a few words", "Text from the user, gaps as placeholders", "No fake reviews, logos, prices or contact details", "Works on mobile", "Contact form or call-to-action defined"]
validators:
- id: "length"
  type: "maxLength"
  value: 3000
  message: "RouteAI limit: keep the prompt under 3000 characters."
- id: "min-length"
  type: "regex"
  value: "^[\\s\\S]{80,}$"
  message: "Too short: say what the site is for, its sections and its style."
- id: "no-braces"
  type: "regex"
  value: "^(?![\\s\\S]*(\\{\\{|\\}\\}))[\\s\\S]*$"
  message: "Remove unfilled {{placeholders}}; write the real content or a [clearly marked placeholder]."
---

## Sözdizimi

Web sitesi kurucularda (Wix, Framer, Webflow AI, Durable, v0, Lovable vb.) prompt bir **site brifidir:** işletme ne, ziyaretçi kim, ne yapmasını istiyorsun, hangi bölümler, nasıl görünsün, metinler nerede. Araç düzen ve renkleri üretir; sen içerik ve hedefi netleştirirsin.

**Sıra:** (1) site türü ve işletme, (2) ziyaretçi ve tek ana hedef, (3) sayfalar/bölümler (sırasıyla), (4) görünüm, (5) içerik kuralı, (6) cihaz ve ek özellikler.

- **Tek ana hedef** seç (iletişim, satın alma, randevu); buton ve düzen ona göre kurulur.
- Bölümleri sırasıyla yaz: giriş (başlık + tek cümle + buton), hizmetler, hakkımızda, iletişim.
- **İçerik kuralı:** kullanıcı vermediği müşteri yorumu, referans/logolar, rakamlar ("500+ müşteri"), ödüller, fiyat, adres ve telefon UYDURMA; [yer tutucu] ya da belirgin örnek metin koy. Sahte yorum ve sahte logo hem yanıltıcıdır hem yasal sorun çıkarabilir.
- Görünümü birkaç kelimeyle tarif et ve marka renkleri/logosu varsa belirt; telifli görsel ya da başka markanın tasarımını kopyalama isteme.
- Mobil uyumluluğu ve okunaklı yazı boyutunu iste.
- Alan adı, yayınlama ve ödeme/form bağlantıları aracın ayarlarındandır; prompt'a özel bir işaretleme yazma.
- Kullanıcı kodla çalışıyorsa teknoloji seçimini ayrıca belirtsin; bilmiyorsa aracın seçmesine bırak.

## Şablon

[İşletme / konu] için [site türü] kur. Ziyaretçiler: [kim]. Ana hedef: ziyaretçi [eylem] yapsın. Bölümler (sırasıyla): [bölümler]. Görünüm: [görünüm]. İçerik: [kullanıcının metinleri / taslak yaz]. Cihaz: [mobil öncelikli]. Ek: [form, harita]. Kurallar: müşteri yorumu, logo, rakam, ödül, fiyat, adres ve telefon uydurma; eksik içeriğe belirgin [yer tutucu] koy.

## Yap / Yapma

**Yap**
- İşletmeyi ve tek ana hedefi söyle.
- Bölümleri sırasıyla yaz.
- Kendi metinlerini ve bilgilerini ekle.
- Mobil uyumluluk iste.

**Yapma**
- Sahte müşteri yorumu, logo, ödül ya da rakam yazdırma.
- Başka sitenin tasarımını kopyalama isteme.
- Her şeyi tek sayfaya doldurma.
- Telefon/adres gibi bilgileri tahminle bırakma.

## Örnekler

**Örnek 1 — yerel işletme:** "Çiçekçi dükkânım için site"

```
Küçük bir çiçekçi dükkânı için tek sayfalık bir tanıtım sitesi kur. Ziyaretçiler: mahalledeki müşteriler. Ana hedef: ziyaretçi telefonla ya da formla sipariş versin. Bölümler (sırasıyla): giriş (başlık, tek cümle, "Sipariş ver" butonu), çiçek çeşitleri, hakkımızda, iletişim (adres ve harita). Görünüm: sade, ferah, yumuşak renkler. İçerik: aşağıdaki bilgileri kullan, eksik yere [yer tutucu] koy. Cihaz: önce mobil. Kurallar: müşteri yorumu, logo, ödül, fiyat, adres ve telefon uydurma.
```

**Örnek 2 — portfolyo:** "Grafik tasarımcı portfolyosu"

```
Bir grafik tasarımcı için portfolyo sitesi kur. Ana hedef: ziyaretçi benimle iletişime geçsin. Bölümler: giriş, seçilmiş işler (galeri), hakkımda, iletişim formu. Görünüm: zarif ve minimal. İçerik: iş görsellerini ve metinleri ben vereceğim; yerlerine belirgin yer tutucu koy. Müşteri adı, ödül ya da rakam uydurma.
```

Örnekler Türkçe yazıldı; prompt her zaman kullanıcının dilinde yazılır (kod ve hata iletileri olduğu gibi kalır).

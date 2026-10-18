---
# TASLAK — reviewedBy boş. Görev şablonu: araca özel sözdizimi içermez, hiçbir araca bağlı değildir.
# Araca özel rehberi olmayan HER araçta, "design.ui-prototype" işi için kullanılır (lib/promptBuilder/fallback.ts).
id: "task-design-ui-prototype"
version: 1
appliesTo: []
tasks: ["design.ui-prototype"]
modality: "code"
promptLanguage: "user"
sources: ["https://developers.openai.com/api/docs/guides/prompt-engineering", "https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices", "https://ai.google.dev/gemini-api/docs/prompting-strategies"]
reviewedBy: ""
reviewedAt: ""
slots:
- id: "what"
  impact: "high"
  question:
    en: "What are you designing?"
    tr: "Ne tasarlıyorsun?"
  options:
  - id: "app"
    label:
      en: "Mobile app screens"
      tr: "Mobil uygulama ekranları"
    value: "mobile app screens"
  - id: "web"
    label:
      en: "Website pages"
      tr: "Web sitesi sayfaları"
    value: "website pages"
  - id: "dashboard"
    label:
      en: "Dashboard"
      tr: "Yönetim paneli"
    value: "a dashboard"
  - id: "flow"
    label:
      en: "A user flow"
      tr: "Bir kullanıcı akışı"
    value: "a short user flow across several screens"
  - id: "component"
    label:
      en: "One component"
      tr: "Tek bir bileşen"
    value: "one interface component"
  default: "infer"
- id: "screens"
  impact: "high"
  question:
    en: "Which screens?"
    tr: "Hangi ekranlar?"
  options:
  - id: "one"
    label:
      en: "One screen"
      tr: "Tek ekran"
    value: "one screen"
  - id: "few"
    label:
      en: "3 to 5 screens"
      tr: "3–5 ekran"
    value: "three to five connected screens"
  - id: "flow"
    label:
      en: "A full flow"
      tr: "Tam akış"
    value: "a complete flow from start to finish"
  default: "few"
- id: "goal"
  impact: "high"
  question:
    en: "What is the user trying to do?"
    tr: "Kullanıcı ne yapmaya çalışıyor?"
  options:
  - id: "signup"
    label:
      en: "Sign up or log in"
      tr: "Kayıt / giriş"
    value: "sign up or log in"
  - id: "browse"
    label:
      en: "Browse and choose"
      tr: "Gez ve seç"
    value: "browse and choose"
  - id: "buy"
    label:
      en: "Buy or book"
      tr: "Satın al / rezerve et"
    value: "buy or book something"
  - id: "track"
    label:
      en: "Track progress or data"
      tr: "İlerleme / veri takibi"
    value: "track progress or data"
  - id: "create"
    label:
      en: "Create content"
      tr: "İçerik oluştur"
    value: "create content"
  default: "infer"
- id: "style"
  impact: "medium"
  question:
    en: "Style?"
    tr: "Stil?"
  options:
  - id: "minimal"
    label:
      en: "Minimal"
      tr: "Minimal"
    value: "minimal and uncluttered"
  - id: "friendly"
    label:
      en: "Friendly and rounded"
      tr: "Samimi, yuvarlak hatlı"
    value: "friendly with rounded shapes"
  - id: "bold"
    label:
      en: "Bold"
      tr: "Cesur"
    value: "bold with strong colors"
  - id: "corporate"
    label:
      en: "Professional"
      tr: "Kurumsal"
    value: "professional and trustworthy"
  - id: "dark"
    label:
      en: "Dark theme"
      tr: "Koyu tema"
    value: "dark theme"
  default: "minimal"
- id: "interaction"
  impact: "medium"
  question:
    en: "How interactive?"
    tr: "Ne kadar etkileşimli?"
  options:
  - id: "static"
    label:
      en: "Static screens"
      tr: "Statik ekranlar"
    value: "static screens"
  - id: "clickable"
    label:
      en: "Clickable between screens"
      tr: "Ekranlar arası tıklanabilir"
    value: "clickable navigation between the screens"
  - id: "working"
    label:
      en: "Working basics"
      tr: "Temel işlevler çalışsın"
    value: "working basics such as form validation and list filtering with sample data"
  default: "clickable"
- id: "content"
  impact: "medium"
  question:
    en: "Content?"
    tr: "İçerik?"
  options:
  - id: "sample"
    label:
      en: "Realistic sample content"
      tr: "Gerçekçi örnek içerik"
    value: "realistic but clearly fictional sample content; no real brands, people or logos"
  - id: "mine"
    label:
      en: "My content"
      tr: "Benim içeriğim"
    value: "the content the user provides"
  default: "sample"
- id: "device"
  impact: "medium"
  question:
    en: "Device?"
    tr: "Cihaz?"
  options:
  - id: "mobile"
    label:
      en: "Phone"
      tr: "Telefon"
    value: "phone-sized screens"
  - id: "desktop"
    label:
      en: "Desktop"
      tr: "Masaüstü"
    value: "desktop-sized screens"
  - id: "responsive"
    label:
      en: "Responsive"
      tr: "Duyarlı"
    value: "responsive layout that works on phone and desktop"
  default: "mobile"
- id: "access"
  impact: "low"
  question:
    en: "Accessibility?"
    tr: "Erişilebilirlik?"
  options:
  - id: "basic"
    label:
      en: "Readable and clear"
      tr: "Okunaklı ve net"
    value: "readable text sizes, enough color contrast and clear labels on buttons and fields"
  - id: "strong"
    label:
      en: "Extra large and high contrast"
      tr: "Daha büyük ve yüksek karşıtlık"
    value: "larger text, strong color contrast, large tap targets and clear labels on buttons and fields"
  default: "basic"
refinements:
- id: "one"
  label:
    en: "One screen only"
    tr: "Yalnız tek ekran"
  patch:
    screens: "one screen"
- id: "flow"
  label:
    en: "Full flow"
    tr: "Tam akış"
  patch:
    screens: "a complete flow from start to finish"
- id: "dark"
  label:
    en: "Dark theme"
    tr: "Koyu tema"
  patch:
    style: "dark theme"
- id: "friendly"
  label:
    en: "Friendlier"
    tr: "Daha samimi"
  patch:
    style: "friendly with rounded shapes"
- id: "clickable"
  label:
    en: "Clickable"
    tr: "Tıklanabilir"
  patch:
    interaction: "clickable navigation between the screens"
- id: "responsive"
  label:
    en: "Responsive"
    tr: "Duyarlı"
  patch:
    device: "responsive layout that works on phone and desktop"
- id: "states"
  label:
    en: "Add states"
    tr: "Durumları ekle"
  instruction: "Also design the empty state, the loading state and the error state for the main screen."
- id: "hierarchy"
  label:
    en: "Clearer hierarchy"
    tr: "Daha net hiyerarşi"
  instruction: "Make the most important action the most prominent element on each screen and keep secondary actions quieter."
checklist: ["What is designed and for which device", "User goal on each screen", "Screens listed in order", "Main action of each screen", "Style in a few words", "Realistic fictional content, no real brands", "Empty, loading and error states considered", "Readable sizes and contrast"]
validators:
- id: "length"
  type: "maxLength"
  value: 3000
  message: "RouteAI limit: keep the prompt under 3000 characters."
- id: "min-length"
  type: "regex"
  value: "^[\\s\\S]{80,}$"
  message: "Too short: say what you are designing, the screens and the user goal."
- id: "no-braces"
  type: "regex"
  value: "^(?![\\s\\S]*(\\{\\{|\\}\\}))[\\s\\S]*$"
  message: "Remove unfilled {{placeholders}}; write the real content or a [clearly marked placeholder]."
---

## Sözdizimi

Prototip araçlarında (v0, Figma Make, Lovable, Stitch vb. — çoğu çalışan arayüz ya da tasarım üretir) prompt bir **arayüz brifidir:** kullanıcı ne yapmaya çalışıyor, hangi ekranlar var, her ekranın ana eylemi ne, nasıl görünsün.

**Sıra:** (1) ne tasarlanıyor ve hangi cihaz, (2) kullanıcı ve amacı, (3) ekranlar (sırayla; her biri için ana eylem ve içerdiği bileşenler), (4) stil, (5) etkileşim düzeyi, (6) içerik kuralı.

- **Ekranları sırayla ve ana eylemiyle yaz:** "1. Giriş ekranı: e-posta + şifre alanı, tek ana buton. 2. Liste: arama kutusu, kartlar, filtre. 3. Detay: fotoğraf, açıklama, 'Rezerve et' butonu."
- **Her ekranda tek ana eylem** belirgin olsun; ikincil eylemler daha sönük.
- Bileşenleri adıyla say (üst çubuk, kart, tablo, form, sekmeler). Stili birkaç kelimeyle tarif et ve marka renkleri varsa yaz.
- **Durumları unutma:** boş durum, yükleniyor ve hata durumunu da tasarlat; prototipler genelde yalnızca "dolu" durumu gösterir.
- İçerik: gerçekçi ama belirgin biçimde **kurgusal** örnek içerik; gerçek marka, kişi, logo ya da fiyat kullanma.
- Erişilebilirlik: okunaklı yazı boyutu, yeterli renk karşıtlığı, butonlarda açık etiket iste.
- Kullanıcı mevcut bir tasarım gösteriyorsa onu AYNEN tarif et ve "yalnızca şu değişikliği yap" de; baştan tasarlatma.

## Şablon

[Ne tasarlanıyor] tasarla, [cihaz] için. Kullanıcı amacı: [amaç]. Ekranlar (sırayla, her birinin ana eylemiyle): [ekran listesi]. Stil: [stil]. Etkileşim: [statik / tıklanabilir / temel işlevler]. İçerik: gerçekçi ama belirgin kurgusal örnek içerik; gerçek marka, kişi ya da logo yok. Her ekranda tek ana eylem belirgin olsun; ana ekran için boş, yükleniyor ve hata durumlarını da göster. Okunaklı yazı boyutu ve yeterli renk karşıtlığı kullan.

## Yap / Yapma

**Yap**
- Ekranları sırayla ve ana eylemleriyle yaz.
- Her ekranda tek ana eylem belirt.
- Boş, yükleniyor ve hata durumlarını iste.
- Kurgusal örnek içerik kullandır.

**Yapma**
- "Güzel bir uygulama tasarla" gibi belirsiz istek verme.
- Gerçek marka, kişi ya da logo kullandırma.
- Tek ekranda her şeyi toplamaya çalışma.
- Mevcut tasarımı tarif etmeden baştan yaptırma.

## Örnekler

**Örnek 1 — mobil:** "Su içme takibi uygulaması"

```
Telefon için bir su içme takibi uygulaması tasarla (3 bağlı ekran). Kullanıcı amacı: günlük su tüketimini takip etmek. Ekranlar: 1) Ana ekran: günlük hedef çemberi, "+250 ml" ana butonu, bugünkü kayıtlar. 2) Geçmiş: haftalık çubuk grafik. 3) Ayarlar: günlük hedef ve hatırlatma saati. Stil: samimi, yuvarlak hatlı, mavi tonlar. Etkileşim: ekranlar arası tıklanabilir. İçerik: gerçekçi ama kurgusal örnek veri. Ana ekran için boş ve hata durumunu da göster. Okunaklı yazı boyutu ve yeterli renk karşıtlığı kullan.
```

**Örnek 2 — web paneli:** "Küçük mağaza sipariş paneli"

```
Masaüstü için bir sipariş yönetim paneli tasarla. Kullanıcı amacı: yeni siparişleri görmek ve durumunu güncellemek. Ekranlar: 1) Sipariş listesi (arama, durum filtresi, tablo), 2) Sipariş detayı (ürünler, müşteri bilgisi kurgusal, durum değiştirme butonu). Stil: kurumsal ve sade. Etkileşim: listeden detaya tıklanabilir; filtre örnek veriyle çalışsın. Gerçek marka ya da kişi kullanma.
```

Örnekler Türkçe yazıldı; prompt her zaman kullanıcının dilinde yazılır (kod ve hata iletileri olduğu gibi kalır).

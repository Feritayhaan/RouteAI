---
# TASLAK — reviewedBy boş. Görev şablonu: araca özel sözdizimi içermez, hiçbir araca bağlı değildir.
# Araca özel rehberi olmayan HER araçta, "code.app-builder" işi için kullanılır (lib/promptBuilder/fallback.ts).
id: "task-code-app-builder"
version: 1
appliesTo: []
tasks: ["code.app-builder"]
modality: "code"
promptLanguage: "user"
sources: ["https://developers.openai.com/api/docs/guides/prompt-engineering", "https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices", "https://ai.google.dev/gemini-api/docs/prompting-strategies"]
reviewedBy: ""
reviewedAt: ""
slots:
- id: "app"
  impact: "high"
  question:
    en: "What kind of app?"
    tr: "Nasıl bir uygulama?"
  options:
  - id: "web"
    label:
      en: "Web app"
      tr: "Web uygulaması"
    value: "a web app"
  - id: "mobile"
    label:
      en: "Mobile-friendly app"
      tr: "Mobil uyumlu uygulama"
    value: "a mobile-friendly app"
  - id: "tool"
    label:
      en: "Internal tool"
      tr: "Şirket içi araç"
    value: "an internal business tool"
  - id: "dashboard"
    label:
      en: "Dashboard"
      tr: "Panel"
    value: "a dashboard with data views"
  - id: "booking"
    label:
      en: "Booking or forms"
      tr: "Randevu / form"
    value: "a booking or form-based app"
  - id: "marketplace"
    label:
      en: "Listing or marketplace"
      tr: "İlan / pazaryeri"
    value: "a listing or marketplace app"
  default: "infer"
- id: "users"
  impact: "high"
  question:
    en: "Who uses it?"
    tr: "Kim kullanacak?"
  options:
  - id: "me"
    label:
      en: "Just me"
      tr: "Yalnız ben"
    value: "only the owner"
  - id: "team"
    label:
      en: "My team"
      tr: "Ekibim"
    value: "a small team"
  - id: "customers"
    label:
      en: "My customers"
      tr: "Müşterilerim"
    value: "customers"
  - id: "public"
    label:
      en: "The public"
      tr: "Herkes"
    value: "the general public"
  default: "infer"
- id: "features"
  impact: "high"
  question:
    en: "How many must-have features?"
    tr: "Kaç temel özellik?"
  options:
  - id: "one"
    label:
      en: "One core feature"
      tr: "Tek temel özellik"
    value: "one core feature only"
  - id: "few"
    label:
      en: "2 to 3 core features"
      tr: "2–3 temel özellik"
    value: "two to three core features"
  - id: "many"
    label:
      en: "Several, built in stages"
      tr: "Birkaç, aşama aşama"
    value: "several features, built in stages starting with the most important"
  default: "few"
- id: "data"
  impact: "medium"
  question:
    en: "What data is stored?"
    tr: "Hangi veri saklanacak?"
  options:
  - id: "none"
    label:
      en: "Nothing stored"
      tr: "Saklanan veri yok"
    value: "no stored data"
  - id: "records"
    label:
      en: "Records users create"
      tr: "Kullanıcıların oluşturduğu kayıtlar"
    value: "records that users create, edit and delete"
  - id: "accounts"
    label:
      en: "Accounts and profiles"
      tr: "Hesaplar ve profiller"
    value: "user accounts and profiles"
  - id: "payments"
    label:
      en: "Orders or payments"
      tr: "Sipariş / ödeme"
    value: "orders or payments"
  default: "records"
- id: "login"
  impact: "medium"
  question:
    en: "Login?"
    tr: "Giriş?"
  options:
  - id: "none"
    label:
      en: "No login"
      tr: "Giriş yok"
    value: "no login"
  - id: "simple"
    label:
      en: "Simple email login"
      tr: "Basit e-posta girişi"
    value: "simple email-based login"
  - id: "roles"
    label:
      en: "Login with roles"
      tr: "Rollü giriş"
    value: "login with different roles, for example admin and user"
  default: "none"
- id: "look"
  impact: "medium"
  question:
    en: "Look and feel?"
    tr: "Görünüm?"
  options:
  - id: "clean"
    label:
      en: "Clean and simple"
      tr: "Sade"
    value: "clean and simple"
  - id: "modern"
    label:
      en: "Modern and bold"
      tr: "Modern, cesur"
    value: "modern with bold colors"
  - id: "friendly"
    label:
      en: "Friendly and playful"
      tr: "Samimi, eğlenceli"
    value: "friendly and playful"
  - id: "corporate"
    label:
      en: "Professional"
      tr: "Kurumsal"
    value: "professional and corporate"
  default: "clean"
- id: "stage"
  impact: "medium"
  question:
    en: "How to build it?"
    tr: "Nasıl kurulsun?"
  options:
  - id: "mvp"
    label:
      en: "Smallest working version first"
      tr: "Önce en küçük çalışan sürüm"
    value: "build the smallest working version first, then wait for the user to review before adding more"
  - id: "full"
    label:
      en: "Everything listed"
      tr: "Hepsi bir arada"
    value: "build everything listed"
  default: "mvp"
- id: "integrations"
  impact: "low"
  question:
    en: "Outside services?"
    tr: "Dış servisler?"
  options:
  - id: "none"
    label:
      en: "None"
      tr: "Yok"
    value: "no outside services"
  - id: "email"
    label:
      en: "Email notifications"
      tr: "E-posta bildirimi"
    value: "email notifications"
  - id: "payments"
    label:
      en: "Online payments"
      tr: "Online ödeme"
    value: "online payments"
  - id: "maps"
    label:
      en: "Maps or calendars"
      tr: "Harita / takvim"
    value: "maps or a calendar"
  default: "none"
refinements:
- id: "mvp"
  label:
    en: "Smallest version first"
    tr: "Önce küçük sürüm"
  patch:
    stage: "build the smallest working version first, then wait for the user to review before adding more"
- id: "login"
  label:
    en: "Add login"
    tr: "Giriş ekle"
  patch:
    login: "simple email-based login"
- id: "no-login"
  label:
    en: "No login"
    tr: "Girişsiz"
  patch:
    login: "no login"
- id: "clean"
  label:
    en: "Cleaner look"
    tr: "Daha sade görünüm"
  patch:
    look: "clean and simple"
- id: "modern"
  label:
    en: "More modern"
    tr: "Daha modern"
  patch:
    look: "modern with bold colors"
- id: "fewer"
  label:
    en: "Fewer features"
    tr: "Daha az özellik"
  patch:
    features: "one core feature only"
- id: "stories"
  label:
    en: "Write user stories"
    tr: "Kullanıcı hikâyesi yaz"
  instruction: "Describe each feature as a short user story: \"As a [user], I want to [action] so that [goal]\"."
- id: "mobile"
  label:
    en: "Mobile first"
    tr: "Önce mobil"
  patch:
    app: "a mobile-friendly app"
checklist: ["What the app is and who uses it", "Core features as user actions", "What is stored and who can see it", "Login and roles", "Look and feel", "Smallest first version defined", "Out-of-scope items listed", "No invented integrations or fake data"]
validators:
- id: "length"
  type: "maxLength"
  value: 3000
  message: "RouteAI limit: keep the prompt under 3000 characters."
- id: "min-length"
  type: "regex"
  value: "^[\\s\\S]{100,}$"
  message: "Too short: describe the app, its users and its core features."
- id: "no-braces"
  type: "regex"
  value: "^(?![\\s\\S]*(\\{\\{|\\}\\}))[\\s\\S]*$"
  message: "Remove unfilled {{placeholders}}; write the real content or a [clearly marked placeholder]."
---

## Sözdizimi

Kod yazmadan uygulama kuran araçlarda (Lovable, Bolt, Replit Agent, v0 vb.) prompt bir **ürün tarifidir**, kod değil. Programcı olmayan kullanıcı "ne yapılacağını" anlatır; araç "nasıl"ı seçer. İyi tarif: kim kullanır, ne yapabilir, hangi veri tutulur, nasıl görünür, önce neyi kuralım.

**Sıra:** (1) uygulama ne ve kimin için, (2) temel özellikler (kullanıcı eylemi olarak), (3) saklanan veri, (4) giriş ve roller, (5) ekranlar/akış, (6) görünüm, (7) ilk sürüm sınırı, (8) kapsam dışı olanlar.

- **Özellikleri kullanıcı eylemi olarak yaz:** "Kullanıcı bir görev ekleyip tamamlandı olarak işaretleyebilir." Teknik ayrıntı (veritabanı türü, çerçeve) yazma; kullanıcı belirtmediyse aracın seçmesine izin ver.
- **Önce en küçük çalışan sürüm** (MVP): "ilk önce yalnızca X'i kur, ben deneyeyim, sonra ekleriz." Hepsini tek promptta istemek hata ve belirsizlik getirir.
- **Kapsam dışını yaz:** "ödeme, bildirim, yönetici paneli bu sürümde yok."
- Örnek veri/metin gerekiyorsa "belirgin örnek veri koy, gerçek marka, kişi ya da fiyat uydurma" de.
- Dış servisler (ödeme, e-posta, harita) hesap/anahtar ister; kullanıcı istemediyse ekleme. Gerçek müşteri verisi ve ödeme akışını canlıya almadan önce uzmanla doğrulat (`howToUse`).
- Sonuç iyi değilse yeniden büyük prompt yazmak yerine **küçük, tek değişiklikli** takip istekleri öner.

## Şablon

[Uygulama türü] kur. Kullanıcılar: [kim]. Temel özellikler (kullanıcı eylemi olarak): [1], [2], [3]. Saklanan veri: [veri]. Giriş: [giriş / roller]. Görünüm: [görünüm]. İlk sürüm: yalnızca [en önemli özellik]; ben deneyene kadar başka özellik ekleme. Bu sürümde yok: [kapsam dışı]. Örnek veri belirgin olsun; gerçek marka, kişi ya da fiyat uydurma.

## Yap / Yapma

**Yap**
- Kullanıcıyı ve temel eylemleri anlat.
- Önce tek bir çalışan küçük sürüm iste.
- Kapsam dışı olanları yaz.
- Görünümü bir iki kelimeyle tarif et.

**Yapma**
- Veritabanı/çerçeve seçimini bilmeden zorlamayla belirtme.
- Tek promptta her şeyi isteme.
- Gerçek müşteri verisiyle başlama.
- Ödeme ve gizli verili akışları denetlenmeden canlıya alma.

## Örnekler

**Örnek 1 — randevu:** "Berber salonu için randevu uygulaması"

```
Küçük bir berber salonu için web tabanlı bir randevu uygulaması kur. Kullanıcılar: salon sahibi ve müşteriler. Temel özellikler: müşteri uygun saatleri görüp randevu alabilir; sahibi günlük randevuları görüp iptal edebilir. Saklanan veri: randevular (ad, telefon, saat). Giriş: müşteri için giriş yok, sahibi için basit e-posta girişi. Görünüm: sade ve samimi. İlk sürüm: yalnızca randevu alma ve günlük liste; ben deneyene kadar başka özellik ekleme. Bu sürümde yok: ödeme ve SMS bildirimi. Örnek veri belirgin olsun; gerçek isim ya da fiyat uydurma.
```

**Örnek 2 — görev takibi:** "Ekibim için görev listesi"

```
Küçük bir ekip için görev takip uygulaması kur. Temel özellikler: görev ekleme, kişiye atama, tamamlandı işaretleme. Giriş: e-posta ile; roller yok. Görünüm: modern ve sade. İlk sürüm: yalnızca görev ekleme ve tamamlama. Bu sürümde yok: bildirimler ve raporlar.
```

Örnekler Türkçe yazıldı; prompt her zaman kullanıcının dilinde yazılır (kod ve hata iletileri olduğu gibi kalır).

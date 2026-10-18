---
# TASLAK — reviewedBy boş. Görev şablonu: araca özel sözdizimi içermez, hiçbir araca bağlı değildir.
# Araca özel rehberi olmayan HER araçta, "slides.create" işi için kullanılır (lib/promptBuilder/fallback.ts).
id: "task-slides-create"
version: 1
appliesTo: []
tasks: ["slides.create"]
modality: "slides"
promptLanguage: "user"
sources: ["https://gamma.app/explore/content/guides/the-ultimate-guide-to-ai-presentation-prompts-how-to-get-better-slides-from-gamma", "https://developers.openai.com/api/docs/guides/prompt-engineering", "https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices"]
reviewedBy: ""
reviewedAt: ""
slots:
- id: "deck"
  impact: "high"
  question:
    en: "What kind of presentation?"
    tr: "Nasıl bir sunum?"
  options:
  - id: "pitch"
    label:
      en: "Pitch deck"
      tr: "Yatırımcı / pitch sunumu"
    value: "a pitch deck"
  - id: "sales"
    label:
      en: "Sales or product deck"
      tr: "Satış / ürün sunumu"
    value: "a sales or product presentation"
  - id: "report"
    label:
      en: "Business report"
      tr: "İş raporu"
    value: "a business report presentation"
  - id: "training"
    label:
      en: "Training or lesson"
      tr: "Eğitim / ders"
    value: "a training or lesson presentation"
  - id: "talk"
    label:
      en: "Conference talk"
      tr: "Konuşma sunumu"
    value: "a talk or conference presentation"
  - id: "proposal"
    label:
      en: "Project proposal"
      tr: "Proje önerisi"
    value: "a project proposal"
  default: "infer"
- id: "audience"
  impact: "high"
  question:
    en: "Who will watch it?"
    tr: "Kim izleyecek?"
  options:
  - id: "execs"
    label:
      en: "Executives"
      tr: "Yöneticiler"
    value: "executives and decision makers"
  - id: "clients"
    label:
      en: "Clients"
      tr: "Müşteriler"
    value: "clients or prospects"
  - id: "investors"
    label:
      en: "Investors"
      tr: "Yatırımcılar"
    value: "investors"
  - id: "team"
    label:
      en: "My team"
      tr: "Ekibim"
    value: "my team"
  - id: "students"
    label:
      en: "Students"
      tr: "Öğrenciler"
    value: "students"
  - id: "public"
    label:
      en: "General audience"
      tr: "Genel kitle"
    value: "a general audience"
  default: "infer"
- id: "goal"
  impact: "high"
  question:
    en: "What should they do after it?"
    tr: "Sonunda ne yapsınlar?"
  options:
  - id: "decide"
    label:
      en: "Make a decision"
      tr: "Karar versinler"
    value: "make a decision"
  - id: "learn"
    label:
      en: "Understand and remember"
      tr: "Anlasınlar"
    value: "understand and remember the key points"
  - id: "buy"
    label:
      en: "Buy or sign up"
      tr: "Satın alsınlar"
    value: "buy or sign up"
  - id: "fund"
    label:
      en: "Support or fund"
      tr: "Destek / yatırım versinler"
    value: "support or fund the idea"
  - id: "act"
    label:
      en: "Take next steps"
      tr: "Sonraki adımı atsınlar"
    value: "take clear next steps"
  default: "infer"
- id: "length"
  impact: "medium"
  question:
    en: "How many slides?"
    tr: "Kaç slayt?"
  options:
  - id: "short"
    label:
      en: "About 5 slides"
      tr: "Yaklaşık 5 slayt"
    value: "about 5 slides"
  - id: "medium"
    label:
      en: "About 10 slides"
      tr: "Yaklaşık 10 slayt"
    value: "about 10 slides"
  - id: "long"
    label:
      en: "About 15 slides"
      tr: "Yaklaşık 15 slayt"
    value: "about 15 slides"
  default: "medium"
- id: "content"
  impact: "medium"
  question:
    en: "How should content be handled?"
    tr: "İçerik nasıl ele alınsın?"
  options:
  - id: "given"
    label:
      en: "Only my content"
      tr: "Yalnız verdiğim içerik"
    value: "use only the content, numbers and facts the user provided; put [placeholders] where data is missing"
  - id: "outline"
    label:
      en: "Build from my outline"
      tr: "Taslağıma göre kur"
    value: "follow the user's outline and fill the slides without adding new facts or numbers"
  default: "given"
- id: "style"
  impact: "medium"
  question:
    en: "Which text style?"
    tr: "Slayt metni nasıl olsun?"
  options:
  - id: "concise"
    label:
      en: "Short bullets"
      tr: "Kısa maddeler"
    value: "a title plus 3 to 5 short bullet points per slide"
  - id: "visual"
    label:
      en: "Very little text"
      tr: "Çok az metin"
    value: "very little text per slide, one key message and a suggested visual"
  - id: "detailed"
    label:
      en: "Detailed"
      tr: "Ayrıntılı"
    value: "fuller text with a short explanation per slide"
  default: "concise"
- id: "notes"
  impact: "medium"
  question:
    en: "Speaker notes?"
    tr: "Konuşmacı notları?"
  options:
  - id: "yes"
    label:
      en: "Yes"
      tr: "Evet"
    value: "add short speaker notes for every slide"
  - id: "no"
    label:
      en: "No"
      tr: "Hayır"
    value: "no speaker notes"
  default: "no"
- id: "tone"
  impact: "low"
  question:
    en: "Tone?"
    tr: "Ton?"
  options:
  - id: "professional"
    label:
      en: "Professional"
      tr: "Profesyonel"
    value: "professional"
  - id: "friendly"
    label:
      en: "Friendly"
      tr: "Samimi"
    value: "friendly"
  - id: "bold"
    label:
      en: "Bold and inspiring"
      tr: "Cesur, ilham verici"
    value: "bold and inspiring"
  default: "professional"
refinements:
- id: "shorter"
  label:
    en: "Fewer slides"
    tr: "Daha az slayt"
  patch:
    length: "about 5 slides"
- id: "longer"
  label:
    en: "More slides"
    tr: "Daha çok slayt"
  patch:
    length: "about 15 slides"
- id: "visual"
  label:
    en: "Less text"
    tr: "Daha az metin"
  patch:
    style: "very little text per slide, one key message and a suggested visual"
- id: "notes"
  label:
    en: "Add speaker notes"
    tr: "Konuşmacı notu ekle"
  patch:
    notes: "add short speaker notes for every slide"
- id: "bold"
  label:
    en: "Bolder"
    tr: "Daha cesur"
  patch:
    tone: "bold and inspiring"
- id: "friendly"
  label:
    en: "Friendlier"
    tr: "Daha samimi"
  patch:
    tone: "friendly"
- id: "story"
  label:
    en: "Stronger story"
    tr: "Daha güçlü hikâye"
  instruction: "Make the deck follow one story line: problem, why it matters, solution, proof, next step."
- id: "cta"
  label:
    en: "Clear closing slide"
    tr: "Net kapanış slaydı"
  instruction: "End with one closing slide that states the single next step the audience should take."
checklist: ["Deck type and audience", "Goal of the deck", "Number of slides", "One message per slide", "Only the user's facts and numbers, gaps as [placeholders]", "Title plus short points, not paragraphs", "Closing slide with the next step"]
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

Üç resmî rehberin (OpenAI, Anthropic, Google) ortak önerisi: net ve belirli yaz; amacı, kitleyi ve çıktı biçimini söyle; bağlamı ayrı blokta ver; kısıtları "yap" diliyle yaz. Araştırmada ek kural: kaynağı olmayan bilgi, "bulamadım" demekten daha kötüdür.

Slayt aracı (Gamma, Beautiful.ai, Tome, Canva vb.) için prompt bir SUNUM ÖZETİDİR: araç tasarımı kendisi yapar, sen KİME, NE AMAÇLA ve HANGİ İÇERİKLE'yi söylersin. Gamma'nın kendi rehberi de aynı yönde: konuyu, kitleyi, amacı, tonu ve yapıyı belirtmek daha iyi sonuç verir.

Sıra: (1) sunum türü ve konu, (2) kitle, (3) amaç (izleyici sonunda ne yapsın), (4) slayt sayısı ve akış, (5) içerik bloğu (kullanıcının verdiği bilgi ve rakamlar), (6) slayt başına metin miktarı, (7) ton.

- Akışı yaz: ör. kapak → sorun → çözüm → kanıt → plan → kapanış. Kullanıcı taslak verdiyse aynen izle.
- Slayt başına TEK ana mesaj; metin kısa maddeler olsun.
- Rakam, müşteri adı, pazar büyüklüğü ve alıntıyı yalnızca kullanıcı verdiyse yaz; eksik veriye [yer tutucu] koy. Aracın "otomatik grafik/veri" özelliği uydurma rakam üretebilir; rakamları sen ver.
- Görsel/ikon istiyorsan "önerilen görsel" olarak tarif ettir; telifli görsel ya da marka logosu isteme.
- Görsel tema ve renkleri çoğu zaman aracın içinden seçersin; prompt'a yalnızca marka renklerin varsa ve araç destekliyorsa ekle.

## Şablon

[Sunum türü] hazırla. Konu: [konu]. Kitle: [kitle]. Amaç: izleyici sonunda [eylem]. Yaklaşık [sayı] slayt. Akış: [akış / "uygun akışı öner"]. İçerik: [kullanıcının bilgileri ve rakamları]. Slayt metni: [stil]. Ton: [ton]. Konuşmacı notu: [evet/hayır]. Kurallar: yalnızca verilen bilgi ve rakamları kullan; eksik veriye [yer tutucu] koy; slayt başına tek ana mesaj; son slaytta tek net sonraki adım.

## Yap / Yapma

**Yap**
- Kitleyi ve izleyicinin sonunda ne yapacağını yaz.
- Slayt sayısını ve akışı belirt.
- Kendi bilgi ve rakamlarını ayrı blokta ver.
- Slayt başına metin miktarını söyle.

**Yapma**
- Sadece konu adını yazıp bırakma ("Yapay zekâ hakkında sunum").
- Aracın rakam uydurmasına izin verme.
- Slayta paragraf doldurtma.
- Tek sunumda birden çok farklı hedef karıştırma.

## Örnekler

**Örnek 1 — pitch:** "Mobil uygulama fikri için yatırımcı sunumu"

```
Yatırımcı sunumu (pitch deck) hazırla. Konu: [uygulama adı], [tek cümlelik açıklama]. Kitle: erken aşama yatırımcılar. Amaç: toplantı sonunda ikinci görüşme talep etsinler. Yaklaşık 10 slayt. Akış: kapak, sorun, çözüm, ürün, pazar, iş modeli, rekabet, ekip, yol haritası, talep/kapanış. İçerik: [kullanıcının bilgileri ve rakamları]. Slayt başına başlık ve en fazla 4 kısa madde. Ton: profesyonel ve güven veren. Kurallar: yalnızca verilen bilgi ve rakamları kullan; pazar büyüklüğü, gelir ya da müşteri sayısı uydurma, eksik veriye [yer tutucu] koy; son slaytta tek net sonraki adım.
```

**Örnek 2 — ders:** "Fotosentez dersi için sunum"

```
Ortaokul öğrencileri için fotosentez dersi sunumu hazırla. Amaç: öğrenciler süreci anlasın ve hatırlasın. Yaklaşık 8 slayt. Slayt başına çok az metin, tek ana mesaj ve önerilen görsel tarifi. Sonda üç soruluk mini quiz slaydı ekle. Her slayt için kısa konuşmacı notu yaz. Ton: samimi.
```

Örnekler Türkçe yazıldı; prompt her zaman kullanıcının dilinde yazılır.

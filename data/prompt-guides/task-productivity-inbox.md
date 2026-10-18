---
# TASLAK — reviewedBy boş. Görev şablonu: araca özel sözdizimi içermez, hiçbir araca bağlı değildir.
# Araca özel rehberi olmayan HER araçta, "productivity.inbox" işi için kullanılır (lib/promptBuilder/fallback.ts).
id: "task-productivity-inbox"
version: 1
appliesTo: []
tasks: ["productivity.inbox"]
modality: "text"
promptLanguage: "user"
sources: ["https://developers.openai.com/api/docs/guides/prompt-engineering", "https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices", "https://ai.google.dev/gemini-api/docs/prompting-strategies"]
reviewedBy: ""
reviewedAt: ""
slots:
- id: "need"
  impact: "high"
  question:
    en: "What should the assistant do with your inbox?"
    tr: "Asistan gelen kutunla ne yapsın?"
  options:
  - id: "triage"
    label:
      en: "Sort by priority"
      tr: "Önceliğe göre sırala"
    value: "triage emails by priority"
  - id: "draft"
    label:
      en: "Draft replies"
      tr: "Cevap taslağı yaz"
    value: "draft replies for the user to review"
  - id: "summarize"
    label:
      en: "Summarize threads"
      tr: "Zincirleri özetle"
    value: "summarize long email threads"
  - id: "rules"
    label:
      en: "Set up labels and rules"
      tr: "Etiket ve kural kur"
    value: "suggest labels and rules for organizing email"
  - id: "clean"
    label:
      en: "Clean up newsletters"
      tr: "Bülten temizliği"
    value: "identify newsletters and promotions that can be archived or unsubscribed"
  default: "infer"
- id: "priority"
  impact: "high"
  question:
    en: "What is urgent for you?"
    tr: "Senin için ne acil?"
  options:
  - id: "people"
    label:
      en: "Specific people"
      tr: "Belirli kişiler"
    value: "emails from the people the user names"
  - id: "deadline"
    label:
      en: "Deadlines"
      tr: "Son tarihler"
    value: "emails with deadlines or time-sensitive requests"
  - id: "customers"
    label:
      en: "Customers"
      tr: "Müşteriler"
    value: "customer emails"
  - id: "money"
    label:
      en: "Invoices and payments"
      tr: "Fatura ve ödemeler"
    value: "invoices, payments and billing"
  default: "infer"
- id: "autonomy"
  impact: "high"
  question:
    en: "How much should it do alone?"
    tr: "Ne kadarını tek başına yapsın?"
  options:
  - id: "suggest"
    label:
      en: "Only suggest"
      tr: "Yalnız önersin"
    value: "only suggest; never send, delete or move anything without the user's approval"
  - id: "draft"
    label:
      en: "Draft, I approve"
      tr: "Taslak yazsın, ben onaylayayım"
    value: "prepare drafts and wait for the user's approval before sending"
  default: "draft"
- id: "voice"
  impact: "medium"
  question:
    en: "Which voice for drafts?"
    tr: "Taslaklar hangi üslupta?"
  options:
  - id: "brief"
    label:
      en: "Brief and direct"
      tr: "Kısa ve net"
    value: "brief and direct"
  - id: "friendly"
    label:
      en: "Warm and friendly"
      tr: "Sıcak, samimi"
    value: "warm and friendly"
  - id: "formal"
    label:
      en: "Formal"
      tr: "Resmî"
    value: "formal"
  - id: "mine"
    label:
      en: "Like my past emails"
      tr: "Eski e-postalarım gibi"
    value: "matching the user's past emails, using the examples provided"
  default: "infer"
- id: "length"
  impact: "medium"
  question:
    en: "Reply length?"
    tr: "Cevap uzunluğu?"
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
    value: "medium"
  - id: "detailed"
    label:
      en: "Detailed"
      tr: "Ayrıntılı"
    value: "detailed"
  default: "short"
- id: "labels"
  impact: "medium"
  question:
    en: "Categories?"
    tr: "Kategoriler?"
  options:
  - id: "simple"
    label:
      en: "Simple few"
      tr: "Birkaç basit kategori"
    value: "a few simple categories such as action needed, waiting, read later and archive"
  - id: "mine"
    label:
      en: "My own"
      tr: "Kendi kategorilerim"
    value: "the categories the user provides"
  default: "simple"
- id: "privacy"
  impact: "low"
  question:
    en: "Sensitive emails?"
    tr: "Hassas e-postalar?"
  options:
  - id: "skip"
    label:
      en: "Skip them"
      tr: "Atlasın"
    value: "skip emails marked personal, legal, medical or financial and flag them for the user"
  - id: "normal"
    label:
      en: "Handle normally"
      tr: "Normal ele alsın"
    value: "handle all emails the same way"
  default: "skip"
refinements:
- id: "shorter"
  label:
    en: "Shorter replies"
    tr: "Daha kısa cevaplar"
  patch:
    length: "short"
- id: "formal"
  label:
    en: "More formal"
    tr: "Daha resmî"
  patch:
    voice: "formal"
- id: "friendly"
  label:
    en: "Warmer"
    tr: "Daha sıcak"
  patch:
    voice: "warm and friendly"
- id: "suggest"
  label:
    en: "Suggest only"
    tr: "Yalnız önersin"
  patch:
    autonomy: "only suggest; never send, delete or move anything without the user's approval"
- id: "triage"
  label:
    en: "Triage first"
    tr: "Önce önceliklendir"
  patch:
    need: "triage emails by priority"
- id: "summaries"
  label:
    en: "Add summaries"
    tr: "Özet ekle"
  instruction: "For each long thread, add a two-sentence summary and the question that needs an answer."
- id: "questions"
  label:
    en: "Ask when unsure"
    tr: "Emin değilse sorsun"
  instruction: "When a reply needs a fact, a date or a commitment that is not in the email, ask the user instead of guessing."
- id: "rules"
  label:
    en: "Suggest rules"
    tr: "Kural öner"
  patch:
    need: "suggest labels and rules for organizing email"
checklist: ["What the assistant does with the inbox", "What counts as urgent", "Never sends or deletes without approval", "Voice for drafts", "Never invents dates, prices or commitments", "Sensitive emails flagged", "Categories named"]
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

E-posta yönetimi araçları (ör. Superhuman, Shortwave, Fyxer) genellikle "yapay zekâya talimat" alanı sunar; bu prompt, o talimat gibi çalışan bir KURAL SETİdir. Sıra: (1) görev, (2) öncelik kuralları (kim, ne zaman acil), (3) özerklik sınırı, (4) üslup ve uzunluk, (5) kategoriler, (6) gizlilik ve yasaklar.

- Özerklik sınırı şart: "kullanıcı onayı olmadan hiçbir şeyi gönderme, silme, taşıma" gibi açık bir kural yaz.
- Taslaklarda tarih, fiyat, söz ve dosya eki uydurulmaz; bilgi eksikse yapay zekâ kullanıcıya sorar ya da [yer tutucu] bırakır.
- Üslup için kullanıcının geçmiş e-postalarından birkaç örnek ver; örnek yoksa 3–5 kısa özellik yaz (kısa cümleler, selam biçimi, kapanış).
- Hassas e-postalar (kişisel, hukuki, tıbbi, finansal) için "işaretle ve dokunma" kuralı koy.
- Aracın hangi talimat alanlarını desteklediğini bilmeden özellik adı uydurma; kuralı düz cümlelerle yaz.

## Şablon

Görev: [gelen kutusu görevi]. Acil sayılacaklar: [kişiler / son tarihler / müşteriler / faturalar]. Özerklik: onayım olmadan hiçbir e-postayı gönderme, silme ya da taşıma; [yalnız öner / taslak yaz]. Üslup: [üslup], cevaplar [uzunluk]. Kategoriler: [kategoriler]. Kurallar: tarih, fiyat ve söz uydurma; bilgi eksikse bana sor; kişisel, hukuki, tıbbi ve finansal e-postaları işaretle ve dokunma.

## Yap / Yapma

**Yap**
- Acil sayılanları kişi, son tarih ve konu olarak yaz.
- "Onayım olmadan gönderme" kuralını ekle.
- Üslup için gerçek e-posta örneği ver.
- Hassas e-postalar için ayrı kural yaz.

**Yapma**
- "Tüm e-postaları cevapla" gibi sınırsız yetki verme.
- Yapay zekânın bilmediği tarih, fiyat ve taahhütleri yazmasına izin verme.
- Aracın olmayan özelliklerini isteme.
- Gelen kutusundaki kişisel verileri üçüncü kişilere aktarmaya yönelik kural yazma.

## Örnekler

**Örnek 1 — öncelik:** "Yoğun gelen kutumu önceliklendir"

```
Gelen kutumdaki e-postaları önceliğe göre sırala. Acil sayılanlar: yöneticimden gelenler, son tarihi olanlar ve müşteri e-postaları. Kategoriler: işlem gerekli, bekliyor, sonra oku, arşivle. Onayım olmadan hiçbir e-postayı gönderme, silme ya da taşıma; yalnızca öner. Kişisel, hukuki, tıbbi ve finansal e-postaları işaretle ve dokunma. Her işlem gerekli e-posta için tek cümlelik özet yaz.
```

**Örnek 2 — taslak:** "Müşteri e-postalarına cevap taslağı"

```
Müşteri e-postalarına cevap taslağı hazırla ve onayımı bekle. Üslup: kısa, net ve sıcak; selamlama "Merhaba [ad]", kapanış "İyi çalışmalar". Tarih, fiyat ya da söz uydurma; e-postada olmayan bir bilgi gerekiyorsa taslakta [yer tutucu] bırak ve bana sor.
```

Örnekler Türkçe yazıldı; prompt her zaman kullanıcının dilinde yazılır.

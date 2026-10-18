---
# TASLAK — reviewedBy boş. Görev şablonu: araca özel sözdizimi içermez, hiçbir araca bağlı değildir.
# Araca özel rehberi olmayan HER araçta, "support.chatbot" işi için kullanılır (lib/promptBuilder/fallback.ts).
id: "task-support-chatbot"
version: 1
appliesTo: []
tasks: ["support.chatbot"]
modality: "automation"
promptLanguage: "user"
sources: ["https://developers.openai.com/api/docs/guides/prompt-engineering", "https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices", "https://ai.google.dev/gemini-api/docs/prompting-strategies"]
reviewedBy: ""
reviewedAt: ""
slots:
- id: "business"
  impact: "high"
  question:
    en: "What is the bot for?"
    tr: "Bot ne için?"
  options:
  - id: "shop"
    label:
      en: "Online store"
      tr: "Online mağaza"
    value: "an online store"
  - id: "saas"
    label:
      en: "Software product"
      tr: "Yazılım ürünü"
    value: "a software product"
  - id: "service"
    label:
      en: "Service business"
      tr: "Hizmet işletmesi"
    value: "a service business"
  - id: "booking"
    label:
      en: "Bookings and appointments"
      tr: "Randevu / rezervasyon"
    value: "bookings and appointments"
  - id: "internal"
    label:
      en: "Internal helpdesk"
      tr: "Şirket içi yardım masası"
    value: "an internal helpdesk for employees"
  default: "infer"
- id: "scope"
  impact: "high"
  question:
    en: "What may it answer?"
    tr: "Neleri cevaplasın?"
  options:
  - id: "kb"
    label:
      en: "Only from my knowledge base"
      tr: "Yalnız bilgi tabanımdan"
    value: "only from the knowledge provided below"
  - id: "kb-plus"
    label:
      en: "Knowledge base plus general help"
      tr: "Bilgi tabanı ve genel yardım"
    value: "mainly from the knowledge provided below, with general help for common questions, clearly marked as general"
  default: "kb"
- id: "handoff"
  impact: "high"
  question:
    en: "When should it hand off to a person?"
    tr: "Ne zaman insana devretsin?"
  options:
  - id: "unsure"
    label:
      en: "When it does not know"
      tr: "Bilmediğinde"
    value: "when the answer is not in the knowledge or the customer asks for a person"
  - id: "sensitive"
    label:
      en: "Unsure, angry, or money or legal topics"
      tr: "Bilmediğinde, kızgın müşteri, para / hukuk"
    value: "when the answer is not in the knowledge, the customer is upset, the customer asks for a person, or the topic is refunds, payments, legal or medical"
  default: "sensitive"
- id: "tone"
  impact: "medium"
  question:
    en: "Tone?"
    tr: "Ton?"
  options:
  - id: "friendly"
    label:
      en: "Friendly"
      tr: "Samimi"
    value: "friendly and warm"
  - id: "professional"
    label:
      en: "Professional"
      tr: "Profesyonel"
    value: "professional and calm"
  - id: "brief"
    label:
      en: "Brief and efficient"
      tr: "Kısa, verimli"
    value: "brief and efficient"
  default: "friendly"
- id: "style"
  impact: "medium"
  question:
    en: "Answer style?"
    tr: "Cevap biçimi?"
  options:
  - id: "short"
    label:
      en: "Short answers"
      tr: "Kısa cevaplar"
    value: "short answers of a few sentences, one question at a time"
  - id: "steps"
    label:
      en: "Steps when helpful"
      tr: "Gerekirse adımlar"
    value: "short answers, with numbered steps for how-to questions"
  default: "short"
- id: "collect"
  impact: "medium"
  question:
    en: "What may it ask for?"
    tr: "Neler isteyebilsin?"
  options:
  - id: "basic"
    label:
      en: "Name and email"
      tr: "Ad ve e-posta"
    value: "only name and email, and only when a person needs to follow up"
  - id: "order"
    label:
      en: "Order number too"
      tr: "Sipariş numarası da"
    value: "name, email and order number when needed"
  - id: "none"
    label:
      en: "Nothing"
      tr: "Hiçbir şey"
    value: "no personal information"
  default: "basic"
- id: "limits"
  impact: "medium"
  question:
    en: "What must it never do?"
    tr: "Asla ne yapmasın?"
  options:
  - id: "safe"
    label:
      en: "Standard limits"
      tr: "Standart sınırlar"
    value: "never promise refunds, discounts, delivery dates, prices or policies that are not in the knowledge; never give legal, medical or financial advice; never ask for passwords or card numbers"
  - id: "strict"
    label:
      en: "Standard limits and stay on topic"
      tr: "Standart sınırlar, konu dışına çıkma"
    value: "never promise refunds, discounts, delivery dates, prices or policies that are not in the knowledge; never give legal, medical or financial advice; never ask for passwords or card numbers; politely decline off-topic requests and steer back to the business"
  default: "safe"
- id: "language"
  impact: "low"
  question:
    en: "Language?"
    tr: "Dil?"
  options:
  - id: "user"
    label:
      en: "Reply in the customer's language"
      tr: "Müşterinin dilinde"
    value: "reply in the language the customer writes in"
  - id: "fixed"
    label:
      en: "One fixed language"
      tr: "Tek sabit dil"
    value: "always reply in the language of this prompt"
  default: "user"
refinements:
- id: "strict"
  label:
    en: "Knowledge base only"
    tr: "Yalnız bilgi tabanı"
  patch:
    scope: "only from the knowledge provided below"
- id: "handoff"
  label:
    en: "Hand off sooner"
    tr: "Daha erken devret"
  patch:
    handoff: "when the answer is not in the knowledge, the customer is upset, the customer asks for a person, or the topic is refunds, payments, legal or medical"
- id: "brief"
  label:
    en: "Briefer"
    tr: "Daha kısa"
  patch:
    tone: "brief and efficient"
- id: "warm"
  label:
    en: "Warmer"
    tr: "Daha sıcak"
  patch:
    tone: "friendly and warm"
- id: "steps"
  label:
    en: "Use steps"
    tr: "Adım adım"
  patch:
    style: "short answers, with numbered steps for how-to questions"
- id: "nodata"
  label:
    en: "Collect nothing"
    tr: "Veri isteme"
  patch:
    collect: "no personal information"
- id: "clarify"
  label:
    en: "Ask when unclear"
    tr: "Belirsizse sorsun"
  instruction: "When the question is unclear, ask one short clarifying question before answering."
- id: "ai"
  label:
    en: "Say it is an AI"
    tr: "Yapay zekâ olduğunu söylesin"
  instruction: "If the customer asks, say clearly that it is an AI assistant."
checklist: ["Role and business", "Answers only from the provided knowledge", "Says it does not know and hands off", "Clear hand-off triggers", "No promises about refunds, prices, dates or policies", "Asks only for the data it needs", "Never asks for passwords or card numbers", "Tone and length"]
validators:
- id: "length"
  type: "maxLength"
  value: 3000
  message: "RouteAI limit: keep the prompt under 3000 characters."
- id: "min-length"
  type: "regex"
  value: "^[\\s\\S]{100,}$"
  message: "Too short: describe the bot's role, its knowledge limits and when it hands off."
- id: "no-braces"
  type: "regex"
  value: "^(?![\\s\\S]*(\\{\\{|\\}\\}))[\\s\\S]*$"
  message: "Remove unfilled {{placeholders}}; write the real content or a [clearly marked placeholder]."
---

## Sözdizimi

Üç resmî rehberin (OpenAI, Anthropic, Google) ortak önerisi: net ve belirli yaz; amacı, kitleyi ve çıktı biçimini söyle; bağlamı ve veriyi ayrı blokta ver; kısıtları "yap" diliyle yaz.

Müşteri destek botlarında (Intercom Fin, Tidio, Chatbase, Zendesk AI vb.) "prompt", botun **kalıcı talimatıdır** (sistem talimatı): bot kim, neyi bilir, ne yapmaz, ne zaman insana devreder. Bu, tek seferlik bir soru değil bir **davranış sözleşmesidir.** OpenAI ve Anthropic rehberleri de kimliği, kuralları ve bağlamı (bilgi tabanı) ayrı bloklarda vermeyi önerir.

**Sıra:** (1) rol ve işletme, (2) bilgi kaynağı kuralı, (3) ton ve biçim, (4) devir (insana aktarma) kuralları, (5) yasaklar, (6) toplanabilecek veriler, (7) dil.

- **Bilgi kuralı:** "Yalnızca aşağıdaki bilgilere dayanarak cevap ver. Cevap bilgide yoksa 'bilmiyorum' de ve insana devret." Bilgi tabanı genelde araca ayrıca yüklenir; prompt'ta nasıl kullanılacağını söyle.
- **Devir kuralları:** bilmediğinde, müşteri kızgınsa ya da insan isterse, iade/ödeme/hukuk/tıbbi konularda.
- **Yasaklar:** bilgide olmayan iade, indirim, teslim tarihi, fiyat ve politika vaat etme; hukuki, tıbbi, mali tavsiye verme; parola ve kart numarası isteme.
- **Veri:** yalnızca gerekli olanı iste (ör. insan geri dönecekse ad ve e-posta).
- Kısa cevap, tek soru bir seferde, belirsizse tek netleştirme sorusu.
- Müşteri sorarsa yapay zekâ olduğunu söylemesini iste.
- Fiyat, politika ve süre gibi bilgileri prompt'a gömme; bunlar değişir, bilgi tabanında dursun ve düzenli güncellensin. Gerçek müşteri konuşmalarıyla botu yayına almadan önce test et.

## Şablon

Sen [işletme adı] için müşteri destek asistanısın. Yalnızca aşağıdaki bilgilere dayanarak cevap ver: [bilgi tabanı]. Cevap bilgide yoksa "bilmiyorum" de ve [devir kuralı] durumlarında bir insana devret. Ton: [ton]; cevaplar kısa, bir seferde tek soru. Asla: bilgide olmayan iade, indirim, teslim tarihi, fiyat ya da politika vaat etme; hukuki, tıbbi ya da mali tavsiye verme; parola ya da kart numarası isteme. İstenebilecek veri: [veri]. Dil: [dil]. Sorulursa yapay zekâ asistanı olduğunu söyle.

## Yap / Yapma

**Yap**
- Botun rolünü ve işletmeyi tanımla.
- "Yalnız bilgi tabanından, yoksa bilmiyorum" kuralını koy.
- Devir kurallarını açık yaz.
- Yasakları tek tek say.

**Yapma**
- Fiyat ve politika gibi değişen bilgiyi prompta gömme.
- Botun iade, indirim ve teslim tarihi vaat etmesine izin verme.
- Gereksiz kişisel veri toplatma.
- Yayına almadan gerçek sorularla denemeyi atlama.

## Örnekler

**Örnek 1 — mağaza:** "Online ayakkabı mağazası için destek botu"

```
Sen [mağaza adı] için müşteri destek asistanısın. Yalnızca aşağıdaki bilgilere dayanarak cevap ver: [kargo, iade ve beden bilgileri]. Cevap bilgide yoksa "bilmiyorum" de ve şu durumlarda bir insana devret: bilgide cevap yoksa, müşteri kızgınsa, müşteri insan isterse ya da konu iade, ödeme ya da hukuksa. Ton: samimi; cevaplar kısa, bir seferde tek soru. Asla: bilgide olmayan iade, indirim, teslim tarihi ya da politika vaat etme; hukuki, tıbbi ya da mali tavsiye verme; parola ya da kart numarası isteme. Yalnızca insanın geri dönmesi gerekirse ad ve e-posta iste. Sorulursa yapay zekâ asistanı olduğunu söyle.
```

**Örnek 2 — randevu:** "Diş kliniği randevu botu"

```
Sen [klinik adı] için randevu asistanısın. Yalnızca verilen çalışma saatleri ve hizmet listesine dayan: [bilgiler]. Tıbbi tavsiye verme; belirti soran birine bir uzmanla görüşmesini söyle ve ekibe devret. Randevu için yalnızca ad, telefon ve uygun gün iste. Cevaplar kısa olsun.
```

Örnekler Türkçe yazıldı; prompt her zaman kullanıcının dilinde yazılır.

---
# TASLAK — reviewedBy boş. Görev şablonu: araca özel sözdizimi içermez, hiçbir araca bağlı değildir.
# Araca özel rehberi olmayan HER araçta, "sales.prospecting" işi için kullanılır (lib/promptBuilder/fallback.ts).
id: "task-sales-prospecting"
version: 1
appliesTo: []
tasks: ["sales.prospecting"]
modality: "automation"
promptLanguage: "user"
sources: ["https://developers.openai.com/api/docs/guides/prompt-engineering", "https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices", "https://ai.google.dev/gemini-api/docs/prompting-strategies"]
reviewedBy: ""
reviewedAt: ""
slots:
- id: "need"
  impact: "high"
  question:
    en: "What do you need?"
    tr: "Neye ihtiyacın var?"
  options:
  - id: "icp"
    label:
      en: "Define my ideal customer"
      tr: "İdeal müşteriyi tanımla"
    value: "turn the user's description into a clear ideal customer profile"
  - id: "list"
    label:
      en: "Lead search criteria"
      tr: "Potansiyel müşteri arama ölçütleri"
    value: "write precise search criteria for finding leads"
  - id: "first"
    label:
      en: "First outreach email"
      tr: "İlk temas e-postası"
    value: "write a first outreach email"
  - id: "sequence"
    label:
      en: "Follow-up sequence"
      tr: "Takip e-posta dizisi"
    value: "write a short follow-up sequence"
  - id: "linkedin"
    label:
      en: "LinkedIn message"
      tr: "LinkedIn mesajı"
    value: "write a short LinkedIn message"
  - id: "reply"
    label:
      en: "Reply to a response"
      tr: "Gelen cevaba yanıt"
    value: "write a reply to a prospect's response"
  default: "infer"
- id: "customer"
  impact: "high"
  question:
    en: "Who do you want to reach?"
    tr: "Kime ulaşmak istiyorsun?"
  options:
  - id: "described"
    label:
      en: "I will describe them"
      tr: "Ben tarif edeceğim"
    value: "the customer the user describes: industry, size, role and region"
  - id: "role"
    label:
      en: "A job role"
      tr: "Bir unvan"
    value: "people with the job role the user names"
  default: "infer"
- id: "offer"
  impact: "high"
  question:
    en: "What are you offering?"
    tr: "Ne sunuyorsun?"
  options:
  - id: "product"
    label:
      en: "A product"
      tr: "Bir ürün"
    value: "a product, described by the user"
  - id: "service"
    label:
      en: "A service"
      tr: "Bir hizmet"
    value: "a service, described by the user"
  - id: "meeting"
    label:
      en: "Just a conversation"
      tr: "Sadece görüşme"
    value: "a short conversation to learn about their needs"
  default: "infer"
- id: "personalization"
  impact: "high"
  question:
    en: "How is it personalized?"
    tr: "Kişiselleştirme?"
  options:
  - id: "given"
    label:
      en: "Only from details I give"
      tr: "Yalnız verdiğim bilgilerle"
    value: "personalize only with details the user provides about the prospect; leave a [personal detail] placeholder when none is given"
  - id: "generic"
    label:
      en: "Generic but relevant"
      tr: "Genel ama ilgili"
    value: "relevant to the industry, with no claims about the individual"
  default: "given"
- id: "tone"
  impact: "medium"
  question:
    en: "Tone?"
    tr: "Ton?"
  options:
  - id: "direct"
    label:
      en: "Direct and brief"
      tr: "Direkt, kısa"
    value: "direct and brief"
  - id: "warm"
    label:
      en: "Warm and human"
      tr: "Sıcak, insani"
    value: "warm and human"
  - id: "formal"
    label:
      en: "Formal"
      tr: "Resmî"
    value: "formal and respectful"
  default: "direct"
- id: "cta"
  impact: "medium"
  question:
    en: "What do you want them to do?"
    tr: "Ne yapmalarını istiyorsun?"
  options:
  - id: "call"
    label:
      en: "A short call"
      tr: "Kısa bir görüşme"
    value: "agree to a short call"
  - id: "reply"
    label:
      en: "Reply with interest"
      tr: "İlgi varsa cevaplasın"
    value: "reply if interested"
  - id: "demo"
    label:
      en: "See a demo"
      tr: "Demo izlesin"
    value: "see a short demo"
  default: "reply"
- id: "compliance"
  impact: "medium"
  question:
    en: "Compliance?"
    tr: "Uyum?"
  options:
  - id: "optout"
    label:
      en: "Include a simple opt-out"
      tr: "Basit vazgeçme seçeneği ekle"
    value: "include a simple way to opt out, and remind the user to check the local rules for cold outreach"
  - id: "sender"
    label:
      en: "Opt-out and sender details"
      tr: "Vazgeçme ve gönderen bilgisi"
    value: "include a simple way to opt out plus the sender's name and company, and remind the user to check the local rules for cold outreach"
  default: "optout"
refinements:
- id: "shorter"
  label:
    en: "Shorter"
    tr: "Daha kısa"
  instruction: "Cut it to the shortest version that still has the reason for writing and one clear ask."
- id: "warm"
  label:
    en: "Warmer"
    tr: "Daha sıcak"
  patch:
    tone: "warm and human"
- id: "formal"
  label:
    en: "More formal"
    tr: "Daha resmî"
  patch:
    tone: "formal and respectful"
- id: "sequence"
  label:
    en: "Add follow-ups"
    tr: "Takip e-postaları ekle"
  patch:
    need: "write a short follow-up sequence"
- id: "subject"
  label:
    en: "Subject options"
    tr: "Konu satırı seçenekleri"
  instruction: "Add three subject line options."
- id: "value"
  label:
    en: "Lead with value"
    tr: "Faydayı öne çıkar"
  instruction: "Open with one concrete benefit for the reader instead of describing the sender."
- id: "call"
  label:
    en: "Ask for a call"
    tr: "Görüşme iste"
  patch:
    cta: "agree to a short call"
- id: "soft"
  label:
    en: "Softer ask"
    tr: "Daha yumuşak istek"
  patch:
    cta: "reply if interested"
checklist: ["Who the customer is (industry, size, role)", "What is offered, in one line", "Why this person, from details the user gave", "One clear ask", "Short", "No invented facts about the prospect or the company", "No false urgency, discounts or claims", "A simple way to opt out"]
validators:
- id: "length"
  type: "maxLength"
  value: 3000
  message: "RouteAI limit: keep the prompt under 3000 characters."
- id: "min-length"
  type: "regex"
  value: "^[\\s\\S]{60,}$"
  message: "Too short: say who you are reaching and what you offer."
- id: "no-braces"
  type: "regex"
  value: "^(?![\\s\\S]*(\\{\\{|\\}\\}))[\\s\\S]*$"
  message: "Remove unfilled {{placeholders}}; write the real content or a [clearly marked placeholder]."
---

## Sözdizimi

Üç resmî rehberin (OpenAI, Anthropic, Google) ortak önerisi: net ve belirli yaz; amacı, kitleyi ve çıktı biçimini söyle; bağlamı ve veriyi ayrı blokta ver; kısıtları "yap" diliyle yaz.

Satış potansiyeli araçlarında (Apollo, Clay, Lemlist, Instantly vb.) yapay zekâ iki iş yapar: **hedef kitleyi tanımlama/arama ölçütü** ve **mesaj yazma.** İkisinde de başarı **netlik ve gerçeklik** ile gelir.

**Sıra:** (1) iş, (2) hedef müşteri (sektör, büyüklük, unvan, bölge), (3) teklif (tek cümle), (4) kişiselleştirme kuralı, (5) ton, (6) tek istek, (7) uyum.

- **İdeal müşteriyi somut yaz:** sektör, şirket büyüklüğü, unvan, bölge, tipik sorun. "Herkes" bir müşteri tanımı değildir.
- **Kısa mesaj:** neden yazıyorum + sana faydası + tek net istek. Uzun tanıtım yazısı yanıt getirmez.
- **Kişiselleştirme yalnızca verilen bilgiyle:** kişi ya da şirket hakkında bilgi vermediysen [kişisel detay] yer tutucusu bırak. Modelin "makalenizi okudum" gibi olmayan bir şeyi uydurması güveni yok eder.
- **Yanlış aciliyet, sahte indirim, olmayan referans ve rakam** yazdırma.
- **Uyum:** soğuk e-posta mevzuatı ülkeye göre değişir (onay, vazgeçme, veri koruma). Basit bir vazgeçme seçeneği ekle ve yerel kuralları kontrol etmesi gerektiğini `howToUse`ta hatırlat. Kişisel verileri toplamak için izinsiz kazıma önerme.
- Takip dizisi için her mesajın FARKLI bir yaklaşımı olsun (fayda, örnek, kısa hatırlatma); aynı metni tekrar etmesin.
- Arama ölçütü yazarken aracın filtre adlarını uydurma; ölçütü düz cümlelerle yaz.

## Şablon

İş: [iş]. Hedef müşteri: [sektör, büyüklük, unvan, bölge]. Teklif: [tek cümle]. Kişiselleştirme: yalnızca şu bilgilerle: [kişi/şirket bilgisi]; bilgi yoksa [kişisel detay] bırak. Ton: [ton]. Tek istek: [istek]. Kurallar: kısa yaz; kişi ya da şirket hakkında bilgi uydurma; sahte aciliyet, indirim, referans ya da rakam yazma; basit bir vazgeçme seçeneği ekle.

## Yap / Yapma

**Yap**
- Hedef müşteriyi sektör, unvan ve büyüklükle tarif et.
- Tek cümlelik net bir teklif yaz.
- Mesajı kısa tut, tek istek koy.
- Vazgeçme seçeneği ekle.

**Yapma**
- Kişi hakkında bilmediğin şeyi kişiselleştirme gibi yazdırma.
- Sahte aciliyet, indirim ya da referans uydurtma.
- İzinsiz kişisel veri toplama önerme.
- Aynı mesajı birkaç kez tekrar ettirme.

## Örnekler

**Örnek 1 — ilk e-posta:** "Muhasebe yazılımımı küçük işletmelere tanıtmak istiyorum"

```
İş: ilk temas e-postası yaz. Hedef müşteri: 1–10 kişilik hizmet işletmelerinin sahipleri, Türkiye. Teklif: faturaları ve giderleri tek yerde takip eden basit bir muhasebe uygulaması. Kişiselleştirme: yalnızca şu bilgilerle: [kişi/şirket bilgisi]; bilgi yoksa [kişisel detay] bırak. Ton: direkt ve kısa. Tek istek: ilgisi varsa cevaplasın. Kurallar: kısa yaz; kişi ya da şirket hakkında bilgi uydurma; sahte aciliyet, indirim, referans ya da rakam yazma; basit bir vazgeçme seçeneği ekle; üç konu satırı öner.
```

**Örnek 2 — takip dizisi:** "Cevap vermeyenlere üç hatırlatma"

```
İlk e-postama cevap vermeyen potansiyel müşteriler için üç takip e-postası yaz. Her biri farklı yaklaşım kullansın (fayda, kısa örnek, nazik son hatırlatma). Her e-posta çok kısa olsun; tek istek: kısa bir görüşme. Sahte aciliyet ya da olmayan referans yazma; vazgeçme seçeneği ekle.
```

Örnekler Türkçe yazıldı; prompt her zaman kullanıcının dilinde yazılır.

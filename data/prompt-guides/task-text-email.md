---
# TASLAK — reviewedBy boş. Görev şablonu: araca özel sözdizimi içermez, hiçbir araca bağlı değildir.
# Araca özel rehberi olmayan HER araçta, "text.email" işi için kullanılır (lib/promptBuilder/fallback.ts).
id: "task-text-email"
version: 1
appliesTo: []
tasks: ["text.email"]
modality: "text"
promptLanguage: "user"
sources: ["https://developers.openai.com/api/docs/guides/prompt-engineering", "https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices", "https://ai.google.dev/gemini-api/docs/prompting-strategies"]
reviewedBy: ""
reviewedAt: ""
slots:
- id: "type"
  impact: "high"
  question:
    en: "What kind of email?"
    tr: "Nasıl bir e-posta?"
  options:
  - id: "new"
    label:
      en: "New message"
      tr: "Yeni mesaj"
    value: "a new email"
  - id: "reply"
    label:
      en: "Reply"
      tr: "Cevap"
    value: "a reply to a received email"
  - id: "followup"
    label:
      en: "Follow-up"
      tr: "Takip"
    value: "a follow-up email"
  - id: "request"
    label:
      en: "Request"
      tr: "Rica / talep"
    value: "a request"
  - id: "decline"
    label:
      en: "Polite refusal"
      tr: "Nazik ret"
    value: "a polite refusal"
  - id: "thanks"
    label:
      en: "Thank-you"
      tr: "Teşekkür"
    value: "a thank-you email"
  - id: "cold"
    label:
      en: "First contact / outreach"
      tr: "İlk temas"
    value: "a first-contact outreach email"
  default: "infer"
- id: "recipient"
  impact: "high"
  question:
    en: "Who is it to?"
    tr: "Kime?"
  options:
  - id: "manager"
    label:
      en: "Manager"
      tr: "Yönetici"
    value: "a manager"
  - id: "colleague"
    label:
      en: "Colleague"
      tr: "İş arkadaşı"
    value: "a colleague"
  - id: "customer"
    label:
      en: "Customer"
      tr: "Müşteri"
    value: "a customer"
  - id: "stranger"
    label:
      en: "Someone I do not know"
      tr: "Tanımadığım biri"
    value: "someone the sender has not met"
  - id: "academic"
    label:
      en: "Teacher or professor"
      tr: "Öğretmen / hoca"
    value: "a teacher or professor"
  default: "infer"
- id: "goal"
  impact: "high"
  question:
    en: "What should happen after they read it?"
    tr: "Okuyunca ne olsun?"
  options:
  - id: "inform"
    label:
      en: "They are informed"
      tr: "Bilgilensin"
    value: "the reader is informed"
  - id: "act"
    label:
      en: "They take an action"
      tr: "Bir şey yapsın"
    value: "the reader takes one specific action"
  - id: "meeting"
    label:
      en: "They agree to a meeting"
      tr: "Görüşme ayarlasın"
    value: "the reader agrees to a meeting"
  - id: "reply"
    label:
      en: "They reply"
      tr: "Cevap versin"
    value: "the reader replies"
  default: "infer"
- id: "tone"
  impact: "medium"
  question:
    en: "Which tone?"
    tr: "Hangi ton?"
  options:
  - id: "formal"
    label:
      en: "Formal"
      tr: "Resmî"
    value: "formal"
  - id: "professional"
    label:
      en: "Professional"
      tr: "Profesyonel"
    value: "professional"
  - id: "friendly"
    label:
      en: "Friendly"
      tr: "Samimi"
    value: "friendly and warm"
  - id: "persuasive"
    label:
      en: "Persuasive"
      tr: "İkna edici"
    value: "persuasive"
  - id: "neutral"
    label:
      en: "Neutral, factual"
      tr: "Nötr, bilgilendirici"
    value: "neutral and factual"
  default: "infer"
- id: "length"
  impact: "medium"
  question:
    en: "How long?"
    tr: "Ne kadar uzun?"
  options:
  - id: "veryshort"
    label:
      en: "Very short"
      tr: "Çok kısa"
    value: "very short, a few sentences"
  - id: "short"
    label:
      en: "Short"
      tr: "Kısa"
    value: "short"
  - id: "detailed"
    label:
      en: "Detailed"
      tr: "Ayrıntılı"
    value: "detailed"
  default: "short"
- id: "subject"
  impact: "low"
  question:
    en: "Add a subject line?"
    tr: "Konu satırı yazılsın mı?"
  options:
  - id: "yes"
    label:
      en: "Yes"
      tr: "Evet"
    value: "include a clear subject line"
  - id: "no"
    label:
      en: "No"
      tr: "Hayır"
    value: "no subject line"
  default: "yes"
- id: "next"
  impact: "medium"
  question:
    en: "Should it propose a next step?"
    tr: "Sonraki adım önerilsin mi?"
  options:
  - id: "yes"
    label:
      en: "Yes, with a date placeholder"
      tr: "Evet, tarih yer tutucusuyla"
    value: "end with one clear next step and a [date] placeholder when no date was given"
  - id: "no"
    label:
      en: "No"
      tr: "Hayır"
    value: "no explicit next step"
  default: "yes"
refinements:
- id: "shorter"
  label:
    en: "Shorter"
    tr: "Daha kısa"
  patch:
    length: "very short, a few sentences"
- id: "formal"
  label:
    en: "More formal"
    tr: "Daha resmî"
  patch:
    tone: "formal"
- id: "friendly"
  label:
    en: "Friendlier"
    tr: "Daha samimi"
  patch:
    tone: "friendly and warm"
- id: "direct"
  label:
    en: "More direct"
    tr: "Daha net"
  instruction: "State the main point in the first sentence and the request in the second."
- id: "softer"
  label:
    en: "Softer"
    tr: "Daha yumuşak"
  instruction: "Soften the wording: more polite phrasing, no blame, keep the message clear."
- id: "subject"
  label:
    en: "Subject options"
    tr: "Konu satırı seçenekleri"
  instruction: "Give three subject line options before the email."
- id: "followup"
  label:
    en: "Add a reminder"
    tr: "Hatırlatma ekle"
  patch:
    type: "a follow-up email"
- id: "detail"
  label:
    en: "More detail"
    tr: "Daha ayrıntılı"
  patch:
    length: "detailed"
checklist: ["Who it is to and relationship", "One clear goal or request", "Key facts exactly as given", "Tone stated", "One next step", "No invented dates, prices or promises", "Subject line if needed"]
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

E-posta promptu: (1) kim yazıyor, kime (ilişki ve saygı düzeyi), (2) e-postanın türü ve tek hedefi, (3) bağlam bloğu: gelen e-posta (cevap yazılıyorsa AYNEN yapıştırılmış) ve kullanıcının verdiği bilgiler, (4) ton ve uzunluk, (5) kurallar.

- Bir e-postada tek ana istek olsun; ilk cümlede amaç, sonda tek net sonraki adım.
- Tarih, fiyat, söz ve ek (dosya) bilgilerini yalnızca kullanıcı verdiyse yaz; vermediyse [tarih], [tutar] gibi yer tutucu kullan. Kullanıcı adına taahhüt UYDURMA.
- Cevap yazılıyorsa gelen e-postayı bağlam bloğuna koy ve "bu e-postadaki tüm soruları cevapla" kuralını ekle.
- Selamlama ve kapanışı alıcıya uygun seç (resmî/samimi).

## Şablon

Ben [kim]. [Alıcı] için [e-posta türü] yaz. Hedef: [tek hedef]. Bağlam: [kullanıcının bilgileri / gelen e-posta]. Ton: [ton]. Uzunluk: [uzunluk]. Konu satırı: [evet/hayır]. Kurallar: ilk cümlede amacı söyle; tek net sonraki adım öner; tarih, tutar ve söz uydurma, eksikler için [yer tutucu] bırak.

## Yap / Yapma

**Yap**
- Alıcıyı ve ilişkiyi belirt (yönetici, müşteri, tanımadığım biri).
- Tek hedef, tek sonraki adım iste.
- Cevap yazılıyorsa gelen e-postayı aynen ekle.
- Konu satırını ayrıca iste.

**Yapma**
- Kullanıcı adına tarih, toplantı saati, fiyat ya da söz uydurma.
- Pasif-agresif ya da suçlayıcı dil isteme.
- Tek e-postada birden çok bağımsız istek toplama.
- Çok uzun e-posta isteyip okunmayacak hale getirme.

## Örnekler

**Örnek 1 — takip:** "Teklif gönderdiğim müşteriye hatırlatma"

```
Ben bir serbest grafik tasarımcıyım. Geçen hafta teklif gönderdiğim bir müşteriye takip e-postası yaz. Hedef: müşterinin teklifle ilgili düşüncesini öğrenmek. Ton: profesyonel ve sıcak. Uzunluk: çok kısa. Konu satırı yaz. İlk cümlede amacı söyle, sonda tek net sonraki adım öner (kısa bir görüşme için [tarih] yer tutucusu). Tarih, fiyat ve söz uydurma.
```

**Örnek 2 — nazik ret:** "Müşterinin ek istediği işi reddetmem lazım"

```
Bir müşteriye, sözleşme kapsamı dışındaki ek işi nazikçe geri çeviren bir e-posta yaz. Müşteri ek iş için aynı fiyata ekstra revizyonlar istiyor. Ton: resmî ama anlayışlı. Önce mevcut işe teşekkür et, sonra kapsamın dışında kaldığını açıkla, ek iş için ayrı bir teklif hazırlayabileceğimi söyle. Suçlayıcı dil kullanma. Uzunluk: kısa.
```

Örnekler Türkçe yazıldı; prompt her zaman kullanıcının dilinde yazılır.

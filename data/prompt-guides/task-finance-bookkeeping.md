---
# TASLAK — reviewedBy boş. Görev şablonu: araca özel sözdizimi içermez, hiçbir araca bağlı değildir.
# Araca özel rehberi olmayan HER araçta, "finance.bookkeeping" işi için kullanılır (lib/promptBuilder/fallback.ts).
id: "task-finance-bookkeeping"
version: 1
appliesTo: []
tasks: ["finance.bookkeeping"]
modality: "data"
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
  - id: "categorize"
    label:
      en: "Categorize expenses"
      tr: "Giderleri kategorize et"
    value: "categorize transactions using the user's own category list"
  - id: "reconcile"
    label:
      en: "Match bank lines to records"
      tr: "Banka kalemlerini eşleştir"
    value: "match bank statement lines to invoices and records and list what does not match"
  - id: "summary"
    label:
      en: "Monthly summary"
      tr: "Aylık özet"
    value: "summarize income, expenses and net for the period"
  - id: "invoice"
    label:
      en: "Invoice or reminder text"
      tr: "Fatura / hatırlatma metni"
    value: "write a clear invoice note or payment reminder"
  - id: "explain"
    label:
      en: "Explain a transaction or term"
      tr: "Bir işlemi / terimi açıkla"
    value: "explain a transaction or an accounting term in plain words"
  - id: "prep"
    label:
      en: "Prepare for my accountant"
      tr: "Muhasebeciye hazırlık"
    value: "prepare an organized list of documents and open questions for the accountant"
  default: "infer"
- id: "data"
  impact: "high"
  question:
    en: "What will you give?"
    tr: "Ne vereceksin?"
  options:
  - id: "rows"
    label:
      en: "Transaction rows"
      tr: "İşlem satırları"
    value: "the transaction rows the user pastes or uploads"
  - id: "statement"
    label:
      en: "Bank statement"
      tr: "Banka ekstresi"
    value: "the bank statement the user provides"
  - id: "invoices"
    label:
      en: "Invoices and receipts"
      tr: "Fatura ve fişler"
    value: "the invoices and receipts the user provides"
  - id: "description"
    label:
      en: "Only a description"
      tr: "Yalnız tarif"
    value: "only a description of the situation"
  default: "infer"
- id: "categories"
  impact: "high"
  question:
    en: "Which categories?"
    tr: "Hangi kategoriler?"
  options:
  - id: "mine"
    label:
      en: "My own category list"
      tr: "Kendi kategori listem"
    value: "only the categories on the user's list; mark anything that does not fit as \"uncategorized\""
  - id: "common"
    label:
      en: "Common small-business categories"
      tr: "Yaygın işletme kategorileri"
    value: "common small-business categories, labeled as suggestions for the user to confirm"
  default: "mine"
- id: "country"
  impact: "medium"
  question:
    en: "Country and currency?"
    tr: "Ülke ve para birimi?"
  options:
  - id: "stated"
    label:
      en: "I will state them"
      tr: "Ben yazacağım"
    value: "the country and currency the user states; never assume tax rules"
  - id: "generic"
    label:
      en: "Keep it general"
      tr: "Genel kal"
    value: "general bookkeeping that does not depend on one country's tax rules"
  default: "stated"
- id: "uncertain"
  impact: "high"
  question:
    en: "What if unsure?"
    tr: "Emin değilse?"
  options:
  - id: "flag"
    label:
      en: "Flag for review"
      tr: "İncelemeye işaretle"
    value: "flag every uncertain item for review by the user or accountant instead of deciding"
  - id: "ask"
    label:
      en: "Ask me"
      tr: "Bana sor"
    value: "list the questions needed to decide uncertain items"
  default: "flag"
- id: "output"
  impact: "medium"
  question:
    en: "Result form?"
    tr: "Sonuç biçimi?"
  options:
  - id: "table"
    label:
      en: "Table"
      tr: "Tablo"
    value: "a table: date, description, amount, suggested category, confidence"
  - id: "summary"
    label:
      en: "Summary and list of issues"
      tr: "Özet ve sorunlar"
    value: "a short summary followed by a list of issues to check"
  default: "table"
- id: "tax"
  impact: "medium"
  question:
    en: "Tax and legal questions?"
    tr: "Vergi / hukuk soruları?"
  options:
  - id: "info"
    label:
      en: "General info only"
      tr: "Yalnız genel bilgi"
    value: "give general information only, say it is not tax or legal advice, and name what to confirm with an accountant"
  - id: "refer"
    label:
      en: "Send tax questions to my accountant"
      tr: "Vergi sorularını muhasebeciye bırak"
    value: "do not answer tax or legal questions; list them as questions for the accountant"
  default: "info"
refinements:
- id: "table"
  label:
    en: "As a table"
    tr: "Tablo olarak"
  patch:
    output: "a table: date, description, amount, suggested category, confidence"
- id: "summary"
  label:
    en: "Summary and issues"
    tr: "Özet ve sorunlar"
  patch:
    output: "a short summary followed by a list of issues to check"
- id: "flag"
  label:
    en: "Flag uncertain items"
    tr: "Belirsizleri işaretle"
  patch:
    uncertain: "flag every uncertain item for review by the user or accountant instead of deciding"
- id: "ask"
  label:
    en: "Ask me"
    tr: "Bana sorsun"
  patch:
    uncertain: "list the questions needed to decide uncertain items"
- id: "mine"
  label:
    en: "Only my categories"
    tr: "Yalnız benim kategorilerim"
  patch:
    categories: "only the categories on the user's list; mark anything that does not fit as \"uncategorized\""
- id: "duplicates"
  label:
    en: "Check duplicates"
    tr: "Tekrarları kontrol et"
  instruction: "Also list possible duplicate transactions and why they look like duplicates."
- id: "totals"
  label:
    en: "Show totals"
    tr: "Toplamları göster"
  instruction: "Show the total for each category and the grand total, and say how many rows were used."
- id: "plain"
  label:
    en: "Plain words"
    tr: "Sade anlatım"
  instruction: "Explain accounting terms in plain words."
checklist: ["What to do with the records", "Records pasted or described, with currency", "User's own category list", "Country stated, no assumed tax rules", "Uncertain items flagged, not decided", "Totals shown with row count", "No invented amounts, dates or invoice numbers", "Not tax or legal advice"]
validators:
- id: "length"
  type: "maxLength"
  value: 3000
  message: "RouteAI limit: keep the prompt under 3000 characters."
- id: "min-length"
  type: "regex"
  value: "^[\\s\\S]{60,}$"
  message: "Too short: say what to do with which records."
- id: "no-braces"
  type: "regex"
  value: "^(?![\\s\\S]*(\\{\\{|\\}\\}))[\\s\\S]*$"
  message: "Remove unfilled {{placeholders}}; write the real content or a [clearly marked placeholder]."
---

## Sözdizimi

Üç resmî rehberin (OpenAI, Anthropic, Google) ortak önerisi: net ve belirli yaz; amacı, kitleyi ve çıktı biçimini söyle; bağlamı ve veriyi ayrı blokta ver; kısıtları "yap" diliyle yaz.

Küçük işletme muhasebesinde (QuickBooks, Xero, Zoho Books, Wave vb.) yapay zekâ **sınıflandırma, eşleştirme ve özetleme** için iyidir; **vergi/hukuk kararı ve resmi beyan için değildir.** Prompt'un çekirdeği bu sınırı çizmektir.

**Sıra:** (1) iş (kategorize et, eşleştir, özetle, açıkla), (2) veri (kalemler ve para birimi), (3) kategori listesi (kullanıcının kendi listesi), (4) ülke, (5) belirsizlikte ne yapılacağı, (6) çıktı biçimi.

- **Kullanıcının kategori listesini ver;** model kendi kategorisini uydurmasın. Uymayan kalem "kategorisiz" diye işaretlensin.
- **Tutar, tarih, fatura numarası, vergi oranı UYDURMA.** Verilen satırlardaki değerleri aynen kullan; eksik olanı sorsun ya da işaretlesin.
- **Emin olmayanı işaretletme:** her kalem için güven düzeyi ve "incelemeye gerekli" sütunu iste.
- **Vergi ve mevzuat:** ülkenin vergi kuralını model tahmin etmesin; kullanıcı ülkeyi ve kuralı veriyorsa onu kullan. Çıktının genel bilgi olduğunu, kesin karar için muhasebeciye danışılması gerektiğini `howToUse`ta söyle.
- Toplamları ve satır sayısını gösterttir; sayıları tabloda kendin hızlıca doğrula.
- Banka hesap numarası, kimlik ve kart bilgisi yapıştırma; maskele.
- Aracın otomatik kayıt/gönderme yapmasına izin verme; her kayıt kullanıcı onayından geçsin.

## Şablon

İş: [kategorize et / eşleştir / özetle / açıkla]. Veri: [satırlar, para birimi, dönem]. Kategoriler: yalnızca şu liste: [liste]; uymayanı "kategorisiz" yaz. Ülke: [ülke]; vergi kurallarını varsayma. Emin olmadığın her kalemi "incelemeye gerekli" olarak işaretle ve nedenini yaz. Çıktı: [tablo / özet]. Kurallar: tutar, tarih, fatura numarası ve oran uydurma; toplamları ve kullanılan satır sayısını göster; bu çıktı vergi/hukuk tavsiyesi değildir, kesin karar için muhasebeciye danış.

## Yap / Yapma

**Yap**
- Kendi kategori listeni ver.
- Para birimini ve dönemi belirt.
- Emin olmadığı kalemleri işaretlet.
- Toplamları ve satır sayısını göstert.

**Yapma**
- Tutar, fatura numarası ya da vergi oranı uydurtma.
- Vergi/hukuk kararını yapay zekâya bırakma.
- Banka/kimlik/kart bilgisini yapıştırma.
- Otomatik kayıt ve ödemeye izin verme.

## Örnekler

**Örnek 1 — kategorize:** "Banka hareketlerimi kategorilere ayır"

```
İş: aşağıdaki banka hareketlerini kategorilere ayır. Para birimi: TL. Kategoriler: yalnızca şu liste: Kira, Maaş, Malzeme, Ulaşım, Pazarlama, Yazılım aboneliği; uymayanı "kategorisiz" yaz. Emin olmadığın her kalemi "incelemeye gerekli" işaretle ve nedenini yaz. Çıktı: tablo (tarih, açıklama, tutar, önerilen kategori, güven). Tutar ve tarih uydurma; sonda her kategorinin toplamını ve kullanılan satır sayısını yaz.

[Hareketler]
```

**Örnek 2 — muhasebeciye hazırlık:** "Yıl sonu için hazırlık listesi"

```
Muhasebecime yıl sonunda vermem gereken belgelerin düzenli bir listesini ve muhasebeciye soracağım açık soruları hazırla. Ülke: [ülke]. Durum: küçük bir hizmet işletmesi, serbest çalışan. Genel bilgi ver; vergi kurallarını varsayma; bu çıktı vergi tavsiyesi değildir diye belirt.
```

Örnekler Türkçe yazıldı; prompt her zaman kullanıcının dilinde yazılır.

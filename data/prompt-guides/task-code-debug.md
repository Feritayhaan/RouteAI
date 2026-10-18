---
# TASLAK — reviewedBy boş. Görev şablonu: araca özel sözdizimi içermez, hiçbir araca bağlı değildir.
# Araca özel rehberi olmayan HER araçta, "code.debug" işi için kullanılır (lib/promptBuilder/fallback.ts).
id: "task-code-debug"
version: 1
appliesTo: []
tasks: ["code.debug"]
modality: "code"
promptLanguage: "user"
sources: ["https://cursor.com/blog/agent-best-practices", "https://code.claude.com/docs/en/best-practices.md", "https://developers.openai.com/api/docs/guides/prompt-engineering", "https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices"]
reviewedBy: ""
reviewedAt: ""
slots:
- id: "symptom"
  impact: "high"
  question:
    en: "What goes wrong?"
    tr: "Ne ters gidiyor?"
  options:
  - id: "error"
    label:
      en: "An error message"
      tr: "Hata mesajı"
    value: "an error message or exception"
  - id: "wrong"
    label:
      en: "Wrong result"
      tr: "Yanlış sonuç"
    value: "a wrong result"
  - id: "crash"
    label:
      en: "Crash or freeze"
      tr: "Çökme / donma"
    value: "a crash or freeze"
  - id: "slow"
    label:
      en: "Too slow"
      tr: "Çok yavaş"
    value: "poor performance"
  - id: "flaky"
    label:
      en: "Only sometimes"
      tr: "Bazen oluyor"
    value: "an intermittent problem that does not always happen"
  - id: "ui"
    label:
      en: "Looks or behaves wrong on screen"
      tr: "Ekranda yanlış görünüyor"
    value: "a visual or interaction problem on screen"
  default: "infer"
- id: "evidence"
  impact: "high"
  question:
    en: "What evidence do you have?"
    tr: "Elinde ne var?"
  options:
  - id: "stack"
    label:
      en: "Full error and stack trace"
      tr: "Tam hata ve yığın izi"
    value: "the full error message and stack trace, pasted exactly"
  - id: "logs"
    label:
      en: "Logs"
      tr: "Log kayıtları"
    value: "relevant log lines, pasted exactly"
  - id: "steps"
    label:
      en: "Steps to reproduce"
      tr: "Tekrar etme adımları"
    value: "steps that reproduce the problem"
  - id: "little"
    label:
      en: "Only a description"
      tr: "Yalnız tarif"
    value: "only a description of the problem"
  default: "infer"
- id: "approach"
  impact: "high"
  question:
    en: "What do you want?"
    tr: "Ne istiyorsun?"
  options:
  - id: "diagnose"
    label:
      en: "Find the cause first"
      tr: "Önce nedenini bul"
    value: "list the most likely causes in order, with a quick check for each, before changing anything"
  - id: "fix"
    label:
      en: "Find and fix it"
      tr: "Bul ve düzelt"
    value: "find the root cause and fix it with the smallest change"
  - id: "explain"
    label:
      en: "Explain the error"
      tr: "Hatayı açıkla"
    value: "explain what the error means and how to avoid it"
  default: "fix"
- id: "expected"
  impact: "medium"
  question:
    en: "Expected vs actual?"
    tr: "Beklenen ve gerçekleşen?"
  options:
  - id: "state"
    label:
      en: "I will state both"
      tr: "İkisini de yazacağım"
    value: "the expected behavior and the actual behavior, both stated"
  - id: "unknown"
    label:
      en: "Not sure what is expected"
      tr: "Beklenen net değil"
    value: "the expected behavior is unclear; ask the user one question about it"
  default: "state"
- id: "change"
  impact: "medium"
  question:
    en: "Did something change recently?"
    tr: "Yakın zamanda ne değişti?"
  options:
  - id: "code"
    label:
      en: "My code"
      tr: "Kodum"
    value: "a recent code change"
  - id: "deps"
    label:
      en: "Dependency or version"
      tr: "Bağımlılık / sürüm"
    value: "a dependency or version update"
  - id: "env"
    label:
      en: "Environment or settings"
      tr: "Ortam / ayar"
    value: "an environment or configuration change"
  - id: "nothing"
    label:
      en: "Nothing / unknown"
      tr: "Hiçbir şey / bilmiyorum"
    value: "nothing known"
  default: "nothing"
- id: "constraints"
  impact: "medium"
  question:
    en: "Rules for the fix?"
    tr: "Düzeltme kuralları?"
  options:
  - id: "minimal"
    label:
      en: "Smallest change"
      tr: "En küçük değişiklik"
    value: "make the smallest change and no unrelated refactoring"
  - id: "regression"
    label:
      en: "Add a regression test"
      tr: "Tekrarı önleyen test ekle"
    value: "add a test that fails before the fix and passes after it"
  default: "minimal"
- id: "output"
  impact: "medium"
  question:
    en: "Answer form?"
    tr: "Cevap biçimi?"
  options:
  - id: "structured"
    label:
      en: "Cause, fix, how to check"
      tr: "Neden, çözüm, kontrol"
    value: "cause first, then the fix, then how to confirm it worked"
  - id: "short"
    label:
      en: "Short"
      tr: "Kısa"
    value: "a short answer: cause and fix"
  default: "structured"
refinements:
- id: "diagnose"
  label:
    en: "Causes first"
    tr: "Önce nedenler"
  patch:
    approach: "list the most likely causes in order, with a quick check for each, before changing anything"
- id: "fix"
  label:
    en: "Just fix it"
    tr: "Direkt düzelt"
  patch:
    approach: "find the root cause and fix it with the smallest change"
- id: "explain"
  label:
    en: "Explain the error"
    tr: "Hatayı açıkla"
  patch:
    approach: "explain what the error means and how to avoid it"
- id: "regression"
  label:
    en: "Add a test"
    tr: "Test ekle"
  patch:
    constraints: "add a test that fails before the fix and passes after it"
- id: "minimal"
  label:
    en: "Smallest change"
    tr: "En küçük değişiklik"
  patch:
    constraints: "make the smallest change and no unrelated refactoring"
- id: "short"
  label:
    en: "Shorter"
    tr: "Daha kısa"
  patch:
    output: "a short answer: cause and fix"
- id: "ask"
  label:
    en: "Ask me what is missing"
    tr: "Eksikleri sorsun"
  instruction: "If you need more code, logs or versions to be sure, list exactly what you need instead of guessing."
- id: "logs"
  label:
    en: "Add logging"
    tr: "Log ekletsin"
  instruction: "Suggest where to add temporary logging to confirm the cause, and what each log line should show."
checklist: ["Exact error text and stack trace pasted", "Expected and actual behavior", "Steps to reproduce", "Relevant code pasted", "Versions and environment", "What changed recently and what was tried", "Asks for more information instead of guessing", "Smallest fix, no unrelated changes"]
validators:
- id: "length"
  type: "maxLength"
  value: 3000
  message: "RouteAI limit: keep the prompt under 3000 characters."
- id: "min-length"
  type: "regex"
  value: "^[\\s\\S]{60,}$"
  message: "Too short: describe the problem and what you know about it."
- id: "no-braces"
  type: "regex"
  value: "^(?![\\s\\S]*(\\{\\{|\\}\\}))[\\s\\S]*$"
  message: "Remove unfilled {{placeholders}}; write the real content or a [clearly marked placeholder]."
---

## Sözdizimi

Hata ayıklamada en değerli şey **kanıttır**. Model tahmin etmek yerine verdiğin hata ve koddan akıl yürütür; kanıt ne kadar tam ise teşhis o kadar doğru olur.

**Sıra:** (1) belirti (ne oluyor), (2) beklenen–gerçekleşen, (3) kanıt (tam hata iletisi, yığın izi, log; AYNEN yapıştırılmış), (4) tekrar etme adımları, (5) ilgili kod, (6) ortam ve sürümler, (7) ne değişti/ne denendi, (8) istenen çıktı.

- **Hata iletisini ve yığın izini olduğu gibi yapıştır;** özetleme. Bu, prompt'ta "kanıt bloğu" olarak ayrı ve belirgin olsun.
- Beklenen ve gerçekleşen davranışı ikisini de yaz: "X olmalıydı, Y oluyor."
- Önce **nedeni** buldur: "en olası nedenleri sırayla yaz ve her biri için hızlı bir kontrol öner" — tek tahmin yerine hipotez listesi, yanlış düzeltmeyi azaltır.
- Eksik bilgi varsa **tahmin ettirme:** "daha fazla koda/log'a/sürüme ihtiyacın varsa tam olarak neyin gerektiğini yaz."
- Düzeltmede kural: **en küçük değişiklik**, ilgisiz düzenleme yok; mümkünse düzeltmeden önce başarısız, sonra geçen bir test iste.
- "Bazen oluyor" tipi hatalarda zamanlama, paylaşılan durum ve veri farkını sor; tek satırlık sihirli çözüm vaat etme.
- Gizli anahtar, şifre ve kişisel verileri yapıştırmadan önce [GİZLİ] ile değiştir.
- Çıktıyı çalıştırıp doğrulamadan "düzeldi" sayma; doğrulama adımını yazdır.

## Şablon

Sorun: [belirti]. Beklenen: [beklenen]. Gerçekleşen: [gerçekleşen]. Kanıt (aynen): [tam hata ve yığın izi / log]. Tekrar etme adımları: [adımlar]. İlgili kod: [kod]. Ortam: [dil, sürümler, işletim sistemi]. Son değişiklik / denenenler: [ne değişti, ne denendi]. İstek: [önce nedenleri sırala / bul ve düzelt]. Kurallar: tahmin etme, eksik bilgi varsa tam olarak neyin gerektiğini yaz; en küçük değişikliği yap; çözümün çalıştığını nasıl doğrulayacağımı yaz.

## Yap / Yapma

**Yap**
- Hata iletisini ve yığın izini aynen yapıştır.
- Beklenen ve gerçekleşeni ayrı yaz.
- Sürümleri, ortamı ve son değişikliği belirt.
- Önce nedenleri sırala, sonra düzelt.

**Yapma**
- Hatayı kendi cümlenle özetleyip tam metni saklama.
- Kodun ilgili kısmını vermeden çözüm bekleme.
- Birden çok bağımsız hatayı tek promptta toplama.
- Gizli anahtarları yapıştırma.

## Örnekler

**Örnek 1 — hata iletisi:** "Uygulama açılırken TypeError veriyor"

```
Sorun: uygulama açılırken bir hata çıkıyor ve ana sayfa yüklenmiyor. Beklenen: sayfanın açılması. Gerçekleşen: aşağıdaki hata. Kanıt (aynen):
[tam hata iletisi ve yığın izi]
İlgili kod: [hatayı üreten dosya ve fonksiyon]. Ortam: [dil ve sürüm, işletim sistemi]. Son değişiklik: dün [bir paketi] güncelledim. İstek: önce en olası nedenleri sırala ve her biri için hızlı bir kontrol öner, sonra en küçük düzeltmeyi yaz. Eksik bilgi varsa tam olarak neyin gerektiğini söyle; tahmin etme.
```

**Örnek 2 — yanlış sonuç:** "Toplam fiyat bazen yanlış çıkıyor"

```
Sorun: sepet toplamı bazen yanlış hesaplanıyor. Beklenen: 3 ürün × 19.99 = 59.97. Gerçekleşen: [yanlış değer]. Tekrar etme: [adımlar]. İlgili kod: [hesaplama fonksiyonu]. İstek: nedeni bul ve en küçük değişiklikle düzelt; düzeltmeden önce başarısız, sonra geçen bir test ekle ve çalıştırma komutunu yaz.
```

Örnekler Türkçe yazıldı; prompt her zaman kullanıcının dilinde yazılır (kod ve hata iletileri olduğu gibi kalır).

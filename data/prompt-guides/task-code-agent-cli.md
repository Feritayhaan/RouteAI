---
# TASLAK — reviewedBy boş. Görev şablonu: araca özel sözdizimi içermez, hiçbir araca bağlı değildir.
# Araca özel rehberi olmayan HER araçta, "code.agent-cli" işi için kullanılır (lib/promptBuilder/fallback.ts).
id: "task-code-agent-cli"
version: 1
appliesTo: []
tasks: ["code.agent-cli"]
modality: "code"
promptLanguage: "user"
sources: ["https://cursor.com/blog/agent-best-practices", "https://code.claude.com/docs/en/best-practices.md", "https://developers.openai.com/api/docs/guides/prompt-engineering", "https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices"]
reviewedBy: ""
reviewedAt: ""
slots:
- id: "job"
  impact: "high"
  question:
    en: "What should the agent do?"
    tr: "Ajan ne yapsın?"
  options:
  - id: "feature"
    label:
      en: "Implement a feature"
      tr: "Özellik geliştir"
    value: "implement a feature"
  - id: "bug"
    label:
      en: "Fix a bug"
      tr: "Hata düzelt"
    value: "find the cause of a bug and fix it"
  - id: "refactor"
    label:
      en: "Refactor"
      tr: "Yeniden düzenle"
    value: "refactor without changing behavior"
  - id: "tests"
    label:
      en: "Write tests"
      tr: "Test yaz"
    value: "write tests for existing code"
  - id: "migrate"
    label:
      en: "Migrate or upgrade"
      tr: "Taşı / yükselt"
    value: "migrate or upgrade a dependency or pattern"
  - id: "explore"
    label:
      en: "Explore and explain the codebase"
      tr: "Kod tabanını keşfet ve açıkla"
    value: "explore the codebase and explain how it works, without changing anything"
  default: "infer"
- id: "scope"
  impact: "high"
  question:
    en: "Where may it work?"
    tr: "Nerede çalışabilir?"
  options:
  - id: "named"
    label:
      en: "Only the files or folders I name"
      tr: "Yalnız adını verdiğim dosya / klasörler"
    value: "only the files and folders the user names"
  - id: "module"
    label:
      en: "One module"
      tr: "Tek modül"
    value: "one module and its tests"
  - id: "wide"
    label:
      en: "Anywhere needed"
      tr: "Gerekirse her yer"
    value: "any file needed, but report every file changed"
  default: "named"
- id: "autonomy"
  impact: "high"
  question:
    en: "How independent?"
    tr: "Ne kadar bağımsız?"
  options:
  - id: "plan-first"
    label:
      en: "Plan first, wait for my approval"
      tr: "Önce plan, onayımı bekle"
    value: "first explore and write a plan, then wait for approval before editing files"
  - id: "proceed"
    label:
      en: "Plan briefly, then proceed"
      tr: "Kısa plan yap, devam et"
    value: "make a short plan, then implement it step by step"
  default: "plan-first"
- id: "verify"
  impact: "high"
  question:
    en: "How should it verify its work?"
    tr: "Yaptığını nasıl doğrulasın?"
  options:
  - id: "tests"
    label:
      en: "Run tests"
      tr: "Testleri çalıştırsın"
    value: "run the project's tests, and show the result"
  - id: "full"
    label:
      en: "Tests, lint and build"
      tr: "Test, lint ve build"
    value: "run the tests, the linter and the build, and show each result"
  - id: "manual"
    label:
      en: "Describe manual checks"
      tr: "Elle kontrol adımları yazsın"
    value: "describe the manual checks the user should do, since it cannot be tested automatically"
  default: "tests"
- id: "safety"
  impact: "high"
  question:
    en: "Safety rules?"
    tr: "Güvenlik kuralları?"
  options:
  - id: "safe"
    label:
      en: "No destructive actions"
      tr: "Yıkıcı işlem yok"
    value: "do not delete files, reset the repository, push, deploy, publish or touch secrets and production data"
  - id: "commit"
    label:
      en: "Allow local commits only"
      tr: "Yalnız yerel commit"
    value: "local commits are allowed; never push, deploy or publish, and never touch secrets or production data"
  default: "safe"
- id: "context"
  impact: "medium"
  question:
    en: "Where does it learn the project rules?"
    tr: "Proje kurallarını nereden öğrensin?"
  options:
  - id: "read"
    label:
      en: "Read the project docs first"
      tr: "Önce proje dokümanlarını okusun"
    value: "first read the project's instruction and readme files and follow them"
  - id: "given"
    label:
      en: "Rules are given below"
      tr: "Kurallar aşağıda"
    value: "follow the rules the user gives"
  default: "read"
- id: "report"
  impact: "medium"
  question:
    en: "Final report?"
    tr: "Son rapor?"
  options:
  - id: "short"
    label:
      en: "Short"
      tr: "Kısa"
    value: "a short report: what changed, how it was verified, what is still open"
  - id: "detailed"
    label:
      en: "Detailed"
      tr: "Ayrıntılı"
    value: "a detailed report: files changed, why, how verified, risks and open questions"
  default: "short"
- id: "commit"
  impact: "low"
  question:
    en: "Commit?"
    tr: "Commit?"
  options:
  - id: "no"
    label:
      en: "Do not commit"
      tr: "Commit atma"
    value: "do not commit"
  - id: "end"
    label:
      en: "Commit at the end"
      tr: "Sonunda commit"
    value: "make one local commit at the end with a clear message"
  default: "no"
refinements:
- id: "plan"
  label:
    en: "Plan first"
    tr: "Önce plan"
  patch:
    autonomy: "first explore and write a plan, then wait for approval before editing files"
- id: "proceed"
  label:
    en: "Go ahead"
    tr: "Devam etsin"
  patch:
    autonomy: "make a short plan, then implement it step by step"
- id: "narrow"
  label:
    en: "Only named files"
    tr: "Yalnız belirtilen dosyalar"
  patch:
    scope: "only the files and folders the user names"
- id: "full-verify"
  label:
    en: "Test, lint, build"
    tr: "Test, lint, build"
  patch:
    verify: "run the tests, the linter and the build, and show each result"
- id: "safe"
  label:
    en: "Strict safety"
    tr: "Sıkı güvenlik"
  patch:
    safety: "do not delete files, reset the repository, push, deploy, publish or touch secrets and production data"
- id: "detail"
  label:
    en: "Detailed report"
    tr: "Ayrıntılı rapor"
  patch:
    report: "a detailed report: files changed, why, how verified, risks and open questions"
- id: "commit"
  label:
    en: "Commit at the end"
    tr: "Sonunda commit"
  patch:
    commit: "make one local commit at the end with a clear message"
- id: "ask"
  label:
    en: "Ask when unclear"
    tr: "Belirsizse sorsun"
  instruction: "If something is unclear or a decision cannot be undone, stop and ask instead of assuming."
checklist: ["One clear goal", "Files or folders it may touch", "Explore and plan before editing", "How to verify, with commands", "Safety limits (no push, deploy, delete, secrets)", "Where to find project rules", "Final report format", "Stops and asks when unsure"]
validators:
- id: "length"
  type: "maxLength"
  value: 3000
  message: "RouteAI limit: keep the prompt under 3000 characters."
- id: "min-length"
  type: "regex"
  value: "^[\\s\\S]{80,}$"
  message: "Too short: state the goal, the scope, how to verify and the safety rules."
- id: "no-braces"
  type: "regex"
  value: "^(?![\\s\\S]*(\\{\\{|\\}\\}))[\\s\\S]*$"
  message: "Remove unfilled {{placeholders}}; write the real content or a [clearly marked placeholder]."
---

## Sözdizimi

Terminalde çalışan kod ajanları (Claude Code, Codex CLI, Gemini CLI vb.) dosyaları okur, komut çalıştırır ve kodu değiştirir. Claude Code'un en iyi uygulama rehberi şu çerçeveyi önerir: **önce keşfet ve plan yap, sonra uygula, en sonda doğrula**; ajana kendini doğrulayacak bir yol ver (test, komut); bağlamı somut ver; büyük işi küçük parçalara böl.

**Sıra:** (1) hedef, (2) kapsam (hangi dosya/klasör), (3) proje kuralları (hangi dokümanı okusun), (4) çalışma biçimi (önce plan mı), (5) doğrulama komutları, (6) güvenlik sınırları, (7) son rapor.

- **Doğrulama şart:** "testleri çalıştır ve sonucu göster". Çalıştırılacak komutu biliyorsan yaz; bilmiyorsan "projedeki test komutunu bul ve çalıştır" de, komut adı uydurma.
- **Güvenlik sınırı:** dosya silme, depoyu sıfırlama, push, deploy, yayınlama, gizli anahtar ve canlı veriye dokunma yasağını açıkça yaz.
- **Kapsam:** hangi dosyalara dokunabileceğini söyle; dışına çıkması gerekirse dur ve sorsun.
- **Plan modu:** riskli ya da büyük işte önce planı yazdırıp onay iste.
- Belirsiz ya da geri alınamaz bir karar çıkarsa varsayım yapmasın, sorsun.
- Son rapor: ne değişti, nasıl doğrulandı, ne açık kaldı. Uzun anlatı isteme.
- Projede bir talimat dosyası (ör. CLAUDE.md, AGENTS.md, README) varsa "önce onu oku ve uy" de; dosya adlarını bilmiyorsan genel söyle.

## Şablon

Hedef: [tek cümle]. Kapsam: [dosya/klasörler]. Önce [proje talimat dosyalarını] oku ve kurallara uy. Çalışma biçimi: [önce keşfet ve plan yaz, onayımı bekle / kısa plan sonra uygula]. Doğrulama: [komutlar]; sonucu göster. Güvenlik: dosya silme, depoyu sıfırlama, push, deploy, yayınlama, gizli anahtar ve canlı veriye dokunma. Belirsizlikte ya da geri alınamaz kararda dur ve sor. Sonunda rapor: ne değişti, nasıl doğrulandı, ne açık kaldı.

## Yap / Yapma

**Yap**
- Önce keşif ve plan, sonra uygulama iste.
- Doğrulama komutlarını ya da "test komutunu bul" talimatını ekle.
- Güvenlik sınırlarını açıkça yaz.
- Kapsamı dosya/klasör olarak ver.

**Yapma**
- Tek komutta çok büyük, belirsiz iş verme ("tüm projeyi yenile").
- Ajana push, deploy ya da silme yetkisi verme.
- Kontrol etmeden sonucu kabul etme; çıktıyı ve testleri gör.
- Test komutunu uydurma.

## Örnekler

**Örnek 1 — özellik:** "Uygulamaya e-posta doğrulama ekle"

```
Hedef: kayıt formuna e-posta biçimi doğrulaması ekle. Kapsam: yalnızca kayıt formu bileşeni ve onun testleri. Önce projenin talimat ve readme dosyalarını oku ve kurallara uy. Önce kodu incele ve kısa bir plan yaz, onayımı bekle. Doğrulama: projedeki test komutunu bul, çalıştır ve sonucu göster; yeni davranış için test ekle. Güvenlik: dosya silme, depoyu sıfırlama, push, deploy ve gizli anahtara dokunma. Belirsizlikte dur ve sor. Sonunda kısa rapor: ne değişti, nasıl doğrulandı, ne açık kaldı.
```

**Örnek 2 — keşif:** "Bu projeyi anlamak istiyorum"

```
Hedef: bu kod tabanının nasıl çalıştığını açıkla; hiçbir dosyayı değiştirme. Önce readme ve talimat dosyalarını oku. Çıktı: ana klasörlerin görevi, uygulamanın giriş noktası, veri akışı ve testlerin nasıl çalıştırıldığı. Emin olmadığın yerleri "emin değilim" diye işaretle; tahmin etme.
```

Örnekler Türkçe yazıldı; prompt her zaman kullanıcının dilinde yazılır (kod ve hata iletileri olduğu gibi kalır).

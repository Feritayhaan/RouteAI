---
# TASLAK — reviewedBy boş. Resmi dokümana erişilemedi; sözdizimi bölümleri KAYNAK GEREKLİ.
id: "chat-general"
version: 4
appliesTo: ["chatgpt-gpt-5", "claude-ai-claude-4", "gemini-25-pro"]
modality: "text"
promptLanguage: "user"
sources: []
reviewedBy: ""
reviewedAt: ""
slots:
- id: "intent"
  impact: "high"
  question:
    en: "What should the AI do for you?"
    tr: "Yapay zekâ senin için ne yapsın?"
  options:
  - id: "build"
    label:
      en: "Build it with me"
      tr: "Benimle birlikte inşa etsin"
    value: "build it with me end to end"
  - id: "solve"
    label:
      en: "Solve a problem"
      tr: "Bir sorunu çözsün"
    value: "find the root cause and solve the problem step by step"
  - id: "analyze"
    label:
      en: "Analyze and decide"
      tr: "Analiz edip karar versin"
    value: "analyze the options and recommend a decision"
  - id: "transform"
    label:
      en: "Transform my text"
      tr: "Metnimi dönüştürsün"
    value: "transform my existing text"
  - id: "learn"
    label:
      en: "Teach me"
      tr: "Bana öğretsin"
    value: "teach me the topic"
  default: "infer"
- id: "deliverable"
  impact: "high"
  question:
    en: "What should the output be?"
    tr: "Çıktı ne olsun?"
  options:
  - id: "roadmap"
    label:
      en: "Roadmap with milestones"
      tr: "Kilometre taşlı yol haritası"
    value: "a step-by-step roadmap with milestones"
  - id: "draft"
    label:
      en: "Ready-to-use draft"
      tr: "Kullanıma hazır taslak"
    value: "a ready-to-use first draft of the work"
  - id: "spec"
    label:
      en: "Structured plan or spec"
      tr: "Yapılandırılmış plan / şema"
    value: "a structured plan or specification"
  - id: "matrix"
    label:
      en: "Comparison with criteria"
      tr: "Kriterli karşılaştırma"
    value: "a comparison table with explicit criteria"
  default: "infer"
- id: "stage"
  impact: "high"
  question:
    en: "Where are you now?"
    tr: "Şu an hangi aşamadasın?"
  options:
  - id: "idea"
    label:
      en: "Just an idea"
      tr: "Sadece bir fikir"
    value: "starting from an idea, nothing built yet"
  - id: "draft"
    label:
      en: "I have a draft"
      tr: "Taslağım var"
    value: "a first draft or prototype exists"
  - id: "live"
    label:
      en: "Running, want to improve"
      tr: "Çalışıyor, geliştireceğim"
    value: "already running and needs improvement"
  default: "infer"
- id: "depth"
  impact: "medium"
  question:
    en: "How deep should it go?"
    tr: "Ne kadar derin olsun?"
  options:
  - id: "concise"
    label:
      en: "Concise"
      tr: "Öz ve net"
    value: "concise and to the point"
  - id: "thorough"
    label:
      en: "Thorough"
      tr: "Kapsamlı"
    value: "thorough, covering every part"
  - id: "expert"
    label:
      en: "Expert depth"
      tr: "Uzman derinliğinde"
    value: "exhaustive, expert-level depth"
  default: "infer"
- id: "audience"
  impact: "medium"
  question:
    en: "Who is the output for?"
    tr: "Çıktı kimin için?"
  options:
  - id: "beginner"
    label:
      en: "A beginner"
      tr: "Yeni başlayan biri"
    value: "a beginner"
  - id: "pro"
    label:
      en: "A professional"
      tr: "Bir profesyonel"
    value: "a professional"
  - id: "exec"
    label:
      en: "An executive"
      tr: "Bir yönetici"
    value: "an executive"
  - id: "team"
    label:
      en: "My team"
      tr: "Ekibim"
    value: "my team"
  default: "infer"
- id: "tone"
  impact: "low"
  question:
    en: "What tone?"
    tr: "Nasıl bir ton?"
  options:
  - id: "neutral"
    label:
      en: "Neutral"
      tr: "Nötr"
    value: "neutral"
  - id: "friendly"
    label:
      en: "Friendly"
      tr: "Samimi"
    value: "friendly"
  - id: "formal"
    label:
      en: "Formal"
      tr: "Resmî"
    value: "formal"
  default: "infer"
refinements:
- id: "shorter"
  label:
    en: "Shorter"
    tr: "Daha kısa"
  patch:
    depth: "concise and to the point"
- id: "more-detail"
  label:
    en: "More depth"
    tr: "Daha derin"
  patch:
    depth: "exhaustive, expert-level depth"
- id: "table"
  label:
    en: "As a table"
    tr: "Tablo olarak"
  instruction: "Ask for the main output as a table with clear columns."
- id: "roadmap"
  label:
    en: "Roadmap"
    tr: "Yol haritası"
  patch:
    deliverable: "a step-by-step roadmap with milestones"
- id: "simpler"
  label:
    en: "Simpler language"
    tr: "Daha sade dil"
  patch:
    audience: "a beginner"
- id: "formal"
  label:
    en: "More formal"
    tr: "Daha resmî"
  patch:
    tone: "formal"
- id: "examples"
  label:
    en: "Add examples"
    tr: "Örnek ekle"
  instruction: "Ask for one concrete example per point."
checklist: ["Expert role and goal", "Context and constraints", "Concrete deliverable matched to the intent", "Output structure or working steps", "Placeholders only for facts the user must fill in", "Quality bar and depth"]
validators:
- id: "length"
  type: "maxLength"
  value: 6000
  message: "RouteAI limit: keep the prompt under 6000 characters."
- id: "deliverable"
  type: "regex"
  value: "(?<![\\p{L}])(çıktı|output|deliver|teslim|format|bölüm|section|başlık|heading|adım|step|madde|bullet|liste|list|tablo|table|matris|matrix|yol haritası|roadmap|kilometre|milestone|aşama|phase|plan|taslak|draft|şema|schema|outline|rapor|report|paragraf|paragraph|kelime|words|cümle|sentence|json|markdown)"
  flags: "iu"
  criterion: "toolReadiness"
  message: "State the expected output and its structure (e.g. sections, steps, a roadmap, a table)."
---

## Sözdizimi

KAYNAK GEREKLİ — ChatGPT, Claude ve Gemini resmi dokümantasyonuna bu rehber yazılırken erişilemedi. Ferit resmi dokümandan doldurup `sources` alanına sayfa URL'lerini eklemeli.

## Şablon

RouteAI iskeleti (doğrulanmadı, araca özel sözdizimi içermez). Mekanik etiket zinciri değil; doğal ve akıcı bölümlerden oluşan bir uzman promptu:

1. Uzmanlık rolü ve amaç: hedef AI'ı işin gerektirdiği kıdemli uzman olarak konumlandıran ve kullanıcının asıl hedefini net söyleyen giriş. Üretim isteğinde işi kullanıcıyla uçtan uca inşa eden rol (kıdemli kurucu ortak, baş mimar, baş yaratıcı yönetmen gibi).
2. Bağlam ve kısıtlar: kullanıcının verdiği tüm ayrıntılar (adlar, sayılar, dil, bütçe, süre, teknik sınırlar), bulunduğu aşama ve henüz bilinmeyenler.
3. Beklenen çıktı: niyete göre somut teslimat (kilometre taşlı yol haritası, üretim taslağı, yapılandırılmış plan ya da şema, kriterli karar matrisi, kök neden analizi ve çözüm adımları) ve bölüm bölüm yapısı.
4. Kalite ölçütleri ve çalışma kuralı: derinlik, kitle, ton; ardından yüzeysel özeti engelleyen kısa bir kural: genel bilgi değil somut teslimatı hemen üret; kritik bir bilgi eksikse başlamadan önce en fazla 1-2 soru sor.
5. Kullanıcının dolduracağı bilgiler: yalnızca kullanıcının bilebileceği gerçekler için köşeli parantezli yer tutucular.

## Yap / Yapma

KAYNAK GEREKLİ — ChatGPT, Claude ve Gemini resmi dokümantasyonuna bu rehber yazılırken erişilemedi. Ferit resmi dokümandan doldurup `sources` alanına sayfa URL'lerini eklemeli.

RouteAI kuralları (araç dokümanına dayanmaz; hedef AI yeterlilik rubriği, lib/promptBuilder/sufficiency.ts):

- Meta-sınır: prompt konuyu anlatmaz ve kullanıcının sorusunu cevaplamaz; hedef AI'a ne yapacağını ve neyi teslim edeceğini söyler.
- Niyet korunur: "X yapmak/üretmek istiyorum" diyen kullanıcıya "X hakkında kısa bilgi ver" promptu yazılmaz; hedef AI işi birlikte inşa eden kıdemli rolde somut teslimat üretir (yol haritası, taslak, şema, eserin kendisi).
- Öğretici/açıklayıcı prompt sadece kullanıcı açıkça "nedir, nasıl çalışır, anlat/öğret" dediğinde.
- Mekanik etiket zinciri yok ("Rol: X. Bağlam: Y. Görev: Z. Format: W."); doğal, akıcı bölümler.
- Hedef araç RouteAI konuşmasını görmez: kullanıcının verdiği adlar, tırnaklı metinler, sayılar ve kısıtlar promptta aynen yer alır; yalnızca kullanıcının bilebileceği gerçekler köşeli parantezli yer tutucu olur.
- Sadece prompt metni: "Elbette", "İşte promptun" gibi giriş yok; konuşmaya atıf yok; muğlak ifade ("vb.", "güzel bir şey") yok.
- Derinlik isteğin ağırlığına göre seçilir; varsayılan olarak "başlangıç seviyesi" ya da "kısa paragraf" seçilmez.
- Bu tür araçta negatif prompt alanı yok: istenmeyenler promptta kısıt olarak yazılır, negativePrompt boş kalır.

## Örnekler

KAYNAK GEREKLİ — ChatGPT, Claude ve Gemini resmi dokümantasyonuna bu rehber yazılırken erişilemedi. Ferit resmi dokümandan doldurup `sources` alanına sayfa URL'lerini eklemeli.

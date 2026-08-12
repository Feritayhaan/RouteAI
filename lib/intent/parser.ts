import { openai } from '../openai';
import { ParsedIntent, IntentParsingError } from './types';
import { detectCategory } from '../keywords';

const SYSTEM_PROMPT = `Sen RouteAI'in intent analyzer'isin. Kullanicinin istegini analiz edip yapilandirilmis JSON donduruyorsun.

**Kategoriler:**
- gorsel: SADECE statik gorseller — resim, fotograf, logo, illustrasyon, poster, banner, grafik tasarim
- metin: Blog, makale, copywriting, icerik yazimi
- ses: Muzik, podcast, seslendirme, ses efekti
- arastirma: Akademik arastirma, makale analizi, literatur taramasi
- video: Video uretimi, montaj, animasyon, reel, shorts, klip, hareketli icerik, text-to-video
- veri: Veri analizi, gorsellestirme, dashboard, istatistik
- kod: Programlama, yazilim gelistirme, debugging

**KRITIK SINIFLANDIRMA KURALI:**
- "video" kelimesi gecen sorgulari KESINLIKLE 'video' kategorisinde sinifla. Asla 'gorsel' donme.
- 'gorsel' kategorisi YALNIZCA statik goruntuler (resim, fotograf, logo, illustrasyon, poster) icindir.
- "animasyon", "reel", "shorts", "klip", "hareketli", "text to video" => video.
- Sunum/slayt isteklerinde gorsel olabilir; ama icerikte "video" gectiyse video kazanir.

**Gorevin:**
1. Kullanicinin birincil amacini tespit et (primaryCategory)
2. Varsa yan ihtiyaclari belirle (secondaryCategories)
3. Gizli kisitlamalari yakala:
   - "ucretsiz", "para vermeden" -> pricing: free
   - "hizli", "acil" -> speed: fast
   - "yeni basliyorum", "basit" -> expertise: beginner
4. Guven skoru ver (0-1 arasi)
5. Neden bu kategoriyi sectigini acikla

**WORKFLOW/KARMASIKLIK TESPITI (COK ONEMLI):**
Kullanicinin istegi birden fazla adim veya arac gerektiriyorsa multi-step olarak isaretle!

Cok adimli gorev ornekleri (HEPSINDE complexity: "multi-step" OLMALI):
- "Cizgi roman olustur" -> Hikaye + senaryo + karakter + panel + duzenleme = multi-step (5 adim)
- "Video kursu yap" -> Senaryo + slayt + kayit + kurgu = multi-step (4 adim)
- "Marka kimligi olustur" -> Arastirma + logo + renkler + kilavuz = multi-step (4 adim)
- "Podcast yap" -> Senaryo + kayit + kurgu + dagitim = multi-step (4 adim)
- "Blog yazisi yaz" -> Arastirma + yazim + gorsel = multi-step (3 adim)
- "Sunum hazirla" -> Icerik + slayt tasarim + export = multi-step (3 adim)
- "E-kitap yaz" -> Anahat + yazim + kapak + formatlama = multi-step (4 adim)
- "YouTube video" -> Konu + script + thumbnail + video + SEO = multi-step (5 adim)
- "Sosyal medya kampanyasi" -> Strateji + gorseller + copy = multi-step (4 adim)
- "Muzik yap" -> Sozler + melodi + mix + cover = multi-step (4 adim)
- "Mobil uygulama tasarla" -> UX + design system + ekranlar + prototip = multi-step (4 adim)
- "Dashboard olustur" -> Analiz + gorsellestirme + layout = multi-step (3 adim)

Basit gorev ornekleri (complexity: "simple"):
- "Logo tasarla" -> Tek adim = simple
- "Bir gorsel olustur" -> Tek adim = simple
- "Email yaz" -> Tek adim = simple
- "Ses kaydi duzenle" -> Tek adim = simple
- "Ceviri yap" -> Tek adim veya simple

Multi-step gorevler icin:
- complexity: "multi-step" ayarla
- estimatedSteps: Tahmini adim sayisini belirt (2-6 arasi)
- workflowHints: Ana adimlari icerik olarak belirt (orn: ["hikaye", "gorsel", "duzenleme"])
- secondaryCategories: Tum gerekli kategorileri ekle

**Onemli Kurallar:**
- Belirsiz sorgularda confidence dusuk olsun (< 0.5)
- Multi-intent durumlari tespit et (orn: "video icin muzik" -> primary:video, secondary:ses)
- Context'e dikkat et (orn: "sosyal medya icerigi" cogunlukla gorsel demektir)
- SADECE gercekten karmasik, cok-asamali projeler multi-step olmali!
- Tek arac gerektiren isler SIMPLE olmali!`;

// ===========================================
// WORKFLOW DETECTION LOGIC 
// ===========================================

// ONLY truly complex, multi-stage projects should be workflows
// These require multiple different tools across different categories
const MULTI_STEP_KEYWORDS = [
  // Comic/Graphic Novel - needs story + art + layout (truly complex)
  'çizgi roman', 'comic', 'manga', 'webtoon', 'graphic novel',
  // Full brand identity - needs strategy + logo + guidelines (complex)
  'marka kimliği', 'brand identity', 'kurumsal kimlik',
  // Full video production - needs script + video + audio (complex)
  'video kurs', 'online kurs', 'eğitim videosu', 'kısa film', 'belgesel', 'tanıtım filmi',
  // E-book/Book - needs outline + writing + cover + formatting (complex)
  'e-kitap', 'ebook', 'kitap yaz',
  // YouTube channel/series - needs strategy + content + SEO (complex)
  'youtube kanalı', 'içerik stratejisi',
  // Mobile app design - needs UX + UI + prototype (complex)
  'mobil uygulama tasarımı', 'app tasarla', 'uygulama tasarla',
  // Full music production with album - needs lyrics + production + cover (complex)
  'albüm yap', 'ep yap'
];

// Simple queries that should ALWAYS return single tool recommendation
// These are explicit "what tool should I use" or single-action requests
const SIMPLE_KEYWORDS = [
  // Explicit tool questions
  'hangi araç', 'which tool', 'en iyi', 'best', 'öner', 'recommend',
  // Single actions - logos
  'logo', 'logo tasarla', 'logo yap', 'amblem',
  // Single actions - images
  'görsel', 'resim', 'image', 'fotoğraf', 'poster', 'banner', 'thumbnail', 'kapak',
  // Single actions - text
  'yaz', 'write', 'metin', 'email', 'mail', 'makale', 'article',
  // Single actions - presentations (simple tool needed, not workflow)
  'sunum', 'presentation', 'slayt', 'powerpoint', 'pitch deck',
  // Single actions - audio
  'seslendirme', 'voiceover', 'ses', 'müzik', 'şarkı', 'beat',
  // Single actions - editing
  'düzenle', 'edit', 'değiştir', 'dönüştür', 'convert',
  // Single actions - translation
  'çevir', 'çeviri', 'translate', 'translation',
  // Single actions - code
  'kod', 'code', 'program', 'script', 'debug',
  // Single actions - data
  'analiz', 'grafik', 'chart', 'dashboard', 'rapor',
  // Single actions - video (simple)
  'video düzenle', 'video edit', 'montaj',
  // Social media posts (single action, not campaign)
  'post', 'story', 'reel'
];

// Check if query explicitly asks for tool recommendation
const TOOL_QUESTION_PATTERNS = [
  /hangi (araç|tool|ai|yapay zeka)/i,
  /ne kullan/i,
  /öner/i,
  /(en iyi|best).*(araç|tool|ai)/i,
  /\?(.*)(araç|tool)/i
];

// Detect if query should be simple (single tool) or multi-step (workflow)
function detectQueryType(query: string): {
  isMultiStep: boolean;
  isExplicitSimple: boolean;
  hints: string[]
} {
  const lowerQuery = query.toLowerCase();
  const hints: string[] = [];

  // Check 1: Is this explicitly asking for a tool recommendation?
  for (const pattern of TOOL_QUESTION_PATTERNS) {
    if (pattern.test(query)) {
      return { isMultiStep: false, isExplicitSimple: true, hints: [] };
    }
  }

  // Check 2: Does it contain SIMPLE keywords? (prioritize simple)
  let hasSimpleKeyword = false;
  for (const keyword of SIMPLE_KEYWORDS) {
    if (lowerQuery.includes(keyword.toLowerCase())) {
      hasSimpleKeyword = true;
      break;
    }
  }

  // Check 3: Does it contain MULTI-STEP keywords? (only truly complex)
  let hasMultiStepKeyword = false;
  for (const keyword of MULTI_STEP_KEYWORDS) {
    if (lowerQuery.includes(keyword.toLowerCase())) {
      hasMultiStepKeyword = true;
      hints.push(keyword);
    }
  }

  // Decision logic:
  // - If has multi-step keyword AND NOT overridden by explicit simple → workflow
  // - Otherwise → simple (single tool)

  // Multi-step indicators (additional checks)
  const multiStepIndicators = [
    /oluştur.*baştan/i,        // "baştan oluştur" - create from scratch
    /tam.*süreç/i,             // "tam süreç" - full process
    /adım.*adım/i,             // "adım adım" - step by step
    /sıfırdan/i,               // "sıfırdan" - from zero
    /komple/i,                 // "komple" - complete
    /bütün.*süreç/i            // "bütün süreç" - entire process
  ];

  let hasMultiStepIndicator = multiStepIndicators.some(p => p.test(query));

  return {
    isMultiStep: hasMultiStepKeyword || hasMultiStepIndicator,
    isExplicitSimple: hasSimpleKeyword && !hasMultiStepKeyword,
    hints
  };
}

export async function parseUserIntent(
  query: string
): Promise<ParsedIntent | IntentParsingError> {
  // Pre-check for multi-step indicators using new smart detection
  const queryType = detectQueryType(query);

  try {
    // ================================================================
    // KADEME 1: Kural tabanlı hızlı classifier (LLM ÇAĞRISI YOK)
    // ================================================================
    const keywordCategory = detectCategory(query);
    const constraintsFromKeywords = extractConstraints(query);

    // 6 kelimeye kadar olan sorguları VEYA belirgin kategorisi olan sorguları
    // doğrudan kural tabanlı çöz — LLM'e gitme, ~0ms
    if (keywordCategory && query.split(' ').length <= 6) {
      console.log('[Intent Parser] Kademe 1: Kural tabanlı -', keywordCategory);
      return createFallbackIntent(query, keywordCategory, queryType, constraintsFromKeywords);
    }

    // ================================================================
    // KADEME 2: LLM fallback (sadece karmaşık sorgular için)
    // gpt-4o-mini, temperature: 0, max_tokens: 150
    // ================================================================
    console.log('[Intent Parser] Kademe 2: LLM analizi başlıyor...');
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: query },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'intent_analysis',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              primaryCategory: {
                type: 'string',
                enum: ['gorsel', 'metin', 'ses', 'arastirma', 'video', 'veri', 'kod'],
              },
              secondaryCategories: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['gorsel', 'metin', 'ses', 'arastirma', 'video', 'veri', 'kod'],
                },
              },
              confidence: { type: 'number', minimum: 0, maximum: 1 },
              userGoal: { type: 'string' },
              constraints: {
                type: 'object',
                properties: {
                  pricing: { type: 'string', enum: ['free', 'freemium', 'paid'] },
                  speed: { type: 'string', enum: ['fast', 'quality'] },
                  expertise: { type: 'string', enum: ['beginner', 'advanced'] },
                  language: { type: 'string' },
                },
                required: ['pricing', 'speed', 'expertise', 'language'],
                additionalProperties: false,
              },
              keywords: {
                type: 'array',
                items: { type: 'string' },
              },
              reasoning: { type: 'string' },
              complexity: {
                type: 'string',
                enum: ['simple', 'multi-step'],
              },
              estimatedSteps: {
                type: 'integer',
                minimum: 1,
                maximum: 10,
              },
              workflowHints: {
                type: 'array',
                items: { type: 'string' },
              },
            },
            required: [
              'primaryCategory',
              'secondaryCategories',
              'confidence',
              'userGoal',
              'constraints',
              'keywords',
              'reasoning',
              'complexity',
              'estimatedSteps',
              'workflowHints',
            ],
            additionalProperties: false,
          },
        },
      },
      temperature: 0,       // Deterministic — daha hızlı, tutarlı
      max_tokens: 150,       // Kısa yanıt — hız optimizasyonu
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Boş yanıt");
    }

    const parsed = JSON.parse(
      typeof content === 'string' ? content : JSON.stringify(content)
    ) as ParsedIntent;

    const normalized: ParsedIntent = {
      ...parsed,
      secondaryCategories: parsed.secondaryCategories ?? [],
      constraints: parsed.constraints ?? {},
      complexity: parsed.complexity ?? 'simple',
      estimatedSteps: parsed.estimatedSteps,
      workflowHints: parsed.workflowHints ?? [],
    };

    // SAFETY: "video" kelimesi geçen sorgularda LLM'in 'gorsel' tahminini reddet.
    if (/\bvideo\b/i.test(query) && normalized.primaryCategory === 'gorsel') {
      console.log('[Intent Parser] LLM sınıflandırması düzeltildi: gorsel -> video');
      normalized.primaryCategory = 'video';
      // gorsel'i secondary'ye taşıma — gerçek niyet video, gorsel tetiklenmesin
      normalized.secondaryCategories = (normalized.secondaryCategories ?? []).filter(c => c !== 'gorsel');
    }

    // Override with keyword detection if AI missed it - but respect explicit simple
    if (queryType.isMultiStep && !queryType.isExplicitSimple && normalized.complexity === 'simple') {
      console.log('[Intent Parser] Overriding to multi-step based on keywords');
      normalized.complexity = 'multi-step';
      normalized.estimatedSteps = normalized.estimatedSteps || 4;
      normalized.workflowHints = [...(normalized.workflowHints || []), ...queryType.hints];
    }

    if (normalized.confidence < 0.5) {
      return {
        code: 'LOW_CONFIDENCE',
        message: 'Biraz daha detay verebilir misin? Ne yapmak istedigini tam anlamadim.',
        suggestions: [
          'Ornek: "Logo tasarimi yapmak istiyorum"',
          'Ornek: "Blog yazisi yazmak icin AI lazim"',
          'Ornek: "Cizgi roman olusturmak istiyorum"',
        ],
      };
    }

    console.log('[Intent Parser] Kademe 2 sonuç:', normalized.complexity,
      'Steps:', normalized.estimatedSteps);

    return normalized;

  } catch (error: any) {
    console.error('[Intent Parser Hatası]:', error.message);

    // 3. API Hata Verdiyse → kelime bazlı fallback
    const fallbackCategory = detectCategory(query);

    if (fallbackCategory) {
      console.log(`⚠️ API hatası sonrası "${fallbackCategory}" kategorisi tahmin edildi.`);
      return createFallbackIntent(query, fallbackCategory, queryType);
    }

    return {
      code: 'API_ERROR',
      message: 'Sistemsel bir sorun var (API Key Hatası). Ancak isteğini kategorize edemedim.',
      suggestions: ['Lütfen .env dosyasındaki API anahtarını kontrol et.']
    };
  }
}

// ================================================================
// Yardımcı: Prompt'tan kısıtlamaları çıkar (LLM'siz)
// ================================================================
function extractConstraints(query: string): ParsedIntent['constraints'] {
  const lower = query.toLowerCase();
  const constraints: ParsedIntent['constraints'] = {
    // Varsayilan 'freemium' = "tercih belirtilmedi". Eskiden 'free' idi ve
    // bu, kullanicinin ucretsiz istedigi ile parser'in bir sey bilmedigi
    // durumu AYIRT EDILEMEZ kiliyordu; kisiti okuyan taraf her sorguyu
    // ucretsiz sanirdi. Asagidaki regex sadece kullanici gercekten
    // soyledigginde 'free' yazar.
    pricing: 'freemium',
    speed: 'fast',
    expertise: 'beginner',
    language: 'tr',
  };

  // Pricing
  if (/ücretsiz|bedava|free|para\s*vermeden|parasız/.test(lower)) {
    constraints.pricing = 'free';
  } else if (/premium|profesyonel|paid|pro\b/.test(lower)) {
    constraints.pricing = 'paid';
  }

  // Speed
  if (/hızlı|acil|fast|quick|çabuk/.test(lower)) {
    constraints.speed = 'fast';
  } else if (/kaliteli|detaylı|quality/.test(lower)) {
    constraints.speed = 'quality';
  }

  // Expertise
  if (/yeni\s*başl|basit|kolay|beginner|simple/.test(lower)) {
    constraints.expertise = 'beginner';
  } else if (/ileri|uzman|advanced|profesyonel/.test(lower)) {
    constraints.expertise = 'advanced';
  }

  return constraints;
}

// Yardımcı Fonksiyon: Basit Intent Oluşturucu
function createFallbackIntent(
  query: string,
  category: string,
  queryType: { isMultiStep: boolean; isExplicitSimple: boolean; hints: string[] },
  constraints?: ParsedIntent['constraints']
): ParsedIntent {
  return {
    primaryCategory: category as any,
    secondaryCategories: [],
    confidence: 0.7,
    userGoal: query,
    constraints: constraints ?? { pricing: 'freemium', speed: 'fast', expertise: 'beginner', language: 'tr' },
    keywords: query.split(/\s+/).filter(w => w.length > 2),
    reasoning: 'Kademe 1: Kural tabanlı hızlı classifier kullanıldı.',
    complexity: queryType.isMultiStep && !queryType.isExplicitSimple ? 'multi-step' : 'simple',
    estimatedSteps: queryType.isMultiStep ? 4 : 1,
    workflowHints: queryType.hints.length > 0 ? queryType.hints : []
  };
}

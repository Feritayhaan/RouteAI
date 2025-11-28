import { openai } from './openaiClient';
import { ParsedIntent, IntentParsingError } from './types';
import { detectCategory } from '../keywords';

const SYSTEM_PROMPT = `Sen RouteAI'in intent analyzer'isin. Kullanicinin istegini analiz edip yapilandirilmis JSON donduruyorsun.

**Kategoriler:**
- gorsel: Logo, poster, gorsel tasarim, fotograf duzenleme
- metin: Blog, makale, copywriting, icerik yazimi
- ses: Muzik, podcast, seslendirme, ses efekti
- arastirma: Akademik arastirma, makale analizi, literatur taramasi
- video: Video uretimi, montaj, animasyon
- veri: Veri analizi, gorsellestirme, dashboard, istatistik
- kod: Programlama, yazilim gelistirme, debugging

**Gorevin:**
1. Kullanicinin birincil amacini tespit et (primaryCategory)
2. Varsa yan ihtiyaclari belirle (secondaryCategories)
3. Gizli kisitlamalari yakala:
   - "ucretsiz", "para vermeden" -> pricing: free
   - "hizli", "acil" -> speed: fast
   - "yeni basliyorum", "basit" -> expertise: beginner
4. Guven skoru ver (0-1 arasi)
5. Neden bu kategoriyi sectigini acikla

**Onemli Kurallar:**
- Belirsiz sorgularda confidence dusuk olsun (< 0.5)
- Multi-intent durumlari tespit et (orn: "video icin muzik" -> primary:video, secondary:ses)
- Context'e dikkat et (orn: "sosyal medya icerigi" cogunlukla gorsel demektir)`;

export async function parseUserIntent(
  query: string
): Promise<ParsedIntent | IntentParsingError> {
  try {
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
            },
            required: [
              'primaryCategory',
              'secondaryCategories',
              'confidence',
              'userGoal',
              'constraints',
              'keywords',
              'reasoning',
            ],
            additionalProperties: false,
          },
        },
      },
      temperature: 0.3,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return {
        code: 'PARSE_ERROR',
        message: 'OpenAI yanit vermedi',
      };
    }

    const parsed = JSON.parse(
      typeof content === 'string' ? content : JSON.stringify(content)
    ) as ParsedIntent;

    const normalized: ParsedIntent = {
      ...parsed,
      secondaryCategories: parsed.secondaryCategories ?? [],
      constraints: parsed.constraints ?? {},
    };

    if (normalized.confidence < 0.5) {
      return {
        code: 'LOW_CONFIDENCE',
        message: 'Biraz daha detay verebilir misin? Ne yapmak istedigini tam anlamadim.',
        suggestions: [
          'Ornek: "Logo tasarimi yapmak istiyorum"',
          'Ornek: "Blog yazisi yazmak icin AI lazim"',
          'Ornek: "Musterilerim icin tanitim videosu hazirlamaliyim"',
        ],
      };
    }

    return normalized;
  } catch (error: any) {
    console.error('[Intent Parser] Error:', error);

    const fallbackCategory = detectCategory(query);
    if (fallbackCategory) {
      return {
        primaryCategory: fallbackCategory,
        confidence: 0.55,
        userGoal: query,
        secondaryCategories: [],
        constraints: {},
        keywords: query.split(/\s+/).filter(Boolean).slice(0, 8),
        reasoning: 'OpenAI yaniti alinamadigi icin anahtar kelime tespiti ile fallback yapildi.',
      };
    }

    const apiMessage =
      typeof error?.message === 'string'
        ? error.message
        : 'AI analiz yaparken bir sorun olustu. Lutfen tekrar dene.';

    return {
      code: 'API_ERROR',
      message: apiMessage,
      suggestions: [
        'OPENAI_API_KEY degerini dogrula',
        'Ag baglantisini kontrol et ve yeniden dene',
        'Kisa bir sure sonra tekrar dene',
      ],
    };
  }
}

// RouteAI Workflow Templates
//
// İş akışı SADECE iş gerçekten farklı türde araçlar gerektirdiğinde çıkar
// (metin + ses + görsel gibi). Tek araçla yapılan işlerin (sunum, blog, logo,
// ürün fotoğrafı, çeviri, dashboard, mobil uygulama) şablonu yok: onlar tek
// araç önerisine gider.
//
// Kurallar:
//  - En fazla 3 adım.
//  - Her adımın `tasks` alanı katalogdaki görev kimlikleridir (data/tasks.json).
//    Araç adı şablona YAZILMAZ; adımın aracı o görevi yapabilen aktif ürünler
//    arasından seçilir (workflowGenerator.ts).
//  - Süre, maliyet ya da sayı yazılmaz: kaynağı olmayan bilgi gösterilmez.
//  - Adım promptu şablonda durmaz; kullanıcı isterse o adımın aracı için
//    prompt oluşturucu (lib/promptBuilder) kullanıcının amacına göre yazar.

import { WorkflowTemplate } from './workflowTypes';
import { ParsedIntent } from '../intent/types';
import { hasTerm } from '../text';

export const MAX_WORKFLOW_STEPS = 3;

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
    {
        id: 'comic-creation',
        name: 'Çizgi Roman',
        nameEn: 'Comic',
        description: 'Hikayeden panellere çizgi roman',
        triggers: ['çizgi roman', 'comic', 'manga', 'webtoon', 'graphic novel', 'çizgi hikaye'],
        semanticDescription: 'Kullanıcı sıfırdan bir çizgi roman, manga ya da webtoon oluşturmak istiyor: hikaye ve senaryo, karakterler ve paneller.',
        minConfidence: 0.6,
        primaryCategories: ['gorsel', 'metin'],
        tags: ['creative', 'visual', 'storytelling'],
        steps: [
            {
                order: 1,
                name: 'Hikaye ve senaryo',
                description: 'Karakterleri, olay örgüsünü ve panel panel senaryoyu yaz',
                category: 'metin',
                tasks: ['text.write-longform'],
                tips: ['Her karakterin görünüşünü tek paragrafta tarif et; çizim adımında aynen kullan.'],
            },
            {
                order: 2,
                name: 'Karakterler ve paneller',
                description: 'Karakterleri tutarlı çiz, sahneleri panel panel üret',
                category: 'gorsel',
                tasks: ['image.generate'],
                tips: ['Önce karakter referans sayfası üret, panellerde onu referans ver.', 'Tüm panellerde aynı stil tarifini kullan.'],
            },
        ],
    },
    {
        id: 'video-production',
        name: 'Tanıtım Videosu',
        nameEn: 'Promo Video',
        description: 'Senaryodan seslendirilmiş videoya',
        triggers: [
            'tanıtım videosu', 'tanıtım filmi', 'reklam videosu', 'kısa film', 'belgesel',
            'promo video', 'short film', 'documentary',
        ],
        semanticDescription: 'Kullanıcı senaryosu, görüntüsü ve seslendirmesi olan bir tanıtım videosu, reklam ya da kısa film üretmek istiyor.',
        minConfidence: 0.6,
        primaryCategories: ['video', 'ses'],
        tags: ['video', 'marketing'],
        steps: [
            {
                order: 1,
                name: 'Senaryo',
                description: 'Sahne sahne akışı ve anlatım metnini yaz',
                category: 'metin',
                tasks: ['text.write-longform'],
            },
            {
                order: 2,
                name: 'Video sahneleri',
                description: 'Senaryodaki sahneleri metinden videoya üret',
                category: 'video',
                tasks: ['video.text-to-video'],
                tips: ['Her sahneyi ayrı üret; kamera hareketini ve ışığı promptta belirt.'],
            },
            {
                order: 3,
                name: 'Seslendirme',
                description: 'Anlatım metnini doğal bir sesle seslendir',
                category: 'ses',
                tasks: ['audio.tts-voiceover'],
            },
        ],
    },
    {
        id: 'online-course',
        name: 'Online Kurs',
        nameEn: 'Online Course',
        description: 'Ders metninden anlatımlı ders videosuna',
        triggers: ['online kurs', 'video kurs', 'eğitim videosu', 'ders videosu', 'online course', 'video course'],
        semanticDescription: 'Kullanıcı slaytlı ve anlatımlı ders videolarından oluşan bir online kurs hazırlamak istiyor.',
        minConfidence: 0.6,
        primaryCategories: ['video', 'metin'],
        tags: ['education', 'video'],
        steps: [
            {
                order: 1,
                name: 'Ders planı ve metin',
                description: 'Ders başlıklarını ve her dersin anlatım metnini yaz',
                category: 'metin',
                tasks: ['text.write-longform'],
            },
            {
                order: 2,
                name: 'Slaytlar',
                description: 'Her ders için slaytları hazırla',
                category: 'metin',
                tasks: ['slides.create'],
            },
            {
                order: 3,
                name: 'Anlatımlı video',
                description: 'Slaytları sunan avatarlı ya da seslendirmeli ders videosunu oluştur',
                category: 'video',
                tasks: ['video.avatar-presenter', 'audio.tts-voiceover'],
            },
        ],
    },
    {
        id: 'brand-identity',
        name: 'Marka Kimliği',
        nameEn: 'Brand Identity',
        description: 'İsimden logoya ve örnek tasarımlara',
        triggers: [
            'marka kimliği', 'kurumsal kimlik', 'brand identity', 'branding',
            'marka oluştur', 'marka tasarımı', 'logo ve marka',
        ],
        semanticDescription: 'Kullanıcı bir marka için baştan kurumsal kimlik oluşturmak istiyor: isim ve slogan, logo, renkler ve örnek tasarımlar.',
        minConfidence: 0.6,
        primaryCategories: ['gorsel', 'metin'],
        tags: ['branding', 'design', 'business'],
        steps: [
            {
                order: 1,
                name: 'İsim ve slogan',
                description: 'Marka adı, konumlandırma ve slogan seçeneklerini çıkar',
                category: 'metin',
                tasks: ['text.marketing-copy'],
            },
            {
                order: 2,
                name: 'Logo',
                description: 'Marka karakterine uygun logo seçenekleri üret',
                category: 'gorsel',
                tasks: ['image.logo'],
                tips: ['Küçük boyutta da okunabilen sade bir işaret seç.'],
            },
            {
                order: 3,
                name: 'Renkler ve örnek tasarımlar',
                description: 'Renk paleti ve yazı tipiyle sosyal medya, kartvizit gibi örnek uygulamalar hazırla',
                category: 'gorsel',
                tasks: ['design.social-graphic'],
            },
        ],
    },
    {
        id: 'podcast-creation',
        name: 'Podcast',
        nameEn: 'Podcast',
        description: 'Bölüm metninden kapaklı bölüme',
        triggers: ['podcast', 'podcast bölümü', 'radyo programı', 'sesli içerik'],
        semanticDescription: 'Kullanıcı bir podcast bölümü ya da serisi hazırlamak istiyor: bölüm metni, seslendirme ve kapak görseli.',
        minConfidence: 0.5,
        primaryCategories: ['ses', 'metin'],
        tags: ['audio', 'content', 'media'],
        steps: [
            {
                order: 1,
                name: 'Bölüm metni',
                description: 'Konuyu, bölüm akışını ve konuşma metnini yaz',
                category: 'metin',
                tasks: ['text.write-longform'],
            },
            {
                order: 2,
                name: 'Seslendirme',
                description: 'Metni seslendir ya da kendi kaydını temizle',
                category: 'ses',
                tasks: ['audio.tts-voiceover'],
            },
            {
                order: 3,
                name: 'Kapak görseli',
                description: 'Podcast platformları için kare kapak görseli üret',
                category: 'gorsel',
                tasks: ['image.generate'],
            },
        ],
    },
    {
        id: 'ebook-creation',
        name: 'E-kitap',
        nameEn: 'E-book',
        description: 'Yazımdan kapağa e-kitap',
        triggers: ['e-kitap', 'ebook', 'e-book', 'kitap yaz', 'kitap oluştur', 'dijital kitap', 'kindle', 'epub'],
        semanticDescription: 'Kullanıcı bir e-kitap yazıp yayınlamak istiyor: bölüm planı, yazım ve kapak.',
        minConfidence: 0.6,
        primaryCategories: ['metin', 'gorsel'],
        tags: ['writing', 'publishing', 'content'],
        steps: [
            {
                order: 1,
                name: 'Anahat ve yazım',
                description: 'Bölüm planını çıkar, bölümleri yaz ve düzelt',
                category: 'metin',
                tasks: ['text.write-longform'],
                tips: ['Önce bölüm planını onayla, sonra bölümleri tek tek yazdır.'],
            },
            {
                order: 2,
                name: 'Kapak',
                description: 'Kitabın türüne uygun kapak görseli üret',
                category: 'gorsel',
                tasks: ['image.generate'],
            },
        ],
    },
    {
        id: 'youtube-video',
        name: 'YouTube Videosu',
        nameEn: 'YouTube Video',
        description: 'Senaryodan küçük resme YouTube videosu',
        triggers: ['youtube', 'youtube video', 'youtube videosu', 'youtube kanalı', 'youtuber', 'vlog'],
        semanticDescription: 'Kullanıcı YouTube için video hazırlamak istiyor: senaryo ve başlık, seslendirme ve küçük resim (thumbnail).',
        minConfidence: 0.6,
        primaryCategories: ['video', 'metin', 'gorsel'],
        tags: ['youtube', 'video', 'content'],
        steps: [
            {
                order: 1,
                name: 'Senaryo ve başlık',
                description: 'Video metnini, başlığı ve açıklamayı yaz',
                category: 'metin',
                tasks: ['text.write-longform'],
                tips: ['İlk birkaç cümlede videonun ne vaat ettiğini söyle.'],
            },
            {
                order: 2,
                name: 'Seslendirme',
                description: 'Video metnini seslendir',
                category: 'ses',
                tasks: ['audio.tts-voiceover'],
            },
            {
                order: 3,
                name: 'Küçük resim',
                description: 'Videonun küçük resmini (thumbnail) tasarla',
                category: 'gorsel',
                tasks: ['design.social-graphic'],
                tips: ['Az kelime, büyük yazı ve yüksek kontrast kullan.'],
            },
        ],
    },
    {
        id: 'social-media-campaign',
        name: 'Sosyal Medya Kampanyası',
        nameEn: 'Social Media Campaign',
        description: 'Metinlerden görsellere ve kısa videolara',
        triggers: [
            'sosyal medya kampanya', 'social media campaign', 'kampanya', 'instagram kampanya',
            'sosyal medya', 'social media',
        ],
        semanticDescription: 'Kullanıcı planlı bir sosyal medya kampanyası yürütmek istiyor: paylaşım metinleri, görseller ve kısa videolar.',
        minConfidence: 0.5,
        primaryCategories: ['gorsel', 'metin'],
        tags: ['social media', 'marketing', 'content'],
        steps: [
            {
                order: 1,
                name: 'Kampanya metinleri',
                description: 'Kampanya fikrini, paylaşım metinlerini ve takvimi yaz',
                category: 'metin',
                tasks: ['text.marketing-copy'],
            },
            {
                order: 2,
                name: 'Paylaşım görselleri',
                description: 'Gönderi ve hikâye görsellerini tasarla',
                category: 'gorsel',
                tasks: ['design.social-graphic'],
            },
            {
                order: 3,
                name: 'Kısa videolar',
                description: 'Reels ve Shorts için kısa videolar hazırla',
                category: 'video',
                tasks: ['video.edit-short-social'],
            },
        ],
    },
    {
        id: 'music-album',
        name: 'Albüm / EP',
        nameEn: 'Album / EP',
        description: 'Şarkılardan albüm kapağına',
        triggers: ['albüm', 'album', 'ep yap', 'ep hazırla', 'mixtape'],
        semanticDescription: 'Kullanıcı birden fazla şarkıdan oluşan bir albüm ya da EP hazırlamak istiyor: şarkılar ve albüm kapağı.',
        minConfidence: 0.5,
        primaryCategories: ['ses', 'gorsel'],
        tags: ['music', 'audio', 'creative'],
        steps: [
            {
                order: 1,
                name: 'Şarkılar',
                description: 'Sözleri ve şarkıları üret',
                category: 'ses',
                tasks: ['music.generate'],
            },
            {
                order: 2,
                name: 'Albüm kapağı',
                description: 'Albümün havasına uygun kapak görseli üret',
                category: 'gorsel',
                tasks: ['image.generate'],
            },
        ],
    },
];

// ============================================
// TEMPLATE SCORING & MATCHING
// ============================================

/**
 * Score a template against intent and prompt for relevance
 */
export function scoreTemplate(
    template: WorkflowTemplate,
    intent: ParsedIntent,
    prompt: string
): number {
    let score = 0;

    // 1. Keyword (trigger) eşleşmesi (ağırlık: 0.4 per match). Kelime başına
    // bağlı: "facebook" içinde "ebook" tetiklemez.
    const keywordMatches = template.triggers.filter(t => hasTerm(prompt, t)).length;
    score += keywordMatches * 0.4;

    // 2. Kısmi kelime eşleşmesi (trigger'ların parçaları, ağırlık: 0.15)
    for (const trigger of template.triggers) {
        const words = trigger.toLowerCase().split(' ');
        for (const word of words) {
            if (word.length > 3 && hasTerm(prompt, word)) {
                score += 0.15;
            }
        }
    }

    // 3. Kategori eşleşmesi (ağırlık: 0.3)
    if (template.primaryCategories?.includes(intent.primaryCategory)) {
        score += 0.3;
    }

    // 4. İkincil kategori eşleşmesi (ağırlık: 0.15)
    if (intent.secondaryCategories) {
        for (const sec of intent.secondaryCategories) {
            if (template.primaryCategories?.includes(sec)) {
                score += 0.15;
                break;
            }
        }
    }

    // 5. Workflow hint eşleşmesi (ağırlık: 0.2)
    if (intent.workflowHints) {
        for (const hint of intent.workflowHints) {
            const hintLower = hint.toLowerCase();
            if (template.triggers.some(t => t.toLowerCase().includes(hintLower))) {
                score += 0.2;
            }
            if (template.tags.some(t => t.toLowerCase().includes(hintLower))) {
                score += 0.1;
            }
        }
    }

    // 6. Güven çarpanı
    score *= (intent.confidence || 0.7);

    return score;
}

/**
 * Find matching workflow template based on user intent
 * Uses scoring system with minConfidence threshold
 */
export function findMatchingTemplate(
    query: string,
    workflowHints?: string[],
    intent?: ParsedIntent
): WorkflowTemplate | null {
    // intent yoksa eski davranışa fallback
    const effectiveIntent: ParsedIntent = intent ?? {
        primaryCategory: 'metin',
        secondaryCategories: [],
        confidence: 0.7,
        userGoal: query,
        constraints: { pricing: 'free', speed: 'fast', expertise: 'beginner', language: 'tr' },
        keywords: query.split(/\s+/),
        reasoning: '',
        complexity: 'multi-step',
        workflowHints: workflowHints ?? [],
    };

    // Score each template
    const scored = WORKFLOW_TEMPLATES.map(template => ({
        template,
        score: scoreTemplate(template, effectiveIntent, query),
    }));

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    const best = scored[0];

    // Skor, template'in minimum güven eşiğinin altındaysa → workflow döndürme
    if (!best || best.score < (best.template.minConfidence ?? 0.3)) {
        console.log('[Workflow] En iyi skor yetersiz:', best?.score, '< eşik:', best?.template.minConfidence);
        return null;
    }

    console.log('[Workflow] Template seçildi:', best.template.id, 'skor:', best.score.toFixed(2));
    return best.template;
}

/**
 * Get all available workflow templates
 */
export function getAllWorkflowTemplates(): WorkflowTemplate[] {
    return WORKFLOW_TEMPLATES;
}

/**
 * Get workflow template by ID
 */
export function getWorkflowTemplateById(id: string): WorkflowTemplate | null {
    return WORKFLOW_TEMPLATES.find(t => t.id === id) || null;
}

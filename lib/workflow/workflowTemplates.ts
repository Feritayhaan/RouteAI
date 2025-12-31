// RouteAI Workflow Templates
// Predefined multi-step workflows for common use cases

import { WorkflowTemplate } from './workflowTypes';

/**
 * Library of workflow templates
 * Each template defines a multi-step process with tool requirements per step
 */
export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
    // ============================================
    // COMIC CREATION WORKFLOW
    // ============================================
    {
        id: 'comic-creation',
        name: 'Çizgi Roman Oluşturma',
        nameEn: 'Comic Creation',
        description: 'Hikaye yazımından bitmiş çizgi romana kadar tam süreç',
        triggers: [
            'comic', 'çizgi roman', 'manga', 'graphic novel',
            'webtoon', 'karikatür hikaye', 'çizgi hikaye'
        ],
        complexity: 'complex',
        estimatedDuration: '4-8 saat',
        tags: ['creative', 'visual', 'storytelling'],
        steps: [
            {
                order: 1,
                name: 'Hikaye & Konsept Geliştirme',
                description: 'Ana hikaye, karakterler ve olay örgüsünü oluştur',
                category: 'metin',
                inputType: 'text',
                outputType: 'text',
                capabilities: ['creative writing', 'story', 'character development'],
                promptTemplate: `Bir [TÜR] çizgi roman için hikaye geliştirmek istiyorum.
Tema: [TEMA]
Hedef kitle: [HEDEf]

Lütfen şunları oluştur:
1. Ana karakterler (görsel tanımlarıyla birlikte)
2. Hikaye özeti (başlangıç, gelişme, sonuç)
3. Ana sahneler/anlar listesi ([X] sayfa için)`
            },
            {
                order: 2,
                name: 'Senaryo & Panel Dağılımı',
                description: 'Panel bazlı detaylı senaryo oluştur',
                category: 'metin',
                inputType: 'text',
                outputType: 'text',
                capabilities: ['script writing', 'formatting', 'dialogue'],
                promptTemplate: `Bu hikayeyi çizgi roman senaryo formatına dönüştür:

Format:
- Sayfa X, Panel Y
- Görsel açıklama (kamera açısı dahil)
- Diyalog/düşünce balonları
- Ses efektleri

Hedef: [X] sayfa, sayfa başına 4-6 panel`
            },
            {
                order: 3,
                name: 'Karakter Tasarımı',
                description: 'Tutarlı karakter referans çizimleri oluştur',
                category: 'gorsel',
                inputType: 'text',
                outputType: 'image',
                capabilities: ['character design', 'concept art', 'illustration'],
                promptTemplate: `Character reference sheet of [KARAKTER ADI], [GÖRSEL TANIM], 
comic art style, full body front view, 3/4 view, expression sheet, 
color palette, white background, detailed --ar 16:9`
            },
            {
                order: 4,
                name: 'Panel/Sahne Üretimi',
                description: 'Her panel için görseller oluştur',
                category: 'gorsel',
                inputType: 'text',
                outputType: 'image',
                capabilities: ['image generation', 'scene composition', 'dynamic poses'],
                promptTemplate: `Comic panel: [SAHNE AÇIKLAMASI], [SANAT STİLİ], 
[KAMERA AÇISI], dramatic lighting, speech bubble space in [POZİSYON] --ar 3:4`,
                tips: [
                    'Karakter referanslarını --cref ile kullan (Midjourney)',
                    'Her panel için tutarlı stil koru',
                    'Diyalog balonları için boşluk bırak'
                ]
            },
            {
                order: 5,
                name: 'Düzen & Yazı Ekleme',
                description: 'Panelleri düzenle, diyalogları ekle, finalize et',
                category: 'gorsel',
                inputType: 'image',
                outputType: 'document',
                capabilities: ['layout', 'typography', 'design', 'comic lettering'],
                promptTemplate: null,
                tips: [
                    'Diyalog ve anlatı için farklı fontlar kullan',
                    'Konuşma balonlarını panele göre pozisyonla',
                    'Baskı için PDF, web için PNG olarak dışa aktar'
                ]
            }
        ]
    },

    // ============================================
    // VIDEO PRODUCTION WORKFLOW
    // ============================================
    {
        id: 'video-production',
        name: 'Video Prodüksiyon',
        nameEn: 'Video Production',
        description: 'Senaryodan bitmiş videoya tam prodüksiyon süreci',
        triggers: [
            'video', 'film', 'video çek', 'video yap', 'reklam videosu',
            'tanıtım filmi', 'youtube video', 'kısa film', 'video içerik'
        ],
        complexity: 'complex',
        estimatedDuration: '3-6 saat',
        tags: ['video', 'creative', 'marketing'],
        steps: [
            {
                order: 1,
                name: 'Senaryo & Storyboard',
                description: 'Video senaryosu ve görsel planı oluştur',
                category: 'metin',
                inputType: 'text',
                outputType: 'text',
                capabilities: ['script writing', 'storyboard', 'creative writing'],
                promptTemplate: `[SÜRE] dakikalık bir [TÜR] video için senaryo yaz.
Konu: [KONU]
Hedef kitle: [HEDEF]
Ton: [TON]

Çıktı formatı:
- Sahne numarası
- Süre
- Görsel açıklama
- Seslendirme/diyalog
- Müzik/ses notları`
            },
            {
                order: 2,
                name: 'Görsel Üretimi',
                description: 'Video kareleri veya görseller oluştur',
                category: 'video',
                inputType: 'text',
                outputType: 'video',
                capabilities: ['video generation', 'animation', 'visual effects'],
                promptTemplate: `[SAHNE AÇIKLAMASI], cinematic, [KAMERA HAREKETİ], 
professional lighting, [STİL], high quality --duration [X]s`
            },
            {
                order: 3,
                name: 'Seslendirme',
                description: 'Profesyonel seslendirme veya TTS',
                category: 'ses',
                inputType: 'text',
                outputType: 'audio',
                capabilities: ['voice synthesis', 'text to speech', 'dubbing'],
                promptTemplate: null,
                tips: [
                    'Senaryo metnini düz metin olarak hazırla',
                    'Ses tonunu hedef kitleye göre seç',
                    'Doğal duraklamalar için noktalama kullan'
                ]
            },
            {
                order: 4,
                name: 'Müzik & Ses Efektleri',
                description: 'Arka plan müziği ve ses efektleri ekle',
                category: 'ses',
                inputType: 'text',
                outputType: 'audio',
                capabilities: ['music generation', 'sound effects', 'audio'],
                promptTemplate: `[TÜR] tarzında, [MOOD] ruh halinde, [SÜRE] süresinde 
enstrümantal müzik oluştur. Tempo: [BPM]`,
                optional: true
            }
        ]
    },

    // ============================================
    // BRAND IDENTITY WORKFLOW
    // ============================================
    {
        id: 'brand-identity',
        name: 'Marka Kimliği Oluşturma',
        nameEn: 'Brand Identity',
        description: 'Logodan renk paletine tam marka kimliği süreci',
        triggers: [
            'brand identity', 'marka kimliği', 'branding', 'kurumsal kimlik',
            'logo ve marka', 'marka oluştur', 'marka tasarımı', 'startup branding'
        ],
        complexity: 'complex',
        estimatedDuration: '3-5 saat',
        tags: ['branding', 'design', 'business'],
        steps: [
            {
                order: 1,
                name: 'Marka Stratejisi & Araştırma',
                description: 'Marka değerleri, hedef kitle ve pozisyonlama analizi',
                category: 'metin',
                inputType: 'text',
                outputType: 'text',
                capabilities: ['research', 'strategy', 'analysis'],
                promptTemplate: `[MARKA ADI] için marka stratejisi oluştur:

Sektör: [SEKTÖR]
Hedef kitle: [HEDEF KİTLE]
Rakipler: [RAKİPLER]

Çıktılar:
1. Marka değerleri ve misyon
2. Hedef kitle personas
3. Marka sesi ve tonu
4. Farklılaştırıcı özellikler`
            },
            {
                order: 2,
                name: 'Logo Tasarımı',
                description: 'Ana logo ve varyasyonları oluştur',
                category: 'gorsel',
                inputType: 'text',
                outputType: 'image',
                capabilities: ['logo design', 'branding', 'typography'],
                promptTemplate: `Minimalist logo design for [MARKA ADI], [SEKTÖR] company,
[STİL] style, [RENK TERCİHİ], professional, scalable, 
white background, vector-ready --ar 1:1`
            },
            {
                order: 3,
                name: 'Renk Paleti & Tipografi',
                description: 'Marka renkleri ve yazı tipleri belirleme',
                category: 'gorsel',
                inputType: 'text',
                outputType: 'image',
                capabilities: ['color palette', 'typography', 'design system'],
                promptTemplate: `Brand color palette with 5 colors: primary, secondary, 
accent, neutral, and highlight. [MOOD] feeling, [SEKTÖR] industry.
Include HEX codes, color names, and usage guidelines.`,
                tips: [
                    'Ana renk + 2 yardımcı + nötr + vurgu',
                    'Dijital ve baskı için renk kodları',
                    'Erişilebilirlik kontrastı kontrol et'
                ]
            },
            {
                order: 4,
                name: 'Marka Kılavuzu',
                description: 'Tüm elementleri birleştiren kullanım kılavuzu',
                category: 'metin',
                inputType: 'text',
                outputType: 'document',
                capabilities: ['documentation', 'guidelines', 'templates'],
                promptTemplate: `[MARKA ADI] için marka kullanım kılavuzu oluştur:

1. Logo kullanım kuralları (minimum boyut, boşluklar, yasak kullanımlar)
2. Renk kullanımı (birincil ve ikincil renkler, gradyanlar)
3. Tipografi kuralları (başlık, alt başlık, gövde metin)
4. Ses ve ton örnekleri
5. Sosyal medya şablonları`
            }
        ]
    },

    // ============================================
    // PODCAST CREATION WORKFLOW
    // ============================================
    {
        id: 'podcast-creation',
        name: 'Podcast Oluşturma',
        nameEn: 'Podcast Creation',
        description: 'Konudan yayına hazır podcast bölümü',
        triggers: [
            'podcast', 'podcast yap', 'podcast bölümü', 'ses içerik',
            'audio content', 'radyo programı', 'sesli içerik'
        ],
        complexity: 'medium',
        estimatedDuration: '2-4 saat',
        tags: ['audio', 'content', 'media'],
        steps: [
            {
                order: 1,
                name: 'Konu Araştırma & Senaryo',
                description: 'Bölüm konusu araştır ve konuşma metni hazırla',
                category: 'arastirma',
                inputType: 'text',
                outputType: 'text',
                capabilities: ['research', 'script writing', 'content planning'],
                promptTemplate: `[KONU] hakkında [SÜRE] dakikalık podcast bölümü için:

1. Konu araştırması ve ana noktalar
2. Bölüm yapısı (intro, ana bölümler, outro)
3. Konuşma noktaları ve geçişler
4. İlginç anekdotlar veya istatistikler`
            },
            {
                order: 2,
                name: 'Kayıt / Seslendirme',
                description: 'Sesli içerik kaydet veya AI ile oluştur',
                category: 'ses',
                inputType: 'text',
                outputType: 'audio',
                capabilities: ['voice synthesis', 'recording', 'text to speech'],
                tips: [
                    'Doğal konuşma temposu için duraklamalar ekle',
                    'Podcast formatına uygun samimi ton seç',
                    'Intro ve outro için ayrı ses ayarları'
                ]
            },
            {
                order: 3,
                name: 'Ses Düzenleme & Mastering',
                description: 'Ses temizleme, düzenleme ve son rötuşlar',
                category: 'ses',
                inputType: 'audio',
                outputType: 'audio',
                capabilities: ['audio editing', 'noise reduction', 'mastering'],
                tips: [
                    'Arka plan gürültüsünü temizle',
                    'Ses seviyelerini normalize et',
                    'Intro müziği ve jingle ekle'
                ]
            },
            {
                order: 4,
                name: 'Kapak Görseli & Dağıtım',
                description: 'Podcast kapağı ve platform dağıtımı',
                category: 'gorsel',
                inputType: 'text',
                outputType: 'image',
                capabilities: ['cover art', 'design', 'social media'],
                promptTemplate: `Podcast cover art for "[PODCAST ADI]", episode about [KONU],
modern design, bold typography, [RENK ŞEMASI], 
1:1 aspect ratio, podcast platform ready`,
                optional: true
            }
        ]
    },

    // ============================================
    // BLOG CONTENT WORKFLOW
    // ============================================
    {
        id: 'blog-content',
        name: 'Blog İçeriği Üretimi',
        nameEn: 'Blog Content Creation',
        description: 'SEO uyumlu, görsellerle zenginleştirilmiş blog yazısı',
        triggers: [
            'blog', 'blog yaz', 'blog yazısı', 'makale yaz', 'içerik üret',
            'seo content', 'article', 'blog post', 'içerik pazarlama'
        ],
        complexity: 'simple',
        estimatedDuration: '1-2 saat',
        tags: ['content', 'writing', 'marketing'],
        steps: [
            {
                order: 1,
                name: 'Araştırma & Anahat',
                description: 'Konu araştırması ve yazı yapısı oluştur',
                category: 'arastirma',
                inputType: 'text',
                outputType: 'text',
                capabilities: ['research', 'seo', 'content planning'],
                promptTemplate: `[KONU] hakkında SEO odaklı blog yazısı için:

1. Anahtar kelime araştırması
2. Rakip içerik analizi
3. Başlık önerileri (5 farklı)
4. Detaylı içerik anahattı
5. Hedef kelime sayısı: [X] kelime`
            },
            {
                order: 2,
                name: 'İçerik Yazımı',
                description: 'SEO uyumlu, akıcı blog yazısı',
                category: 'metin',
                inputType: 'text',
                outputType: 'text',
                capabilities: ['content writing', 'seo', 'copywriting'],
                promptTemplate: `Bu anahat için [X] kelimelik blog yazısı yaz:

[ANAHAT]

Gereksinimler:
- SEO için anahtar kelime yerleştirme
- Okunabilir paragraflar (3-4 cümle)
- H2 ve H3 başlıklar
- Aksiyon çağrıları
- Özet ve sonuç bölümü`
            },
            {
                order: 3,
                name: 'Görsel Oluşturma',
                description: 'Blog için öne çıkan görsel ve içerik görselleri',
                category: 'gorsel',
                inputType: 'text',
                outputType: 'image',
                capabilities: ['blog images', 'featured image', 'infographic'],
                promptTemplate: `Blog header image for article about [KONU], 
modern editorial style, [RENK ŞEMASI], professional, 
no text overlay needed --ar 16:9`,
                optional: true
            }
        ]
    },

    // ============================================
    // E-BOOK CREATION WORKFLOW
    // ============================================
    {
        id: 'ebook-creation',
        name: 'E-Kitap Oluşturma',
        nameEn: 'E-book Creation',
        description: 'Fikirden yayına hazır e-kitap',
        triggers: [
            'ebook', 'e-kitap', 'kitap yaz', 'kitap oluştur', 'dijital kitap',
            'kindle', 'epub', 'pdf kitap'
        ],
        complexity: 'complex',
        estimatedDuration: '8-20 saat',
        tags: ['writing', 'publishing', 'content'],
        steps: [
            {
                order: 1,
                name: 'Anahat & Bölüm Planı',
                description: 'Kitap yapısı ve bölümleri planla',
                category: 'metin',
                inputType: 'text',
                outputType: 'text',
                capabilities: ['outline', 'planning', 'structure'],
                promptTemplate: `[KONU] hakkında bir e-kitap yazmak istiyorum.
Hedef okuyucu: [HEDEF]
Tahmini uzunluk: [X] bölüm

Oluştur:
1. Kitap başlığı önerileri (5 adet)
2. Alt başlık
3. Bölüm başlıkları ve kısa açıklamaları
4. Her bölüm için anahtar noktalar`
            },
            {
                order: 2,
                name: 'İçerik Yazımı',
                description: 'Bölümleri detaylı şekilde yaz',
                category: 'metin',
                inputType: 'text',
                outputType: 'text',
                capabilities: ['long form writing', 'storytelling', 'educational content'],
                promptTemplate: `Bu bölüm anahattını detaylı içeriğe dönüştür:

Bölüm: [BÖLÜM ADI]
Anahtar noktalar: [NOKTALAR]

Gereksinimler:
- [X] kelime civarı
- Alt başlıklarla organize
- Örnekler ve pratik tavsiyeler ekle
- Sonraki bölüme geçiş cümlesi`
            },
            {
                order: 3,
                name: 'Kapak Tasarımı',
                description: 'Profesyonel kitap kapağı oluştur',
                category: 'gorsel',
                inputType: 'text',
                outputType: 'image',
                capabilities: ['book cover', 'design', 'typography'],
                promptTemplate: `E-book cover design for "[KİTAP ADI]", 
[TÜR] genre, [HEDEF KİTLE] audience,
professional, modern typography, [RENK ŞEMASI],
bestseller quality --ar 2:3`
            },
            {
                order: 4,
                name: 'Düzenleme & Formatlama',
                description: 'Son düzenleme ve e-kitap formatına çevirme',
                category: 'metin',
                inputType: 'text',
                outputType: 'document',
                capabilities: ['editing', 'formatting', 'epub'],
                tips: [
                    'Tutarlı başlık stilleri kullan',
                    'İçindekiler tablosu ekle',
                    'Kindle ve EPUB formatlarında test et'
                ]
            }
        ]
    },

    // ============================================
    // YOUTUBE VIDEO WORKFLOW
    // ============================================
    {
        id: 'youtube-video',
        name: 'YouTube Video Üretimi',
        nameEn: 'YouTube Video Production',
        description: 'Thumbnail\'dan SEO\'ya tam YouTube workflow',
        triggers: [
            'youtube', 'youtube video', 'youtuber', 'youtube kanalı',
            'youtube içerik', 'vlog', 'tutorial video'
        ],
        complexity: 'complex',
        estimatedDuration: '4-8 saat',
        tags: ['youtube', 'video', 'content'],
        steps: [
            {
                order: 1,
                name: 'Konu & SEO Araştırması',
                description: 'Viral potansiyelli konu ve anahtar kelimeler',
                category: 'arastirma',
                inputType: 'text',
                outputType: 'text',
                capabilities: ['seo', 'research', 'trend analysis'],
                promptTemplate: `YouTube video için [NİŞ] alanında konu araştırması:

1. Trend olan 5 video fikri
2. Her fikir için: başlık, açıklama, etiketler
3. Rakip analizi (üst 3 video)
4. Potansiyel görüntülenme tahmini
5. Hook (ilk 5 saniye) önerileri`
            },
            {
                order: 2,
                name: 'Script & Shot List',
                description: 'Video senaryosu ve çekim planı',
                category: 'metin',
                inputType: 'text',
                outputType: 'text',
                capabilities: ['script writing', 'youtube', 'hook'],
                promptTemplate: `[SÜRE] dakikalık YouTube video scripti:

Konu: [KONU]
Format: [TUTORIAL/VLOG/REVIEW/...]

Script formatı:
- HOOK (0-15 sn): İzleyiciyi yakala
- INTRO (15-30 sn): Ne öğrenecekler
- ANA İÇERİK: Bölümlere ayrılmış
- CTA: Abone ol, beğen, yorum yap
- OUTRO: Sonraki video teaser`
            },
            {
                order: 3,
                name: 'Thumbnail Tasarımı',
                description: 'Tıklanabilir, dikkat çekici thumbnail',
                category: 'gorsel',
                inputType: 'text',
                outputType: 'image',
                capabilities: ['thumbnail', 'youtube', 'click-worthy'],
                promptTemplate: `YouTube thumbnail for video about [KONU],
eye-catching, bold text "[KISA BAŞLIK]",
expressive face or reaction, bright colors,
high contrast, professional --ar 16:9`,
                tips: [
                    'Yüz ifadesi tıklama oranını artırır',
                    '3 kelimeden fazla metin kullanma',
                    'Kontrast renkler seç'
                ]
            },
            {
                order: 4,
                name: 'Video Üretimi',
                description: 'B-roll, efektler ve kurgu',
                category: 'video',
                inputType: 'text',
                outputType: 'video',
                capabilities: ['video editing', 'b-roll', 'effects'],
                tips: [
                    'Her 5-7 saniyede görsel değişim yap',
                    'Alt yazı ekle (izlenme %40 artar)',
                    'Müzik seviyesini -20dB tut'
                ]
            },
            {
                order: 5,
                name: 'SEO & Yayınlama',
                description: 'Başlık, açıklama, etiketler ve zamanlama',
                category: 'metin',
                inputType: 'text',
                outputType: 'text',
                capabilities: ['seo', 'youtube optimization', 'scheduling'],
                promptTemplate: `YouTube video SEO optimizasyonu:

Video: [VIDEO KONUSU]

Oluştur:
1. SEO uyumlu başlık (60 karakter)
2. Açıklama (timestamps dahil, 5000 karakter)
3. 15 ilgili etiket
4. Pinned yorum önerisi
5. End screen ve card stratejisi`
            }
        ]
    },

    // ============================================
    // LOGO DESIGN WORKFLOW (Simple)
    // ============================================
    {
        id: 'logo-design',
        name: 'Logo Tasarımı',
        nameEn: 'Logo Design',
        description: 'Profesyonel logo konseptinden finale',
        triggers: [
            'logo', 'logo tasarla', 'logo yap', 'logo oluştur',
            'amblem', 'marka logosu', 'şirket logosu'
        ],
        complexity: 'simple',
        estimatedDuration: '1-2 saat',
        tags: ['design', 'branding', 'logo'],
        steps: [
            {
                order: 1,
                name: 'Konsept & Brief',
                description: 'Logo gereksinimleri ve yön belirleme',
                category: 'metin',
                inputType: 'text',
                outputType: 'text',
                capabilities: ['branding', 'concept', 'brief'],
                promptTemplate: `[MARKA/ŞİRKET ADI] için logo brief'i oluştur:

Sektör: [SEKTÖR]
Hedef kitle: [HEDEF]
Rakipler: [RAKİPLER]
Tercih edilen stil: [MİNİMAL/MODERN/KLASİK/OYUNSU]

Çıktı:
1. 3 farklı konsept yönü
2. Her konsept için görsel tarifler
3. Renk önerileri
4. Tipografi stili`
            },
            {
                order: 2,
                name: 'Logo Üretimi',
                description: 'AI ile logo varyasyonları oluştur',
                category: 'gorsel',
                inputType: 'text',
                outputType: 'image',
                capabilities: ['logo design', 'vector', 'branding'],
                promptTemplate: `Minimalist logo for [MARKA ADI], [SEKTÖR],
[KONSEPT AÇIKLAMASI], 
clean lines, scalable, professional,
[RENK] color scheme, white background,
vector style --ar 1:1`,
                tips: [
                    'En az 3 farklı varyasyon oluştur',
                    'Siyah-beyaz versiyonunu da test et',
                    'Küçük boyutta okunabilirliği kontrol et'
                ]
            },
            {
                order: 3,
                name: 'Varyasyonlar & Finalizasyon',
                description: 'Renk varyasyonları ve dosya formatları',
                category: 'gorsel',
                inputType: 'image',
                outputType: 'image',
                capabilities: ['variations', 'color schemes', 'export'],
                tips: [
                    'Koyu/açık arka plan versiyonları',
                    'SVG, PNG, PDF formatları hazırla',
                    'Favicon boyutu (32x32) versiyonu'
                ]
            }
        ]
    },

    // ============================================
    // SOCIAL MEDIA CAMPAIGN WORKFLOW
    // ============================================
    {
        id: 'social-media-campaign',
        name: 'Sosyal Medya Kampanyası',
        nameEn: 'Social Media Campaign',
        description: 'Planlı, tutarlı sosyal medya içerik paketi',
        triggers: [
            'sosyal medya', 'social media', 'instagram', 'kampanya',
            'sosyal medya içerik', 'post', 'içerik takvimi'
        ],
        complexity: 'medium',
        estimatedDuration: '3-5 saat',
        tags: ['social media', 'marketing', 'content'],
        steps: [
            {
                order: 1,
                name: 'Strateji & İçerik Takvimi',
                description: 'Kampanya planı ve içerik takvimi oluştur',
                category: 'metin',
                inputType: 'text',
                outputType: 'text',
                capabilities: ['strategy', 'content calendar', 'planning'],
                promptTemplate: `[MARKA] için [SÜRE] günlük sosyal medya kampanyası:

Hedef: [HEDEF - satış/awareness/engagement]
Platform: [INSTAGRAM/TWITTER/LINKEDIN/TIKTOK]
Günlük post sayısı: [X]

Oluştur:
1. Kampanya teması ve hashtag'ler
2. İçerik sütunları (eğitici, eğlenceli, satış, UGC)
3. Günlük içerik takvimi
4. Her post için copy önerileri`
            },
            {
                order: 2,
                name: 'Görsel Şablonlar',
                description: 'Tutarlı marka görselliğinde şablonlar',
                category: 'gorsel',
                inputType: 'text',
                outputType: 'image',
                capabilities: ['social media graphics', 'templates', 'design'],
                promptTemplate: `Social media post template for [MARKA],
[PLATFORM] optimized, [RENK ŞEMASI],
modern, clean, branded, space for text,
professional marketing aesthetic --ar 1:1`
            },
            {
                order: 3,
                name: 'Carousel & Story İçerikleri',
                description: 'Carousel postlar ve hikaye görselleri',
                category: 'gorsel',
                inputType: 'text',
                outputType: 'image',
                capabilities: ['carousel', 'stories', 'swipe content'],
                promptTemplate: `Instagram carousel slide [X/5], topic: [KONU],
[MARKA] branding, educational infographic style,
clean typography, [RENK] palette, 
social media optimized --ar 1:1`,
                tips: [
                    'Carousel\'de 8-10 slide ideal',
                    'Her slide tek bir fikir',
                    'Son slide CTA içermeli'
                ]
            },
            {
                order: 4,
                name: 'Copywriting & Hashtag\'ler',
                description: 'Tüm postlar için metin ve hashtag\'ler',
                category: 'metin',
                inputType: 'text',
                outputType: 'text',
                capabilities: ['copywriting', 'hashtags', 'engagement'],
                promptTemplate: `[X] adet [PLATFORM] postu için copy yaz:

Her post için:
1. Hook (ilk satır - dikkat çekici)
2. Ana mesaj (değer/bilgi)
3. CTA (call to action)
4. 20-30 alakalı hashtag (niche + genel)
5. Emoji kullanımı`
            }
        ]
    },

    // ============================================
    // PRODUCT PHOTOGRAPHY WORKFLOW
    // ============================================
    {
        id: 'product-photography',
        name: 'Ürün Fotoğrafçılığı',
        nameEn: 'Product Photography',
        description: 'E-ticaret kalitesinde ürün görselleri',
        triggers: [
            'ürün fotoğraf', 'product photo', 'e-ticaret görsel',
            'amazon', 'ürün çekim', 'product shot', 'ürün görseli'
        ],
        complexity: 'simple',
        estimatedDuration: '1-3 saat',
        tags: ['ecommerce', 'product', 'photography'],
        steps: [
            {
                order: 1,
                name: 'Arka Plan Kaldırma',
                description: 'Temiz, beyaz arka plan oluştur',
                category: 'gorsel',
                inputType: 'image',
                outputType: 'image',
                capabilities: ['background removal', 'cutout', 'clean'],
                tips: [
                    'Amazon için beyaz arka plan zorunlu',
                    'Gölge ekleme opsiyonel (floating look önler)',
                    'En az 1000x1000px çözünürlük'
                ]
            },
            {
                order: 2,
                name: 'Lifestyle Kompozisyon',
                description: 'Ürünü kullanım senaryosunda göster',
                category: 'gorsel',
                inputType: 'image',
                outputType: 'image',
                capabilities: ['lifestyle', 'composition', 'scene generation'],
                promptTemplate: `Product lifestyle shot: [ÜRÜN] in use,
[SENARYO - mutfakta/ofiste/dışarıda],
natural lighting, professional photography,
aspirational, high-end aesthetic --ar 4:3`,
                tips: [
                    'Hedef kitleyi yansıtan ortam seç',
                    'Ürün always focal point olmalı',
                    '3-5 farklı lifestyle varyasyonu oluştur'
                ]
            },
            {
                order: 3,
                name: 'Infografik & Özellik Görseli',
                description: 'Ürün özelliklerini vurgulayan görsel',
                category: 'gorsel',
                inputType: 'image',
                outputType: 'image',
                capabilities: ['infographic', 'product features', 'callouts'],
                tips: [
                    'Maksimum 5 anahtar özellik göster',
                    'İkonlar kullan, çok metin yazma',
                    'Oklar ve çizgilerle işaretle'
                ]
            }
        ]
    },

    // ============================================
    // MUSIC PRODUCTION WORKFLOW
    // ============================================
    {
        id: 'music-production',
        name: 'Müzik Prodüksiyon',
        nameEn: 'Music Production',
        description: 'Orijinal müzik parçası oluşturma',
        triggers: [
            'müzik', 'şarkı', 'music', 'beat', 'melodi',
            'müzik yap', 'şarkı yaz', 'jingle', 'soundtrack'
        ],
        complexity: 'medium',
        estimatedDuration: '2-4 saat',
        tags: ['music', 'audio', 'creative'],
        steps: [
            {
                order: 1,
                name: 'Konsept & Şarkı Sözleri',
                description: 'Tema, mood ve lyrics oluştur',
                category: 'metin',
                inputType: 'text',
                outputType: 'text',
                capabilities: ['songwriting', 'lyrics', 'creative writing'],
                promptTemplate: `[TÜR] tarzında şarkı sözleri yaz:

Tema: [TEMA]
Mood: [MUTLU/HÜZÜNLÜ/ENERJİK/ROMANTIK]
Yapı: Verse - Chorus - Verse - Chorus - Bridge - Chorus

Gereksinimler:
- Akılda kalıcı hook/nakarat
- Kafiye şeması tutarlı
- [DİL] dilinde
- Yaklaşık [X] dakika`
            },
            {
                order: 2,
                name: 'Melodi & Beat Üretimi',
                description: 'AI ile müzik oluştur',
                category: 'ses',
                inputType: 'text',
                outputType: 'audio',
                capabilities: ['music generation', 'beat making', 'melody'],
                promptTemplate: `[TÜR] style instrumental track,
[TEMPO] BPM, [KEY] key,
[MOOD] atmosphere, [ENSTRÜMANlar],
professional mix, radio ready`,
                tips: [
                    'Suno veya Udio kullan',
                    'Lyrics ile birlikte generate et',
                    'Birkaç varyasyon dene'
                ]
            },
            {
                order: 3,
                name: 'Ses Düzenleme',
                description: 'Mix, master ve son dokunuşlar',
                category: 'ses',
                inputType: 'audio',
                outputType: 'audio',
                capabilities: ['mixing', 'mastering', 'audio editing'],
                tips: [
                    'Loudness standardı: -14 LUFS (Spotify)',
                    'Reference track ile karşılaştır',
                    'WAV ve MP3 formatlarında export'
                ]
            },
            {
                order: 4,
                name: 'Cover Art',
                description: 'Albüm/single kapak görseli',
                category: 'gorsel',
                inputType: 'text',
                outputType: 'image',
                capabilities: ['album art', 'cover design', 'music visual'],
                promptTemplate: `Album cover art for "[ŞARKI ADI]",
[TÜR] music genre aesthetic,
[MOOD] atmosphere, artistic, professional,
minimal text, streaming platform ready --ar 1:1`,
                optional: true
            }
        ]
    },

    // ============================================
    // PRESENTATION WORKFLOW
    // ============================================
    {
        id: 'presentation',
        name: 'Sunum Oluşturma',
        nameEn: 'Presentation Creation',
        description: 'Etkileyici ve profesyonel sunum',
        triggers: [
            'sunum', 'presentation', 'slayt', 'powerpoint',
            'pitch deck', 'keynote', 'prezentasyon'
        ],
        complexity: 'simple',
        estimatedDuration: '1-3 saat',
        tags: ['presentation', 'business', 'slides'],
        steps: [
            {
                order: 1,
                name: 'İçerik & Akış Planı',
                description: 'Sunum yapısı ve ana mesajlar',
                category: 'metin',
                inputType: 'text',
                outputType: 'text',
                capabilities: ['presentation', 'outline', 'storytelling'],
                promptTemplate: `[KONU] hakkında [X] slaytlık sunum için içerik:

Hedef kitle: [HEDEF]
Süre: [X] dakika
Amaç: [İKNA/BİLGİLENDİR/EĞİT]

Her slayt için:
- Başlık
- Ana mesaj (tek cümle)
- Destekleyici noktalar (bullet)
- Görsel önerisi`
            },
            {
                order: 2,
                name: 'Slayt Tasarımı',
                description: 'Görsel olarak etkileyici slaytlar',
                category: 'gorsel',
                inputType: 'text',
                outputType: 'image',
                capabilities: ['slide design', 'presentation graphics', 'infographic'],
                promptTemplate: `Presentation slide design, topic: [KONU],
modern corporate style, [RENK ŞEMASI],
clean layout, data visualization,
professional, minimal text --ar 16:9`,
                tips: [
                    'Bir slayt = bir fikir',
                    'Maksimum 6 bullet point',
                    'Büyük görseller, az metin'
                ]
            },
            {
                order: 3,
                name: 'Son Düzenleme & Export',
                description: 'Geçişler, animasyonlar ve dosya',
                category: 'gorsel',
                inputType: 'image',
                outputType: 'document',
                capabilities: ['presentation', 'animation', 'export'],
                tips: [
                    'Subtle animasyonlar yeterli',
                    'PDF backup al',
                    'Fontları embed et'
                ]
            }
        ]
    },

    // ============================================
    // TRANSLATION WORKFLOW
    // ============================================
    {
        id: 'translation-localization',
        name: 'Çeviri & Lokalizasyon',
        nameEn: 'Translation & Localization',
        description: 'Profesyonel çeviri ve kültürel uyarlama',
        triggers: [
            'çeviri', 'translation', 'localization', 'lokalizasyon',
            'tercüme', 'dil çeviri', 'metin çevir'
        ],
        complexity: 'simple',
        estimatedDuration: '1-4 saat',
        tags: ['translation', 'language', 'localization'],
        steps: [
            {
                order: 1,
                name: 'Kaynak Analizi',
                description: 'Metin analizi ve terminoloji çıkarma',
                category: 'metin',
                inputType: 'text',
                outputType: 'text',
                capabilities: ['analysis', 'terminology', 'glossary'],
                promptTemplate: `Bu metni çeviri için analiz et:

[METİN]

Çıktı:
1. Teknik terimler ve önerilen çeviriler
2. Kültürel referanslar
3. Ton ve stil notları
4. Potansiyel zorluklar`
            },
            {
                order: 2,
                name: 'Çeviri',
                description: 'Ana çeviri işlemi',
                category: 'metin',
                inputType: 'text',
                outputType: 'text',
                capabilities: ['translation', 'language', 'localization'],
                promptTemplate: `Bu metni [KAYNAK DİL]'den [HEDEF DİL]'e çevir:

[METİN]

Gereksinimler:
- Doğal ve akıcı dil
- Terminoloji tutarlılığı
- Ton korunmalı: [FORMAL/INFORMAL/TEKNİK]
- Kültürel uyarlama gerektiğinde yap`
            },
            {
                order: 3,
                name: 'Review & QA',
                description: 'Kalite kontrol ve son düzeltmeler',
                category: 'metin',
                inputType: 'text',
                outputType: 'text',
                capabilities: ['proofreading', 'qa', 'editing'],
                tips: [
                    'Native speaker review önerilir',
                    'Terminoloji tutarlılığını kontrol et',
                    'Biçimlendirme korunmalı'
                ]
            }
        ]
    },

    // ============================================
    // DATA DASHBOARD WORKFLOW
    // ============================================
    {
        id: 'data-dashboard',
        name: 'Veri Dashboard Oluşturma',
        nameEn: 'Data Dashboard Creation',
        description: 'Veriden görsel dashboard',
        triggers: [
            'dashboard', 'veri analizi', 'data visualization',
            'grafik', 'rapor', 'analytics', 'bi'
        ],
        complexity: 'medium',
        estimatedDuration: '2-5 saat',
        tags: ['data', 'analytics', 'visualization'],
        steps: [
            {
                order: 1,
                name: 'Veri Analizi & Insights',
                description: 'Veriyi analiz et ve önemli noktaları çıkar',
                category: 'veri',
                inputType: 'data',
                outputType: 'text',
                capabilities: ['data analysis', 'statistics', 'insights'],
                promptTemplate: `Bu veri setini analiz et:

[VERİ veya AÇIKLAMA]

Çıktı:
1. Temel metrikler ve istatistikler
2. Önemli trendler
3. Anomaliler veya dikkat çekici noktalar
4. Dashboard için görselleştirme önerileri
5. KPI tanımları`
            },
            {
                order: 2,
                name: 'Görselleştirme Tasarımı',
                description: 'Grafik ve chart tasarımları',
                category: 'veri',
                inputType: 'text',
                outputType: 'image',
                capabilities: ['charts', 'graphs', 'data viz'],
                tips: [
                    'Doğru grafik tipi seç (trend=line, karşılaştırma=bar)',
                    'Renk kodlaması tutarlı olsun',
                    'Gereksiz dekorasyon ekleme (data-ink ratio)'
                ]
            },
            {
                order: 3,
                name: 'Dashboard Layout',
                description: 'Tüm elementleri bir araya getir',
                category: 'gorsel',
                inputType: 'image',
                outputType: 'document',
                capabilities: ['dashboard', 'layout', 'design'],
                promptTemplate: `Dashboard layout design, [KONU] analytics,
clean modern style, dark theme,
KPI cards on top, main chart center,
supporting charts below, professional BI aesthetic --ar 16:9`,
                tips: [
                    'En önemli metrikler üstte',
                    'Filtreleme alanı kolay erişilebilir',
                    'Responsive tasarım düşün'
                ]
            }
        ]
    },

    // ============================================
    // MOBILE APP DESIGN WORKFLOW
    // ============================================
    {
        id: 'mobile-app-design',
        name: 'Mobil Uygulama Tasarımı',
        nameEn: 'Mobile App Design',
        description: 'UI/UX tasarımından prototipe',
        triggers: [
            'mobil uygulama', 'app design', 'uygulama tasarla',
            'mobile app', 'ios app', 'android app', 'ui design'
        ],
        complexity: 'complex',
        estimatedDuration: '5-10 saat',
        tags: ['mobile', 'ui', 'ux', 'design'],
        steps: [
            {
                order: 1,
                name: 'UX Araştırma & Wireframe',
                description: 'Kullanıcı akışları ve iskelet tasarım',
                category: 'metin',
                inputType: 'text',
                outputType: 'text',
                capabilities: ['ux research', 'wireframe', 'user flow'],
                promptTemplate: `[UYGULAMA ADI] için UX dökümanı:

Uygulama amacı: [AMAÇ]
Hedef kullanıcı: [PERSONA]
Ana özellikler: [ÖZELLİKLER]

Çıktı:
1. User persona
2. Ana kullanıcı akışları (user flows)
3. Ekran listesi ve hiyerarşisi
4. Her ekran için wireframe açıklaması
5. Navigation yapısı`
            },
            {
                order: 2,
                name: 'UI Design System',
                description: 'Renk, tipografi, component kütüphanesi',
                category: 'gorsel',
                inputType: 'text',
                outputType: 'image',
                capabilities: ['design system', 'ui components', 'style guide'],
                promptTemplate: `Mobile app design system for [UYGULAMA],
[STIL - minimal/bold/playful],
color palette, typography scale,
button styles, input fields, cards,
iOS/Android guidelines compliant --ar 3:4`
            },
            {
                order: 3,
                name: 'Ekran Tasarımları',
                description: 'Tüm ekranların final tasarımı',
                category: 'gorsel',
                inputType: 'text',
                outputType: 'image',
                capabilities: ['mobile ui', 'screen design', 'app screens'],
                promptTemplate: `Mobile app screen design: [EKRAN ADI],
[UYGULAMA] app, [FONKSİYON],
modern UI, [RENK ŞEMASI],
iOS style, clean, intuitive --ar 9:19`,
                tips: [
                    'Touch target minimum 44px',
                    'Safe area\'lere dikkat',
                    'Gesture-friendly tasarım'
                ]
            },
            {
                order: 4,
                name: 'Prototip & Handoff',
                description: 'Tıklanabilir prototip ve geliştirici dökümanı',
                category: 'gorsel',
                inputType: 'image',
                outputType: 'document',
                capabilities: ['prototype', 'handoff', 'specs'],
                tips: [
                    'Figma veya Adobe XD kullan',
                    'Tüm state\'leri (hover, active, disabled) göster',
                    'Spacing ve sizing spec\'leri ekle'
                ]
            }
        ]
    }
];

/**
 * Find matching workflow template based on user intent
 */
export function findMatchingTemplate(
    query: string,
    workflowHints?: string[]
): WorkflowTemplate | null {
    const lowerQuery = query.toLowerCase();
    const hints = workflowHints?.map(h => h.toLowerCase()) || [];

    // Score each template
    const scored = WORKFLOW_TEMPLATES.map(template => {
        let score = 0;

        // Check trigger matches
        for (const trigger of template.triggers) {
            if (lowerQuery.includes(trigger.toLowerCase())) {
                score += 10;
            }
            // Partial match
            const triggerWords = trigger.toLowerCase().split(' ');
            for (const word of triggerWords) {
                if (word.length > 3 && lowerQuery.includes(word)) {
                    score += 3;
                }
            }
        }

        // Check workflow hints
        for (const hint of hints) {
            if (template.triggers.some(t => t.toLowerCase().includes(hint))) {
                score += 5;
            }
            if (template.tags.some(t => t.toLowerCase().includes(hint))) {
                score += 3;
            }
        }

        return { template, score };
    });

    // Sort by score and return best match
    scored.sort((a, b) => b.score - a.score);

    // Return template only if score is meaningful
    if (scored[0] && scored[0].score >= 5) {
        return scored[0].template;
    }

    return null;
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

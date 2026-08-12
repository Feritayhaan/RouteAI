#!/usr/bin/env node
/**
 * description/bestFor icerik gocu — Faz 1
 *
 * scripts/migrate-locale.mjs semayi {tr, en}'e tasidi ama icerigi tasimadi.
 * Bu script icerigi duzeltir:
 *
 *   JSON'a YAZILIR (--apply ile):
 *     1. ASCII-duz Turkce description.tr  -> sozluk tabanli diakritik onarimi
 *     2. Yanlislikla tr slotunda duran Ingilizce -> description.en'e TASINIR,
 *        description.tr'ye TR_TRANSLATIONS'taki Turkce karsilik yazilir
 *
 *   SADECE REVIEW DOSYASINA (JSON'a dokunulmaz):
 *     3. description.en onerileri (zaten Turkce olan kayitlar icin)
 *     4. bestFor.tr onerileri (96 kaydin hepsi)
 *     5. bestFor.en icindeki Turkce token kirliligi
 *
 * Varsayilan DRY-RUN. Yazmak icin --apply ekleyin.
 *
 * Sema dogrulamasi (lib/validations/tool.ts) ancak TS loader ile calisir:
 *   node --loader ./lib/__tests__/ts-loader.mjs scripts/fix-descriptions.mjs --apply
 * Loader'siz calistirilirsa dogrulama atlanir (script yine calisir).
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'lib', 'tools-database.json');
const BACKUP_PATH = join(__dirname, '..', 'lib', 'tools-database.prefix.backup.json');
const REVIEW_PATH = join(__dirname, '..', 'data', 'description-review.md');

const APPLY = process.argv.includes('--apply');

// ============================================================
// 1. ASCII -> Turkce sozluk
// Sadece cakismasiz eslemeler. Supheli olanlar (ari/sari gibi, kelime
// gercekten ASCII-duz mu yoksa Ingilizce mi belli olmayanlar) BILEREK yok:
// dokunulmayan kelimeler review dosyasinda listelenir.
// ============================================================
const ASCII_TR = {
    acik: 'açık',
    amacli: 'amaçlı',
    analizi: 'analizi',
    araci: 'aracı',
    arastirma: 'araştırma',
    asistani: 'asistanı',
    cok: 'çok',
    dogrulugu: 'doğruluğu',
    duzenleme: 'düzenleme',
    editoru: 'editörü',
    endustri: 'endüstri',
    fiyatli: 'fiyatlı',
    fotogercekci: 'fotogerçekçi',
    gelismis: 'gelişmiş',
    gercekci: 'gerçekçi',
    gorsel: 'görsel',
    gorsellestirme: 'görselleştirme',
    guclu: 'güçlü',
    guvenli: 'güvenli',
    hizli: 'hızlı',
    icerigi: 'içeriği',
    icin: 'için',
    literatur: 'literatür',
    mukemmel: 'mükemmel',
    olusturma: 'oluşturma',
    ozellesmis: 'özelleşmiş',
    ozellestirilebilir: 'özelleştirilebilir',
    ozellikli: 'özellikli',
    standardi: 'standardı',
    tabanli: 'tabanlı',
    takimlar: 'takımlar',
    taramasi: 'taraması',
    tasarim: 'tasarım',
    tasarimi: 'tasarımı',
    uretici: 'üretici',
    uretim: 'üretim',
    uretimi: 'üretimi',
    ustun: 'üstün',
    yuksek: 'yüksek',
};

// Kesme isaretli ozel durum: \b sinirlari apostrofla calismadigi icin ayri.
const LITERAL_FIXES = {
    "Google'in": "Google'ın",
};

// ============================================================
// 2. Ingilizce-in-tr kayitlar icin Turkce karsiliklar (id -> tr)
// Elle yazildi; script LLM cagirmaz, ayni girdi ayni ciktiyi verir.
// ============================================================
const TR_TRANSLATIONS = {
    'copyai': 'Özel AI ajanları, iş akışı otomasyonu ve kurumsal odaklı içerik üretimi',
    'claude-opus-45': 'Sınıfının en iyi kodlama modeli (%80,9 SWE-bench), 30 saatlik otonom görevler, %65 daha az token',
    'gemini-3-pro': '1M token bağlam, WebDev Arena\'da 1487 Elo, üst düzey akıl yürütme ve Deep Think modu',
    'flux2-black-forest-labs': '32B parametre, 4MP görsel düzenleme, 10 referans görsele kadar destek ve güçlü metin render\'ı',
    'gpt-51': '2-3 kat daha hızlı, %50 daha az token, %76,3 SWE-bench ve uyarlanabilir akıl yürütme',
    'gpt-51-codex-max': '24 saatlik görev yürütme, bağlam sıkıştırma ve milyonlarca token\'lık bağlam',
    'grok-41': '1483 Elo (Thinking), %4,22 halüsinasyon oranı, EQ-Bench3 birincisi ve uçtan uca şifreleme',
    'google-antigravity-ai-ide': 'Ajan öncelikli IDE, çoklu ajan yönetimi için Manager görünümü, Gemini 3/Claude/GPT-OSS desteği',
    'ernie-50-baidu': '2,4T parametre, doğuştan omni-modal, LMSYS Arena ikincisi ve güçlü görsel benchmark sonuçları',
    'world-labs-marble': 'İlk ticari 3D dünya modeli, Chisel editörü, Gaussian splat/mesh dışa aktarımı',
    'elevenlabs-scribe-v2-realtime': '150ms gecikme, %93,5 FLEURS doğruluğu, 90+ dil desteği ve saatlik 0,40 dolar',
    'notebooklm-deep-research': 'Otonom araştırma ajanı, yüzlerce siteyi tarar ve kapsamlı raporlar üretir',
    'microsoft-mmctagent': 'Çoklu ajanlı video akıl yürütme, saatler süren video analizi, Planner-Critic mimarisi',
    'google-deepmind-sima-2': 'Gemini destekli oyun ajanı, deneme yanılma ile öğrenir, metin/ses/çizim ile kontrol',
    'jasper-ai-image-suite': 'Toplu arka plan kaldırma/değiştirme, uncrop, 16x büyütme ve ürün görseli ölçekleme',
    'perplexity-ai-promax': 'Gemini 3 Pro, Kimi 2 ve Grok 4.1 entegrasyonu, görev planlama için Spaces, 8 saniyelik video',
    'claude-haiku-45': 'Sonnet 4.5 performansının %90\'ı, en hızlı model ve alt ajan orkestrasyonu',
    'openai-atlas-ai-browser': 'AI yerlisi Chromium tarayıcı, görev otomasyonu için Agent Mode ve Ask ChatGPT yan paneli',
    'synthesia-30': 'Etkileşimli video ajanları, canlı diyalog, 50+ avatar ve 30+ dilde dublaj',
    'suno-v45-all-free-tier': 'Ücretsiz katmanda profesyonel seviye model, daha hızlı üretim ve gelişmiş vokaller',
    'udio-umg-licensed': 'UMG lisans anlaşması, Voices özelliği ve yasal lisanslı eğitim verisi',
    'github-copilot-agent-mode': 'Otonom eş programcı olarak ajan modu; GPT-5/Claude 4.5/Gemini 2.5 Pro/Grok desteği',
    'n8n-ai-workflow-builder': 'Doğal dilden otomasyona, yerleşik veri tabloları ve yerel Python çalıştırıcı',
    'qwen3-vl-4b8b': 'Yoğun ve kompakt modeller, FP8 kuantizasyon, uç cihaz dostu ve GUI kontrolü',
    'google-gemini-for-home': 'Google Asistan\'ın yerini alan, bağlam farkındalıklı konuşma tabanlı akıllı ev AI\'ı',
    'google-veo-31': 'Yerel ses üretimi, çok çekimli sahne kurgusu ve karakter tutarlılığı',
    'adcreativeai': 'Kampanyaya özel reklam kreatifi üretimi ve dönüşüm odaklı tasarımlar',
    'claude-sonnet-45': 'En iyi kodlama modeli (SWE-bench), azaltılmış halüsinasyon ve üst düzey performans',
    'replit-agent': '200 dakika otonom geliştirme, veritabanı entegrasyonu ve anında dağıtım',
    'windsurf-codeium': 'Sonsuza dek ücretsiz katman, IDE bağımsız çalışma ve kalıcı bağlam belleği',
    'arc-browser-ai-arc-max': 'Çoklu sekme bağlam farkındalığı, otomatik araştırma ve AI entegrasyonu',
    'opusclip-video-repurposing': 'Otomatik kısa video çıkarma, altyazı ve çoklu platform optimizasyonu',
    'fathom-meeting-assistant': 'Gerçek zamanlı toplantı notları, otomatik aksiyon maddeleri ve CRM entegrasyonu',
    'amazon-lens-live': 'Gerçek zamanlı görsel arama, ürün tanıma ve alışveriş entegrasyonu',
    'apple-intelligence': 'Canlı Çeviri, ChatGPT destekli Genmoji ve sistem geneline yayılmış AI entegrasyonu',
    'base44-no-code-app-platform': 'GPT-5 sohbet entegrasyonu, alan adı satın alma ve sürüm kontrolü',
    'gemini-robotics-15': 'Fiziksel ajanlar çağı, robotlar arası öğrenme ve karmaşık çok adımlı görevler',
    'anyword-copy-ai': 'Performans skorlaması, uyumluluk kontrolü ve pazarlama odaklı metin yazımı',
    'writesonic-seo-content': 'SERP tabanlı taslak üretici, uzun form editör ve SEO özellikleri',
    'clickup-brain-project-ai': 'Proje düzeyinde AI otomasyonu, görev önerileri ve iş akışı optimizasyonu',
    'simplified-content-and-design': 'Tek tıkla içerik şablonları ve entegre metin yazarlığı',
    'murf-ai': 'Profesyonel ses sentezi ve çok dilli destek',
    'attio-sales-ai-crm': 'Anlaşma önceliklendirme için yerleşik AI\'a sahip CRM',
    'teal-resume-builder-ai': 'AI ile özgeçmiş ve ATS optimizasyonu',
    'kling-ai-21': '3D uzamsal-zamansal dikkat, 1080p Master modu ve en iyi görselden videoya dönüşüm',
    'pika-25': 'Ultra gerçekçi üretimler, gelişmiş fizik ve yüksek prompt uyumu',
    'luma-dream-machine-ray2': 'Talimatla düzenleme, Kamera Hareketi Konseptleri ve 4K büyütme',
    'runway-gen-3-alpha': 'Gelişmiş SDK, ileri kamera kontrolü ve prodüksiyon odaklı özellikler',
    'gemini-3-pro-image': '4K üretim, okunaklı metin render\'ı ve Google Search ile temellendirme',
    'ideogram-30': 'Görsel içi metin render\'ında en iyisi, stil referansı kontrolü ve 4,3B stil',
    'google-deep-research': 'Genişletilmiş çok adımlı analiz, temellendirilmiş akıl yürütme ve gelişmiş kaynakça',
    'snapchat-perplexity-integration': 'Snapchat içinde Perplexity AI; 400M dolarlık anlaşma, 1 milyar kullanıcıya erişim',
    'microsoft-copilot-pro': 'Copilot Chat\'te varsayılan GPT-5 ve Work IQ zeka katmanı',
    'google-vertex-ai-agent-builder': 'ADK API (7M+ indirme), Agent Engine, yerel kimlikler ve Agent Garden',
    'replit-ai-integrations': '300+ AI modeline API anahtarsız anında erişim',
    'mistral-large-21': 'Spekülatif düzenleme, kaynakçalı web araması ve Canvas',
    'pixtral-large-mistral': 'Belge ve görsel anlamada üst düzey model',
    'meta-devmate': 'Rakip modelleri (Claude) entegre eden açık kaynak geliştirici asistanı',
    'grok-imagine-v09-xai': 'Konuşan karakterler ve arka plan müziği içeren kısa videolar',
    'ibm-granite-40-nano': 'Cihaz üzerinde çalışan yerel AI modelleri',
    'adobe-firefly-image-model-5': 'Stüdyo kalitesinde üretken ses/video ve kurumsal entegrasyon',
    'gemini-25-computer-use': 'Arayüzlerle doğrudan etkileşen, web sitelerinde gezinen ve form dolduran AI ajanları',
    'google-pixel-drop-ai-features': 'Generative AI Nano remix, 3D figürinler ve Dolandırıcılık Tespiti',
    'comma-ai-openpilot': '325+ araç için Seviye 2 otonom sürüş, tek seferlik ücret',
};

// ============================================================
// 3. description.en onerileri — SADECE REVIEW (id -> en)
// Zaten Turkce olan kayitlarin Ingilizce karsiligi.
// ============================================================
const EN_SUGGESTIONS = {
    'midjourney-v7': 'AI for cinematic-quality art and image generation',
    'chatgpt-gpt-4o-image': 'Best AI for accurate in-image text and UI design',
    'dall-e-3': 'Photorealistic image generation integrated with ChatGPT',
    'google-imagen-4': 'Google AI for fast, realistic image generation',
    'adobe-firefly-image-4': 'Brand-safe AI image editing and creation',
    'stable-diffusion-xl': 'Open-source, customizable image generation',
    'flux1-pro': 'Fast, high-quality image generation',
    'leonardo-ai': 'Affordable AI image creation for teams',
    'ideogram-20': 'AI image tool with excellent text rendering',
    'canva-ai-magic-studio': 'Design and editing platform with 25+ AI features',
    'chatgpt-gpt-5': 'The most capable general-purpose AI chat and writing assistant',
    'claude-ai-claude-4': 'Superior AI for long-form text analysis and writing',
    'jasper-ai': 'AI writing tool specialized for marketing content',
    'github-copilot': 'AI code completion tool from Microsoft and OpenAI',
    'claude-code-anthropic': 'Terminal-based tool for deep code analysis',
    'elevenlabs': 'The most realistic AI voice cloning and TTS platform',
    'sora-2-openai': 'The most advanced AI video generation model',
    'google-veo-3': 'Fast, high-quality AI video generation',
    'perplexity-ai': 'AI-powered search and research engine',
    'elicit-ai': 'Academic paper analysis and literature review',
    'microsoft-power-bi': 'AI-powered BI tool for the Microsoft ecosystem',
    'gemini-25-pro': "Google's multimodal AI platform",
    'cursor': 'Advanced AI code editor built on VS Code',
    'murfai': 'Professional AI voiceover platform',
    'tableau': 'Industry-standard data visualization platform',
    'gamma-ai': 'AI-powered presentation, document, and website creation',
    'beautifulai': 'Smart presentation design with automatic layout',
    'tome': 'Create AI-powered storytelling presentations',
    'suno-ai': 'AI music generator that creates full songs from text',
    'udio': 'High-quality AI music generation',
    'runway-gen-3': 'Text-to-video and video editing AI tool',
    'pika-labs': 'Creative AI video generation and animation',
};

// ============================================================
// 4. bestFor.tr onerileri icin EN -> TR terim sozlugu — SADECE REVIEW
// Karsiligi olmayan token'lar review'da "?" ile isaretlenir.
// ============================================================
const BESTFOR_GLOSSARY = {
    'coding': 'kodlama', 'research': 'araştırma', 'text-to-video': 'metinden videoya',
    'reasoning': 'akıl yürütme', 'image-to-video': 'görselden videoya', 'fast generation': 'hızlı üretim',
    'analysis': 'analiz', 'presentation': 'sunum', 'presentations': 'sunum', 'pitch deck': 'yatırımcı sunumu',
    'agents': 'ajanlar', 'video-editing': 'video düzenleme', 'text rendering': 'metin render',
    'high quality': 'yüksek kalite', 'marketing': 'pazarlama', 'Google integration': 'Google entegrasyonu',
    'copywriting': 'metin yazarlığı', 'dubbing': 'dublaj', 'storytelling': 'hikaye anlatımı',
    'one-pager': 'tek sayfalık sunum', 'music': 'müzik', 'song': 'şarkı', 'soundtrack': 'film müziği',
    'video': 'video', 'video generation': 'video üretimi', 'computer-use': 'bilgisayar kullanımı',
    'conversation': 'sohbet', 'agentic-coding': 'ajan tabanlı kodlama', 'web-research': 'web araştırması',
    'video-generation': 'video üretimi', 'music-generation': 'müzik üretimi', 'voice-generation': 'ses üretimi',
    'workflow-automation': 'iş akışı otomasyonu', 'debugging': 'hata ayıklama', 'image-generation': 'görsel üretimi',
    'artistic images': 'sanatsal görsel', 'cinematic visuals': 'sinematik görsel', 'concept art': 'konsept sanat',
    'poster design': 'poster tasarımı', 'character design': 'karakter tasarımı', 'comic art': 'çizgi roman',
    'UI wireframes': 'arayüz taslağı', 'diagrams': 'diyagram', 'signage': 'tabela', 'infographic': 'infografik',
    'photorealistic images': 'fotogerçekçi görsel', 'precise prompts': 'hassas prompt',
    'text integration': 'metin entegrasyonu', 'product shots': 'ürün fotoğrafı', 'photorealism': 'fotogerçekçilik',
    'Google ecosystem': 'Google ekosistemi', 'brand-safe editing': 'marka güvenli düzenleme',
    'commercial use': 'ticari kullanım', 'Adobe integration': 'Adobe entegrasyonu',
    'high-volume generation': 'toplu üretim', 'customization': 'özelleştirme', 'offline use': 'çevrimdışı kullanım',
    'batch processing': 'toplu işleme', 'team collaboration': 'takım çalışması', 'custom models': 'özel model',
    'game assets': 'oyun varlıkları', 'posters': 'poster', 'typography': 'tipografi', 'logos': 'logo',
    'social media': 'sosyal medya', 'branding': 'marka kimliği', 'content writing': 'içerik yazımı',
    'creative writing': 'yaratıcı yazım', 'creative-writing': 'yaratıcı yazım', 'long documents': 'uzun belge',
    'safety': 'güvenlik', 'multimodal tasks': 'çok modlu görevler', 'code': 'kod',
    'marketing copy': 'pazarlama metni', 'SEO content': 'SEO içeriği', 'brand voice': 'marka dili',
    'campaigns': 'kampanya', 'social-media-content': 'sosyal medya içeriği', 'code completion': 'kod tamamlama',
    'function generation': 'fonksiyon üretimi', 'test cases': 'test senaryosu', 'documentation': 'dokümantasyon',
    'multi-file edits': 'çoklu dosya düzenleme', 'codebase queries': 'kod tabanı sorgulama',
    'AI agent mode': 'AI ajan modu', 'terminal coding': 'terminalde kodlama', 'code explanation': 'kod açıklama',
    'documentation generation': 'dokümantasyon üretimi', 'voice cloning': 'ses klonlama',
    'audiobooks': 'sesli kitap', 'voice agents': 'sesli ajan', 'voiceovers': 'seslendirme',
    'e-learning': 'uzaktan eğitim', 'ads': 'reklam', 'cinematic videos': 'sinematik video',
    'filmmaking': 'film yapımı', 'fact-checking': 'doğruluk kontrolü', 'cited answers': 'kaynaklı cevap',
    'deep research': 'derin araştırma', 'literature review': 'literatür taraması',
    'data extraction': 'veri çıkarma', 'systematic reviews': 'sistematik derleme', 'enterprise BI': 'kurumsal BI',
    'data visualization': 'veri görselleştirme', 'dashboards': 'gösterge paneli', 'analytics': 'analitik',
    'Microsoft users': 'Microsoft kullanıcıları', 'business intelligence': 'iş zekası',
    'corporate reporting': 'kurumsal raporlama', 'proposal': 'teklif', 'business presentation': 'iş sunumu',
    'portfolio': 'portfolyo', 'beat': 'ritim', 'jingle': 'jingle', 'production': 'prodüksiyon', 'audio': 'ses',
    'montaj': 'montaj', 'efekt': 'efekt', 'b-roll': 'b-roll', 'animation': 'animasyon',
    'social video': 'sosyal medya videosu', 'spreadsheets': 'elektronik tablo',
    'multimodal-reasoning': 'çok modlu akıl yürütme', 'vibe-coding': 'vibe coding',
    'video-analysis': 'video analizi', 'text-to-image': 'metinden görsele', 'image-editing': 'görsel düzenleme',
    'multi-reference': 'çoklu referans', 'adaptive-reasoning': 'uyarlanabilir akıl yürütme',
    'long-horizon-coding': 'uzun soluklu kodlama', 'multi-step-refactoring': 'çok adımlı refactor',
    'real-time-search': 'gerçek zamanlı arama', 'agentic-development': 'ajan tabanlı geliştirme',
    'multi-agent-coding': 'çoklu ajanlı kodlama', 'autonomous-debugging': 'otonom hata ayıklama',
    'multimodal-generation': 'çok modlu üretim', 'video-understanding': 'video anlama',
    '3d-world-generation': '3B dünya üretimi', 'text-to-3d': 'metinden 3B\'ye', 'image-to-3d': 'görselden 3B\'ye',
    'vr-content': 'VR içeriği', 'speech-to-text': 'konuşmadan metne',
    'real-time-transcription': 'gerçek zamanlı transkripsiyon', 'multilingual-stt': 'çok dilli konuşma tanıma',
    'autonomous-research': 'otonom araştırma', 'document-synthesis': 'belge sentezi',
    'video-reasoning': 'video akıl yürütme', 'long-video-analysis': 'uzun video analizi',
    'multi-agent-reasoning': 'çoklu ajanlı akıl yürütme', '3d-world-navigation': '3B dünyada gezinme',
    'autonomous-learning': 'otonom öğrenme', 'game-agents': 'oyun ajanları',
    'bulk-image-editing': 'toplu görsel düzenleme', 'background-removal': 'arka plan kaldırma',
    'upscaling': 'çözünürlük artırma', 'citation': 'kaynak gösterme', 'task-scheduling': 'görev planlama',
    'fast-coding': 'hızlı kodlama', 'sub-agent-orchestration': 'alt ajan orkestrasyonu',
    'ai-browsing': 'AI ile web gezinme', 'research-automation': 'araştırma otomasyonu',
    'agent-mode': 'ajan modu', 'avatar-video': 'avatar video', 'interactive-agents': 'etkileşimli ajanlar',
    'command-generation': 'komut üretimi', 'multi-model': 'çoklu model', 'ai-orchestration': 'AI orkestrasyonu',
    'no-code': 'kod yazmadan', 'image-understanding': 'görsel anlama', 'code-generation': 'kod üretimi',
    'agent-control': 'ajan kontrolü', 'smart-home-control': 'akıllı ev kontrolü',
    'natural-language-commands': 'doğal dil komutları', 'audio-sync': 'ses senkronizasyonu',
    'ad-creative-generation': 'reklam kreatifi üretimi', 'marketing-assets': 'pazarlama materyali',
    'long-form-analysis': 'uzun form analiz', 'compliance': 'uyumluluk', 'app-generation': 'uygulama üretimi',
    'full-stack-development': 'full-stack geliştirme', 'deployment': 'dağıtım',
    'code-completion': 'kod tamamlama', 'code-chat': 'kod sohbeti', 'research-synthesis': 'araştırma sentezi',
    'tab-management': 'sekme yönetimi', 'summarization': 'özetleme', 'short-form-video': 'kısa video',
    'content-repurposing': 'içerik yeniden kullanımı', 'meeting-transcription': 'toplantı transkripsiyonu',
    'note-taking': 'not alma', 'action-items': 'aksiyon maddeleri', 'visual-search': 'görsel arama',
    'product-recognition': 'ürün tanıma', 'device-automation': 'cihaz otomasyonu',
    'live-translation': 'canlı çeviri', 'mail-summarization': 'e-posta özetleme',
    'app-building': 'uygulama geliştirme', 'dashboard-creation': 'gösterge paneli oluşturma',
    'robot-control': 'robot kontrolü', 'physical-agents': 'fiziksel ajanlar',
    'multi-step-tasks': 'çok adımlı görevler', 'ad-copy-generation': 'reklam metni üretimi',
    'long-form-content': 'uzun form içerik', 'seo-optimization': 'SEO optimizasyonu',
    'project-automation': 'proje otomasyonu', 'task-generation': 'görev üretimi',
    'content-generation': 'içerik üretimi', 'design-creation': 'tasarım oluşturma', 'narration': 'anlatım',
    'lead-intelligence': 'müşteri adayı analizi', 'sales-automation': 'satış otomasyonu',
    'resume-optimization': 'özgeçmiş optimizasyonu', 'job-tailoring': 'ilana göre uyarlama',
    'style-transfer': 'stil aktarımı', 'text-rendering': 'metin render',
    'grounded-generation': 'temellendirilmiş üretim', 'text-in-image': 'görsel içi metin',
    'logo-design': 'logo tasarımı', 'poster-creation': 'poster oluşturma',
    'multi-step-research': 'çok adımlı araştırma', 'synthesis': 'sentez',
    'conversational-search': 'sohbet tabanlı arama', 'verified-answers': 'doğrulanmış cevap',
    'document-drafting': 'belge taslağı', 'image-creation': 'görsel oluşturma', 'data-analysis': 'veri analizi',
    'agent-building': 'ajan geliştirme', 'scaling': 'ölçekleme', 'governance': 'yönetişim',
    'multi-model-access': 'çoklu model erişimi', 'instant-ai': 'anında AI', 'multilingual': 'çok dilli',
    'document-understanding': 'belge anlama', 'image-analysis': 'görsel analizi',
    'code-assistance': 'kod asistanı', 'model-integration': 'model entegrasyonu',
    'spoken-characters': 'konuşan karakterler', 'local-ai': 'yerel AI',
    'on-device-inference': 'cihaz üstü çıkarım', 'video-creation': 'video oluşturma',
    'ui-interaction': 'arayüz etkileşimi', 'web-automation': 'web otomasyonu', 'form-filling': 'form doldurma',
    'photo-editing': 'fotoğraf düzenleme', 'scam-detection': 'dolandırıcılık tespiti',
    'self-driving': 'otonom sürüş', 'driver-assistance': 'sürücü asistanı',
};

// Zaten Turkce olan bestFor.en token'lari: TR onerisinde oldugu gibi kullanilir.
const TR_TOKEN = /[çğıöşüÇĞİÖŞÜ]/;

// ============================================================
// Siniflandirma
// ============================================================
const HAS_DIACRITIC = /[çğıöşüÇĞİÖŞÜ]/;

// ASCII-duz Turkce isaretcileri. Onarim sozlugundeki kelimeler + onarim
// gerektirmeyen ama Turkce olan kelimeler (platformu, kaliteli, ...).
//
// DIKKAT: Sadece Ingilizce'de bulunamayacak biciimler. 'video', 'kod', 'ses',
// 'veri', 'multimodal' gibi jenerik token'lar BILEREK yok — Ingilizce
// aciklamalarda da geciyorlar ve 5 kaydi yanlis tarafa atiyorlardi
// ("best image-to-video" -> 'video' eslesiyordu). Turkce kayitlar zaten
// ekli bicimlerle (platformu/tabanli/editoru) yakalaniyor.
const TR_MARKERS = new RegExp(
    '\\b(' + [
        ...Object.keys(ASCII_TR),
        'ile', 've', 'platformu', 'kaliteli', 'kalitede', 'metin', 'metinden',
        'sanat', 'kaynak', 'marka', 'entegre', 'derin', 'uzun', 'akilli', 'yapay', 'zeka',
        'sohbet', 'yazma', 'modeli', 'motoru', 'makale', 'akademik', 'pazarlama',
        'ekosistemi', 'tamamlama', 'klonlama', 'profesyonel', 'sinematik', 'uygun', 'iyi',
    ].join('|') + ')\\b',
    'i'
);

// Ingilizce isaretcileri — sinif supheli mi diye bakmak icin.
const EN_MARKERS = /\b(the|with|for|and|of|to|in|on|per|first|best|fastest|faster|fewer|models?|agents?|tasks?|hours?|context|reasoning|generation|editing|images?|videos?|support|integration|features?|access|built-in|native|automatic|real-time|performance|autonomous|multi|mode|data|tokens?)\b/i;

function scoreMarkers(text, re) {
    const g = new RegExp(re.source, 'gi');
    return (text.match(g) || []).length;
}

function classify(desc) {
    if (HAS_DIACRITIC.test(desc)) return { cls: 'tr-ok', suspicious: false };

    const trScore = scoreMarkers(desc, TR_MARKERS);
    const enScore = scoreMarkers(desc, EN_MARKERS);

    if (trScore > 0) {
        // Hem TR hem EN isaretcisi varsa siniflandirma net degil -> insana sor.
        return { cls: 'tr-ascii', suspicious: enScore > 0 && enScore >= trScore };
    }
    // Hicbir isaretci yoksa da net degil (cok kisa / sadece marka adi).
    return { cls: 'en-in-tr', suspicious: enScore === 0 };
}

// ============================================================
// Onarim
// ============================================================
function matchCase(source, replacement) {
    if (source[0] === source[0].toUpperCase()) {
        return replacement[0].toUpperCase() + replacement.slice(1);
    }
    return replacement;
}

function repairAscii(text) {
    let out = text;
    const touched = [];

    for (const [from, to] of Object.entries(LITERAL_FIXES)) {
        if (out.includes(from) && from !== to) {
            out = out.split(from).join(to);
            touched.push(`${from} → ${to}`);
        }
    }

    out = out.replace(/\b[a-zA-ZçğıöşüÇĞİÖŞÜ']+\b/g, (word) => {
        const hit = ASCII_TR[word.toLowerCase()];
        if (!hit) return word;
        const fixed = matchCase(word, hit);
        if (fixed !== word) touched.push(`${word} → ${fixed}`);
        return fixed;
    });

    return { text: out, touched };
}

/**
 * Sozlugun dokunmadigi kelimeler (gozle taranmasi icin: arada gozden kacmis
 * ASCII-duz Turkce olabilir).
 *
 * ORIJINAL metinden hesaplanir, onarilmistan degil: onarilmis metin diakritik
 * icerdigi icin [a-zA-Z] siniri kelimeleri ortadan bolerdi ("görsel" -> "g","rsel").
 */
function untouchedWords(originalText) {
    const words = originalText.match(/\b[a-zA-Z]{3,}\b/g) || [];
    return [...new Set(words.filter((w) => !ASCII_TR[w.toLowerCase()]))];
}

function suggestBestForTr(enList) {
    const mapped = [];
    const unmapped = [];
    for (const token of enList) {
        if (TR_TOKEN.test(token)) { mapped.push(token); continue; }   // zaten Turkce
        const hit = BESTFOR_GLOSSARY[token];
        if (hit) mapped.push(hit);
        else unmapped.push(token);
    }
    return { mapped: [...new Set(mapped)], unmapped };
}

// ============================================================
// Calistir
// ============================================================
const db = JSON.parse(readFileSync(DB_PATH, 'utf8'));
console.log(`📖 ${db.length} arac okundu: ${DB_PATH}`);

const report = {
    repaired: [], moved: [], trOk: [], suspicious: [],
    trMissing: [], enSuggest: [], bestForTr: [], bestForEnDirty: [], untouched: new Set(),
};

const out = db.map((tool) => {
    const desc = tool.description?.tr ?? '';
    const { cls, suspicious } = classify(desc);
    const next = { ...tool };

    if (suspicious) report.suspicious.push({ id: tool.id, cls, desc });

    if (cls === 'tr-ascii') {
        const { text, touched } = repairAscii(desc);
        untouchedWords(desc).forEach((w) => report.untouched.add(w));
        if (touched.length > 0) {
            report.repaired.push({ id: tool.id, before: desc, after: text, touched });
        } else {
            report.trOk.push({ id: tool.id, desc, note: 'ASCII-duz degil, onarim gerekmedi' });
        }
        next.description = { ...tool.description, tr: text };
    } else if (cls === 'en-in-tr') {
        const tr = TR_TRANSLATIONS[tool.id];
        if (!tr) report.trMissing.push({ id: tool.id, desc });
        report.moved.push({ id: tool.id, movedToEn: desc, generatedTr: tr ?? '(TR BEKLİYOR)' });
        // Ingilizce metin en'e tasinir (en zaten bos -> veri kaybi yok), tr yeniden yazilir.
        next.description = { ...tool.description, tr: tr ?? '', en: desc };
    } else {
        report.trOk.push({ id: tool.id, desc, note: 'zaten diakritikli Turkce' });
    }

    // --- SADECE REVIEW: description.en onerisi
    const enSuggest = EN_SUGGESTIONS[tool.id];
    if (cls !== 'en-in-tr') {
        report.enSuggest.push({ id: tool.id, tr: next.description.tr, en: enSuggest ?? '(EN BEKLİYOR)' });
    }

    // --- SADECE REVIEW: bestFor.tr onerisi
    const enList = tool.bestFor?.en ?? [];
    const { mapped, unmapped } = suggestBestForTr(enList);
    report.bestForTr.push({ id: tool.id, mapped, unmapped });

    const dirty = enList.filter((t) => TR_TOKEN.test(t));
    if (dirty.length > 0) report.bestForEnDirty.push({ id: tool.id, dirty });

    return next;
});

// ============================================================
// Dogrulama: sema
// ============================================================
let schemaOk = true;
try {
    const { toolsDatabaseSchema } = await import('../lib/validations/tool.ts');
    const parsed = toolsDatabaseSchema.safeParse(out);
    if (!parsed.success) {
        schemaOk = false;
        console.error('❌ Sema dogrulamasi basarisiz:', parsed.error.errors.slice(0, 5));
    } else {
        console.log('✅ Sema dogrulamasi gecti');
    }
} catch {
    console.log('⚠️  Sema dogrulamasi atlandi (tool.ts .mjs icinden import edilemedi)');
}

// ============================================================
// Review dosyasi
// ============================================================
const esc = (s) => String(s).replace(/\|/g, '\\|');
const L = [];
L.push('# description / bestFor review', '');
L.push(`Uretim: \`node scripts/fix-descriptions.mjs${APPLY ? ' --apply' : ''}\` — ${new Date().toISOString()}`, '');
L.push('| Sinif | Adet |', '|---|---|');
L.push(`| Onarildi (ASCII→TR) | ${report.repaired.length} |`);
L.push(`| Tasindi (EN tr→en, TR uretildi) | ${report.moved.length} |`);
L.push(`| Dokunulmadi (zaten Turkce) | ${report.trOk.length} |`);
L.push(`| ⚠️ Siniflandirma suphesi | ${report.suspicious.length} |`);
L.push(`| ⚠️ TR cevirisi eksik | ${report.trMissing.length} |`);
L.push('');

L.push('## Onarildi (ASCII→TR) — JSON\'a yazildi', '');
L.push('| id | Once | Sonra | Degisen kelimeler |', '|---|---|---|---|');
report.repaired.forEach((r) =>
    L.push(`| ${r.id} | ${esc(r.before)} | ${esc(r.after)} | ${esc(r.touched.join(', '))} |`));
L.push('');

L.push('## Tasindi: Ingilizce tr→en (+ uretilen TR) — JSON\'a yazildi', '');
L.push('> `en` slotu bostu, tasima veri kaybetmez. TR metinleri elle yazildi — gozden gecirin.', '');
L.push('| id | en\'e tasinan (orijinal) | uretilen tr |', '|---|---|---|');
report.moved.forEach((r) =>
    L.push(`| ${r.id} | ${esc(r.movedToEn)} | ${esc(r.generatedTr)} |`));
L.push('');

if (report.trMissing.length > 0) {
    L.push('## ⚠️ TR BEKLIYOR — ceviri tablosunda karsiligi yok', '');
    report.trMissing.forEach((r) => L.push(`- \`${r.id}\` :: ${r.desc}`));
    L.push('');
}

L.push('## Dokunulmadi: zaten Turkce', '');
report.trOk.forEach((r) => L.push(`- \`${r.id}\` (${r.note}) :: ${r.desc}`));
L.push('');

L.push('## ⚠️ Siniflandirma suphesi — ELLE KONTROL', '');
L.push('> Regex hem TR hem EN isaretcisi gordu ya da hicbirini gormedi. Sinif yanlissa duzeltin.', '');
if (report.suspicious.length === 0) L.push('_Yok._');
report.suspicious.forEach((r) => L.push(`- \`${r.id}\` → **${r.cls}** :: ${r.desc}`));
L.push('');

L.push('## Sozlukte olmayan / dokunulmayan kelimeler', '');
L.push('> Onarilan metinlerdeki diakritiksiz kelimeler. Aralarinda ASCII-duz Turkce kalmis olabilir.', '');
L.push('`' + [...report.untouched].sort().join('`, `') + '`');
L.push('');

L.push('## Oneri: description.en — JSON\'A YAZILMADI', '');
L.push('| id | mevcut tr | onerilen en |', '|---|---|---|');
report.enSuggest.forEach((r) => L.push(`| ${r.id} | ${esc(r.tr)} | ${esc(r.en)} |`));
L.push('');

L.push('## Oneri: bestFor.tr — JSON\'A YAZILMADI', '');
L.push('> `?` isaretli token\'lar sozlukte yok; Turkce karsiligini elle yazin.', '');
L.push('| id | onerilen bestFor.tr | sozlukte yok |', '|---|---|---|');
report.bestForTr.forEach((r) =>
    L.push(`| ${r.id} | ${esc(r.mapped.join(', '))} | ${r.unmapped.length ? '❓ ' + esc(r.unmapped.join(', ')) : '—'} |`));
L.push('');

L.push('## ⚠️ bestFor.en icinde Turkce token — ELLE DUZELTIN', '');
L.push('> Bu token\'lar `en` listesinde ama Turkce. Faz 2\'de `tr`ye tasinmali.', '');
if (report.bestForEnDirty.length === 0) L.push('_Yok._');
report.bestForEnDirty.forEach((r) => L.push(`- \`${r.id}\` :: ${r.dirty.join(', ')}`));
L.push('');

writeFileSync(REVIEW_PATH, L.join('\n'), 'utf8');
console.log(`📝 Review yazildi: ${REVIEW_PATH}`);

// ============================================================
// Ozet + yazma
// ============================================================
console.log('');
console.log(`   Onarildi (ASCII→TR)      : ${report.repaired.length}`);
console.log(`   Tasindi (EN tr→en)       : ${report.moved.length}`);
console.log(`   Dokunulmadi (zaten TR)   : ${report.trOk.length}`);
console.log(`   ⚠️  Siniflandirma suphesi : ${report.suspicious.length}`);
console.log(`   ⚠️  TR cevirisi eksik     : ${report.trMissing.length}`);
console.log(`   bestFor.en kirli arac    : ${report.bestForEnDirty.length}`);
console.log('');

if (!APPLY) {
    console.log('🔍 DRY-RUN — JSON degistirilmedi. Yazmak icin: node scripts/fix-descriptions.mjs --apply');
    process.exit(0);
}

if (!schemaOk) {
    console.error('🛑 Sema dogrulamasi basarisiz — yazilmadi.');
    process.exit(1);
}

if (report.trMissing.length > 0) {
    console.error('🛑 TR cevirisi eksik kayitlar var — yazilmadi. Review dosyasina bakin.');
    process.exit(1);
}

// migrate-locale.mjs'in backup'ina DOKUNMA: o pre-migration snapshot.
if (!existsSync(BACKUP_PATH)) {
    writeFileSync(BACKUP_PATH, readFileSync(DB_PATH, 'utf8'), 'utf8');
    console.log(`💾 Yedek: ${BACKUP_PATH}`);
} else {
    console.log(`💾 Yedek zaten var, korunuyor: ${BACKUP_PATH}`);
}

writeFileSync(DB_PATH, JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log(`✅ Yazildi: ${DB_PATH}`);

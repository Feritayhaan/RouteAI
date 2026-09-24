// lib/tools-database.json (v1, 96 kayıt) -> data/products.json (v2 katalog).
//
//   node scripts/migrate-to-catalog.mjs          # products.json'u üretir
//   node scripts/migrate-to-catalog.mjs --force  # elle düzenlenmiş products.json'un ÜZERİNE yazar
//
// İdempotent: aynı girdiyle her çalışmada aynı çıktıyı üretir (sıralama v1
// dosyasındaki sırayla aynı, tarih/saat yazılmaz). v1 dosyasına DOKUNMAZ; v1
// yolu (/api/recommend) aynen çalışmaya devam eder.
//
// Göç tek seferliktir: products.json sonradan elle ya da link-products --apply
// ile değiştiyse (ör. models bağlandıysa) script üzerine yazmayı reddeder.
//
// Kurallar (P2):
//  - deprecated olmayan kayıt -> status 'active', deprecated -> 'retired'
//  - strength TAŞINMAZ (v2'de kullanılmıyor); pricing, reviewStatus, url,
//    description aynen taşınır; models: [] (P3 bağlayacak)
//  - access: [] = bilinmiyor (v1'de bu bilgi yok, tahmin edilmez)
//  - addedAt: v1'deki lastUpdated (kaydın bilinen tek tarihi)
//  - görev eşlemesi aşağıdaki ACTIVE_TASKS tablosunda; bestFor.en + description
//    + category okunarak seçildi. `unsure` olanlar data/migration-review.md'ye yazılır.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const v1 = JSON.parse(readFileSync(path.join(ROOT, 'lib/tools-database.json'), 'utf8'));
const taskIds = new Set(JSON.parse(readFileSync(path.join(ROOT, 'data/tasks.json'), 'utf8')).map((t) => t.id));

// ------------------------------------------------------------------
// Aktif ürünler: görevler. sure = eminim; unsure = Ferit baksın (neden yazılı).
// ------------------------------------------------------------------
const ACTIVE_TASKS = {
  'midjourney-v7': { sure: ['image.generate'], unsure: { 'image.logo': 'logo işe yarar ama metin render zayıf' }, why: 'bestFor: artistic images, poster design, concept art' },
  'chatgpt-gpt-4o-image': { sure: ['image.generate', 'image.logo', 'image.edit', 'design.social-graphic'], unsure: { 'image.product-photo': 'ürün çekimi için özel bir iddia yok' }, why: 'bestFor: text rendering, signage, infographic; ChatGPT içinde görsel düzenleme' },
  'dall-e-3': { sure: ['image.generate', 'image.product-photo'], unsure: {}, why: 'bestFor: photorealistic images, product shots' },
  'google-imagen-4': { sure: ['image.generate'], unsure: { 'image.product-photo': 'fotogerçekçilik iddiasından çıkarım' }, why: 'bestFor: photorealism, fast generation' },
  'adobe-firefly-image-4': { sure: ['image.generate', 'image.edit'], unsure: { 'image.background-remove': 'Firefly web uygulamasında arka plan kaldırma doğrulanmalı', 'image.product-photo': 'ticari güvenli iddiasından çıkarım' }, why: 'bestFor: brand-safe editing, commercial use' },
  'stable-diffusion-xl': { sure: ['image.generate'], unsure: {}, why: 'bestFor: high-volume generation, customization' },
  'flux1-pro': { sure: ['image.generate'], unsure: { 'image.product-photo': 'yüksek kalite iddiasından çıkarım' }, why: 'bestFor: fast generation, high quality' },
  'leonardo-ai': { sure: ['image.generate'], unsure: { 'image.upscale': 'Leonardo\'nun büyütme aracı kayıtta geçmiyor' }, why: 'bestFor: custom models, game assets' },
  'ideogram-20': { sure: ['image.generate', 'image.logo', 'design.social-graphic'], unsure: {}, why: 'bestFor: text rendering, posters, typography, logos' },
  'canva-ai-magic-studio': { sure: ['design.social-graphic', 'slides.create', 'docs.create', 'image.background-remove'], unsure: { 'image.logo': 'logo şablonları var, üretim gücü ayrı', 'video.edit-short-social': 'Canva video editörü kayıtta geçmiyor' }, why: 'bestFor: social media, presentations, branding, marketing' },
  'chatgpt-gpt-5': { sure: ['chat.general-assistant', 'text.write-longform', 'text.marketing-copy', 'text.email', 'text.summarize', 'text.translate', 'text.rewrite-edit', 'research.web', 'research.document-qa', 'data.spreadsheet-analysis', 'code.debug', 'docs.create'], unsure: {}, why: 'bestFor: content writing, research, coding, analysis — genel asistan' },
  'claude-ai-claude-4': { sure: ['chat.general-assistant', 'text.write-longform', 'text.marketing-copy', 'text.email', 'text.summarize', 'text.translate', 'text.rewrite-edit', 'research.document-qa', 'data.spreadsheet-analysis', 'code.debug', 'docs.create'], unsure: {}, why: 'bestFor: long documents, analysis, coding, research — genel asistan' },
  'gemini-25-pro': { sure: ['chat.general-assistant', 'text.write-longform', 'text.email', 'text.summarize', 'text.translate', 'text.rewrite-edit', 'research.web', 'research.document-qa', 'data.spreadsheet-analysis', 'code.debug'], unsure: {}, why: 'bestFor: multimodal tasks, Google integration, research, code' },
  'jasper-ai': { sure: ['text.marketing-copy', 'text.write-longform'], unsure: {}, why: 'bestFor: marketing copy, SEO content, brand voice' },
  copyai: { sure: ['text.marketing-copy'], unsure: {}, why: 'bestFor: copywriting, social-media-content' },
  'github-copilot': { sure: ['code.assistant-ide', 'code.debug'], unsure: {}, why: 'bestFor: code completion, function generation, test cases' },
  cursor: { sure: ['code.assistant-ide', 'code.debug'], unsure: { 'code.website-builder': 'sadece geliştirici için' }, why: 'bestFor: multi-file edits, codebase queries, agent mode' },
  'claude-code-anthropic': { sure: ['code.agent-cli', 'code.debug'], unsure: {}, why: 'bestFor: terminal coding, code explanation' },
  elevenlabs: { sure: ['audio.tts-voiceover', 'audio.voice-clone'], unsure: { 'audio.cleanup': 'Voice Isolator kayıtta geçmiyor', 'audio.transcribe': 'Speech-to-Text (Scribe) ayrı kayıttı, emekliye ayrıldı' }, why: 'bestFor: voice cloning, audiobooks, dubbing' },
  murfai: { sure: ['audio.tts-voiceover'], unsure: {}, why: 'bestFor: voiceovers, e-learning, ads' },
  'sora-2-openai': { sure: ['video.text-to-video'], unsure: { 'video.image-to-video': 'görselden video kayıtta geçmiyor' }, why: 'bestFor: cinematic videos, storytelling' },
  'google-veo-3': { sure: ['video.text-to-video'], unsure: { 'video.image-to-video': 'görselden video kayıtta geçmiyor' }, why: 'bestFor: fast generation, high quality' },
  'perplexity-ai': { sure: ['research.web'], unsure: { 'research.academic': 'akademik mod kayıtta geçmiyor' }, why: 'bestFor: research, fact-checking, cited answers' },
  'elicit-ai': { sure: ['research.academic'], unsure: {}, why: 'bestFor: literature review, data extraction' },
  tableau: { sure: ['data.dashboard'], unsure: {}, why: 'bestFor: dashboards, data visualization' },
  'microsoft-power-bi': { sure: ['data.dashboard'], unsure: {}, why: 'bestFor: business intelligence, corporate reporting' },
  'gamma-ai': { sure: ['slides.create', 'docs.create'], unsure: { 'code.website-builder': 'açıklamada "web sitesi" geçiyor, sınırlı site aracı' }, why: 'bestFor: presentation, pitch deck, one-pager, proposal' },
  beautifulai: { sure: ['slides.create'], unsure: {}, why: 'bestFor: presentation, pitch deck' },
  tome: { sure: [], unsure: { 'slides.create': 'Tome sunum ürününü kapatmış olabilir; doğrulanmalı' }, why: 'bestFor: presentation, storytelling, pitch deck' },
  'suno-ai': { sure: ['music.generate'], unsure: {}, why: 'bestFor: music, song, jingle' },
  udio: { sure: ['music.generate'], unsure: {}, why: 'bestFor: music, song, production' },
  'runway-gen-3': { sure: ['video.text-to-video', 'video.image-to-video'], unsure: { 'video.edit-short-social': 'montaj/efekt iddiasından çıkarım' }, why: 'bestFor: video generation, montaj, b-roll' },
  'pika-labs': { sure: ['video.text-to-video', 'video.image-to-video'], unsure: { 'video.edit-short-social': '"social video" iddiasından çıkarım' }, why: 'bestFor: video generation, animation, social video' },
  'grok-41': { sure: ['chat.general-assistant'], unsure: { 'text.write-longform': 'creative-writing iddiası', 'research.web': 'real-time-search iddiası' }, why: 'bestFor: creative-writing, reasoning, real-time-search' },
  'world-labs-marble': { sure: ['3d.generate'], unsure: {}, why: 'bestFor: 3d-world-generation, text-to-3d' },
  'notebooklm-deep-research': { sure: ['research.document-qa'], unsure: { 'text.summarize': 'kayıttaki açıklama ürünle uyuşmuyor (bkz. veri sorunları)' }, why: 'bestFor: document-synthesis' },
  'openai-atlas-ai-browser': { sure: [], unsure: { 'research.web': 'bir tarayıcı; araştırma aracı sayılmalı mı?' }, why: 'bestFor: ai-browsing, research-automation' },
  'synthesia-30': { sure: ['video.avatar-presenter'], unsure: {}, why: 'bestFor: avatar-video, dubbing' },
  'n8n-ai-workflow-builder': { sure: ['automation.workflow'], unsure: {}, why: 'bestFor: workflow-automation, no-code' },
  adcreativeai: { sure: ['design.social-graphic'], unsure: { 'text.marketing-copy': 'reklam metni de üretiyor ama odak görsel' }, why: 'bestFor: ad-creative-generation, marketing-assets' },
  'replit-agent': { sure: ['code.app-builder', 'code.website-builder'], unsure: {}, why: 'bestFor: app-generation, full-stack-development, deployment' },
  'windsurf-codeium': { sure: ['code.assistant-ide', 'code.debug'], unsure: {}, why: 'bestFor: code-completion, code-chat, debugging' },
  'opusclip-video-repurposing': { sure: ['video.repurpose-clips', 'video.edit-short-social'], unsure: { 'video.subtitles': 'altyazı var; uzun videonun tamamı için uygun mu?' }, why: 'bestFor: short-form-video, content-repurposing; açıklamada altyazı' },
  'fathom-meeting-assistant': { sure: ['audio.meeting-notes'], unsure: {}, why: 'bestFor: meeting-transcription, note-taking, action-items' },
  'base44-no-code-app-platform': { sure: ['code.app-builder'], unsure: { 'code.website-builder': 'web uygulaması üretir; tanıtım sitesi için?' }, why: 'bestFor: app-building, dashboard-creation' },
  'anyword-copy-ai': { sure: ['text.marketing-copy'], unsure: {}, why: 'bestFor: copywriting, ad-copy-generation' },
  'writesonic-seo-content': { sure: ['text.write-longform'], unsure: { 'text.marketing-copy': 'SEO içerik odaklı' }, why: 'bestFor: long-form-content, seo-optimization' },
  'clickup-brain-project-ai': { sure: [], unsure: {}, why: 'bestFor: project-automation, task-generation — taksonomide proje yönetimi görevi yok' },
  'simplified-content-and-design': { sure: ['design.social-graphic'], unsure: { 'text.marketing-copy': 'entegre metin yazarlığı iddiası' }, why: 'bestFor: content-generation, design-creation' },
  'teal-resume-builder-ai': { sure: ['docs.create'], unsure: {}, why: 'bestFor: resume-optimization' },
  'kling-ai-21': { sure: ['video.text-to-video', 'video.image-to-video'], unsure: {}, why: 'bestFor: text-to-video, image-to-video' },
  'luma-dream-machine-ray2': { sure: ['video.text-to-video', 'video.image-to-video'], unsure: {}, why: 'bestFor: text-to-video, image-to-video' },
  'gemini-3-pro-image': { sure: ['image.generate', 'image.logo'], unsure: { 'image.edit': 'düzenleme kayıtta geçmiyor', 'design.social-graphic': 'metin render iddiasından çıkarım' }, why: 'bestFor: image-generation, text-rendering' },
  'microsoft-copilot-pro': { sure: ['chat.general-assistant', 'text.email', 'docs.create', 'data.spreadsheet-analysis'], unsure: { 'slides.create': 'PowerPoint içinde; kayıtta sunum geçmiyor' }, why: 'bestFor: document-drafting, data-analysis' },
  'mistral-large-21': { sure: ['chat.general-assistant', 'text.translate'], unsure: { 'research.web': 'kaynakçalı web araması iddiası' }, why: 'bestFor: coding, reasoning, multilingual' },
  'grok-imagine-v09-xai': { sure: ['video.text-to-video'], unsure: { 'video.image-to-video': 'kayıtta geçmiyor' }, why: 'bestFor: video-generation' },
};

// Emekli ürünler önerilmez; görev sadece kategori varsayılanı (bilgi amaçlı).
const RETIRED_CATEGORY_TASK = {
  gorsel: 'image.generate',
  metin: 'chat.general-assistant',
  kod: 'code.assistant-ide',
  ses: 'audio.tts-voiceover',
  video: 'video.text-to-video',
  arastirma: 'research.web',
  veri: 'data.spreadsheet-analysis',
};

// v1'de İngilizce açıklaması boş kayıtlar: Türkçe açıklamanın çevirisi.
// Yeni iddia eklenmez; sadece dil tamamlanır.
const DESCRIPTION_EN = {
  'midjourney-v7': 'AI for cinematic-quality art and image generation',
  'chatgpt-gpt-4o-image': 'Top AI for accurate text in images and UI design',
  'dall-e-3': 'Photorealistic image generation integrated with ChatGPT',
  'google-imagen-4': "Google's AI for fast, realistic image generation",
  'adobe-firefly-image-4': 'Brand-safe AI image editing and creation',
  'stable-diffusion-xl': 'Open-source, customizable image generation',
  'flux1-pro': 'Fast, high-quality image generation',
  'leonardo-ai': 'Affordable AI image creation for teams',
  'ideogram-20': 'AI image tool with excellent text rendering',
  'canva-ai-magic-studio': 'Design and editing platform with 25+ AI features',
  'chatgpt-gpt-5': 'The most powerful all-purpose AI chat and writing assistant',
  'claude-ai-claude-4': 'Superior AI for long-text analysis and writing',
  'gemini-25-pro': "Google's multimodal AI platform",
  'jasper-ai': 'AI writing tool specialized in marketing content',
  'github-copilot': 'AI code completion tool from Microsoft and OpenAI',
  cursor: 'Advanced AI code editor based on VS Code',
  'claude-code-anthropic': 'Terminal-based deep code analysis tool',
  elevenlabs: 'The most realistic AI voice cloning and TTS platform',
  murfai: 'Professional AI voiceover platform',
  'sora-2-openai': 'The most advanced AI video generation model',
  'google-veo-3': 'Fast, high-quality AI video generation',
  'perplexity-ai': 'AI-powered search and research engine',
  'elicit-ai': 'Academic paper analysis and literature review',
  tableau: 'Industry-standard data visualization platform',
  'microsoft-power-bi': 'AI-powered BI tool for the Microsoft ecosystem',
  'gamma-ai': 'AI-powered presentation, document and website creation',
  beautifulai: 'Smart presentation design with automatic layout',
  tome: 'Create storytelling presentations with AI',
  'suno-ai': 'AI music generator that creates full songs from text',
  udio: 'High-quality AI music generation',
  'runway-gen-3': 'AI tool for text-to-video and video editing',
  'pika-labs': 'Creative AI video generation and animation',
};

function tasksFor(tool) {
  if (tool.deprecated) {
    const t = RETIRED_CATEGORY_TASK[tool.category];
    return { tasks: t ? [t] : [], unsure: {}, why: `emekli; kategori (${tool.category}) varsayılanı` };
  }
  const entry = ACTIVE_TASKS[tool.id];
  if (!entry) throw new Error(`ACTIVE_TASKS'ta eşleme yok: ${tool.id} (${tool.name})`);
  // Emin olmadıklarımız da ürünün görevlerine girer (aksi halde hiç önerilemez);
  // Ferit review'da çıkarabilir.
  return { tasks: [...entry.sure, ...Object.keys(entry.unsure)], unsure: entry.unsure, why: entry.why };
}

function description(tool) {
  const tr = tool.description?.tr?.trim() ?? '';
  const en = tool.description?.en?.trim() || DESCRIPTION_EN[tool.id] || '';
  return { en, tr };
}

const products = [];
const review = [];
const problems = [];

for (const tool of v1) {
  const { tasks, unsure, why } = tasksFor(tool);
  for (const t of tasks) {
    if (!taskIds.has(t)) throw new Error(`${tool.id}: bilinmeyen görev ${t}`);
  }
  const desc = description(tool);
  if (!desc.en || !desc.tr) problems.push(`${tool.id}: açıklama eksik (en="${desc.en}", tr="${desc.tr}")`);

  products.push({
    id: tool.id,
    name: tool.name,
    url: tool.url,
    description: desc,
    tasks,
    models: [],
    pricing: tool.pricing,
    access: [],
    status: tool.deprecated ? 'retired' : 'active',
    reviewStatus: tool.reviewStatus ?? 'unreviewed',
    addedAt: tool.lastUpdated,
  });

  if (!tool.deprecated) review.push({ tool, tasks, unsure, why });
}

const productsPath = path.join(ROOT, 'data/products.json');
const generated = `${JSON.stringify(products, null, 2)}\n`;
if (existsSync(productsPath) && readFileSync(productsPath, 'utf8') !== generated && !process.argv.includes('--force')) {
  console.error('[migrate] data/products.json göçten sonra değişmiş (elle düzenleme ya da model bağlantısı). Üzerine yazmak için --force.');
  process.exit(1);
}
writeFileSync(productsPath, generated);

// ------------------------------------------------------------------
// data/migration-review.md
// ------------------------------------------------------------------
const active = products.filter((p) => p.status === 'active');
const tasks = JSON.parse(readFileSync(path.join(ROOT, 'data/tasks.json'), 'utf8'));
const countByTask = tasks.map((t) => ({ id: t.id, n: active.filter((p) => p.tasks.includes(t.id)).length }));

const lines = [
  '# Göç incelemesi: lib/tools-database.json -> data/products.json',
  '',
  'Bu dosyayı `scripts/migrate-to-catalog.mjs` üretir. Elle düzenleme; eşlemeyi scriptteki `ACTIVE_TASKS` tablosunda değiştir ve scripti yeniden çalıştır.',
  '',
  `Özet: ${products.length} kayıt → ${active.length} active, ${products.length - active.length} retired. Emekli ürünlerin görevi sadece kategori varsayılanıdır (önerilmezler).`,
  '',
  '## Emin olmadığım eşlemeler',
  '',
  'Biçim: ürün → önerilen görev → neden → emin değilim. Bu görevler şimdilik ürüne EKLENDİ; yanlışsa scriptten çıkar.',
  '',
];
for (const { tool, unsure } of review) {
  for (const [task, reason] of Object.entries(unsure)) {
    lines.push(`- ${tool.name} → \`${task}\` → ${reason} → emin değilim`);
  }
}
lines.push('', '## Görevi olmayan aktif ürünler', '');
const noTask = review.filter((r) => r.tasks.length === 0);
if (noTask.length === 0) lines.push('- yok');
for (const { tool, why } of noTask) lines.push(`- ${tool.name}: ${why}. Hiç önerilmez; ya bir görev eklenmeli ya da ürün emekliye ayrılmalı.`);

lines.push('', '## Tüm aktif ürünler', '', '| Ürün | Görevler | Dayanak |', '| --- | --- | --- |');
for (const { tool, tasks: t, unsure, why } of review) {
  const shown = t.map((id) => (id in unsure ? `${id} (?)` : id)).join(', ') || '—';
  lines.push(`| ${tool.name} | ${shown} | ${why} |`);
}

lines.push('', '## Görev başına aktif ürün sayısı', '', '| Görev | Aktif ürün |', '| --- | --- |');
for (const { id, n } of countByTask) lines.push(`| \`${id}\` | ${n === 0 ? '**0 — katalog boşluğu**' : n} |`);

lines.push(
  '',
  '## Veri sorunları (göçte düzeltilmedi, aynen taşındı)',
  '',
  `- İngilizce açıklaması boş olan ${v1.filter((t) => !t.description?.en?.trim() && DESCRIPTION_EN[t.id]).length} kaydın \`description.en\` alanı Türkçe açıklamanın çevirisiyle dolduruldu; yeni iddia eklenmedi.`,
  '- **Grok 4.1** açıklamasında kaynaksız sayılar var ("1483 Elo", "%4,22 halüsinasyon"). CLAUDE.md kuralına göre kaynaksız sayı hatadır; açıklama temizlenmeli.',
  '- **NotebookLM** açıklaması ("otonom araştırma ajanı, yüzlerce siteyi tarar") ürünle uyuşmuyor; NotebookLM yüklenen kaynaklarla çalışır.',
  '- **Tome**: sunum ürünü kapatılmış olabilir; kapandıysa emekliye ayrılmalı.',
  '- **DALL-E 3**: ChatGPT içinde yerini GPT görsel modeline bırakmış olabilir; iki kayıt (DALL-E 3, ChatGPT (GPT-4o Image)) birleştirilmeli mi?',
  '- `access` alanı 96 kayıtta da boş (v1\'de yoktu). P4\'teki platform filtresi bilinmeyeni geçirir ama kartta "bilinmiyor" görünür.',
  '- `addedAt` = v1\'deki `lastUpdated`; ürünün kataloğa gerçek giriş tarihi bilinmiyor.',
);
for (const p of problems) lines.push(`- ${p}`);

writeFileSync(path.join(ROOT, 'data/migration-review.md'), `${lines.join('\n')}\n`);
console.log(`[migrate] ${products.length} ürün yazıldı (${active.length} active). data/migration-review.md güncellendi.`);

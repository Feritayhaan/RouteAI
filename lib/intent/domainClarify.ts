// Eksik bilgili (alan düzeyinde belirsiz) sorgu -> "Şunu mu demek istedin?"
// (kural tabanlı, LLM çağrısı yok).
//
// Sorun: "kodla ilgili yardım almak istiyorum", "video", "görsel lazım" gibi
// sorgular bir ALANI söyler ama hangi İŞİ istediğini söylemez. Sorgu sınıflandırıcıya
// (OpenAI) gidince ona tek bir görev seçtirilir ("kusurlu olsa bile") ve sistem hiç
// soru sormaz (eval clarifyRate 0/112, bkz. lib/recommendV3.ts). Kural katmanı da
// "video" gibi geniş kelimeyi 6 göreve birden bağlayıp bir tanesini seçer.
//
// Çözüm: sorgudaki HER kelime ya (a) bir alanı genel olarak anlatan "şemsiye" ifade
// (video, görsel, kodlama…) ya da (b) hiçbir şey söylemeyen "dolgu" kelime (istiyorum,
// lazım, yardım, I need, help…) ise sorguda görev bilgisi YOKTUR: tahmin etmek yerine
// o alanın görevlerini seçenek olarak sunarız. Seçimden sonraki akış zaten çalışıyor
// (recommendV3 `taskId` seçeneği, P13).
//
// Kasıtlı olarak DAR (önce hassasiyet): şüphede soru sorulmaz, mevcut akış sürer.
//  - Tek bir "gerçek" kelime bile varsa ("logo", "altyazı", "python", "instagram",
//    "hata", "üret") sorgu görev bilgisi taşıyor sayılır ve bu katman susar.
//  - Eylem fiilleri (üret, oluştur, hazırla, create, generate…) DOLGU DEĞİLDİR: tasks.json
//    anahtar kelimeleri onlara dayanır ("video üret" -> metinden video). Yalnızca
//    "yapmak/make/do" gibi hiçbir şey söylemeyen fiiller dolgudur.
//  - Şemsiye ifadeler bilerek dar: yalın "kod" (QR kod, indirim kodu), "yazılım"
//    (muhasebe yazılımı), "program" (diyet programı) yok.
//  - Eşleşme varsayılan olarak TAM KELİME; kök (ek serbest) eşleşme için ifadenin
//    sonuna `*` konur ("video*" -> videosu, videolar). Böylece "voiceover", "audiobook",
//    "assistant" gibi kendi anlamı olan kelimeler yanlışlıkla şemsiye/dolgu sayılmaz.
//  - Seçenek olarak yalnızca katalogda var olan ve en az bir aktif ürünü bulunan
//    görevler sunulur; ikiden az seçenek kalırsa soru sorulmaz.
//  - Sorgu birden fazla alana yayılıyorsa ("video ve görsel") ya da birden çok alan
//    eşit uyuyorsa susar.
//
// Sözlüğün tek kontrol noktası: lib/__tests__/domainClarify.test.ts — hiçbir görev
// anahtar kelimesi yalnızca şemsiye+dolgu kelimelerden oluşamaz (oluşursa test uyarır:
// o anahtar kelimeyi Ferit bilerek yazmıştır, sorulacak mı kararı onun).

import { normalizeTr, tokenizeTr } from '../text';
import type { SearchContext } from '../catalog/search';

export interface Domain {
  id: string;
  /**
   * Alanı genel olarak anlatan ifadeler ("şemsiye"). Tam kelime eşleşir; son kelimede
   * `*` varsa kök eşleşir (ek serbest). Diakritik ve harf duyarsız.
   */
  terms: string[];
  /** Sunulacak görevler, gösterim sırasıyla. */
  tasks: string[];
}

export const DOMAINS: Domain[] = [
  {
    id: 'code',
    terms: [
      // tr
      'kodla*', 'kodlama*', 'kodum*', 'kodunu*', 'kod konusunda', 'kod ile ilgili', 'kod hakkında',
      'programlama*', 'programcı*', 'yazılımcı*', 'yazılım proje*', 'geliştirici*',
      // en
      'coding*', 'programming*', 'programmer*', 'developer*', 'my code', 'the code', 'with code',
      'code help', 'software project*', 'software development', 'software engineer*',
    ],
    tasks: ['code.assistant-ide', 'code.debug', 'code.app-builder', 'code.agent-cli'],
  },
  {
    id: 'video',
    terms: ['video*'],
    tasks: ['video.text-to-video', 'video.image-to-video', 'video.edit-short-social', 'video.avatar-presenter', 'video.repurpose-clips', 'video.subtitles'],
  },
  {
    id: 'image',
    terms: [
      // tr
      'görsel*', 'resim*', 'fotoğraf', 'fotoğrafı', 'fotoğrafım', 'fotoğraflar',
      // en
      'image', 'images', 'picture', 'pictures', 'photo', 'photos', 'visual', 'visuals',
    ],
    tasks: ['image.generate', 'image.edit', 'image.logo', 'image.product-photo', 'image.background-remove', 'image.upscale'],
  },
  {
    id: 'audio',
    terms: ['ses', 'sesi', 'sesim', 'sesler', 'sesleri', 'audio', 'sound', 'sounds'],
    tasks: ['audio.tts-voiceover', 'audio.voice-clone', 'audio.transcribe', 'audio.cleanup', 'music.generate'],
  },
  {
    id: 'writing',
    terms: [
      // tr
      'yazma*', 'yazıyor*', 'yazı', 'yazılar', 'metin*', 'metni',
      // en
      'write', 'writing*', 'text', 'texts',
    ],
    tasks: ['text.write-longform', 'text.marketing-copy', 'text.email', 'text.rewrite-edit'],
  },
  {
    id: 'content',
    terms: ['içerik*', 'içeriği', 'içeriğim', 'content'],
    tasks: ['text.write-longform', 'text.marketing-copy', 'design.social-graphic', 'video.edit-short-social'],
  },
  {
    id: 'research',
    terms: ['araştırma*', 'research*'],
    tasks: ['research.web', 'research.academic', 'research.document-qa'],
  },
];

/**
 * Hiçbir şey söylemeyen kelimeler: istek/ihtiyaç/yardım kalıpları, bağlaçlar, "yapay zeka",
 * "iş/marka" gibi bağlam kelimeleri. Eylem fiilleri (üret, oluştur, create…) BURADA YOK.
 */
export const FILLERS: string[] = [
  // tr
  'bir', 'bu', 'şu', 'o', 'ben', 'bana', 'benim', 'bize', 'biz', 've', 'ama', 'ya', 'da', 'de', 'ki', 'mi', 'mı', 'mu', 'mü',
  'için', 'ile', 'ilgili', 'konusunda', 'hakkında', 'üzerine', 'biraz', 'bazı', 'şey', 'şeyler', 'birşey', 'bişey',
  'yardım*', 'istiyor*', 'isterim', 'isteriz', 'istedim', 'lazım', 'gerek', 'gerekiyor', 'ihtiyaç*', 'var', 'olsun',
  'arıyor*', 'almak', 'alabil*', 'yapma*', 'yapaca*', 'yapabil*', 'yapıyor*',
  'proje*', 'yapay', 'zeka', 'araç', 'aracı', 'araçlar', 'işim', 'markam', 'şirketim', 'işletmem',
  // en. Kısa kelimeler (on, in, at, is, do…) bilerek yok: normalizeTr Türkçe harfleri sadeleştirdiği
  // için Türkçe kelimelerle çakışır ("ön yazı" -> "on yazi", "iş" -> "is").
  'i', 'm', 'd', 'll', 's', 're', 'we', 'my', 'me', 'mine', 'our', 'a', 'an', 'the', 'to', 'of', 'for', 'with', 'about', 'regarding',
  'and', 'or', 'but', 'some', 'any', 'something', 'anything', 'thing', 'things', 'stuff',
  'need', 'needs', 'want', 'wants', 'would', 'like', 'can', 'could', 'you', 'please', 'help', 'helping', 'looking', 'find', 'new',
  'get', 'getting', 'started', 'start', 'project', 'projects', 'tool', 'tools', 'ai',
  'make', 'making', 'business', 'brand', 'company',
];

/** Bir alan için en az bu kadar seçenek yoksa soru sorulmaz (tek seçenekli soru anlamsız). */
const MIN_OPTIONS = 2;

interface Word {
  text: string;
  /** true: kök eşleşir (token bu kelimeyle BAŞLAR); false: tam kelime. */
  stem: boolean;
}

/** "kodla*" -> {text:'kodla', stem:true}. Çok kelimelik ifadede `*` yalnız son kelimeye uygulanır. */
function parseTerm(term: string): Word[] {
  const stem = term.endsWith('*');
  const tokens = tokenizeTr(stem ? term.slice(0, -1) : term);
  return tokens.map((text, i) => ({ text, stem: stem && i === tokens.length - 1 }));
}

function matches(token: string, w: Word): boolean {
  return w.stem ? token.startsWith(w.text) : token === w.text;
}

const PREPARED = DOMAINS.map((domain) => ({
  domain,
  // En uzun ifade önce: "yazılım proje*" tek "yazılım"dan önce denenir.
  phrases: domain.terms.map(parseTerm).filter((p) => p.length > 0).sort((a, b) => b.length - a.length),
}));

const FILLER_WORDS: Word[] = FILLERS.flatMap((f) => parseTerm(f));

/** Normalize edilmiş (tokenizeTr) tek kelime hiçbir şey söylemeyen bir dolgu mu? (lib/intent/productName.ts de kullanır.) */
export function isFillerToken(token: string): boolean {
  return FILLER_WORDS.some((w) => matches(token, w));
}

/** Sorgudaki her kelime bu alanın şemsiyesi ya da dolgu mu, ve en az bir şemsiye var mı? */
function isVagueFor(tokens: string[], phrases: Word[][]): boolean {
  let umbrella = false;
  for (let i = 0; i < tokens.length; ) {
    const phrase = phrases.find((p) => p.every((w, j) => i + j < tokens.length && matches(tokens[i + j], w)));
    if (phrase) {
      umbrella = true;
      i += phrase.length;
      continue;
    }
    if (FILLER_WORDS.some((w) => matches(tokens[i], w))) {
      i += 1;
      continue;
    }
    return false; // görev bilgisi taşıyan gerçek bir kelime var
  }
  return umbrella;
}

/**
 * Sorgu bir alanı söylüyor ama hangi işi istediğini söylemiyorsa sunulacak görev id'leri;
 * aksi halde null (normal akış sürer).
 */
export function domainClarify(query: string, ctx: Pick<SearchContext, 'tasksById' | 'products'>): string[] | null {
  if (!normalizeTr(query)) return null;
  const tokens = tokenizeTr(query);

  const vague = PREPARED.filter((p) => isVagueFor(tokens, p.phrases));
  if (vague.length !== 1) return null; // hiçbiri ya da birden çok alan: tahmin etme

  const offered = vague[0].domain.tasks.filter(
    (taskId) => ctx.tasksById.has(taskId) && ctx.products.some((p) => p.status === 'active' && p.tasks.includes(taskId))
  );
  return offered.length >= MIN_OPTIONS ? offered : null;
}

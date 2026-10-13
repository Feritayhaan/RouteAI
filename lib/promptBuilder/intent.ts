// Evrensel niyet modu (LLM yok): kullanıcının amacındaki fiil kalıplarından
// beş moddan biri. Alana özel kural yok; sadece TR/EN eylem kalıpları.
//   build     — yapmak, üretmek, geliştirmek, tasarlamak, yazmak (make, create, build...)
//   solve     — hata, sorun, düzeltmek, iyileştirmek (fix, debug, optimize...)
//   analyze   — karşılaştırmak, analiz, karar, strateji (compare, analyze, decide...)
//   transform — çevirmek, yeniden yazmak, özetlemek, dönüştürmek (translate, rewrite...)
//   learn     — SADECE açıkça "nedir, nasıl çalışır, anlat/öğret" denince
// Üreticiye ipucu olarak gider (model açıkça yanlışsa düzeltir) ve yeterlilik
// denetçisi niyet küçültmeyi (üretim isteğine "kısa bilgi ver" promptu) yakalar.

export const INTENT_MODES = ['build', 'solve', 'analyze', 'transform', 'learn'] as const;
export type IntentMode = (typeof INTENT_MODES)[number];

const NOT_LETTER = '(?![\\p{L}])';
const START = '(?<![\\p{L}])';

/** Türkçe fiil kökü + yaygın çekimler (mastar, gelecek, şimdiki, istek, emir). */
function trVerb(stems: string[]): string {
  const suffix = '(?:mak|mek|ma|me|maya|meye|mayı|meyi|acağım|eceğim|acağız|eceğiz|ıyorum|iyorum|uyorum|üyorum|alım|elim|ar mısın|er misin|ın|in|un|ün|sın|sin|abilir miyim|ebilir miyim)?';
  return `${START}(?:${stems.join('|')})${suffix}${NOT_LETTER}`;
}

const PATTERNS: [IntentMode, RegExp][] = [
  ['learn', new RegExp(`${START}(?:nedir|ne demek|ne işe yarar|nasıl çalış\\p{L}*|(?:anlat|öğret|açıkla)(?:ır mısın|ır mısınız|ın|abilir misin)?|öğrenmek istiyorum|anlamak istiyorum|hakkında bilgi ver\\p{L}*)${NOT_LETTER}|\\b(?:what is|what are|what does|how does|how do .{1,40} work|explain|teach me|tell me about|help me understand|i want to (?:learn|understand))\\b`, 'iu')],
  ['solve', new RegExp(`${START}(?:hata|hatası|sorun|sorunu|problem|çalışmıyor|bozuk|yavaş)${NOT_LETTER}|${trVerb(['düzelt', 'onar', 'çöz', 'iyileştir', 'hızlandır', 'optimize et'])}|\\b(?:fix|debug|bug|error|broken|not working|crash(?:es|ing)?|slow|optimi[sz]e|improve|troubleshoot)\\b`, 'iu')],
  ['transform', new RegExp(`${trVerb(['çevir', 'yeniden yaz', 'özetle', 'dönüştür', 'sadeleştir', 'kısalt', 'uzat', 'düzenle'])}|\\b(?:translate|rewrite|summari[sz]e|convert|paraphrase|shorten|simplify|proofread|edit this)\\b`, 'iu')],
  ['analyze', new RegExp(`${START}(?:analiz|karşılaştırma|hangisi|strateji|stratejisi)${NOT_LETTER}|${trVerb(['karşılaştır', 'analiz et', 'değerlendir', 'kıyasla', 'seç'])}|\\b(?:compare|analy[sz]e|evaluate|which (?:is|one) (?:better|best)|pros and cons|decide|strategy|assess)\\b`, 'iu')],
  ['build', new RegExp(`${trVerb(['yap', 'üret', 'oluştur', 'geliştir', 'tasarla', 'yaz', 'kur', 'hazırla', 'başlat', 'çek', 'aç', 'bestele', 'çiz', 'kaydet', 'inşa et', 'planla'])}|${START}(?:lazım|gerekiyor|ihtiyacım var)${NOT_LETTER}|\\b(?:create|build|make|develop|design|write|produce|launch|start|compose|draw|shoot|record|set up|plan|i need (?:a|an|some))\\b`, 'iu')],
];

/** Amacın niyet modu; hiçbir kalıp yoksa null (model karar verir). Öncelik: learn > solve > transform > analyze > build. */
export function classifyIntent(goal: string): IntentMode | null {
  for (const [mode, re] of PATTERNS) if (re.test(goal)) return mode;
  return null;
}

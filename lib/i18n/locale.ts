// Dil seçimi — sözlük yüklemez (proxy.ts'te de kullanılır).
// Sıra: ?lang parametresi -> Accept-Language (q değerine göre) -> en.

export const LOCALES = ['en', 'tr'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';
/** proxy.ts'in isteğe eklediği başlık; layout <html lang> için okur. */
export const LOCALE_HEADER = 'x-routeai-locale';

export function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale);
}

export function resolveLocale({ lang, acceptLanguage }: { lang?: string | null; acceptLanguage?: string | null }): Locale {
  if (lang && isLocale(lang.toLowerCase())) return lang.toLowerCase() as Locale;
  if (acceptLanguage) {
    const ranked = acceptLanguage
      .split(',')
      .map((part) => {
        const [tag, ...params] = part.trim().split(';');
        const q = params.find((p) => p.trim().startsWith('q='));
        return { tag: tag.toLowerCase(), q: q ? Number(q.trim().slice(2)) : 1 };
      })
      .filter((x) => x.tag && !Number.isNaN(x.q))
      .sort((a, b) => b.q - a.q);
    for (const { tag } of ranked) {
      const base = tag.split('-')[0];
      if (isLocale(base)) return base;
    }
  }
  return DEFAULT_LOCALE;
}

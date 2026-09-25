// Sunucu bileşenleri için dil: proxy.ts'in başlığı -> ?lang -> Accept-Language.

import { headers } from "next/headers";
import { LOCALE_HEADER, isLocale, resolveLocale, type Locale } from "./locale";

export async function currentLocale(lang?: string | string[] | null): Promise<Locale> {
  const h = await headers();
  const langParam = Array.isArray(lang) ? lang[0] : lang;
  if (langParam && isLocale(langParam)) return langParam;
  const fromProxy = h.get(LOCALE_HEADER);
  if (isLocale(fromProxy)) return fromProxy;
  return resolveLocale({ acceptLanguage: h.get("accept-language") });
}

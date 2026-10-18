import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_HEADER, resolveLocale } from "@/lib/i18n/locale";
import { DEVICE_HEADER, classifyRequest } from "@/lib/device/classify";

// Dili (?lang -> Accept-Language -> en) ve cihaz tahminini (User-Agent +
// Sec-CH-UA-Mobile) isteğe başlık olarak ekler; root layout <html lang> /
// <html data-device> ve metadata için okur. Sayfa istekleri dışında çalışmaz.
// Ana sayfa (navigasyon arayüzü) sadece Türkçe: <html lang="tr">.
export function proxy(request: NextRequest) {
  const locale = request.nextUrl.pathname === "/" ? "tr" : resolveLocale({
    lang: request.nextUrl.searchParams.get("lang"),
    acceptLanguage: request.headers.get("accept-language"),
  });
  const headers = new Headers(request.headers);
  headers.set(LOCALE_HEADER, locale);
  headers.set(DEVICE_HEADER, classifyRequest({
    userAgent: request.headers.get("user-agent"),
    chUaMobile: request.headers.get("sec-ch-ua-mobile"),
  }));
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};

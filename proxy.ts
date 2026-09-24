import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_HEADER, resolveLocale } from "@/lib/i18n/locale";

// Dili (?lang -> Accept-Language -> en) isteğe başlık olarak ekler; root
// layout <html lang> ve metadata için okur. Sayfa istekleri dışında çalışmaz.
export function proxy(request: NextRequest) {
  const locale = resolveLocale({
    lang: request.nextUrl.searchParams.get("lang"),
    acceptLanguage: request.headers.get("accept-language"),
  });
  const headers = new Headers(request.headers);
  headers.set(LOCALE_HEADER, locale);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};

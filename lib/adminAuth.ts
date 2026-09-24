// Admin uçlarının (/api/admin/*, /api/update-tools) TEK yetki kontrolü.
//
// Anahtar SADECE `x-admin-key` başlığından okunur. `?key=` desteği kaldırıldı:
// URL'deki sır erişim loglarına, tarayıcı geçmişine ve Referer başlığına sızar.
//
// Karşılaştırma sabit zamanlı: `!==` ilk farklı karakterde durduğu için yanıt
// süresi, tahminin ne kadarının doğru olduğunu ele verebilir. İki değer önce
// SHA-256 ile sabit uzunluğa indirilir (uzunluk da sızmasın), sonra bütün
// baytlar gezilip karar tek seferde verilir. Web Crypto kullanıldığı için Edge
// ve Node runtime'da aynı kod çalışır (node:crypto Edge'de yok).

export const ADMIN_KEY_HEADER = 'x-admin-key';

const encoder = new TextEncoder();

async function sha256(value: string): Promise<Uint8Array> {
    return new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
}

/** İki dizeyi, içerikleri hakkında zamanlama bilgisi sızdırmadan karşılaştırır. */
export async function timingSafeEqual(a: string, b: string): Promise<boolean> {
    const [x, y] = await Promise.all([sha256(a), sha256(b)]);
    let diff = 0;
    for (let i = 0; i < x.length; i++) {
        diff |= x[i] ^ y[i];
    }
    return diff === 0;
}

/**
 * İstek geçerli admin anahtarını taşıyor mu?
 * ADMIN_SECRET tanımsız ya da boşsa HİÇBİR istek admin sayılmaz.
 */
export async function isAdminRequest(req: Request): Promise<boolean> {
    const expected = process.env.ADMIN_SECRET;
    if (!expected) return false;

    const provided = req.headers.get(ADMIN_KEY_HEADER);
    if (!provided) return false;

    return timingSafeEqual(provided, expected);
}

/** Yetkisizse 401 yanıtı, yetkiliyse null döner. */
export async function requireAdmin(req: Request): Promise<Response | null> {
    if (await isAdminRequest(req)) return null;
    return Response.json({ error: 'Yetkisiz erişim' }, { status: 401 });
}

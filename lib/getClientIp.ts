import { NextRequest } from "next/server";

/**
 * Extract the real client IP from a NextRequest.
 * Prioritizes Vercel's trusted x-real-ip header over user-controllable x-forwarded-for.
 */
export function getClientIp(req: NextRequest): string {
    // Vercel'in güvenilir başlığı (Vercel proxy tarafından set edilir, kullanıcı manipüle edemez)
    const realIp = req.headers.get("x-real-ip");
    if (realIp) {
        return realIp;
    }

    // Fallback: x-forwarded-for'dan sadece İLK IP'yi al (orijinal istemci)
    const forwardedFor = req.headers.get("x-forwarded-for");
    if (forwardedFor) {
        const firstIp = forwardedFor.split(",")[0].trim();
        // Basit IP format doğrulaması (IPv4 veya IPv6)
        if (/^[\d.:a-fA-F]+$/.test(firstIp)) {
            return firstIp;
        }
    }

    return "unknown";
}

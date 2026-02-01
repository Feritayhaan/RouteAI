import { NextRequest } from "next/server";

/**
 * Extract the real client IP from a NextRequest.
 * Handles proxied requests (Vercel, Cloudflare, etc.)
 */
export function getClientIp(req: NextRequest): string {
    // Check x-forwarded-for header (common for proxies)
    const forwardedFor = req.headers.get("x-forwarded-for");
    if (forwardedFor) {
        // x-forwarded-for can contain multiple IPs, the first one is the client
        const ips = forwardedFor.split(",").map((ip) => ip.trim());
        if (ips[0]) {
            return ips[0];
        }
    }

    // Check x-real-ip header (used by some proxies like Nginx)
    const realIp = req.headers.get("x-real-ip");
    if (realIp) {
        return realIp;
    }

    // Vercel-specific header
    const vercelForwardedFor = req.headers.get("x-vercel-forwarded-for");
    if (vercelForwardedFor) {
        return vercelForwardedFor.split(",")[0].trim();
    }

    // Fallback to a default (in development or if all else fails)
    return "127.0.0.1";
}

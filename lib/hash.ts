/**
 * Simple string hash for cache keys (FNV-1a 32-bit)
 * Edge-uyumlu, crypto.subtle gerektirmez
 */
export function hashString(str: string): string {
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(36);
}

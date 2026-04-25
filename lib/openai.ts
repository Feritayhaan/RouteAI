import OpenAI from 'openai';

// Edge Runtime uyumlu lazy initialization
// Top-level throw Edge'de modül yüklenirken hata verir, bu yüzden lazy yapıyoruz
let _openai: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
    if (!_openai) {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error(
                'OPENAI_API_KEY ortam değişkeni tanımlanmamış. Lütfen .env.local dosyasına ekleyin.'
            );
        }
        const apiKey = process.env.OPENAI_API_KEY.trim();
        _openai = new OpenAI({ apiKey });
    }
    return _openai;
}

// Backwards-compatible export (getter ile lazy)
export const openai = new Proxy({} as OpenAI, {
    get(_target, prop) {
        return (getOpenAIClient() as any)[prop];
    },
});

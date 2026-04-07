import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error(
    'OPENAI_API_KEY ortam değişkeni tanımlanmamış. Lütfen .env.local dosyasına ekleyin.'
  );
}

// API Anahtarını temizle (boşluk varsa siler)
const apiKey = process.env.OPENAI_API_KEY.trim();

export const openai = new OpenAI({
    apiKey,
});

import OpenAI from 'openai';

// API Anahtarını kontrol et ve temizle (boşluk varsa siler)
const apiKey = process.env.OPENAI_API_KEY?.trim();

if (!apiKey) {
    console.error("❌ HATA: OPENAI_API_KEY bulunamadı! .env dosyanı kontrol et.");
} else {
    // Güvenlik için anahtarın sadece ilk 7 karakterini logluyoruz
    console.log(`✅ OpenAI Bağlantısı: ${apiKey.substring(0, 7)}... ile başlatılıyor.`);
}

export const openai = new OpenAI({
    apiKey: apiKey || "dummy-key", // Boşsa hata patlamasın, aşağıda yakalarız
    dangerouslyAllowBrowser: true // Sadece gerekli durumlarda
});

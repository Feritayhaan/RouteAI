import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

// Anahtarı senin oluşturduğun .env.local dosyasından çeker
// AI için "Veritabanı" ve "Rol" Tanımı
const systemMessage = `
Sen RouteAI adında bir yönlendirme asistanısın. 
Görevin: Kullanıcının isteğini analiz et ve aşağıdaki ARAÇ LİSTESİNDEN en uygun olanı seç.

ARAÇ LİSTESİ (Sadece bunlardan birini öner):
1.  **ChatGPT (GPT-5.1)**: Genel sohbet, metin düzenleme, basit çeviri ve günlük işler için joker eleman.
2.  **Claude 4.5 Sonnet**: İnsani ve doğal yazı yazma, uzun makale, senaryo ve ileri seviye kodlama (ChatGPT'den daha iyi kod yazar).
3.  **Gemini 3**: Çok uzun PDF'leri, kitapları veya yüzlerce satır veriyi analiz etmek için (Devasa hafıza).
4.  **Midjourney**: Sanatsal, hiper-gerçekçi görseller ve logolar (En yüksek görsel kalite).
5.  **Ideogram**: İçinde "yazı" geçen görseller ve logolar için (Midjourney yazıda kötüdür, bu iyidir).
6.  **Perplexity**: Güncel haberler, kaynaklı araştırma ve "Bana X hakkında bilgi bul" soruları (Google yerine geçer).
7.  **Consensus**: Sadece bilimsel ve akademik makalelerden cevap verir (Öğrenciler ve tez yazanlar için).
8.  **NotebookLM**: Ders notlarını ve PDF'leri yükleyip onlarla sohbet etmek veya "Podcast" formatında dinlemek için.
9.  **Gamma**: Saniyeler içinde PowerPoint sunumu ve web sayfası taslağı hazırlamak için.
10. **DeepSeek Coder**: Karmaşık matematik, mantık soruları ve zorlu yazılım hatalarını çözmek için (Açık kaynak kralı).
11. **Runway Gen-3**: Metinden video oluşturma (Text-to-Video) ve video düzenleme.
12. **Suno AI**: Metinden şarkı ve müzik besteleme.
13. **ElevenLabs**: Metni insan sesine çevirme (Dublaj ve seslendirme).
14. **Canva Magic Studio**: Sosyal medya postu, afiş ve basit görsel tasarımlar (Profesyonel olmayanlar için).

KURALLAR:
- Asla sohbet etme.
- Cevabını SADECE geçerli bir JSON formatında ver.
- JSON formatı şöyle olmalı: { "toolName": "...", "description": "...", "reason": "...", "suggestedPrompt": "..." }
`;

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    // Prompt boş mu kontrolü
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Lütfen bir istek yazın." },
        { status: 400 }
      );
    }

    // Anahtar var mı kontrolü
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API Key bulunamadı (.env.local dosyasını kontrol et)." },
        { status: 500 }
      );
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // OpenAI'a isteği gönderiyoruz (Doğru Fonksiyon Burası)
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini", // Senin istediğin ucuz ve hızlı model
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" }, // Kesinlikle JSON dönmesini zorluyoruz
    });

    // Gelen cevabı alıyoruz
    const aiResponse = completion.choices[0].message.content;

    // Eğer cevap boşsa hata döndür
    if (!aiResponse) {
      throw new Error("AI boş cevap döndürdü.");
    }

    // Cevabı JSON olarak frontend'e gönderiyoruz
    return NextResponse.json(JSON.parse(aiResponse));

  } catch (error) {
    console.error("API Hatası:", error);
    return NextResponse.json(
      { error: "İşlem sırasında bir hata oluştu." },
      { status: 500 }
    );
  }
}
import OpenAI from "openai";
import { detectCategory, Category } from "./keywords";

const allowedCategories: Category[] = [
  "gorsel",
  "metin",
  "ses",
  "video",
  "kod",
  "arastirma",
  "veri"
];

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Detect category using OpenAI with fallback to keyword-based detection.
 */
export async function detectCategoryWithAI(query: string): Promise<Category | null> {
  // Fallback helper
  const fallback = (): Category | null => {
    const detected = detectCategory(query);
    console.log("[aiClassifier] Fallback category:", detected);
    return detected;
  };

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: 10,
      messages: [
        {
          role: "system",
          content: "Sen bir AI araç öneri asistanısın. Kullanıcının isteğini analiz et ve en uygun kategoriyi seç. Sadece kategori ismini döndür."
        },
        {
          role: "user",
          content: query
        }
      ]
    });

    const choice = completion.choices?.[0]?.message?.content?.trim().toLowerCase();
    if (choice && allowedCategories.includes(choice as Category)) {
      console.log("[aiClassifier] AI category:", choice);
      return choice as Category;
    }

    console.warn("[aiClassifier] Invalid category from AI:", choice);
    return fallback();
  } catch (error) {
    console.error("[aiClassifier] OpenAI error, using fallback:", error);
    return fallback();
  }
}

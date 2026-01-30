
import { GoogleGenAI, Type } from "@google/genai";

// Safe access to API key to prevent runtime crashes
const getApiKey = () => {
  try {
    return process.env.API_KEY || (window as any).process?.env?.API_KEY || '';
  } catch {
    return '';
  }
};

export const generateProductDetails = async (productName: string) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("Gemini API Key missing. AI features disabled.");
    return null;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a short, appetizing description (max 15 words) and a typical market price (number only) for a cafe product named "${productName}".`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            suggestedPrice: { type: Type.NUMBER },
            category: { type: Type.STRING, enum: ['Beverages', 'Food', 'Snacks', 'Dessert', 'Other'] }
          },
          propertyOrdering: ["description", "suggestedPrice", "category"],
        }
      }
    });

    const text = response.text;
    if (!text) return null;

    return JSON.parse(text.trim());
  } catch (error) {
    console.error("Gemini generation error:", error);
    return null;
  }
};

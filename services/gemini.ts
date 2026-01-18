import { GoogleGenAI, Type } from "@google/genai";

export const generateProductDetails = async (productName: string) => {
  if (!process.env.API_KEY) {
    console.error("API Key is missing.");
    return null;
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
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
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini generation error:", error);
    return null;
  }
};
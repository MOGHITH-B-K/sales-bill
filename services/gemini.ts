import { GoogleGenAI, Type } from "@google/genai";

// Initialize client with environment variable, fallback to empty string to prevent crash on load
const apiKey = process.env.API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

export const generateProductDetails = async (productName: string) => {
  if (!apiKey) {
    console.error("API Key is missing. Please check your environment variables.");
    return null;
  }

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
          }
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Gemini generation error:", error);
    return null;
  }
};
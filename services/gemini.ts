import { GoogleGenAI, Type } from "@google/genai";

// Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateProductDetails = async (productName: string) => {
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

    // Access .text property directly, do not call as a function
    const text = response.text;
    if (!text) return null;

    // Parse the JSON output from the model directly as it's requested in JSON format
    return JSON.parse(text.trim());
  } catch (error) {
    console.error("Gemini generation error:", error);
    return null;
  }
};
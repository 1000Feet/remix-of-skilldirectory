
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  throw new Error('Missing Gemini API key in environment variables');
}

const genAI = new GoogleGenerativeAI(apiKey);

export const getChatResponse = async (message: string): Promise<string> => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const result = await model.generateContent({
      contents: [{
        parts: [{ text: message }]
      }]
    });

    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
};

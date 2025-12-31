import { GoogleGenAI } from "@google/genai";

const getAIClient = () => {
  if (!process.env.API_KEY) {
    console.warn("API_KEY not found in environment variables.");
    return null;
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const refineMessage = async (text: string, tone: 'professional' | 'casual' | 'cryptic'): Promise<string> => {
  const ai = getAIClient();
  if (!ai) return "Error: No API Key";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Rewrite the following message to be ${tone} and concise. Keep the meaning but change the style. Message: "${text}"`,
    });
    return response.text?.trim() || text;
  } catch (error) {
    console.error("Gemini Refine Error:", error);
    return text;
  }
};

export const translateMessage = async (text: string, targetLang: string = 'Vietnamese'): Promise<string> => {
  const ai = getAIClient();
  if (!ai) return "Error: No API Key";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Translate the following text to ${targetLang}. Only return the translated text. Text: "${text}"`,
    });
    return response.text?.trim() || text;
  } catch (error) {
    console.error("Gemini Translate Error:", error);
    return "Translation failed.";
  }
};

export const analyzeSecurity = async (conversation: string): Promise<string> => {
  const ai = getAIClient();
  if (!ai) return "Error: No API Key";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze the following conversation snippet (last 10 messages) for privacy leaks (PII like names, addresses, phones, passwords, financial info) and potential social engineering risks.

      Provide a detailed report in Vietnamese using the following structure:
      
      [Đánh giá chung]: (An toàn / Rủi ro thấp / Rủi ro cao)
      
      1. Thông tin nhạy cảm phát hiện:
         - (Liệt kê cụ thể hoặc ghi "Không có")
      
      2. Phân tích rủi ro:
         - (Giải thích tại sao thông tin này nguy hiểm hoặc xác nhận an toàn)
      
      3. Khuyến nghị:
         - (Lời khuyên cụ thể để bảo vệ dữ liệu)

      Conversation Snippet:
      "${conversation}"`,
    });
    return response.text?.trim() || "Không thể phân tích.";
  } catch (error) {
    return "Lỗi phân tích bảo mật.";
  }
};
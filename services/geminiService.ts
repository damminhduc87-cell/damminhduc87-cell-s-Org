
import { GoogleGenAI } from "@google/genai";

export const getRegulatoryAdvice = async (userPrompt: string) => {
  try {
    // Fix: Create a new GoogleGenAI instance right before making an API call to ensure it always uses the most up-to-date API key
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: userPrompt,
      config: {
        systemInstruction: `Bạn là một cố vấn chuyên gia về quản lý chất lượng phòng xét nghiệm y học tại Việt Nam. 
        Nhiệm vụ của bạn là giải đáp các thắc mắc về:
        1. Quyết định 2429/QĐ-BYT (Tiêu chí đánh giá mức chất lượng phòng xét nghiệm).
        2. Thông tư 37/2017/TT-BYT về an toàn sinh học.
        3. Hướng dẫn an toàn sinh học của WHO (ấn bản thứ 4).
        4. Các quy tắc Westgard trong kiểm soát nội kiểm.
        
        Trả lời bằng tiếng Việt, chuyên nghiệp, súc tích và chính xác. Sử dụng định dạng Markdown cho các bảng biểu hoặc danh sách.`,
        tools: [{ googleSearch: {} }]
      },
    });

    return {
      /* Fix: Directly access the .text property of GenerateContentResponse */
      text: response.text || "Xin lỗi, tôi không thể tìm thấy thông tin vào lúc này.",
      sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return { text: "Đã xảy ra lỗi khi kết nối với máy chủ AI.", sources: [] };
  }
};

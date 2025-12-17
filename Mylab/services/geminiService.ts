import { GoogleGenAI } from "@google/genai";
import { ResearchResult, SearchSource } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const searchResearchTopic = async (query: string): Promise<ResearchResult> => {
  try {
    // Keep search on flash for speed and grounding stability
    const modelId = 'gemini-2.5-flash';
    
    // We specifically want to find academic intersections.
    const enhancedQuery = `
      Please conduct a rigorous academic literature search on the following specific thesis topic:
      "${query}"
      
      The user is proposing a consensus methodology:
      1. Model: Poisson ARCH(1) (also known as Poisson INGARCH).
      2. Theory: Large Deviations Principle (LDP).
      3. Technique: Importance Sampling with measure change based on LDP.
      4. Implementation: Numerical solution of optimal twisting parameter theta* using Principal Eigenvalue of the truncated tilted matrix K(theta) and finding root of g(theta) = Lambda'(theta) - a.

      Task:
      1. Identify if this *exact* numerical combination has been published. Look for keywords like "numerical large deviations INGARCH", "rare event simulation Poisson ARCH", "eigenvalue method importance sampling".
      2. List closely related papers (e.g., LDP for GARCH, or IS for Poisson processes).
      3. Assess the "Risk of Overlap" (High/Medium/Low) for a Master's thesis.
      
      **IMPORTANT: Please provide the entire response, including the summary and assessment, in Chinese (Simplified).**
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: enhancedQuery,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "未找到相关结果。";
    
    // Extract grounding chunks for citations
    const sources: SearchSource[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;

    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web) {
          sources.push({
            title: chunk.web.title || "来源",
            uri: chunk.web.uri || "#"
          });
        }
      });
    }

    // Deduplicate sources based on URI
    const uniqueSources = sources.filter((v, i, a) => a.findIndex(t => (t.uri === v.uri)) === i);

    return {
      markdown: text,
      sources: uniqueSources
    };

  } catch (error) {
    console.error("Error fetching research:", error);
    return {
      markdown: "无法获取研究数据。请检查您的 API 密钥或稍后重试。\n\n错误详情: " + (error instanceof Error ? error.message : String(error)),
      sources: []
    };
  }
};

export const explainSimulationConcept = async (params: string): Promise<string> => {
    const prompt = `Explain simply how Importance Sampling guided by Large Deviations would theoretically work for a Poisson ARCH(1) process with parameters: ${params}. Contrast this with Naive Monte Carlo. Keep it brief and educational. **Please answer in Chinese (Simplified).**`;

    try {
        // 1. Attempt using the high-reasoning Gemini 3.0 Pro (Preview) model
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt
        });
        return response.text || "无法生成解释 (3.0 Pro)。";
    } catch (e: any) {
        console.warn("Gemini 3.0 Pro failed (likely rate limit or availability), falling back to Flash:", e.message);
        
        // 2. Fallback to Gemini 2.5 Flash if Pro fails (e.g. 429 Quota Exceeded)
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt
            });
            return (response.text || "无法生成解释 (Flash)。") + "\n\n*(注：检测到 API 配额限制，已自动切换至 Gemini 2.5 Flash 模型为您生成)*";
        } catch (innerE) {
            return "无法生成解释。请检查您的 API 密钥配置或网络连接。";
        }
    }
}
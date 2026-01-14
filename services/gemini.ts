
import { GoogleGenAI, Type } from "@google/genai";
import { Panel } from "../types";

export const getSemanticRelationships = async (panels: Panel[]): Promise<{ source: string, target: string, value: number }[]> => {
  if (panels.length < 2) return [];

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Analise os painéis e retorne pares com forte similaridade temática (score 0.1-1.0). IDs: ${panels.map(p => `${p.id}:${p.title}`).join(', ')}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              source: { type: Type.STRING },
              target: { type: Type.STRING },
              value: { type: Type.NUMBER }
            },
            required: ['source', 'target', 'value']
          }
        },
        temperature: 0.1
      }
    });

    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error("Error fetching relationships:", error);
    return [];
  }
};

export const semanticSearch = async (query: string, panels: Panel[]): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  // Prompt ultra-compacto para reduzir latência de processamento
  const prompt = `Query: "${query}". Retorne IDs relevantes (JSON array). Itens: ${panels.map(p => `[${p.id}] ${p.title} (${p.group})`).join('|')}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        temperature: 0,
        maxOutputTokens: 200 // Limite severo para resposta rápida
      }
    });
    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error("Search error:", error);
    return [];
  }
};

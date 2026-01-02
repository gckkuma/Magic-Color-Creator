
import { GoogleGenAI, Type } from "@google/genai";
import { Resolution, ColoringPage } from "../types";

export class GeminiService {
  private static getAI() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  static async checkApiKey(): Promise<boolean> {
    try {
      if (typeof window.aistudio?.hasSelectedApiKey === 'function') {
        return await window.aistudio.hasSelectedApiKey();
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  static async requestApiKey(): Promise<void> {
    if (typeof window.aistudio?.openSelectKey === 'function') {
      await window.aistudio.openSelectKey();
    }
  }

  static async generateColoringImage(prompt: string, resolution: Resolution): Promise<string> {
    const ai = this.getAI();
    // Optimized prompt for "thick lines" and "printable" quality
    const fullPrompt = `${prompt}. Style: Professional children's coloring book. Thick, clean black outlines. Pure white background. No colors, no gray, no shading, no textures. High contrast. Vector-like clean lines. Suitable for printing and coloring with crayons.`;
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [{ text: fullPrompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: resolution
          }
        },
      });

      if (!response.candidates?.[0]?.content?.parts) {
        throw new Error("The magic failed to manifest an image.");
      }

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      throw new Error("No magic drawing found in the response.");
    } catch (error: any) {
      if (error.message?.includes("Requested entity was not found")) {
        await this.requestApiKey();
        throw new Error("Please select your API key to continue the magic.");
      }
      throw error;
    }
  }

  static async getPagePrompts(theme: string, childName: string): Promise<string[]> {
    const ai = this.getAI();
    const systemPrompt = `You are a creative children's book author. For the theme "${theme}" and child "${childName}", suggest 5 distinct, fun, and simple scenes for coloring.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: "List 5 coloring book scenes.",
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { 
              type: Type.STRING,
              description: "A short, descriptive scene for a coloring page."
            }
          }
        }
      });

      return JSON.parse(response.text || "[]");
    } catch (error) {
      console.error("Failed to fetch prompts", error);
      // Fallback if JSON fails
      return [
        `${childName} having a fun adventure with ${theme}`,
        `${theme} exploration scene`,
        `A friendly character in the ${theme} world`,
        `Magic ${theme} landscape`,
        `Happy ${childName} and friends in ${theme}`
      ];
    }
  }

  static async chat(messages: { role: 'user' | 'assistant', content: string }[]): Promise<string> {
    const ai = this.getAI();
    const history = messages.slice(0, -1).map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));

    const chatSession = ai.chats.create({
      model: 'gemini-3-pro-preview',
      history: history as any,
      config: {
        systemInstruction: "You are 'Sparky', the Magic Color Creator assistant. You love helping parents and kids brainstorm wild, imaginative themes for coloring books. You suggest themes like 'Space Hamsters', 'Underwater Castles', or 'Robot Tea Parties'. Keep it short, encouraging, and whimsical.",
      },
    });

    const lastMessage = messages[messages.length - 1].content;
    const response = await chatSession.sendMessage({ message: lastMessage });
    return response.text || "My magic wand is a bit sleepy. Try asking again!";
  }
}


import { GoogleGenAI, Type } from "@google/genai";
import type { QuizQuestion, SHLReport } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const geminiService = {
  analyzeSHLData: async (pdfPart: { inlineData: { data: string; mimeType: string } }): Promise<SHLReport> => {
    const promptPart = {
      text: `Analyze the attached SHL Assessment Report PDF. 
      Strictly extract the following detailed data points from the SVAR (Spoken) and WriteX (Written) sections.
      IMPORTANT: Return ONLY raw JSON. No markdown code blocks (no \`\`\`json). No explanatory text.
      
      Fields to extract:
      - Candidate Name
      - Email
      - Test Date (string)
      - CEFR Level (The overall or SVAR CEFR result like A2, B1, etc.)
      
      SVAR (Spoken) Sub-scores (0-100):
      - overall
      - pronunciation
      - fluency
      - activeListening (often listed as 'Listening' or 'Active Listening')
      - understanding (often 'Spoken Understanding')
      - vocabulary
      - grammar
      
      WriteX (Written) Sub-scores (0-100):
      - content
      - grammar

      JSON schema: 
      { 
        "candidateName": "string", 
        "email": "string", 
        "testDate": "string",
        "cefrLevel": "string", 
        "svar": {
          "overall": number,
          "pronunciation": number,
          "fluency": number,
          "activeListening": number,
          "understanding": number,
          "vocabulary": number,
          "grammar": number
        },
        "writex": {
          "content": number,
          "grammar": number
        }
      }`
    };

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [pdfPart, promptPart]
      },
      config: { 
        responseMimeType: "application/json"
      }
    });

    const rawText = response.text;
    if (!rawText) throw new Error("Empty response from Gemini Engine");

    try {
      const cleanedJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanedJson);
    } catch (e) {
      console.error("[geminiService] JSON Parse Error. Raw text was:", rawText);
      throw new Error("Failed to parse detailed SHL data. Ensure the PDF contains SVAR and WriteX results.");
    }
  },

  analyzeResourceUrl: async (url: string) => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze this language learning URL: ${url}. 
      Determine: 
      1. Short catchy title.
      2. CEFR Level (A1, A2, B1, B2, C1).
      3. Primary skill tag (Grammar, Listening, Speaking, Vocabulary, Fluency).
      4. Brief learning objective.
      Return as raw JSON. No markdown.`,
      config: { responseMimeType: "application/json" }
    });
    
    const cleanedJson = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanedJson);
  },

  generateQuizForResource: async (title: string, description: string): Promise<QuizQuestion[]> => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate 5 multiple-choice questions for a professional language training quiz.
      Topic: ${title}. 
      Context: ${description}.
      Level: Intermediate Professional.
      Return an array of objects. No markdown.`,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswer: { type: Type.NUMBER },
              explanation: { type: Type.STRING }
            }
          }
        }
      }
    });
    const cleanedJson = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanedJson);
  },

  generateWorksheetQuestions: async (quizId: string, level?: string): Promise<QuizQuestion[]> => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate 5 professional assessment questions for ${quizId}. 
      Target Level: ${level || 'Intermediate'}.
      Include various types: 'listening', 'reading', 'speaking'.
      Return raw JSON. No markdown.`,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswer: { type: Type.NUMBER },
              type: { type: Type.STRING },
              context: { type: Type.STRING },
              speakingPrompt: { type: Type.STRING }
            }
          }
        }
      }
    });
    const cleanedJson = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanedJson);
  }
};

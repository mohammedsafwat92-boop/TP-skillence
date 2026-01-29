
import { GoogleGenAI, Type } from "@google/genai";
import type { QuizQuestion, SHLReport } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const geminiService = {
  analyzeSHLData: async (rawText: string): Promise<SHLReport> => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extract ONLY language proficiency scores and candidate details from this SHL Assessment text.
      IGNORE all sections regarding Personality, Typing Speed, or Cognitive/Analytical ability.
      
      Return JSON only. Format: 
      { 
        "candidateName": "string", 
        "email": "string", 
        "cefrLevel": "A1-C1", 
        "grammar": 0-100, 
        "vocabulary": 0-100, 
        "fluency": 0-100, 
        "pronunciation": 0-100,
        "overallSpokenScore": 0-100
      }.
      If a value is missing, use "Unknown" or 0.
      Text: ${rawText}`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text);
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
      Return as JSON.`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text);
  },

  generateQuizForResource: async (title: string, description: string): Promise<QuizQuestion[]> => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate 5 multiple-choice questions for a professional language training quiz.
      Topic: ${title}. 
      Context: ${description}.
      Level: Intermediate Professional.
      Return an array of objects: { "question": "string", "options": ["A", "B", "C", "D"], "correctAnswer": 0-3, "explanation": "string" }`,
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
    return JSON.parse(response.text);
  },

  generateWorksheetQuestions: async (quizId: string, level?: string): Promise<QuizQuestion[]> => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate 5 professional assessment questions for ${quizId}. 
      Target Level: ${level || 'Intermediate'}.
      Include various types: 'listening' (provide context for audio), 'reading' (provide text), 'speaking' (provide a prompt).
      Return JSON array: { "question": "string", "options": ["A", "B", "C", "D"], "correctAnswer": 0-3, "type": "listening"|"reading"|"speaking", "context": "string", "speakingPrompt": "string" }`,
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
    return JSON.parse(response.text);
  }
};

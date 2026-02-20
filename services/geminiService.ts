
import { GoogleGenAI, Type } from "@google/genai";
import type { QuizQuestion, SHLReport } from '../types';

const API_KEY = (import.meta as any).env?.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey: API_KEY });

/**
 * Helper to handle rate limits (429 errors) with exponential backoff.
 */
const withRetry = async <T>(fn: () => Promise<T>, maxRetries = 3, initialDelay = 2000): Promise<T> => {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const errorMsg = error?.toString() || "";
      if (errorMsg.includes("429") || errorMsg.includes("RESOURCE_EXHAUSTED")) {
        const backoff = initialDelay * Math.pow(2, i);
        console.warn(`[Gemini] Rate limited. Retrying in ${backoff}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
};

export const geminiService = {
  enrichResourceMetadata: async (title: string, url: string): Promise<{ tags: string, level: string, objective: string }> => {
    try {
      if (!API_KEY) throw new Error("API Key missing");

      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemma-3-27b-it:generateContent?key=${API_KEY}`;
      
      const prompt = `Act as an L&D Data Extractor. Analyze this training resource:
      Title: ${title}
      URL: ${url}

      Extract and return STRICTLY a JSON object with these fields:
      - "tags": 3-5 specific sub-skills (e.g., Pronunciation, Fluency, Grammar, Active Listening) combined into a single comma-separated string.
      - "level": A CEFR level (A1, A2, B1, B2, C1, C2) or "ALL".
      - "objective": A 1-sentence learning objective based on the title.

      Return ONLY the JSON object. No markdown, no backticks, no preamble.`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) throw new Error(`API Error: ${response.statusText}`);

      const data = await response.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      // Regex logic to clean the AI's text response
      const cleanedJson = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
      
      return JSON.parse(cleanedJson);
    } catch (error) {
      console.error("Gemma 3 Enrichment Error:", error);
      return { 
        tags: "General", 
        level: "ALL", 
        objective: "General Training" 
      };
    }
  },

  analyzeSHLData: async (pdfPart: { inlineData: { data: string; mimeType: string } }): Promise<SHLReport> => {
    return withRetry(async () => {
      const promptPart = {
        text: `Analyze the attached SHL Assessment Report PDF. 
        Extract the following data into a strict JSON structure.
        
        REQUIRED FIELDS:
        - candidateName: Full name of the candidate.
        - email: Candidate's email address.
        - cefrLevel: The overall or SVAR CEFR result (e.g., A2, B1, B2).
        - svar: Nested object containing sub-scores (0-100) for:
            - overall
            - pronunciation
            - fluency
            - activeListening
            - vocabulary
            - grammar
        - writex: Nested object containing sub-scores (0-100) for:
            - content
            - grammar

        IMPORTANT: Return ONLY raw JSON. No markdown code blocks, no backticks, no preamble.
        
        JSON schema: 
        { 
          "candidateName": "string", 
          "email": "string", 
          "cefrLevel": "string", 
          "svar": {
            "overall": number,
            "pronunciation": number,
            "fluency": number,
            "activeListening": number,
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

      const cleanedJson = rawText
        .replace(/```json/gi, '')
        .replace(/```/gi, '')
        .trim();
      return JSON.parse(cleanedJson);
    });
  },

  /**
   * AI Content Auditor
   * Performs deep analysis of a resource to map it to skills and sub-skills.
   */
  analyzeResource: async (resource: { title: string; url: string; objective: string }) => {
    return withRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: `Perform an expert content audit for this corporate training resource:
        Title: ${resource.title}
        Objective: ${resource.objective}
        URL: ${resource.url}

        Task:
        1. Map to exactly ONE primary skill category from: [Listening, Speaking, Reading, Writing].
        2. Identify 2-3 specific sub-skills (e.g., Grammar, Vocabulary, Pronunciation, Tone, Fluency, Culture, Efficiency).
        3. Refine the 'objective' string to be more professional and action-oriented.

        Return ONLY a JSON object with this schema:
        {
          "primarySkill": "string",
          "subSkills": ["string"],
          "refinedObjective": "string"
        }`,
        config: { 
          responseMimeType: "application/json"
        }
      });

      const cleaned = response.text.replace(/```json/gi, '').replace(/```/gi, '').trim();
      return JSON.parse(cleaned);
    });
  },

  analyzeResourceUrl: async (url: string) => {
    return withRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze this language learning URL: ${url}. 
        Determine: 1. Title, 2. CEFR Level, 3. Skill Tag (Grammar, Listening, Speaking, Vocabulary, Fluency), 4. Objective.
        Return as raw JSON. No markdown.`,
        config: { responseMimeType: "application/json" }
      });
      const cleaned = response.text.replace(/```json/gi, '').replace(/```/gi, '').trim();
      return JSON.parse(cleaned);
    });
  },

  generateQuizForResource: async (title: string, description: string): Promise<QuizQuestion[]> => {
    return withRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate 5 multiple-choice questions for: ${title}. ${description}. Return as JSON array. No markdown.`,
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
      const cleaned = response.text.replace(/```json/gi, '').replace(/```/gi, '').trim();
      return JSON.parse(cleaned);
    });
  },

  generateWorksheetQuestions: async (quizId: string, level?: string): Promise<QuizQuestion[]> => {
    return withRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate 5 professional assessment questions for ${quizId} at ${level || 'Intermediate'} level. Return as JSON array. No markdown.`,
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
      const cleaned = response.text.replace(/```json/gi, '').replace(/```/gi, '').trim();
      return JSON.parse(cleaned);
    });
  }
};

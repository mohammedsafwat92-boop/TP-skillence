
import type { QuizQuestion, SHLReport } from '../types';

const API_KEY = (import.meta as any).env?.VITE_GEMINI_API_KEY || "";

const callGemini = async (prompt: string, inlineData?: { data: string; mimeType: string }) => {
  if (!API_KEY) {
    console.warn("Gemini API Key is missing. Returning fallback.");
    return null;
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
  
  const parts: any[] = [{ text: prompt }];
  if (inlineData) {
    parts.push({
      inline_data: {
        mime_type: inlineData.mimeType,
        data: inlineData.data
      }
    });
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API Error: ${response.statusText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!text) throw new Error("Empty response from Gemini");
  
  return JSON.parse(text.replace(/```json/gi, '').replace(/```/gi, '').trim());
};

export const geminiService = {
  enrichResourceMetadata: async (title: string, url: string): Promise<{ tags: string, level: string, objective: string }> => {
    try {
      const prompt = `Act as an L&D Data Extractor. Analyze this training resource:
      Title: ${title}
      URL: ${url}

      Extract and return STRICTLY a JSON object with these fields:
      - "tags": 3-5 specific sub-skills (e.g., Pronunciation, Fluency, Grammar, Active Listening) combined into a single comma-separated string.
      - "level": A CEFR level (A1, A2, B1, B2, C1, C2) or "ALL".
      - "objective": A 1-sentence learning objective based on the title.

      Return ONLY the JSON object. No markdown, no backticks, no preamble.`;

      const result = await callGemini(prompt);
      return result || { tags: "General", level: "ALL", objective: "General Training" };
    } catch (error) {
      console.error("Gemini Enrichment Error:", error);
      return { tags: "General", level: "ALL", objective: "General Training" };
    }
  },

  analyzeSHLData: async (pdfPart: { inlineData: { data: string; mimeType: string } }): Promise<SHLReport> => {
    try {
      const prompt = `Analyze the attached SHL Assessment Report PDF. 
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

      IMPORTANT: Return ONLY raw JSON.
      
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
      }`;

      const result = await callGemini(prompt, pdfPart.inlineData);
      return result || { candidateName: "Unknown", email: "", cefrLevel: "N/A", svar: {}, writex: {} };
    } catch (error) {
      console.error("SHL Analysis Error:", error);
      return { candidateName: "Error", email: "", cefrLevel: "N/A", svar: {}, writex: {} } as any;
    }
  },

  analyzeResource: async (resource: { title: string; url: string; objective: string }) => {
    try {
      const prompt = `Perform an expert content audit for this corporate training resource:
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
      }`;

      const result = await callGemini(prompt);
      return result || { primarySkill: "General", subSkills: [], refinedObjective: resource.objective };
    } catch (error) {
      console.error("Resource Analysis Error:", error);
      return { primarySkill: "General", subSkills: [], refinedObjective: resource.objective };
    }
  },

  analyzeResourceUrl: async (url: string) => {
    try {
      const prompt = `Analyze this language learning URL: ${url}. 
      Determine: 1. Title, 2. CEFR Level, 3. Skill Tag (Grammar, Listening, Speaking, Vocabulary, Fluency), 4. Objective.
      Return as raw JSON. No markdown.`;

      const result = await callGemini(prompt);
      return result || { title: "Unknown", level: "ALL", tag: "General", objective: "" };
    } catch (error) {
      console.error("URL Analysis Error:", error);
      return { title: "Error", level: "ALL", tag: "General", objective: "" };
    }
  },

  generateQuizForResource: async (title: string, description: string): Promise<QuizQuestion[]> => {
    try {
      const prompt = `Generate 5 multiple-choice questions for: ${title}. ${description}. Return as JSON array.
      Each question must have: question (string), options (string array), correctAnswer (number index), explanation (string).`;

      const result = await callGemini(prompt);
      return result || [];
    } catch (error) {
      console.error("Quiz Generation Error:", error);
      return [];
    }
  },

  generateWorksheetQuestions: async (quizId: string, level?: string): Promise<QuizQuestion[]> => {
    try {
      const prompt = `Generate 5 professional assessment questions for ${quizId} at ${level || 'Intermediate'} level. Return as JSON array.
      Each question must have: question, options, correctAnswer, type, context, speakingPrompt.`;

      const result = await callGemini(prompt);
      return result || [];
    } catch (error) {
      console.error("Worksheet Generation Error:", error);
      return [];
    }
  }
};

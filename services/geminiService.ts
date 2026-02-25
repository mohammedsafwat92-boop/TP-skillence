
import type { QuizQuestion, SHLReport } from '../types';

const API_KEY = (import.meta as any).env?.VITE_GEMINI_API_KEY || "";
const MODEL_URL = `https://generativelanguage.googleapis.com/v1alpha/models/gemma-3-27b-it:generateContent?key=${API_KEY}`;
const BACKUP_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

const callGemini = async (prompt: string) => {
  if (!API_KEY) {
    console.warn("Gemini API Key is missing. Returning fallback.");
    return null;
  }

  const executeRequest = async (url: string) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  };

  try {
    // Primary Attempt: Gemma 3 27B
    let result = await executeRequest(MODEL_URL);

    // Fallback logic for 404 or 400 errors
    if (!result.ok && (result.status === 404 || result.status === 400)) {
      console.warn("Gemma 3 27B failed, switching to backup...");
      result = await executeRequest(BACKUP_URL);
    }

    if (!result.ok) {
      throw new Error(JSON.stringify(result.data.error));
    }

    const textResponse = result.data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResponse) throw new Error("Empty response from Gemini");
    
    return textResponse;
  } catch (error) {
    console.error("Gemini Call Error:", error);
    throw error;
  }
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

      const textResponse = await callGemini(prompt);
      if (!textResponse) throw new Error("No response");
      
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON object found");
      
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error("Gemini Enrichment Error:", error);
      return { tags: "General", level: "ALL", objective: "General Training" };
    }
  },

  analyzeSHLData: async (pdfPart: { inlineData: { data: string; mimeType: string } }): Promise<SHLReport> => {
    try {
      const prompt = `Analyze the attached SHL Assessment Report. 
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

      const textResponse = await callGemini(prompt);
      if (!textResponse) throw new Error("No response");
      
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON object found");
      
      return JSON.parse(jsonMatch[0]);
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

      const textResponse = await callGemini(prompt);
      if (!textResponse) throw new Error("No response");
      
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON object found");
      
      return JSON.parse(jsonMatch[0]);
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

      const textResponse = await callGemini(prompt);
      if (!textResponse) throw new Error("No response");
      
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON object found");
      
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error("URL Analysis Error:", error);
      return { title: "Error", level: "ALL", tag: "General", objective: "" };
    }
  },

  generateQuizForResource: async (title: string, description: string): Promise<QuizQuestion[]> => {
    try {
      const prompt = `Generate 5 multiple-choice questions for: ${title}. ${description}. Return as JSON array.
      Each question must have: question (string), options (string array), correctAnswer (number index), explanation (string).`;

      const textResponse = await callGemini(prompt);
      if (!textResponse) throw new Error("No response");
      
      const arrayMatch = textResponse.match(/\[[\s\S]*\]/);
      if (!arrayMatch) throw new Error("No JSON array found");
      
      return JSON.parse(arrayMatch[0]);
    } catch (error) {
      console.error("Quiz Generation Error:", error);
      return [];
    }
  },

  generateQuiz: async (title: string, url: string, type: string): Promise<QuizQuestion[]> => {
    try {
      const prompt = `Create a 3-question multiple-choice quiz based on this resource: Title: '${title}', URL: '${url}'. You must return ONLY a JSON array. Do not write any other text. Format: [{ "question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": "...", "explanation": "..." }]`;

      const textResponse = await callGemini(prompt);
      if (!textResponse) throw new Error("No response");
      
      const arrayMatch = textResponse.match(/\[[\s\S]*\]/);
      if (!arrayMatch) throw new Error("No JSON array found");
      
      const result = JSON.parse(arrayMatch[0]);
      if (!Array.isArray(result)) return [];
      
      // Ensure correctAnswer is a number index for compatibility with QuizQuestion type
      return result.map((q: any) => {
        let correctIdx = q.correctAnswer;
        if (typeof q.correctAnswer === 'string') {
          // Try to find the string in options
          const foundIdx = q.options.indexOf(q.correctAnswer);
          if (foundIdx !== -1) {
            correctIdx = foundIdx;
          } else {
            // Try to parse as number
            const parsed = parseInt(q.correctAnswer, 10);
            correctIdx = isNaN(parsed) ? 0 : parsed;
          }
        }
        return {
          question: q.question,
          options: q.options,
          correctAnswer: correctIdx,
          explanation: q.explanation
        };
      });
    } catch (error) {
      console.error("Quiz Gen Error:", error);
      return [];
    }
  },

  generateWorksheetQuestions: async (quizId: string, level?: string): Promise<QuizQuestion[]> => {
    try {
      const prompt = `Generate 5 professional assessment questions for ${quizId} at ${level || 'Intermediate'} level. Return as JSON array.
      Each question must have: question, options, correctAnswer, type, context, speakingPrompt.`;

      const textResponse = await callGemini(prompt);
      if (!textResponse) throw new Error("No response");
      
      const arrayMatch = textResponse.match(/\[[\s\S]*\]/);
      if (!arrayMatch) throw new Error("No JSON array found");
      
      return JSON.parse(arrayMatch[0]);
    } catch (error) {
      console.error("Worksheet Generation Error:", error);
      return [];
    }
  }
};


/// <reference types="vite/client" />

import type { QuizQuestion, SHLReport } from '../types';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
if (!API_KEY) console.error("[geminiService] FATAL: VITE_GEMINI_API_KEY is missing from the environment.");

const GEMMA_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemma-3-27b-it:generateContent?key=${API_KEY}`;
const BACKUP_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

const callGemini = async (prompt: string) => {
  if (!API_KEY) {
    console.error("Missing API Key");
    return null;
  }

  const payload = {
    contents: [{ role: "user", parts: [{ text: prompt }] }]
  };

  try {
    // Primary (Gemma 3)
    let response = await fetch(GEMMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    // Backup (Gemini 2.5 Flash)
    if (!response.ok) {
      console.warn("Gemma 3 rejected the request. Falling back to Gemini 2.5 Flash...");
      response = await fetch(BACKUP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Both AI models failed: ${JSON.stringify(errorData.error)}`);
    }

    const data = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResponse) throw new Error("Empty response from AI");
    
    return textResponse;
  } catch (error) {
    console.error("AI Call Error:", error);
    throw error;
  }
};

async function scrapeUrl(url: string) {
  try {
    // 1. YouTube Native Extraction via Gemini 2.5 Flash
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
      const YT_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
      
      const payload = {
        contents: [{
          role: "user",
          parts: [
            { fileData: { fileUri: url, mimeType: "video/x-youtube" } },
            { text: "Analyze this video in deep detail. Extract all core educational concepts, facts, methodologies, and key takeaways into a highly dense master summary. CRITICAL: You must compress and limit your entire response to a maximum of 40,000 characters (approx 10,000 tokens) to ensure it fits into smaller AI context windows later. Return plain text only, no markdown." }
          ]
        }]
      };

      const response = await fetch(YT_URL, { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(payload) 
      });
      
      if (!response.ok) {
        console.error("Gemini 2.5 Flash failed to scrape YouTube video.");
        return null;
      }
      
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
    }

    // 2. Standard Webpage Extraction via Jina AI
    const response = await fetch(`https://r.jina.ai/${url}`, { headers: { "Accept": "text/plain" } });
    if (!response.ok) return null;
    const text = await response.text();
    return text.substring(0, 40000); // Strictly limits standard web pages to ~10k tokens
  } catch (e) {
    console.error("Scraping failed:", e);
    return null;
  }
}

function chunkText(text: string, maxLength = 30000) {
  const chunks = [];
  for (let i = 0; i < text.length; i += maxLength) {
    chunks.push(text.substring(i, i + maxLength));
  }
  return chunks;
}

async function condenseLargeContent(rawText: string) {
  if (!rawText) return "";
  const chunks = chunkText(rawText);
  if (chunks.length === 1) return rawText; // Already small enough

  let masterSummary = "";
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
  const GEMMA_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemma-3-27b-it:generateContent?key=${API_KEY}`;

  for (const chunk of chunks) {
    const payload = {
      contents: [{
        role: "user",
        parts: [{ text: "Extract and summarize all core educational concepts, facts, and key takeaways from this section of the document. Return plain text only. Do not use markdown.\n\n" + chunk }]
      }]
    };
    try {
      const response = await fetch(GEMMA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        const data = await response.json();
        masterSummary += (data.candidates?.[0]?.content?.parts?.[0]?.text || "") + "\n\n";
      }
    } catch (e) {
      console.error("Chunk processing failed", e);
    }
  }
  return masterSummary;
}

export const geminiService = {
  scrapeUrl,
  enrichResourceMetadata: async (title: string, url: string): Promise<{ tags: string, level: string, objective: string, scrapedText?: string }> => {
    if (!API_KEY) return { tags: "General", level: "ALL", objective: "General Training" };
    try {
      let scrapedText = await scrapeUrl(url);
      if (scrapedText) {
        scrapedText = scrapedText.substring(0, 40000);
      }
      const condensedText = await condenseLargeContent(scrapedText || "");
      const prompt = `Act as an L&D Data Extractor. Analyze this training resource:
      Title: ${title}
      URL: ${url}
      ${condensedText ? `Content: ${condensedText.substring(0, 40000)}` : ''}

      Extract and return STRICTLY a JSON object with these fields:
      - "tags": Analyze the core educational content and return an array of 'tags'. To ensure the content matches the learner auto-assignment matrix, you MUST prioritize using these exact tags if the content relates to them: 'speaking', 'pronunciation', 'fluency', 'listening', 'active listening', 'grammar', 'writing', 'vocabulary'. (Return as a single comma-separated string).
      - "level": A CEFR level (A1, A2, B1, B2, C1, C2) or "ALL".
      - "objective": A 1-sentence learning objective based on the title and content.
      - "duration": Estimate the time in minutes it will take a learner to consume and understand this content (return a number only). Base this on the text length or standard video length.

      CRITICAL SKILL CATEGORIZATION: You MUST determine the primary learning skill of this content and include at least one of these exact words in the 'tags' array: 'listening', 'reading', 'writing', or 'speaking'. Do not use variations of these words.

      Return ONLY the JSON object. No markdown, no backticks, no preamble.`;

      const textResponse = await callGemini(prompt);
      if (!textResponse) throw new Error("No response");
      
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON object found");
      
      const result = JSON.parse(jsonMatch[0]);
      return { ...result, scrapedText: scrapedText || "" };
    } catch (error) {
      console.error("Gemini Enrichment Error:", error);
      return { tags: "General", level: "ALL", objective: "General Training" };
    }
  },

  analyzeSHLData: async (pdfPart: { inlineData: { data: string; mimeType: string } }): Promise<SHLReport> => {
    if (!API_KEY) return { candidateName: "Unknown", email: "", cefrLevel: "N/A", svar: {}, writex: {} } as any;
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

  analyzeResource: async (resource: { title: string; url: string; objective: string; scrapedText?: string }) => {
    if (!API_KEY) return { primarySkill: "General", subSkills: [], refinedObjective: resource.objective };
    try {
      const rawContent = resource.scrapedText || await scrapeUrl(resource.url);
      const content = await condenseLargeContent(rawContent || "");
      const prompt = `Perform an expert content audit for this corporate training resource:
      Title: ${resource.title}
      Objective: ${resource.objective}
      URL: ${resource.url}
      ${content ? `Content: ${content.substring(0, 40000)}` : ''}

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
    if (!API_KEY) return { title: "Error", level: "ALL", tag: "General", objective: "" };
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
    if (!API_KEY) return [];
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

  generateQuiz: async (title: string, url: string, type: string, scrapedText?: string): Promise<QuizQuestion[]> => {
    if (!API_KEY) return [];
    try {
      const rawContent = scrapedText || await scrapeUrl(url);
      const content = await condenseLargeContent(rawContent || "");
      const prompt = `Create a rigorous 5-question multiple-choice quiz based strictly on the following content summary. Ensure the questions test deep comprehension, not just surface facts. Return exactly 5 questions.
      Title: '${title}'
      URL: '${url}'
      ${content ? `Content: ${content.substring(0, 40000)}` : ''}
      
      You must return ONLY a JSON array. Do not write any other text. 
      Format: [{ "question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": "...", "explanation": "..." }]`;

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
    if (!API_KEY) return [];
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

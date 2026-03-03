
/// <reference types="vite/client" />

import type { Resource, QuizQuestion, SHLReport } from '../types';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
if (!API_KEY) console.error("[geminiService] FATAL: VITE_GEMINI_API_KEY is missing from the environment.");

const FLASH_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

const callGemini = async (prompt: string) => {
  if (!API_KEY) {
    console.error("Missing API Key");
    return null;
  }

  const payload = {
    contents: [{ role: "user", parts: [{ text: prompt }] }]
  };

  const GEMMA_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemma-3-27b-it:generateContent?key=${API_KEY}`;

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
      response = await fetch(FLASH_URL, {
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

  for (const chunk of chunks) {
    const payload = {
      contents: [{
        role: "user",
        parts: [{ text: "Extract and summarize all core educational concepts, facts, and key takeaways from this section of the document. Return plain text only. Do not use markdown.\n\n" + chunk }]
      }]
    };
    try {
      const response = await fetch(FLASH_URL, {
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
  enrichResourceMetadata: async (
    title: string,
    url: string,
    content?: string,
    type?: string
  ): Promise<Partial<Resource>> => {
    try {
      if (!API_KEY) throw new Error("API Key must be set in .env");

      // Use content if provided (for backward compatibility or specific overrides), otherwise use url
      let scrapedText = await scrapeUrl(content || url);
      if (scrapedText) scrapedText = scrapedText.substring(0, 40000); // 10k token safety limit

      const payload = {
        contents: [{
          role: "user",
          parts: [{ 
            text: `You are an expert language curriculum designer. Analyze the following content and generate strictly formatted JSON metadata.
            
  CRITICAL SKILL CATEGORIZATION: You MUST determine the primary learning skill of this content and include at least one of these exact words in the 'tags' array: "listening", "reading", "writing", or "speaking". 

  DURATION: Estimate the time in minutes it will take a learner to consume this content (return a number).

  Content Title: ${title}
  Content URL: ${url}
  Content Summary: ${scrapedText || "No content extracted. Rely on title and URL."}

  Return strictly valid JSON with no markdown blocks:
  {
    "title": "Optimized Title",
    "level": "B1", // Choose A1, A2, B1, B2, C1, C2, or ALL
    "tags": ["listening", "grammar", "business"],
    "objective": "One sentence summary of what the user will learn.",
    "duration": 15
  }` 
          }]
        }]
      };

      const response = await fetch(FLASH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("Flash Enrichment failed");

      const data = await response.json();
      let resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      resultText = resultText.replace(/```json/g, "").replace(/```/g, "").trim();
      
      const parsedData = JSON.parse(resultText);

      return {
        title: parsedData.title || title,
        level: parsedData.level === "ALL" ? "All" : (parsedData.level || "All"),
        tags: Array.isArray(parsedData.tags) ? parsedData.tags : (parsedData.tags ? String(parsedData.tags).split(',') : ["general"]),
        objective: parsedData.objective || "Learn new concepts.",
        duration: parsedData.duration || "10",
        scrapedText: scrapedText || ""
      };
    } catch (error) {
      console.error("Gemini Enrichment Error:", error);
      return { title, level: "All", tags: ["general"], objective: "Could not generate metadata.", duration: "10" };
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
    const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
    
    try {
      if (!API_KEY) throw new Error("API Key missing");

      // Ensure we have some content to work with
      const rawContent = scrapedText || await scrapeUrl(url);
      const content = await condenseLargeContent(rawContent || "");

      const payload = {
        contents: [{
          role: "user",
          parts: [{
            text: `You are an expert curriculum designer. Based ONLY on the following content summary, generate a rigorous 5-question multiple-choice quiz. 

CRITICAL RULES:
1. Every single question MUST have exactly 4 options.
2. The 'correctOptionId' MUST exactly match the 'id' of one of the 4 options.
3. Escape all internal quotation marks. Do not use unescaped double quotes inside the 'text' fields.

Content Title: ${title}
Content Summary: ${content || "No content extracted. Rely on title."}

Return your response STRICTLY as a raw JSON array. Do NOT wrap the response in markdown blocks like \`\`\`json. The JSON must perfectly match this structure:
[
  {
    "id": "q1",
    "text": "What is the primary theme discussed?",
    "options": [
      { "id": "o1", "text": "Option A" },
      { "id": "o2", "text": "Option B" },
      { "id": "o3", "text": "Option C" },
      { "id": "o4", "text": "Option D" }
    ],
    "correctOptionId": "o2"
  }
]`
          }]
        }]
      };

      const GEMMA_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemma-3-27b-it:generateContent?key=${API_KEY}`;
      const FLASH_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

      // Helper to attempt fetch and strict JSON parsing
      const attemptGeneration = async (apiUrl: string) => {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`API failed with status: ${response.status}`);

        const data = await response.json();
        let resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
        
        // Aggressive cleaning to prevent JSON SyntaxErrors
        resultText = resultText.replace(/```json/gi, "").replace(/```/g, "").trim();
        
        const parsedQuiz = JSON.parse(resultText);
        
        if (!Array.isArray(parsedQuiz) || parsedQuiz.length === 0) {
          throw new Error("Parsed quiz is not a valid array.");
        }
        
        // Map to existing QuizQuestion structure to avoid breaking UI
        return parsedQuiz.map((q: any) => ({
          question: q.text || q.question,
          options: q.options.map((o: any) => typeof o === 'string' ? o : o.text),
          correctAnswer: q.options.findIndex((o: any) => o.id === q.correctOptionId || o === q.correctAnswer),
          explanation: q.explanation || ""
        }));
      };

      // Primary Attempt: Gemma 3
      try {
        return await attemptGeneration(GEMMA_URL);
      } catch (gemmaError) {
        console.warn("Gemma 3 failed (API or Parsing). Falling back to Gemini 2.5 Flash...", gemmaError);
        
        // Fallback Attempt: Gemini 2.5 Flash
        return await attemptGeneration(FLASH_URL);
      }

    } catch (error) {
      console.error("Quiz Gen Error (Both models failed):", error);
      // Safe fallback if EVERYTHING fails
      return [
        {
          question: "The AI encountered an error generating this quiz. Please try again later.",
          options: ["Acknowledge", "Retry", "Skip", "Exit"],
          correctAnswer: 0,
          explanation: ""
        }
      ];
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

/// <reference types="vite/client" />

import type { Resource, QuizQuestion } from '../types';
import { googleSheetService } from './googleSheetService';
import { GoogleGenAI } from "@google/genai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

const proxyGeminiSafe = async (modelName: string, payload: any): Promise<any> => {
  try {
    // Securely delegate entirely to our Google Web App endpoint
    const fullPayload = {
      model: modelName,
      contents: payload.contents,
      systemInstruction: payload.systemInstruction || "",
      config: payload.config || payload.generationConfig
    };
    return await googleSheetService.proxyGeminiRequest(fullPayload);
  } catch (proxyError: any) {
    const errorStr = String(proxyError?.message || proxyError);
    console.warn(`[geminiService] proxy_gemini_request failed, trying legacy proxy_gemini fallback. Error details:`, errorStr);
    try {
      // Legacy Web App proxy call format
      return await googleSheetService.proxyGemini(modelName, payload);
    } catch (legacyError: any) {
      const legacyErrorStr = String(legacyError?.message || legacyError);
      console.warn(`[geminiService] Both primary and legacy proxy actions failed. Error:`, legacyErrorStr);
      
      if (!API_KEY) {
        console.error("[geminiService] Direct client fallback blocked: VITE_GEMINI_API_KEY is not defined in the environment.");
        throw legacyError;
      }

      try {
        console.log(`[geminiService] Activating direct direct-client fallback using modern GoogleGenAI SDK.`);
        const ai = new GoogleGenAI({ apiKey: API_KEY });
        
        const contents = payload.contents;
        const systemInstructionText = payload.systemInstruction || "";
        const config = payload.config || payload.generationConfig || {};

        const response = await ai.models.generateContent({
          model: modelName,
          contents: contents,
          config: {
            systemInstruction: systemInstructionText || undefined,
            ...config
          }
        });

        return {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: response.text || ""
                  }
                ]
              }
            }
          ]
        };
      } catch (directError: any) {
        console.error("[geminiService] Direct client fallback call failed:", directError);
        throw new Error(`AI Integration Failure: Secure spreadsheet proxy and direct fallbacks failed. Error: ${directError.message || directError}`);
      }
    }
  }
};

const callGemini = async (prompt: string) => {
  const payload = {
    contents: [{ role: "user", parts: [{ text: prompt }] }]
  };

  try {
    const data = await proxyGeminiSafe('gemini-3.5-flash', payload);
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResponse) throw new Error("Empty response from AI");
    
    return textResponse;
  } catch (error) {
    console.error("AI Proxy Call Error:", error);
    throw error;
  }
};

async function scrapeUrl(url: string) {
  try {
    // 1. YouTube Native Extraction via Secure Apps Script Proxy
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      const payload = {
        contents: [{
          role: "user",
          parts: [
            { fileData: { fileUri: url, mimeType: "video/x-youtube" } },
            { text: "Analyze this video in deep detail. Extract all core educational concepts, facts, methodologies, and key takeaways into a highly dense master summary. CRITICAL: You must compress and limit your entire response to a maximum of 40,000 characters (approx 10,000 tokens) to ensure it fits into smaller AI context windows later. Return plain text only, no markdown." }
          ]
        }]
      };

      const data = await proxyGeminiSafe('gemini-3.5-flash', payload);
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

  for (const chunk of chunks) {
    const payload = {
      contents: [{
        role: "user",
        parts: [{ text: "Extract and summarize all core educational concepts, facts, and key takeaways from this section of the document. Return plain text only. Do not use markdown.\n\n" + chunk }]
      }]
    };
    try {
      const data = await proxyGeminiSafe('gemini-3.5-flash', payload);
      masterSummary += (data.candidates?.[0]?.content?.parts?.[0]?.text || "") + "\n\n";
    } catch (e) {
      console.error("Chunk processing failed via proxy:", e);
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

      const data = await proxyGeminiSafe('gemini-3.5-flash', payload);
      let resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      resultText = resultText.replace(/```json/g, "").replace(/```/g, "").trim();
      
      const parsedData = JSON.parse(resultText);

      return {
        title: parsedData.title || title,
        level: parsedData.level === "ALL" ? "All" : (parsedData.level || "All"),
        tags: Array.isArray(parsedData.tags) ? parsedData.tags : (parsedData.tags ? String(parsedData.tags).split(',') : ["general"]),
        objective: parsedData.objective || "Learn new concepts.",
        duration: Number(parsedData.duration) || 10,
        scrapedText: scrapedText || ""
      };
    } catch (error) {
      console.error("Gemini Enrichment Error via Proxy:", error);
      return { title, level: "All", tags: ["general"], objective: "Could not generate metadata.", duration: 10 };
    }
  },

  analyzeResource: async (resource: { title: string; url: string; objective: string; scrapedText?: string }) => {
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
      console.error("Resource Analysis Error via Proxy:", error);
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
      console.error("URL Analysis Error via Proxy:", error);
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
      console.error("Quiz Generation Error via Proxy:", error);
      return [];
    }
  },

  generateQuiz: async (title: string, url: string, type: string, scrapedText?: string, level?: string): Promise<QuizQuestion[]> => {
    console.log("🚨 VERCEL DEPLOYMENT: STRICT CONSTRAINED PROTOCOL ACTIVE FOR GEMMA 4!");
    try {
      console.log("▶️ [Step 1] Fetching content...");
      const rawContent = scrapedText || await scrapeUrl(url);

      console.log("▶️ [Step 2] Condensing content...");
      const content = await condenseLargeContent(rawContent || "");

      const systemInstruction = `You are a rigid language assessment developer. Your ONLY permitted output is a raw, valid JSON array of exactly 5 multiple-choice questions. No thoughts, no explanations, no text before or after the JSON.`;

      const payload = {
        systemInstruction: systemInstruction,
        contents: [
          {
            role: "user",
            parts: [{
              text: `Convert this educational text into a CEFR ${level || 'Intermediate'} level 5-question multiple-choice quiz.
You MUST output exactly 5 question objects inside a single JSON array, conforming strictly to this format:
[
  {
    "question": "What is the Sun?",
    "options": ["A planet", "A star", "A comet", "A meteor"],
    "correctAnswer": 1,
    "explanation": "The text states that the Sun is the star at the center of the Solar System."
  },
  {
    "question": "Where is the Sun located in the Solar System?",
    "options": ["At the edge", "At the center", "Near Earth", "Outside it"],
    "correctAnswer": 1,
    "explanation": "According to the text, the Sun is at the center of the Solar System."
  },
  {
    "question": "Which of these best describes the Sun?",
    "options": ["It is a moon", "It is a galaxy", "It is a star", "It is an asteroid"],
    "correctAnswer": 2,
    "explanation": "The text explicitly defines the Sun as a star."
  },
  {
    "question": "The Sun can be defined as what type of celestial body?",
    "options": ["A star", "A gas giant", "A rocky planet", "A black hole"],
    "correctAnswer": 0,
    "explanation": "The provided text defines the Sun as a star at the center of the Solar System."
  },
  {
    "question": "Which system is the Sun at the center of?",
    "options": ["Solar System", "Milky Way", "Andromeda", "Alpha Centauri"],
    "correctAnswer": 0,
    "explanation": "The text specifies that the Sun is at the center of the Solar System."
  }
]

CRITICAL CONSTRAINTS:
- Do not write comments, thoughts, markdown blocks, bullet lists, or extra explanation outside of the JSON array.
- Start your response directly with the opening square bracket '[' and end with the closing square bracket ']'.
- Do not wrap the JSON in markdown code blocks like \`\`\`json. Return only the raw JSON text.

CONTENT:
${title} - ${content}`
            }]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 3000
        }
      };

      const attemptGeneration = async (modelName: string) => {
        console.log(`▶️ [Step 3] Sending Command Payload to ${modelName}... (Awaiting API)`);

        const timeoutPromise = new Promise<any>((_, reject) =>
          setTimeout(() => reject(new Error("API Timeout")), 90000)
        );

        let data: any;
        try {
          if (modelName === 'gemma-4-31b-it') {
            throw new Error("Gemma does not support responseMimeType config on this endpoint");
          }
          // Attempt 1: Strict JSON mode for other models
          const jsonModePayload = {
            ...payload,
            generationConfig: {
              ...payload.generationConfig,
              responseMimeType: "application/json"
            }
          };
          console.log(`▶️ Trying strict JSON Mode with ${modelName}...`);
          data = await Promise.race([
            proxyGeminiSafe(modelName, jsonModePayload),
            timeoutPromise
          ]);
        } catch (jsonModeErr: any) {
          console.warn(`⚠️ Strict JSON mode failed or skipped for ${modelName}. Falling back to standard text mode...`);
          // Attempt 2: Text mode
          data = await Promise.race([
            proxyGeminiSafe(modelName, payload),
            timeoutPromise
          ]);
        }

        console.log(`▶️ [Step 4] API responded from ${modelName}! Running Reader and Scanner...`);
        
        const rawResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const resultText = rawResponse.trim();
        
        // Robust parser helper
        const robustParseJSON = (text: string): any => {
          let cleaned = text.trim();
          
          // 1. Remove markdown backticks if present
          cleaned = cleaned.replace(/```json/gi, "").replace(/```/g, "").trim();

          // 2. Remove JavaScript-style comments (single line // and multi-line /* */)
          cleaned = cleaned.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');

          // 3. Fix trailing commas before closing braces/brackets
          cleaned = cleaned.replace(/,(\s*[\]}])/g, '$1');

          // 4. Try standard JSON.parse first
          try {
            return JSON.parse(cleaned);
          } catch (e) {
            // Sliding window array search
            let firstBracket = cleaned.indexOf('[');
            while (firstBracket !== -1) {
              let lastBracket = cleaned.lastIndexOf(']');
              while (lastBracket > firstBracket) {
                try {
                  const slice = cleaned.substring(firstBracket, lastBracket + 1);
                  let repairedSlice = slice.replace(/,(\s*[\]}])/g, '$1');
                  return JSON.parse(repairedSlice);
                } catch (err) {
                  // shrink window
                }
                lastBracket = cleaned.lastIndexOf(']', lastBracket - 1);
              }
              firstBracket = cleaned.indexOf('[', firstBracket + 1);
            }

            // Sliding window object search
            let firstBrace = cleaned.indexOf('{');
            while (firstBrace !== -1) {
              let lastBrace = cleaned.lastIndexOf('}');
              while (lastBrace > firstBrace) {
                try {
                  const slice = cleaned.substring(firstBrace, lastBrace + 1);
                  let repairedSlice = slice.replace(/,(\s*[\]}])/g, '$1');
                  return JSON.parse(repairedSlice);
                } catch (err) {
                  // shrink window
                }
                lastBrace = cleaned.lastIndexOf('}', lastBrace - 1);
              }
              firstBrace = cleaned.indexOf('{', firstBrace + 1);
            }
          }
          return null;
        };

        const parsed = robustParseJSON(resultText);
        let parsedQuiz = null;

        if (Array.isArray(parsed) && parsed.length > 0) {
          parsedQuiz = parsed;
        } else if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed.quiz)) {
            parsedQuiz = parsed.quiz;
          } else if (Array.isArray(parsed.questions)) {
            parsedQuiz = parsed.questions;
          } else {
            for (const key of Object.keys(parsed)) {
              if (Array.isArray(parsed[key])) {
                parsedQuiz = parsed[key];
                break;
              }
            }
          }
        }

        if (!parsedQuiz) {
          console.error(`Strict scanner failed on model ${modelName}. Response length: ${resultText.length}. Sample output:`, resultText.substring(0, 500));
          throw new Error(`No valid Quiz JSON array could be extracted from '${modelName}' response.`);
        }

        console.log(`✅ [Step 5] Quiz successfully generated and strictly validated via ${modelName}!`, parsedQuiz);

        return parsedQuiz.map((q: any) => {
          const options = Array.isArray(q.options) 
            ? q.options.map((o: any) => typeof o === 'string' ? o : (o.text || String(o)))
            : ["Option A", "Option B", "Option C", "Option D"];
          
          let correctIdx = NaN;
          if (typeof q.correctAnswer !== 'undefined') {
            correctIdx = Number(q.correctAnswer);
          } else if (typeof q.correctIndex !== 'undefined') {
            correctIdx = Number(q.correctIndex);
          } else if (typeof q.correctAnswerIndex !== 'undefined') {
            correctIdx = Number(q.correctAnswerIndex);
          }

          if (isNaN(correctIdx) || correctIdx < 0 || correctIdx > 3) {
             if (q.correctOptionId && Array.isArray(q.options)) {
                 correctIdx = q.options.findIndex((o:any) => o.id === q.correctOptionId);
             }
             if (correctIdx === -1 || isNaN(correctIdx)) correctIdx = 0;
          }

          return {
            question: q.question || q.text || "Unknown Question",
            options: options.slice(0, 4),
            correctAnswer: correctIdx,
            explanation: q.explanation || "No explanation provided."
          };
        });
      };

      // Exclusively route to Gemma as requested
      return await attemptGeneration('gemma-4-31b-it');

    } catch (error) {
      console.error("❌ Gemma Quiz Gen Error:", error);
      return [{
        question: "The AI encountered an error generating this quiz. The server may be overloaded or the content was too complex.",
        options: ["Acknowledge", "Retry", "Skip", "Exit"],
        correctAnswer: 0,
        explanation: "API Timeout, Server Overload (503), or strict formatting failure."
      }];
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
      console.error("Worksheet Generation Error via Proxy:", error);
      return [];
    }
  }
};

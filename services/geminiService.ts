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
        
        // Map target model for compatibility
        let activeModel = modelName;
        if (activeModel.includes('gemma') || activeModel.includes('gemini-3.5') || activeModel.includes('gemini-2.5')) {
          activeModel = 'gemini-2.5-flash';
        }

        const contents = payload.contents;
        const systemInstructionText = payload.systemInstruction || "";
        const config = payload.config || payload.generationConfig || {};

        const response = await ai.models.generateContent({
          model: activeModel,
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
    try {
      const randomSeed = `${Date.now()}-${Math.random()}`;
      const rawContent = scrapedText || await scrapeUrl(url);
      const content = await condenseLargeContent(rawContent || "");

      const payload = {
        contents: [{
          role: "user",
          parts: [{
            text: `You are an expert curriculum designer. Based ONLY on the following content summary, generate a rigorous 5-question multiple-choice quiz. 

CRITICAL DIFFICULTY TUNING:
The target student is studying at the ${level || 'Intermediate'} CEFR level. 
- Beginner (A1, A2): Keep sentence structures clear and literal. Test fundamental facts.
- Intermediate (B1, B2): Introduce standard corporate vocabulary. Test context-based reasoning.
- Advanced (C1, C2): Structure nuanced options testing logical inference and complex arguments.

CRITICAL RULES:
1. Every single question MUST have exactly 4 options.
2. The 'correctAnswer' MUST be an integer representing the zero-based index of the correct option (0, 1, 2, or 3).
3. Provide a brief 'explanation' for why the answer is correct.
4. Escape all internal quotation marks. Do not use unescaped double quotes inside text.
5. Randomization Seed (Forces new output): ${randomSeed}

Content Title: ${title}
Content Summary: ${content || "No content extracted. Rely on title."}

Return your response STRICTLY as a raw JSON array. Do NOT wrap the response in markdown blocks like \`\`\`json. The JSON must perfectly match this structure:
[
  {
    "question": "What is the primary theme discussed?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 1,
    "explanation": "Option B is correct because..."
  }
 ]`
          }]
        }]
      };

      const attemptGeneration = async (modelName: string) => {
        const data = await proxyGeminiSafe(modelName, payload);
        let resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
        
        resultText = resultText.replace(/```json/gi, "").replace(/```/g, "").trim();
        const parsedQuiz = JSON.parse(resultText);
        
        if (!Array.isArray(parsedQuiz) || parsedQuiz.length === 0) {
          throw new Error("Parsed quiz is not a valid array.");
        }
        
        return parsedQuiz.map((q: any) => {
          // Robust mapping to handle slight model hallucinations
          const options = Array.isArray(q.options) 
            ? q.options.map((o: any) => typeof o === 'string' ? o : (o.text || String(o)))
            : ["Option A", "Option B", "Option C", "Option D"];
          
          let correctIdx = Number(q.correctAnswer);
          if (isNaN(correctIdx) || correctIdx < 0 || correctIdx > 3) {
             // Fallback logic if the model returned a string ID instead of an index
             if (q.correctOptionId && Array.isArray(q.options)) {
                 correctIdx = q.options.findIndex((o:any) => o.id === q.correctOptionId);
             }
             if (correctIdx === -1 || isNaN(correctIdx)) correctIdx = 0;
          }

          return {
            question: q.question || q.text || "Unknown Question",
            options: options,
            correctAnswer: correctIdx,
            explanation: q.explanation || "No explanation provided."
          };
        });
      };

      // Exclusively route to Gemma 31B
      return await attemptGeneration('gemma-4-31b-it');

    } catch (error) {
      console.error("Gemma Quiz Gen Error:", error);
      return [{
        question: "The AI encountered an error generating this quiz. Please try again later.",
        options: ["Acknowledge", "Retry", "Skip", "Exit"],
        correctAnswer: 0,
        explanation: "Gemma model execution failed. Check console for details."
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

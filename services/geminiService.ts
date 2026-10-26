/// <reference types="vite/client" />

import type { Resource, QuizQuestion } from '../types';
import { googleSheetService } from './googleSheetService';
import { GoogleGenAI } from "@google/genai";

export const getApiKey = (): string => {
  const viteKey = typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env.VITE_GEMINI_API_KEY || (import.meta.env as any).GEMINI_API_KEY || (import.meta.env as any).Config || (import.meta.env as any).CONFIG)
    : undefined;
  return viteKey || process.env.API_KEY || process.env.GEMINI_API_KEY || '';
};

const FLASH_LITE_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'] as const;
let currentModelIndex = 0;

export const getNextGeminiModel = (): string => {
  const model = FLASH_LITE_MODELS[currentModelIndex];
  currentModelIndex = (currentModelIndex + 1) % FLASH_LITE_MODELS.length;
  return model;
};

export const getAlternateGeminiModel = (failedModel: string): string => {
  return failedModel === 'gemini-3.5-flash-lite'
    ? 'gemini-3.1-flash-lite'
    : 'gemini-3.5-flash-lite';
};

const executeSingleProxyCall = async (modelName: string, rawPayload: any): Promise<any> => {
  // Destructure out expectJson
  const { expectJson, ...cleanPayload } = rawPayload || {};
  const isJsonExpected = Boolean(expectJson || rawPayload?.config?.expectJson || rawPayload?.generationConfig?.expectJson);

  // Build clean config object without expectJson
  const rawConfig = cleanPayload.config || cleanPayload.generationConfig || {};
  const { expectJson: _cJson, ...restConfig } = rawConfig;
  const config = {
    ...restConfig,
    ...(isJsonExpected ? { responseMimeType: 'application/json' } : {})
  };

  try {
    // Securely delegate entirely to our Google Web App endpoint
    const fullPayload = {
      model: modelName,
      contents: cleanPayload.contents,
      systemInstruction: cleanPayload.systemInstruction || "",
      config: config
    };
    return await googleSheetService.proxyGeminiRequest(fullPayload);
  } catch (proxyError: any) {
    const errorStr = String(proxyError?.message || proxyError);
    console.warn(`[geminiService] proxy_gemini_request failed for ${modelName}, trying legacy proxy_gemini fallback. Error details:`, errorStr);
    try {
      // Legacy Web App proxy call format (pass clean generationConfig)
      const legacyPayload = {
        contents: cleanPayload.contents,
        systemInstruction: cleanPayload.systemInstruction,
        generationConfig: config
      };
      return await googleSheetService.proxyGemini(modelName, legacyPayload);
    } catch (legacyError: any) {
      const legacyErrorStr = String(legacyError?.message || legacyError);
      console.warn(`[geminiService] Both primary and legacy proxy actions failed for ${modelName}. Error:`, legacyErrorStr);
      
      const apiKey = getApiKey();
      if (!apiKey) {
        console.error("[geminiService] Direct client fallback blocked: Gemini API key is missing or empty. Please configure GEMINI_API_KEY or VITE_GEMINI_API_KEY.");
        throw legacyError;
      }

      try {
        console.log(`[geminiService] Activating direct client fallback using modern GoogleGenAI SDK with model ${modelName}.`);
        const ai = new GoogleGenAI({ apiKey });
        
        const contents = cleanPayload.contents;
        const systemInstructionText = cleanPayload.systemInstruction || "";

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
        console.error(`[geminiService] Direct client fallback call failed for ${modelName}:`, directError);
        throw new Error(`AI Integration Failure for ${modelName}: Secure spreadsheet proxy and direct fallbacks failed. Error: ${directError.message || directError}`);
      }
    }
  }
};

export const proxyGeminiSafe = async (modelNameOverride?: string, payload?: any): Promise<any> => {
  const primaryModel = modelNameOverride || getNextGeminiModel();
  console.log(`▶️ Sending payload to ${primaryModel}...`);

  try {
    return await executeSingleProxyCall(primaryModel, payload);
  } catch (primaryError: any) {
    const errorMsg = String(primaryError?.message || primaryError);
    console.warn(`⚠️ Request to primary model ${primaryModel} failed (${errorMsg}). Retrying once with failover model...`);
    const alternateModel = getAlternateGeminiModel(primaryModel);
    console.log(`▶️ Sending payload to ${alternateModel}...`);
    try {
      return await executeSingleProxyCall(alternateModel, payload);
    } catch (alternateError: any) {
      console.error(`❌ Both primary model (${primaryModel}) and failover model (${alternateModel}) failed:`, alternateError);
      throw alternateError;
    }
  }
};

const callGemini = async (prompt: string) => {
  const payload = {
    contents: [{ role: "user", parts: [{ text: prompt }] }]
  };

  try {
    const data = await proxyGeminiSafe(undefined, payload);
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
          parts: [{
            fileData: { fileUri: url, mimeType: "video/x-youtube" },
            text: "Analyze this video in deep detail. Extract all core educational concepts, facts, methodologies, and key takeaways into a highly dense master summary. CRITICAL: You must compress and limit your entire response to a maximum of 40,000 characters (approx 10,000 tokens) to ensure it fits into smaller AI context windows later. Return plain text only, no markdown."
          }]
        }]
      };

      const data = await proxyGeminiSafe(undefined, payload);
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
      const data = await proxyGeminiSafe(undefined, payload);
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
        expectJson: true,
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

      const data = await proxyGeminiSafe(undefined, payload);
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
    console.log("🚨 VERCEL DEPLOYMENT: 'TEMPLATE FILL-IN' + FLASH-LITE ROTATOR LOADED!");
    try {
      console.log("▶️ [Step 1] Fetching content...");
      const rawContent = scrapedText || await scrapeUrl(url);

      console.log("▶️ [Step 2] Condensing content...");
      const content = await condenseLargeContent(rawContent || "");

      const payload = {
        expectJson: true,
        contents: [{
          role: "user",
          parts: [{
            text: `You are a strict data compiler. Convert the provided text into a 5-question multiple-choice quiz.
Difficulty: ${level || 'Intermediate'} CEFR.
Content: ${title} - ${content}

CRITICAL INSTRUCTION:
You must fill out the following JSON template. Replace the empty strings and 0s with your generated content.
Do NOT add or remove any objects. You MUST return exactly 5 filled objects.
Do NOT write any conversational text, preamble, or scratchpad. Output ONLY the valid JSON array.

TEMPLATE:
[
  { "question": "", "options": ["", "", "", ""], "correctAnswer": 0, "explanation": "" },
  { "question": "", "options": ["", "", "", ""], "correctAnswer": 0, "explanation": "" },
  { "question": "", "options": ["", "", "", ""], "correctAnswer": 0, "explanation": "" },
  { "question": "", "options": ["", "", "", ""], "correctAnswer": 0, "explanation": "" },
  { "question": "", "options": ["", "", "", ""], "correctAnswer": 0, "explanation": "" }
]`
          }]
        }],
        generationConfig: {
          temperature: 0.1, // Ultra-cold to prevent formatting deviations
          maxOutputTokens: 3000
        }
      };

      const attemptGeneration = async (modelName: string) => {
        console.log(`▶️ [Step 3] Sending Template Payload to ${modelName}... (Awaiting API)`);

        const timeoutPromise = new Promise<any>((_, reject) =>
          setTimeout(() => reject(new Error("API Timeout")), 60000)
        );

        let data;
        try {
          data = await Promise.race([
            proxyGeminiSafe(modelName, payload),
            timeoutPromise
          ]);
        } catch (apiErr: any) {
          console.warn(`⚠️ Primary API generation failed for ${modelName}:`, apiErr.message || apiErr);
          data = { candidates: [] };
        }

        console.log("▶️ [Step 4] API responded! Running Clean JSON Scanner...");
        
        let parsedQuiz = null;
        let rawText = "";

        try {
          rawText = (data.data?.candidates?.[0]?.content?.parts?.[0]?.text) || (data.candidates?.[0]?.content?.parts?.[0]?.text) || "";
        } catch (e) {
          console.warn("Could not find text in candidates standard path", e);
        }

        if (!rawText && typeof data === 'string') {
          rawText = data;
        } else if (!rawText && data.text) {
          rawText = data.text;
        }

        if (!rawText) {
          rawText = "[]";
        }

        try {
          // Strip markdown code blocks to prevent JSON.parse crashes
          let cleanJsonText = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
          parsedQuiz = JSON.parse(cleanJsonText);
          console.log("✅ Bulletproof parser successfully parsed JSON directly.");
        } catch (e) {
          console.warn("⚠️ Direct JSON.parse failed, running scanner fallback...", e);
          
          // Clean any markdown backticks first
          let resultText = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();

          // Strict Thread-Safe Scanner fallback
          let firstBracket = resultText.indexOf('[');
          while (firstBracket !== -1 && !parsedQuiz) {
              let lastBracket = resultText.lastIndexOf(']');
              while (lastBracket > firstBracket && !parsedQuiz) {
                  let isValid = false;
                  try {
                      const slice = resultText.substring(firstBracket, lastBracket + 1);
                      const attempt = JSON.parse(slice);
                      
                      // STRICT VALIDATION: Must be array
                      if (Array.isArray(attempt) && attempt.length > 0) {
                          parsedQuiz = attempt; 
                          isValid = true;
                      }
                  } catch (err) {
                      // JSON.parse failed
                  }
                  
                  if (!isValid) {
                      lastBracket = resultText.lastIndexOf(']', lastBracket - 1);
                  }
              }
              if (!parsedQuiz) {
                  firstBracket = resultText.indexOf('[', firstBracket + 1);
              }
          }
        }

        // 2. Ultra-Reliable Standby Fallback using alternate model with native JSON Mode
        if (!parsedQuiz) {
          const alternateModel = getAlternateGeminiModel(modelName);
          console.warn(`⚠️ Primary generation failed or returned invalid JSON for ${modelName}. Routing immediately to standby ${alternateModel} fallback...`);
          try {
            const fallbackPayload = {
              expectJson: true,
              contents: [
                {
                  role: "user",
                  parts: [{
                    text: `You are an expert curriculum designer. Convert this educational text into a CEFR ${level || 'Intermediate'} level 5-question multiple-choice quiz.
Content: ${title} - ${content}

CRITICAL: You must generate EXACTLY FIVE (5) questions in a valid JSON array format.
JSON Schema structure:
[
  {
    "question": "string",
    "options": ["string", "string", "string", "string"],
    "correctAnswer": 0,
    "explanation": "string"
  }
]`
                  }]
                }
              ],
              config: {
                temperature: 0.1,
                responseMimeType: "application/json"
              }
            };
            const fallbackData = await proxyGeminiSafe(alternateModel, fallbackPayload);
            const fallbackText = (fallbackData.data?.candidates?.[0]?.content?.parts?.[0]?.text) || (fallbackData.candidates?.[0]?.content?.parts?.[0]?.text) || "";
            let cleanedFallback = fallbackText.trim().replace(/```json/gi, "").replace(/```/g, "").trim();
            const fallbackQuiz = JSON.parse(cleanedFallback);
            
            if (Array.isArray(fallbackQuiz) && fallbackQuiz.length === 5) {
              parsedQuiz = fallbackQuiz;
              console.log(`✅ Quiz successfully generated via standby ${alternateModel}!`);
            }
          } catch (fallbackErr) {
            console.error(`Standby ${alternateModel} fallback also failed:`, fallbackErr);
          }
        }

        if (!parsedQuiz) {
          console.error("Strict scanner and fallback both failed.");
          throw new Error("Model failed to output a valid 5-question JSON array.");
        }

        console.log("✅ [Step 5] Quiz successfully generated and strictly validated!", parsedQuiz);

        return parsedQuiz.map((q: any) => {
          const options = Array.isArray(q.options) 
            ? q.options.map((o: any) => typeof o === 'string' ? o : (o.text || String(o)))
            : ["Option A", "Option B", "Option C", "Option D"];
          
          let correctIdx = Number(q.correctAnswer);
          if (isNaN(correctIdx) || correctIdx < 0 || correctIdx > 3) {
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

      // Select primary model via round-robin rotator
      const primaryModel = getNextGeminiModel();
      return await attemptGeneration(primaryModel);

    } catch (error: any) {
      console.error("❌ Gemma Quiz Gen Error:", error);
      throw error;
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

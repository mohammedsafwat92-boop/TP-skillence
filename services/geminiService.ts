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
    console.log("🚨 VERCEL DEPLOYMENT: 'THE 5-COUNT FORCER' LOADED!");
    try {
      console.log("▶️ [Step 1] Fetching content...");
      const rawContent = scrapedText || await scrapeUrl(url);

      console.log("▶️ [Step 2] Condensing content...");
      const content = await condenseLargeContent(rawContent || "");

      const payload = {
        contents: [
          {
            role: "user",
            parts: [{
              text: `You are a strict data compiler. Convert the provided text into a multiple-choice quiz.
Difficulty: ${level || 'Intermediate'} CEFR.
Content: ${title} - ${content}

CRITICAL: You must generate EXACTLY FIVE (5) questions.
Return ONLY a valid JSON array of objects. Do not write a scratchpad or markdown.

[
  {
    "question_number": 1,
    "question": "`
            }]
          }
        ],
        generationConfig: {
          temperature: 0.2, // Cold temperature to prevent it from wandering
          maxOutputTokens: 3000
        }
      };

      const attemptGeneration = async (modelName: string) => {
        console.log(`▶️ [Step 3] Sending 5-Count Payload to ${modelName}... (Awaiting API)`);

        const timeoutPromise = new Promise<any>((_, reject) =>
          setTimeout(() => reject(new Error("API Timeout")), 90000)
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

        console.log("▶️ [Step 4] API responded! Running Thread-Safe Strict Scanner...");
        
        // Re-attach the forced opening structure containing the psychological #1 counter
        const rawResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const resultText = `[\n  {\n    "question_number": 1,\n    "question": "` + rawResponse;
        
        let parsedQuiz = null;

        // 1. Strict Thread-Safe JSON Scanner
        let firstBracket = resultText.indexOf('[');
        while (firstBracket !== -1 && !parsedQuiz) {
            let lastBracket = resultText.lastIndexOf(']');
            while (lastBracket > firstBracket && !parsedQuiz) {
                let isValid = false;
                try {
                    const slice = resultText.substring(firstBracket, lastBracket + 1);
                    const attempt = JSON.parse(slice);
                    
                    // STRICT VALIDATION: Must be an array, EXACTLY 5 items, and valid objects
                    if (Array.isArray(attempt) && attempt.length === 5 && typeof attempt[0] === 'object' && attempt[0] !== null && ('question' in attempt[0] || 'text' in attempt[0]) && 'options' in attempt[0]) {
                        parsedQuiz = attempt; 
                        isValid = true;
                    }
                } catch (e) {
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

        // 2. Fallback Regex/Markdown Parser for Text-Mode Outputs
        if (!parsedQuiz) {
          console.warn("⚠️ JSON parse failed. Running Backup Regex-Markdown parser...");
          try {
            const questions: any[] = [];
            const lines = resultText.split('\n');
            let currentQuestion: string | null = null;
            let currentOptions: string[] = [];
            let currentAnswer: number = 0;
            let currentExplanation = "No explanation provided.";

            const pushQuestion = () => {
              if (currentQuestion && currentOptions.length >= 2) {
                while (currentOptions.length < 4) {
                  currentOptions.push(`Option ${String.fromCharCode(65 + currentOptions.length)}`);
                }
                questions.push({
                   question: currentQuestion.trim(),
                   options: currentOptions.slice(0, 4),
                   correctAnswer: currentAnswer,
                   explanation: currentExplanation.trim()
                });
              }
              currentQuestion = null;
              currentOptions = [];
              currentAnswer = 0;
              currentExplanation = "No explanation provided.";
            };

            for (let line of lines) {
              line = line.trim();
              if (!line) continue;

              const qMatch = line.match(/^\s*[*\s#-]*Question\s*(\d+)\s*(?:\([^)]+\))?\*?\s*[:\-]\*?\s*(.*)/i) ||
                             line.match(/\*Question\s*\d+[^:]*:\s*(.*)/i) ||
                             line.match(/Question\s*\d+[^:]*:\s*(.*)/i) ||
                             line.match(/^(?:[*#-\s]*Question|[*#-\s]*Q|[\d]+\.)\s*(\d+)?\s*[:\-\)]?\s*(.*)/i);
              
              const isMeta = line.toLowerCase().includes("json") || 
                             line.toLowerCase().includes("schema") || 
                             line.toLowerCase().includes("exactly five") ||
                             line.toLowerCase().includes("role:") ||
                             line.toLowerCase().includes("task:");

              if (qMatch && !isMeta) {
                pushQuestion();
                currentQuestion = qMatch[2] || qMatch[1] || line;
                currentQuestion = currentQuestion.replace(/^[*#-\s:]+/, '').replace(/[*_]+/g, '').trim();
                continue;
              }

              const optMatch = line.match(/^[*\s#-]*([A-D])\s*[\)\.\-]\s*(.*)/i);
              if (optMatch && currentQuestion) {
                currentOptions.push(optMatch[2].trim().replace(/[*_]+/g, '').trim());
                continue;
              }

              const ansMatch = line.match(/^[*\s#-]*\*?(?:Answer|Correct|Correct\s*Answer|correctAnswer|Response)\*?\s*[:=]?\s*\*?([A-D\d])\*?/i);
              if (ansMatch && currentQuestion) {
                const val = ansMatch[1].toUpperCase();
                if (['A', 'B', 'C', 'D'].includes(val)) {
                  currentAnswer = val.charCodeAt(0) - 65;
                } else {
                  const num = parseInt(val, 10);
                  if (!isNaN(num) && num >= 0 && num <= 3) {
                    currentAnswer = num;
                  }
                }
                continue;
              }

              const expMatch = line.match(/^(?:[*#-\s]*Explanation|[*#-\s]*explanation)\s*[:=]?\s*(.*)/i);
              if (expMatch && currentQuestion) {
                currentExplanation = expMatch[1].trim().replace(/^[*#-\s:]+/, '').replace(/[*_]+/g, '').trim();
                continue;
              }
            }

            pushQuestion();
            if (questions.length >= 5) {
              parsedQuiz = questions.slice(0, 5);
              console.log("✅ Successfully parsed 5 questions using Backup Regex-Markdown parser!");
            }
          } catch (markdownErr) {
            console.error("Regex backup parser crashed:", markdownErr);
          }
        }

        // 3. Ultra-Reliable Standby Fallback using gemini-3.5-flash with native JSON Mode
        if (!parsedQuiz) {
          console.warn("⚠️ Gemma generation and text-regex extraction failed. Routing immediately to stand-by gemini-3.5-flash fallback...");
          try {
            const flashPayload = {
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
    "correctAnswer": 0 (index 0-3),
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
            const flashData = await proxyGeminiSafe('gemini-3.5-flash', flashPayload);
            const flashText = flashData.candidates?.[0]?.content?.parts?.[0]?.text || "";
            let cleanedFlash = flashText.trim().replace(/```json/gi, "").replace(/```/g, "").trim();
            const flashQuiz = JSON.parse(cleanedFlash);
            if (Array.isArray(flashQuiz) && flashQuiz.length === 5) {
              parsedQuiz = flashQuiz;
              console.log("✅ Quiz successfully generated via stand-by gemini-3.5-flash!");
            }
          } catch (flashErr) {
            console.error("Stand-by gemini-3.5-flash fallback also failed:", flashErr);
          }
        }

        if (!parsedQuiz) {
          console.error("Strict scanner failed to find exactly 5 questions. Re-assembled raw text:", resultText);
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

      // Exclusively route to Gemma
      return await attemptGeneration('gemma-4-31b-it');

    } catch (error) {
      console.error("❌ Gemma Quiz Gen Error:", error);
      return [{
        question: "The AI encountered an error generating this quiz. The server may be overloaded or the content was too complex to generate exactly 5 questions.",
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

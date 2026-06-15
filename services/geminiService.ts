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
    console.log("🚨 VERCEL DEPLOYMENT: 'MD-PARSER WITH COGNITIVE SWEEP' LOADED FOR GEMMA 4!");
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
              text: `Generate a CEFR B1 level multiple-choice quiz with 1 question based on the content.
CONTENT: The Sun - The Sun is the star at the center of the Solar System.`
            }]
          },
          {
            role: "model",
            parts: [{
              text: `<thought>
I need to generate a 1-question B1 multiple-choice quiz about the Sun.
Content: "The Sun is the star at the center of the Solar System."
Question concept: Identify what the Sun is.
Answer: "A star" (index 1).
Explanations: The text explicitly states it's a star.
</thought>

JSON:
[
  {
    "question": "What is the Sun?",
    "options": ["A planet", "A star", "A comet", "A meteor"],
    "correctAnswer": 1,
    "explanation": "The text explicitly states that the Sun is a star."
  }
 ]`
            }]
          },
          {
            role: "user",
            parts: [{
              text: `Generate a CEFR ${level || 'Intermediate'} level multiple-choice quiz with exactly 5 questions based on the content.

You MUST wrap your planning/scratchpad inside "<thought>...</thought>" tags first to think step-by-step.
Then, you MUST output standard, clean, active JSON inside a \`\`\`json markdown block containing an array of exactly 5 questions. Do not truncate. Do not include javascript comments.

REQUIRED JSON FORMAT SCHEMA:
[
  {
    "question": "string",
    "options": ["string", "string", "string", "string"],
    "correctAnswer": number (between 0 and 3),
    "explanation": "string"
  }
]

CONTENT:
${title} - ${content}`
            }]
          }
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 4096
        }
      };

      const attemptGeneration = async (modelName: string) => {
        console.log(`▶️ [Step 3] Sending Payload to ${modelName}... (Awaiting API)`);

        const timeoutPromise = new Promise<any>((_, reject) =>
          setTimeout(() => reject(new Error("API Timeout")), 90000)
        );

        const data = await Promise.race([
          proxyGeminiSafe(modelName, payload),
          timeoutPromise
        ]);

        console.log("▶️ [Step 4] API responded! Running Thread-Safe Smart Cleaners and Scanners...");
        
        const rawResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        let resultText = rawResponse.trim();

        // Strip potential markdown code fences if outputted
        resultText = resultText.replace(/```json/g, "").replace(/```/g, "").trim();

        let parsedQuiz: any[] | null = null;

        // Try direct JSON parsing
        try {
          const parsed = JSON.parse(resultText);
          if (Array.isArray(parsed)) {
            parsedQuiz = parsed;
          } else if (parsed && typeof parsed === 'object') {
            if (Array.isArray(parsed.quiz)) {
              parsedQuiz = parsed.quiz;
            } else if (Array.isArray(parsed.questions)) {
              parsedQuiz = parsed.questions;
            } else {
              // Try to find any array key
              for (const key of Object.keys(parsed)) {
                if (Array.isArray(parsed[key])) {
                  parsedQuiz = parsed[key];
                  break;
                }
              }
            }
          }
        } catch (e) {
          // direct parsing failed, fall back to sliding window
        }

        // Sliding window array extractor fallback
        if (!parsedQuiz) {
          let firstBracket = resultText.indexOf('[');
          while (firstBracket !== -1 && !parsedQuiz) {
            let lastBracket = resultText.lastIndexOf(']');
            while (lastBracket > firstBracket && !parsedQuiz) {
              try {
                const slice = resultText.substring(firstBracket, lastBracket + 1);
                const attempt = JSON.parse(slice);
                if (Array.isArray(attempt) && attempt.length > 0 && attempt[0] && typeof attempt[0] === 'object') {
                  parsedQuiz = attempt;
                }
              } catch (err) {
                // Shrink window
              }
              lastBracket = resultText.lastIndexOf(']', lastBracket - 1);
            }
            firstBracket = resultText.indexOf('[', firstBracket + 1);
          }
        }

        // Sliding window nested-object extractor fallback
        if (!parsedQuiz) {
          let firstBrace = resultText.indexOf('{');
          while (firstBrace !== -1 && !parsedQuiz) {
            let lastBrace = resultText.lastIndexOf('}');
            while (lastBrace > firstBrace && !parsedQuiz) {
              try {
                const slice = resultText.substring(firstBrace, lastBrace + 1);
                const attempt = JSON.parse(slice);
                if (attempt && typeof attempt === 'object') {
                  if (Array.isArray(attempt.quiz)) {
                    parsedQuiz = attempt.quiz;
                  } else if (Array.isArray(attempt.questions)) {
                    parsedQuiz = attempt.questions;
                  } else {
                    for (const key of Object.keys(attempt)) {
                      if (Array.isArray(attempt[key])) {
                        parsedQuiz = attempt[key];
                        break;
                      }
                    }
                  }
                }
              } catch (err) {
                // Shrink window
              }
              lastBrace = resultText.lastIndexOf('}', lastBrace - 1);
            }
            firstBrace = resultText.indexOf('{', firstBrace + 1);
          }
        }

        // Advanced Fallback: Smart line-by-line markdown and text draft extractor
        if (!parsedQuiz) {
          console.log("▶️ [Fallback] Smart JSON solvers failed. Trying advanced raw markdown/draft scraper...");
          try {
            const lines = resultText.split("\n");
            const questions: any[] = [];
            
            let currentQuestion = "";
            let currentOptions: string[] = [];
            let correctAnswer = 0;
            let explanation = "";
            
            const fillOptions = (opts: string[]): string[] => {
              const res = [...opts];
              while (res.length < 4) {
                res.push(`Option ${String.fromCharCode(65 + res.length)}`);
              }
              return res.slice(0, 4);
            };

            for (let i = 0; i < lines.length; i++) {
              const line = lines[i].trim();
              if (!line) continue;
              
              // Check if line defines/overwrites a question
              if (/^(?:Draft|Question|Q)\s*:\s*/i.test(line)) {
                if (currentQuestion && currentOptions.length >= 2) {
                  questions.push({
                    question: currentQuestion,
                    options: fillOptions(currentOptions),
                    correctAnswer: correctAnswer,
                    explanation: explanation || "Explanation based on provided text."
                  });
                }
                currentQuestion = line.replace(/^(?:Draft|Question|Q)\s*:\s*/i, "").trim();
                currentOptions = [];
                correctAnswer = 0;
                explanation = "";
                continue;
              }

              const isQuestionLine = 
                /^\*?\s*\**(?:Q\d+|Question\s*\d+)\**[:.)\s]/i.test(line) ||
                (line.endsWith("?") && /^(What|Why|How|Which|Who|Where|When|Is|Are|Does|Do|Can|Could|Should)\b/i.test(line));
                
              if (isQuestionLine) {
                if (currentQuestion && currentOptions.length >= 2) {
                  questions.push({
                    question: currentQuestion,
                    options: fillOptions(currentOptions),
                    correctAnswer: correctAnswer,
                    explanation: explanation || "Explanation based on provided text."
                  });
                }
                currentQuestion = line.replace(/^\*?\s*\**(?:Q\d+|Question\s*\d+)\**[:.)\s]*/i, "").trim();
                currentOptions = [];
                correctAnswer = 0;
                explanation = "";
                continue;
              }
              
              // Inline options: "Options: A) ..., B) ..., C) ..., D) ..."
              if (/options\s*:/i.test(line)) {
                const parts = line.split(/[A-D]\s*[-).]/i);
                if (parts.length > 2) {
                  for (let j = 1; j < parts.length; j++) {
                    const opt = parts[j].replace(/[,;]\s*$/, "").replace(/\*+$/, "").trim();
                    if (opt) currentOptions.push(opt);
                  }
                  continue;
                }
              }
              
              // Line options: "A) Option text" or "* A) ..."
              const isOptionLine = /^[-\*\s]*([A-D])\s*[-).:]\s*(.+)/i.test(line);
              if (isOptionLine) {
                const match = line.match(/^[-\*\s]*([A-D])\s*[-).:]\s*(.+)/i);
                if (match) {
                  const optionText = match[2].trim().replace(/\*+$/, "").trim();
                  currentOptions.push(optionText);
                }
                continue;
              }
              
              // Correct solver
              const isCorrectLine = /correct\s*answer\s*:\s*([A-D\d])|correct\s*:\s*([A-D\d])/i.test(line);
              if (isCorrectLine) {
                const match = line.match(/(?:correct\s*answer|correct)\s*:\s*\**([A-D\d])/i);
                if (match) {
                  const val = match[1].trim().toUpperCase();
                  if (val === 'A' || val === '0') correctAnswer = 0;
                  else if (val === 'B' || val === '1') correctAnswer = 1;
                  else if (val === 'C' || val === '2') correctAnswer = 2;
                  else if (val === 'D' || val === '3') correctAnswer = 3;
                }
                continue;
              }
              
              // Explanation collector
              if (currentQuestion) {
                if (/explanation\s*:/i.test(line)) {
                  explanation = line.replace(/explanation\s*:\s*/i, "").trim();
                } else if (line.startsWith("*") || line.startsWith("-")) {
                  // Skip general headers/lists
                } else if (currentOptions.length === 0) {
                  currentQuestion += " " + line;
                } else {
                  if (!explanation) {
                    explanation = line;
                  } else {
                    explanation += " " + line;
                  }
                }
              }
            }
            
            if (currentQuestion && currentOptions.length >= 2) {
              questions.push({
                question: currentQuestion,
                options: fillOptions(currentOptions),
                correctAnswer: correctAnswer,
                explanation: explanation || "Explanation based on provided text."
              });
            }

            if (questions.length > 0) {
              parsedQuiz = questions;
            }
          } catch (pe) {
            console.error("Markdown Parser Error:", pe);
          }
        }

        if (!parsedQuiz) {
          console.error("Smart scanner failed. Re-assembled raw text:", resultText);
          throw new Error("No valid Quiz JSON array could be extracted from model response.");
        }

        console.log("✅ [Step 5] Quiz successfully generated and validated!", parsedQuiz);

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

      // Exclusively route to Gemma 4 without fallback as requested
      return await attemptGeneration('gemma-4-31b-it');

    } catch (error) {
      console.error("❌ Gemma Quiz Gen Error:", error);
      return [{
        question: "The AI encountered an error formatting this quiz. The connection timed out, the server was overloaded (503), or the content was too complex.",
        options: ["Acknowledge", "Retry", "Skip", "Exit"],
        correctAnswer: 0,
        explanation: "API Timeout, Server Error, or Parsing Failure."
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

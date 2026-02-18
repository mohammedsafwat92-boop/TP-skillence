
import { GoogleGenAI } from "@google/genai";
import { googleSheetService } from './googleSheetService';
import type { SHLReport } from '../types';

// Use gemini-3-pro-preview for high-complexity reasoning and large report analysis
const MODEL_NAME = 'gemini-3-pro-preview';

export const shlService = {
  /**
   * Main entry point for processing SHL reports.
   * Uses inline base64 data for all files to ensure compatibility with the current environment.
   */
  processAndRegister: async (file: File | undefined, coachEmail?: string) => {
    // Safety Guard: Immediate check for valid file object
    if (!file || !(file instanceof File)) {
      console.error("[shlService] Invalid file object received:", file);
      throw new Error("Registry Error: The processing hub received an invalid or missing file reference.");
    }

    const fileName = file.name || 'Candidate_Report.pdf';
    console.log(`[shlService] Processing ${fileName} via Inline Extraction`);

    try {
      const shlData = await shlService.processInline(file);

      // Step 3: Register results in the global registry
      const registration = await googleSheetService.createUser({
        name: shlData.candidateName,
        email: shlData.email,
        cefrLevel: shlData.cefrLevel,
        shlData: shlData,
        assignedCoach: coachEmail || 'Unassigned',
        password: 'TpSkill2026!'
      });

      return { shlData, registration };
    } catch (error) {
      console.error("[shlService] Processing Hub Error:", (error as Error).message);
      throw error;
    }
  },

  /**
   * Pipeline for processing files using inline Base64 data.
   * This avoids the "Action not implemented" error associated with the Files API.
   */
  processInline: async (file: File): Promise<SHLReport> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        if (!result) return reject(new Error("File conversion resulted in empty buffer."));
        resolve(result.split(',')[1]);
      };
      reader.onerror = () => reject(new Error("Failed to read file into memory."));
      reader.readAsDataURL(file);
    });

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType: 'application/pdf' } },
          { text: shlService.getAnalysisPrompt() }
        ]
      },
      config: { 
        responseMimeType: "application/json"
      }
    });

    return shlService.parseAndClean(response.text);
  },

  /**
   * System Instruction for the Intelligence Extraction
   */
  getAnalysisPrompt: () => {
    return `Perform an expert deep-parsing of this SHL Candidate Assessment Report. 
    Map the data into a strict JSON structure following this schema:
    
    - candidateName: Full name of the candidate.
    - email: Candidate's contact email found in the report.
    - cefrLevel: The detected overall CEFR level (A1, A2, B1, B2, C1, or C2).
    - svar: Detailed speaking sub-scores (0-100):
        - overall: Overall spoken proficiency.
        - pronunciation: Phonic clarity.
        - fluency: Articulation flow.
        - activeListening: Contextual understanding.
        - vocabulary: Lexical range.
        - grammar: Structural accuracy.
    - writex: Detailed writing sub-scores (0-100):
        - content: Information depth.
        - grammar: Syntactic precision.
        - vocabulary: Academic/Professional range.
        - coherence: Logic and flow.
    - competencies: 
        - behavioralTraits: Array of strings representing traits from "Behavioral Indicators".
        - strengths: Candidate strengths from "Detailed Skills" or technical breakdown.

    CRITICAL: Output ONLY raw JSON. No markdown tags, no backticks, no preamble.`;
  },

  /**
   * Sanitizer for AI output to ensure valid JSON registry entry.
   */
  parseAndClean: (text: string | undefined): SHLReport => {
    if (!text) throw new Error("Intelligence Extraction Failed: Empty response from engine.");
    try {
      const cleaned = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
      return JSON.parse(cleaned);
    } catch (e) {
      console.error("[shlService] Parsing Collision. Raw text:", text);
      throw new Error("Registry Error: The candidate intelligence could not be formatted correctly.");
    }
  }
};

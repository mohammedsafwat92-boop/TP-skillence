
import { GoogleGenAI, Type } from "@google/genai";
import { googleSheetService } from './googleSheetService';
import type { SHLReport } from '../types';

// Use gemini-3-pro-preview for complex multi-modal reasoning and large context windows
const MODEL_NAME = 'gemini-3-pro-preview';

export const shlService = {
  /**
   * Pipeline: Upload large PDF via Gemini File API -> Deep Analysis -> Database Registration
   */
  processAndRegister: async (file: File, coachEmail?: string) => {
    if (!file) {
      throw new Error("Missing File: The processing hub received an undefined file reference.");
    }

    // Safer logging with fallback values
    const fileName = file.name || 'Unknown File';
    const fileSizeMB = ((file.size || 0) / 1024 / 1024).toFixed(2);
    console.log(`[shlService] Initiating Deep Analysis for: ${fileName} (Size: ${fileSizeMB}MB)`);
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    try {
      // 1. Upload to Gemini File API (Bypass 400 Payload Limits)
      // Note: ai.files is primarily a Node.js server-side feature. 
      // In client-side SDKs, we verify its existence before calling.
      if (!ai.files || typeof ai.files.upload !== 'function') {
        console.warn("[shlService] File API not supported in this environment. Falling back to inline processing.");
        return await shlService.processInline(file, coachEmail);
      }

      const uploadResponse = await ai.files.upload(file, {
        mimeType: 'application/pdf',
        displayName: file.name,
      });

      if (!uploadResponse?.file?.uri) {
        throw new Error("File Upload Failed: The registry did not return a valid resource URI.");
      }

      console.log(`[shlService] Resource deployed to Cloud: ${uploadResponse.file.uri}`);

      // 2. Perform Deep Cognitive Extraction
      const prompt = `Analyze this SHL Assessment Report PDF comprehensively. 
      Extract the following data into a strict JSON structure:
      
      - candidateName: Full name of the candidate.
      - email: Candidate's email address.
      - cefrLevel: Highest detected CEFR level (A1-C2).
      - svar: Speaking sub-scores (0-100): overall, pronunciation, fluency, activeListening, vocabulary, grammar.
      - writex: Writing sub-scores (0-100): content, grammar, coherence.
      - competencies: 
          - behavioralIndicators: Array of extracted professional/behavioral strengths.
          - skillBreakdown: Key-value pairs of specific skill scores found in the report.

      Return ONLY raw JSON. No markdown backticks.`;

      const analysisResponse = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: [
          {
            fileData: {
              fileUri: uploadResponse.file.uri,
              mimeType: uploadResponse.file.mimeType,
            },
          },
          { text: prompt },
        ],
        config: { 
          responseMimeType: "application/json"
        }
      });

      const rawText = analysisResponse.text;
      if (!rawText) throw new Error("Empty analysis result from model.");

      let shlData: SHLReport;
      try {
        shlData = JSON.parse(rawText.replace(/```json/gi, '').replace(/```/gi, '').trim());
      } catch (e) {
        console.error("[shlService] JSON Parsing Error. Raw output:", rawText);
        throw new Error("Failed to parse analysis metadata.");
      }

      console.log("[shlService] Extracted Deep Capability:", shlData);
      
      // 3. Register in Registry Node
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
   * Fallback for smaller files or environments where ai.files is not exposed
   */
  processInline: async (file: File, coachEmail?: string) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const prompt = `Analyze this SHL Assessment PDF and extract candidateName, email, cefrLevel, svar, and writex into JSON.`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [
        { inlineData: { data: base64Data, mimeType: 'application/pdf' } },
        { text: prompt }
      ],
      config: { responseMimeType: "application/json" }
    });

    const shlData: SHLReport = JSON.parse(response.text.trim());
    
    const registration = await googleSheetService.createUser({
      name: shlData.candidateName,
      email: shlData.email,
      cefrLevel: shlData.cefrLevel,
      shlData: shlData,
      assignedCoach: coachEmail || 'Unassigned',
      password: 'TpSkill2026!'
    });

    return { shlData, registration };
  }
};

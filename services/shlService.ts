import { GoogleGenAI } from "@google/genai";
import { googleSheetService } from './googleSheetService';
import type { SHLReport } from '../types';

// Use gemini-3-pro-preview for high-complexity reasoning and large report analysis
const MODEL_NAME = 'gemini-3-pro-preview';
const LARGE_FILE_THRESHOLD = 15 * 1024 * 1024; // 15MB

export const shlService = {
  /**
   * Main entry point for processing SHL reports.
   * Defensively guards against undefined files and routes based on size.
   */
  processAndRegister: async (file: File | undefined, coachEmail?: string) => {
    // Safety Guard: Immediate check for valid file object to prevent "reading 'size' of undefined"
    if (!file || !(file instanceof File)) {
      console.error("[shlService] Invalid file object received:", file);
      throw new Error("Registry Error: The processing hub received an invalid or missing file reference.");
    }

    if (typeof file.size !== 'number') {
      throw new Error("Registry Error: File metadata is inaccessible.");
    }

    const fileName = file.name || 'Candidate_Report.pdf';
    const fileSize = file.size;
    console.log(`[shlService] Routing ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)}MB)`);

    try {
      let shlData: SHLReport;

      // Branching logic for the dual-pipeline
      if (fileSize < LARGE_FILE_THRESHOLD) {
        shlData = await shlService.processInline(file);
      } else {
        shlData = await shlService.processViaFileApi(file);
      }

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
   * Pipeline for small files using inline Base64 data.
   */
  processInline: async (file: File): Promise<SHLReport> => {
    console.log("[shlService] Mode: In-Memory Extraction (Base64)");
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
      contents: [
        { inlineData: { data: base64Data, mimeType: 'application/pdf' } },
        { text: shlService.getAnalysisPrompt() }
      ],
      config: { 
        responseMimeType: "application/json"
      }
    });

    return shlService.parseAndClean(response.text);
  },

  /**
   * Pipeline for large files using the Gemini File API.
   * Includes Cloud Ingestion and Polling for 'ACTIVE' state.
   */
  processViaFileApi: async (file: File): Promise<SHLReport> => {
    console.log("[shlService] Mode: Cloud-Based File Ingestion (API)");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // 1. Upload to Gemini Cloud Registry
    const uploadResponse = await ai.files.upload(file, {
      mimeType: 'application/pdf',
      displayName: file.name,
    });

    if (!uploadResponse?.file?.uri) {
      throw new Error("Cloud Sync Failed: No URI returned from File API.");
    }

    const fileUri = uploadResponse.file.uri;
    const cloudName = uploadResponse.file.name;
    console.log(`[shlService] Syncing to Cloud: ${fileUri}. Beginning activation poll...`);

    // 2. Polling loop for 'ACTIVE' state
    let state = uploadResponse.file.state;
    let attempts = 0;
    while (state === 'PROCESSING' && attempts < 40) {
      await new Promise(resolve => setTimeout(resolve, 3000)); // Poll every 3 seconds
      const getResponse = await ai.files.get({ name: cloudName });
      state = getResponse.file.state;
      attempts++;
      console.log(`[shlService] Activation Poll (Attempt ${attempts}): ${state}`);
    }

    if (state !== 'ACTIVE') {
      throw new Error(`Cloud Analysis Timeout: File state remains ${state} after 120s.`);
    }

    // 3. Inference using the cloud file reference
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [
        { 
          fileData: { 
            fileUri: fileUri, 
            mimeType: 'application/pdf' 
          } 
        },
        { text: shlService.getAnalysisPrompt() }
      ],
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
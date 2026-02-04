
import { geminiService } from './geminiService';
import { googleSheetService } from './googleSheetService';
import type { SHLReport } from '../types';

export const shlService = {
  /**
   * Converts a File to a Base64 string for Gemini
   */
  fileToGenerativePart: async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        if (!result || !result.includes(',')) {
          reject(new Error("File conversion failed: Invalid result format"));
          return;
        }
        const base64String = result.split(',')[1];
        resolve({
          inlineData: {
            data: base64String,
            mimeType: file.type,
          },
        });
      };
      reader.onerror = () => reject(new Error("FileReader failed to process PDF"));
      reader.readAsDataURL(file);
    });
  },

  /**
   * Full pipeline: Extract PDF data via Gemini -> Register user in Spreadsheet
   * Returns the atomic registration payload { uid, userProfile, resources }
   */
  processAndRegister: async (file: File) => {
    console.log(`[shlService] Starting detailed registration pipeline for: ${file.name}`);
    
    try {
      // 1. Convert to Base64
      const pdfPart = await shlService.fileToGenerativePart(file);
      
      // 2. Multimodal Extraction via Gemini (Strict JSON)
      console.log("[shlService] Requesting Detailed Gemini analysis...");
      const shlData: SHLReport = await geminiService.analyzeSHLData(pdfPart);
      console.log("[shlService] Gemini extraction successful:", shlData);
      
      // 3. Database Registration (Atomic response)
      // The backend now takes shlData as a single nested object
      console.log("[shlService] Submitting to Atomic Registry for Mapping...");
      const registration = await googleSheetService.createUser({
        name: shlData.candidateName,
        email: shlData.email,
        cefrLevel: shlData.cefrLevel,
        shlData: shlData, // Passing the full nested object
        password: 'TpSkill2026!' // Default enterprise password
      });

      console.log("[shlService] Detailed atomic registration successful.");
      return { shlData, registration };
    } catch (error) {
      console.error("[shlService] Registration Pipeline Aborted:", (error as Error).message);
      throw error;
    }
  }
};

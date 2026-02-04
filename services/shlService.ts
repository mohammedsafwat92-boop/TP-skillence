
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
   * Pipeline: Extract Nested SHL JSON via Gemini -> Atomic Registry Creation
   */
  processAndRegister: async (file: File) => {
    console.log(`[shlService] Processing SHL Report: ${file.name}`);
    
    try {
      // 1. Convert to Base64
      const pdfPart = await shlService.fileToGenerativePart(file);
      
      // 2. Deep Extraction via Gemini
      const shlData: SHLReport = await geminiService.analyzeSHLData(pdfPart);
      console.log("[shlService] Extracted Nested Data:", shlData);
      
      // 3. Database Registration & Course Mapping
      // The backend will now handle the gap analysis and course persistence
      const registration = await googleSheetService.createUser({
        name: shlData.candidateName,
        email: shlData.email,
        cefrLevel: shlData.cefrLevel,
        shlData: shlData, // Pass the full nested object
        password: 'TpSkill2026!' // Default system password
      });

      return { shlData, registration };
    } catch (error) {
      console.error("[shlService] Registration Pipeline Aborted:", (error as Error).message);
      throw error;
    }
  }
};

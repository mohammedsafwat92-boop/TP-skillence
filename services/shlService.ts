
import { geminiService } from './geminiService';
import { googleSheetService } from './googleSheetService';

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
   */
  processAndRegister: async (file: File) => {
    console.log(`[shlService] Starting registration pipeline for: ${file.name}`);
    
    try {
      // 1. Convert to Base64
      const pdfPart = await shlService.fileToGenerativePart(file);
      
      // 2. Multimodal Extraction via Gemini
      console.log("[shlService] Requesting Gemini analysis...");
      const shlData = await geminiService.analyzeSHLData(pdfPart);
      console.log("[shlService] Gemini extraction successful:", shlData);
      
      // 3. Database Registration (Crucial: Await the strictly validated result)
      console.log("[shlService] Submitting to Registry...");
      const registrationResult = await googleSheetService.createUser({
        name: shlData.candidateName,
        email: shlData.email,
        cefrLevel: shlData.cefrLevel,
        initialScores: {
          grammar: shlData.grammar,
          vocabulary: shlData.vocabulary,
          fluency: shlData.fluency,
          pronunciation: shlData.pronunciation,
          overallSpokenScore: shlData.overallSpokenScore
        },
        password: 'TpSkill2026!'
      });

      console.log("[shlService] Registry confirmed success.");
      return { shlData, result: registrationResult };
    } catch (error) {
      console.error("[shlService] Registration Pipeline Aborted:", (error as Error).message);
      // Propagate the specific error (e.g., DEPLOYMENT_MISMATCH) so the UI can display it
      throw error;
    }
  }
};

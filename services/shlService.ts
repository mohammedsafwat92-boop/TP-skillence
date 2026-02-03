
import { geminiService } from './geminiService';
import { googleSheetService } from './googleSheetService';

export const shlService = {
  /**
   * Converts a File to a Base64 string formatted for Gemini's inlineData
   */
  fileToGenerativePart: async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        if (!result.includes(',')) {
          reject(new Error("Invalid file read result"));
          return;
        }
        const base64String = result.split(',')[1];
        console.log(`[shlService] File converted to Base64. Length: ${base64String.length}`);
        resolve({
          inlineData: {
            data: base64String,
            mimeType: file.type,
          },
        });
      };
      reader.onerror = () => reject(new Error("FileReader failed"));
      reader.readAsDataURL(file);
    });
  },

  processAndRegister: async (file: File) => {
    console.log(`[shlService] Starting process for file: ${file.name}`);
    
    try {
      // 1. Convert PDF to Base64
      const pdfPart = await shlService.fileToGenerativePart(file);
      
      // 2. Extract Data using Gemini
      console.log("[shlService] Sending to Gemini...");
      const shlData = await geminiService.analyzeSHLData(pdfPart);
      console.log("[shlService] Data extracted successfully:", shlData);
      
      // 3. Register in Backend
      console.log("[shlService] Registering in Spreadsheet Registry...");
      const result = await googleSheetService.createUser({
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

      console.log("[shlService] Registration complete:", result);
      return { shlData, result };
    } catch (error) {
      console.error("[shlService] Pipeline Error:", error);
      throw error;
    }
  }
};


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
        const base64String = result.split(',')[1];
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

  /**
   * Full pipeline: Extract PDF data via Gemini -> Register user in Spreadsheet
   */
  processAndRegister: async (file: File) => {
    try {
      const pdfPart = await shlService.fileToGenerativePart(file);
      
      // Analyze with Gemini
      const shlData = await geminiService.analyzeSHLData(pdfPart);
      
      // Register in Database
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

      return { shlData, result };
    } catch (error) {
      console.error("[shlService] Pipeline Failure:", error);
      throw error;
    }
  }
};

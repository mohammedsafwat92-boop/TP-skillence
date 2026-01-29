
import { pdfjs } from 'react-pdf'; // or pdfjs-dist
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
import { geminiService } from './geminiService';
import { googleSheetService } from './googleSheetService';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export const shlService = {
  extractText: async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map((item: any) => item.str);
      fullText += strings.join(' ') + '\n';
    }
    return fullText;
  },

  processAndRegister: async (file: File) => {
    const rawText = await shlService.extractText(file);
    const shlData = await geminiService.analyzeSHLData(rawText);
    
    // Register User in Backend
    const registration = await googleSheetService.createUser({
      name: shlData.candidateName,
      email: shlData.email,
      cefrLevel: shlData.cefrLevel,
      initialScores: {
        grammar: shlData.grammar,
        vocabulary: shlData.vocabulary,
        fluency: shlData.fluency,
        pronunciation: shlData.pronunciation
      },
      password: 'TpSkill2026!' // Default initial password
    });

    return { shlData, registration };
  }
};


import { GoogleGenAI, Type } from "@google/genai";
import { quizModuleMapping, allTrainingModules } from '../data/trainingData';
import type { QuizQuestion, Module, UserProfile } from '../types';

export const generateWorksheetQuestions = async (quizId: string, userLevel: string = 'B1'): Promise<QuizQuestion[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    let prompt;
    let systemInstruction = "You are an expert language and sales coach for Teleperformance Egypt's Skillence program. ";

    if (quizId === 'adaptive_test') {
        systemInstruction += `Create a 20-question Adaptive Proficiency Test suitable for CEFR Level ${userLevel}. 
        The test must evaluate language skills and sales rapport effectiveness.
        
        Structure:
        - 5 Listening Comprehension Questions (Context: Call center transcripts or customer complaints).
        - 5 Reading Comprehension Questions (Context: Internal travel policies or telecom plans).
        - 5 Sales & Negotiation Questions (Context: Handling objections, upselling, rapport building).
        - 5 Speaking/Response Scenarios (Verbal responses to difficult customers).
        
        For Speaking questions, set 'options' to an empty array and 'correctAnswer' to -1.
        For Listening/Reading, include the source text in the 'context' field.
        `;

        prompt = `Generate a JSON object containing exactly 20 questions. Focus on practical scenarios in Teleperformance Egypt accounts like Airline booking, Telecom support, and Upselling Premium services.`;

    } else if (quizId === 'final_assessment') {
        const allModulesSummary = Object.values(allTrainingModules).map(module => 
            `- ${module.title}: Covers topics like ${module.lessons.slice(0, 2).map(l => `"${l.title}"`).join(', ')}...`
        ).join('\n');

        prompt = `
            Create a comprehensive 15-question final assessment.
            Include questions on: Listening, Reading, Sales Psychology, and Cultural Etiquette.
            
            Modules Summary:
            ${allModulesSummary}
        `;
    } else {
        const moduleIds = quizModuleMapping[quizId];
        const modulesForQuiz = moduleIds ? moduleIds.map(id => allTrainingModules[id]) : [];
        const quizSummary = modulesForQuiz.map(module => 
            `- ${module.title}: ${module.lessons.map(l => l.title).join(', ')}.`
        ).join('\n');

        prompt = `
            Based on the following training modules, create a 10-question multiple-choice quiz.
            
            Training Modules:
            ${quizSummary}
        `;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            quiz: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ['multiple_choice', 'listening', 'reading', 'speaking'] },
                  question: { type: Type.STRING },
                  context: { type: Type.STRING },
                  speakingPrompt: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  correctAnswer: { type: Type.INTEGER }
                },
                required: ['id', 'type', 'question']
              }
            }
          },
          required: ['quiz']
        },
      },
    });

    const jsonString = response.text.trim();
    const parsedResponse = JSON.parse(jsonString);
    
    if (parsedResponse.quiz && Array.isArray(parsedResponse.quiz)) {
        return parsedResponse.quiz;
    } else {
        throw new Error("Invalid response format from Gemini API.");
    }
    
  } catch (error) {
    console.error("Error generating worksheet:", error);
    throw new Error("Failed to generate worksheet. Please try again.");
  }
};

export const generatePersonalizedAssignment = async (user: UserProfile, availableModules: Module[]): Promise<{ recommendedModuleIds: string[], reasoning: string }> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const moduleList = availableModules.map(m => `${m.id}: ${m.title} - ${m.description}`).join('\n');
    
    const prompt = `Analyze this agent profile and recommend exactly 3 modules from the list that will best support their growth.
    
    Agent Profile:
    Name: ${user.name}
    Role: ${user.role}
    Language Level: ${user.languageLevel}
    
    Available Modules:
    ${moduleList}`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                systemInstruction: "You are a Training Director at Teleperformance Egypt. Your goal is to optimize agent performance through targeted training assignments based on their role and CEFR proficiency level.",
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        recommendedModuleIds: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        },
                        reasoning: { type: Type.STRING }
                    },
                    required: ['recommendedModuleIds', 'reasoning']
                }
            }
        });

        const result = JSON.parse(response.text.trim());
        return result;
    } catch (error) {
        console.error("AI Auto-Assign Error:", error);
        throw new Error("Failed to generate AI recommendations.");
    }
};

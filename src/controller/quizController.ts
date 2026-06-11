import { Request, Response } from 'express';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

export const generateQuizFromNote = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, subject, description } = req.body;

    if (!title || !subject) {
      res.status(400).json({ message: "Missing note metadata for quiz profiling." });
      return;
    }

    // 1. Read the API key dynamically *inside* the execution block
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ message: "Server configuration error: Missing API Key." });
      return;
    }

    // 2. Instantiate the SDK right here
    const ai = new GoogleGenerativeAI(apiKey);

    const targetPrompt = `
      You are an expert academic tutor engine. Generate a challenging 3-question multiple-choice self-assessment quiz based on the following lecture note metadata profile:
      - Subject Area: ${subject}
      - Note Title: ${title}
      - Context Description: ${description || 'General study material'}
    `;

    // Fetch model and enforce strict structural JSON schema
    const model = ai.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.ARRAY,
          description: "List of multiple choice quiz questions",
          items: {
            type: SchemaType.OBJECT,
            properties: {
              q: { type: SchemaType.STRING, description: "The quiz question text." },
              a: { 
                type: SchemaType.ARRAY, 
                items: { type: SchemaType.STRING },
                description: "Array of exactly 4 answer options." 
              },
              correct: { type: SchemaType.INTEGER, description: "Index of the correct answer option (0-3)." }
            },
            required: ["q", "a", "correct"],
          }
        }
      }
    });

    const result = await model.generateContent(targetPrompt);
    const textOutput = result.response.text().trim();

    const parsedQuiz = JSON.parse(textOutput);
    res.status(200).json({ quiz: parsedQuiz });

  } catch (error: any) {
    console.error("Gemini AI Engine Fault:", error);
    res.status(500).json({ 
      message: "AI generator encountered an internal exception profile.", 
      error: error.message 
    });
  }
};
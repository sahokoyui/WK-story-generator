
import { GoogleGenAI, Type } from "@google/genai";
import { GeneratedStory, WaniKaniItem, JLPTLevel, StoryLength } from "../types";

export async function generateStory(
  vocabItems: WaniKaniItem[], 
  level: JLPTLevel = 'JLPT N2', 
  length: StoryLength = '2-5 sentences'
): Promise<GeneratedStory> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  
  const vocabList = vocabItems.map(item => ({
    characters: item.data.characters,
    meaning: item.data.meanings.find(m => m.primary)?.meaning || "",
    reading: item.data.readings?.find(r => r.primary)?.reading || "",
    level: item.data.level
  }));

  const prompt = `
    Generate a short Japanese story (${length}) at ${level} level.
    The story MUST include as many of the following vocabulary/kanji as possible in a natural way:
    ${vocabList.map(v => `${v.characters} (${v.meaning})`).join(", ")}

    Return the response in JSON format with the following structure:
    {
      "title": "A creative title in Japanese",
      "segments": [
        {
          "text": "The Japanese text segment",
          "isTarget": true,
          "vocab": {
            "characters": "The kanji/vocab used in this segment",
            "reading": "The reading (hiragana/katakana)",
            "meaning": "The English meaning",
            "level": 12
          }
        }
      ],
      "translation": "Full English translation"
    }
    
    CRITICAL INSTRUCTIONS:
    1. Break the story into segments so that EVERY SINGLE KANJI or KANJI COMPOUND (vocabulary) is its own segment.
    2. For EVERY segment that contains kanji, you MUST provide the "vocab" object with reading and meaning.
    3. For segments that match the target vocabulary/kanji list provided above, you MUST set "isTarget": true.
    4. If a segment is purely kana or punctuation, omit the "vocab" field and set "isTarget": false.
    5. Ensure that the "reading" field is provided for ALL kanji segments to enable furigana.
    6. The story should be natural and appropriate for ${level} level.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          translation: { type: Type.STRING },
          segments: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                isTarget: { type: Type.BOOLEAN },
                vocab: {
                  type: Type.OBJECT,
                  properties: {
                    characters: { type: Type.STRING },
                    reading: { type: Type.STRING },
                    meaning: { type: Type.STRING },
                    level: { type: Type.NUMBER }
                  }
                }
              },
              required: ["text"]
            }
          }
        },
        required: ["title", "translation", "segments"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}

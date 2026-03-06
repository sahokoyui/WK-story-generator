import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API route for story generation
  // We use the same path as Netlify functions for compatibility
  app.post("/.netlify/functions/generate-story", async (req, res) => {
    try {
      const { vocabItems, level, length } = req.body;
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY not set" });
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const vocabList = vocabItems.map((item: any) => ({
        characters: item.data.characters,
        meaning: item.data.meanings.find((m: any) => m.primary)?.meaning || "",
        reading: item.data.readings?.find((r: any) => r.primary)?.reading || "",
        level: item.data.level
      }));

      const prompt = `
        Generate a short Japanese story (${length}) at ${level} level.
        The story MUST include as many of the following vocabulary/kanji as possible in a natural way:
        ${vocabList.map((v: any) => `${v.characters} (${v.meaning})`).join(", ")}

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

      res.json(JSON.parse(response.text || "{}"));
    } catch (error: any) {
      console.error("Error generating story:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

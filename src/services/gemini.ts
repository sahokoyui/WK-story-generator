
import { GeneratedStory, WaniKaniItem, JLPTLevel, StoryLength } from "../types";

export async function generateStory(
  vocabItems: WaniKaniItem[], 
  level: JLPTLevel = 'JLPT N2', 
  length: StoryLength = '2-5 sentences'
): Promise<GeneratedStory> {
  const response = await fetch("/.netlify/functions/generate-story", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ vocabItems, level, length }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to generate story");
  }

  return response.json();
}

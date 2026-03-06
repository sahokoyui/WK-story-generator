
export interface WaniKaniItem {
  id: number;
  object: 'vocabulary' | 'kanji' | 'radical';
  data: {
    characters: string;
    meanings: { meaning: string; primary: boolean }[];
    readings?: { reading: string; primary: boolean; type?: string }[];
    level: number;
    slug: string;
  };
}

export interface StorySegment {
  text: string;
  isTarget?: boolean;
  vocab?: {
    characters: string;
    reading: string;
    meaning: string;
    level: number;
  };
}

export interface GeneratedStory {
  title: string;
  segments: StorySegment[];
  translation: string;
}

export type JLPTLevel = 'JLPT N3' | 'JLPT N2' | 'JLPT N1';
export type StoryLength = '2-5 sentences' | '5-7 sentences';

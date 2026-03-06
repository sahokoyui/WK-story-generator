
import { WaniKaniItem } from '../types';

const BASE_URL = 'https://api.wanikani.com/v2';

export async function fetchWaniKaniData(endpoint: string, apiKey: string) {
  const response = await fetch(`${BASE_URL}/${endpoint}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Wanikani-Revision': '20170710',
    },
  });
  if (!response.ok) {
    throw new Error(`WaniKani API error: ${response.statusText}`);
  }
  return response.json();
}

export async function getVocabBySRS(apiKey: string, stages: number[], limit: number = 15, offset: number = 0): Promise<WaniKaniItem[]> {
  const assignments = await fetchWaniKaniData(`assignments?srs_stages=${stages.join(',')}&immediately_available_for_review=false`, apiKey);
  const subjectIds = assignments.data
    .slice(offset, offset + limit * 2) 
    .map((a: any) => a.data.subject_id);
  
  if (subjectIds.length === 0) return [];

  const subjects = await fetchWaniKaniData(`subjects?ids=${subjectIds.join(',')}`, apiKey);
  return subjects.data
    .filter((s: any) => s.object === 'vocabulary' || s.object === 'kanji')
    .slice(0, limit);
}

export async function getRecentMistakes(apiKey: string, limit: number = 15, offset: number = 0): Promise<WaniKaniItem[]> {
  const stats = await fetchWaniKaniData('review_statistics?order_by=incorrect_count&direction=desc', apiKey);
  const subjectIds = stats.data
    .slice(offset, offset + limit * 2)
    .map((s: any) => s.data.subject_id);

  if (subjectIds.length === 0) return [];

  const subjects = await fetchWaniKaniData(`subjects?ids=${subjectIds.join(',')}`, apiKey);
  return subjects.data
    .filter((s: any) => s.object === 'vocabulary' || s.object === 'kanji')
    .slice(0, limit);
}

export async function getRandomVocab(apiKey: string, limit: number = 15): Promise<WaniKaniItem[]> {
  // Get user's current level to get relevant random items
  const user = await fetchWaniKaniData('user', apiKey);
  const level = user.data.level;
  
  const subjects = await fetchWaniKaniData(`subjects?levels=${level}&types=vocabulary,kanji`, apiKey);
  const shuffled = subjects.data.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, limit);
}

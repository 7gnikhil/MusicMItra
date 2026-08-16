export type MoodBasedRecommendationsOutput = {
  songs: string[];
  reasoning: string;
};

const recommendationsByMood: Record<string, string[]> = {
  happy: ['Butta Bomma', 'Samajavaragamana', 'Inkem Inkem Inkem Kaavaale'],
  relaxed: ['Vellipomaakey', 'Adiga Adiga', 'The Life of Ram'],
  energetic: ['Naatu Naatu', 'Seeti Maar', 'Ramuloo Ramulaa'],
  sad: ['Inthandham', 'Priyathama Priyathama', 'Nee Kannu Neeli Samudram'],
  romantic: ['Oh Sita Hey Rama', 'Kaanunna Kalyanam', 'Maate Vinadhuga'],
};

/**
 * Provides a dependable local fallback while the former Genkit-backed flow is
 * unavailable. It keeps the chatbot functional without exposing API keys in
 * the browser.
 */
export async function moodBasedRecommendations({
  mood,
}: {
  mood: string;
}): Promise<MoodBasedRecommendationsOutput> {
  const normalizedMood = mood.trim().toLowerCase();
  const matchedMood = Object.keys(recommendationsByMood).find((key) =>
    normalizedMood.includes(key)
  );
  const songs = recommendationsByMood[matchedMood ?? 'relaxed'];

  return {
    songs,
    reasoning: matchedMood
      ? `Here are some Telugu songs for a ${matchedMood} mood.`
      : 'Here are some calm Telugu songs to get you started.',
  };
}

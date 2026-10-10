// Voice command parsing for hands-free workout control.
// Ported from the web app (js/workout.js handleVoiceCommand / tryVoiceLog).
// Pure functions, no native dependencies, so the parsing is unit-testable
// and shared by any voice UI.

export type Units = 'kg' | 'lb';

export type VoiceAction =
  | { kind: 'next-set' }
  | { kind: 'start-rest' }
  | { kind: 'stop-rest' }
  | { kind: 'next-exercise' }
  | { kind: 'log-set'; reps: number | null; weight: number | null }
  | { kind: 'add-weight'; amount: number }
  | { kind: 'unknown'; text: string };

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  hundred: 100,
};

const WORD_PATTERN =
  /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)\b/g;

/** Replace English number words with digits; "twenty five" becomes "25". */
export function wordsToDigits(text: string): string {
  let out = text.toLowerCase().replace(WORD_PATTERN, (w) => String(NUMBER_WORDS[w]));
  // "20 5" spoken as "twenty five" -> 25 (only when the second part is < 10)
  out = out.replace(/(\d+)\s+(\d+)\b/g, (m, a, b) =>
    parseInt(a, 10) >= 20 && parseInt(b, 10) < 10
      ? String(parseInt(a, 10) + parseInt(b, 10))
      : m
  );
  return out;
}

export interface ParsedSet {
  reps: number | null;
  weight: number | null;
}

/**
 * Parse "120 for 8", "10 reps 60 kilos", "8 reps", "60 kg" style input.
 * Returns null when nothing set-like was found.
 */
export function parseVoiceSet(rawText: string): ParsedSet | null {
  const text = wordsToDigits(rawText);

  // Gym convention: "120 for 8" means 120 weight for 8 reps.
  const forMatch = text.match(/(\d+(?:\.\d+)?)\s+for\s+(\d+)/);
  if (forMatch) {
    return { weight: parseFloat(forMatch[1]), reps: parseInt(forMatch[2], 10) };
  }

  const repsMatch = text.match(/(\d+)\s*reps?/);
  const weightMatch = text.match(/(\d+(?:\.\d+)?)\s*(kg|kilos?|lb|lbs|pounds?)/);
  let reps = repsMatch ? parseInt(repsMatch[1], 10) : null;
  let weight = weightMatch ? parseFloat(weightMatch[1]) : null;

  if (reps === null && weight === null) {
    const nums = text.match(/\d+(?:\.\d+)?/g);
    if (nums && nums.length >= 2) {
      reps = parseInt(nums[0], 10);
      weight = parseFloat(nums[1]);
    } else if (nums && nums.length === 1) {
      reps = parseInt(nums[0], 10);
    }
  }

  if (reps === null && weight === null) return null;
  return { reps, weight };
}

/** Parse "add 5", "add 2.5 kilos" into a weight increment. */
export function parseAddWeight(rawText: string): number | null {
  const text = wordsToDigits(rawText);
  const m = text.match(/\badd\s+(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}

/**
 * Classify a transcript into a workout action. Command phrases are checked
 * before set logging so "log set" does not get parsed as numbers.
 */
export function classifyVoiceCommand(rawText: string): VoiceAction {
  const text = rawText.toLowerCase().trim();

  if (
    text.includes('next set') ||
    text.includes('complete set') ||
    text.includes('set done') ||
    text.includes('log set')
  ) {
    return { kind: 'next-set' };
  }
  if (text.includes('start timer') || text.includes('start rest')) {
    return { kind: 'start-rest' };
  }
  if (
    text.includes('stop timer') ||
    text.includes('stop rest') ||
    text.includes('cancel timer')
  ) {
    return { kind: 'stop-rest' };
  }
  if (text.includes('next exercise') || text.includes('finish exercise')) {
    return { kind: 'next-exercise' };
  }
  const addAmount = parseAddWeight(text);
  if (addAmount !== null) {
    return { kind: 'add-weight', amount: addAmount };
  }
  const parsed = parseVoiceSet(text);
  if (parsed) {
    return { kind: 'log-set', reps: parsed.reps, weight: parsed.weight };
  }
  return { kind: 'unknown', text: rawText.trim() };
}

/** Human-readable hint shown under the voice button. */
export function voiceHint(units: Units): string {
  const unitWord = units === 'lb' ? 'pounds' : 'kilos';
  return `Say "next set", "start rest", or "10 reps 60 ${unitWord}"`;
}

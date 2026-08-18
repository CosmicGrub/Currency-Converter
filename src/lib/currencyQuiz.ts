import { CURRENCY_NAMES } from "../data/currencyNames.js";

// ---------------------------------------------------------------------------
// "Currency IQ" -- a lightweight learning/observation tool. The adaptive
// question selection below is a genuinely rudimentary form of on-device
// "AI": a simple weighted-sampling heuristic (not a neural network, not
// spaced-repetition scheduling like Anki's SM-2, just a miss-rate-weighted
// random draw) that resurfaces currencies the user has gotten wrong more
// often than ones they already know. Entirely local: stats persist to
// localStorage (see components/CurrencyQuiz.tsx), nothing is computed
// remotely and nothing is ever sent anywhere.
// ---------------------------------------------------------------------------

export interface QuizStats {
  [code: string]: { correct: number; incorrect: number };
}

export interface QuizQuestion {
  code: string;
  correctName: string;
  options: string[];
}

const UNSEEN_WEIGHT = 3; // unseen codes get a head start over "known" ones
const MIN_WEIGHT = 1;
const MISS_WEIGHT_SCALE = 4; // a 100%-miss code gets up to +4 weight

/** Higher weight for codes the user has missed more often; unseen codes
 *  get a flat head-start weight so new material shows up reasonably soon
 *  without dominating every single question. */
export function weightFor(stats: QuizStats, code: string): number {
  const s = stats[code];
  const seen = s ? s.correct + s.incorrect : 0;
  if (seen === 0) return UNSEEN_WEIGHT;
  const missRate = s.incorrect / seen;
  return MIN_WEIGHT + missRate * MISS_WEIGHT_SCALE;
}

/** Weighted random pick from `pool` using `weightFor`. */
export function pickWeightedCode(stats: QuizStats, pool: string[]): string {
  if (pool.length === 0) throw new Error("pickWeightedCode: empty pool");
  const weights = pool.map((code) => weightFor(stats, code));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Builds a 4-option multiple-choice question: "which currency uses code
 *  X", weighted toward codes the user has missed before. */
export function buildQuestion(
  stats: QuizStats,
  pool: string[] = Object.keys(CURRENCY_NAMES)
): QuizQuestion {
  const code = pickWeightedCode(stats, pool);
  const correctName = CURRENCY_NAMES[code] || code;
  const distractorPool = pool.filter((c) => c !== code);
  const distractors = shuffle(distractorPool)
    .slice(0, 3)
    .map((c) => CURRENCY_NAMES[c] || c);
  const options = shuffle([correctName, ...distractors]);
  return { code, correctName, options };
}

/** Returns a new stats object with one answer recorded -- pure, no
 *  mutation, straightforward to test and to persist via saveJSON. */
export function recordAnswer(stats: QuizStats, code: string, wasCorrect: boolean): QuizStats {
  const prev = stats[code] || { correct: 0, incorrect: 0 };
  return {
    ...stats,
    [code]: {
      correct: prev.correct + (wasCorrect ? 1 : 0),
      incorrect: prev.incorrect + (wasCorrect ? 0 : 1),
    },
  };
}

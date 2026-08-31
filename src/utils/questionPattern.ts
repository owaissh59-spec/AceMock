/**
 * Question pattern recognition + pattern-aware ordering.
 *
 * The plain shuffle used earlier had no idea what *kind* of question it was
 * moving around, so it happily placed three "Consider the following
 * statements" questions back-to-back, or two "Match the following" questions
 * in a row. This module classifies every question by its structural pattern
 * and then lays the paper out so that:
 *
 *   1. Two questions of the same pattern are never adjacent (whenever the
 *      group sizes make that mathematically possible), and
 *   2. Each pattern is spread evenly across the whole paper instead of being
 *      bunched into the first half.
 */

export type QuestionPattern =
  | 'assertion-reason'
  | 'match-the-following'
  | 'statement-based'
  | 'pair-based'
  | 'list-based'
  | 'sequence-order'
  | 'fill-in-the-blank'
  | 'odd-one-out'
  | 'direct';

export const PATTERN_LABELS: Record<QuestionPattern, string> = {
  'assertion-reason': 'Assertion & Reason',
  'match-the-following': 'Match the Following',
  'statement-based': 'Statement Based',
  'pair-based': 'Pair Based',
  'list-based': 'Enumerated List',
  'sequence-order': 'Sequence / Order',
  'fill-in-the-blank': 'Fill in the Blank',
  'odd-one-out': 'Odd One Out / Except',
  direct: 'Direct',
};

/** Minimal shape needed for classification — keeps this usable for any question-like object. */
export interface PatternInput {
  questionText: string;
  options?: string[];
  subject?: string;
}

const ROMAN = '(?:i{1,3}|iv|v|vi{0,3}|ix|x)';

/**
 * Counts enumerated items ("1." / "(2)" / "III." / "- ...") that appear in the
 * question stem. Options live in a separate field, so anything enumerated here
 * is part of the stem itself (statements, pairs, list items).
 */
const countEnumeratedItems = (raw: string): number => {
  const lines = raw
    .replace(/<br\s*\/?>/gi, '\n')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let count = 0;
  for (const line of lines) {
    const cleaned = line.replace(/^[*_>\s]+/, '');
    // "1. text" | "1) text" | "(1) text" | "II. text" | "(iii) text"
    if (new RegExp(`^\\(?(?:\\d{1,2}|${ROMAN})\\)?\\s*[.):\\-]\\s*\\S`, 'i').test(cleaned)) {
      count++;
      continue;
    }
    // Markdown/plain bullets used for statements
    if (/^[-•‣]\s+\S/.test(cleaned)) count++;
  }
  return count;
};

/** True when the stem contains a markdown table (the usual shape of a match-the-following). */
const hasTable = (raw: string): boolean => {
  const rows = raw.split(/\r?\n/).filter((l) => (l.match(/\|/g) || []).length >= 2);
  return rows.length >= 2;
};

/**
 * Classifies a question by its structural pattern.
 * Order of the checks matters: the more specific structures are tested first
 * because their text often also contains the generic keywords.
 */
export const detectQuestionPattern = (q: PatternInput): QuestionPattern => {
  const raw = q.questionText || '';
  const text = raw.toLowerCase().replace(/\s+/g, ' ');
  const optionsText = (q.options || []).join(' | ').toLowerCase();

  // ---- 1. Assertion & Reason -------------------------------------------------
  if (/\bassertion\b/.test(text) && /\breason\b/.test(text)) return 'assertion-reason';
  if (/\ba\s*\)?\s*:/.test(text) && /\br\s*\)?\s*:/.test(text) && /\breason\b/.test(text)) {
    return 'assertion-reason';
  }
  // Options of the classic A&R stem, e.g. "Both A and R are true and R explains A"
  if (/\bboth\s+a\s+and\s+r\b/.test(optionsText) || /\br\s+is\s+(the\s+)?correct\s+explanation\b/.test(optionsText)) {
    return 'assertion-reason';
  }

  // ---- 2. Match the following / List-Column matching -------------------------
  if (/match\s+(?:the\s+)?(?:following|list|lists|column|columns|items|pairs|set)/.test(text)) {
    return 'match-the-following';
  }
  if (/\blist\s*[-–—]?\s*i\b/.test(text) && /\blist\s*[-–—]?\s*ii\b/.test(text)) return 'match-the-following';
  if (/\bcolumn\s*[-–—]?\s*(?:i|a|1)\b/.test(text) && /\bcolumn\s*[-–—]?\s*(?:ii|b|2)\b/.test(text)) {
    return 'match-the-following';
  }
  if (/\bcorrectly\s+matched\b/.test(text) && hasTable(raw)) return 'match-the-following';
  // Options shaped like a mapping: "1-b, 2-c, 3-a" or "A-2, B-4, C-1"
  if (/(?:\d|\b[a-d]\b)\s*[-–—:]\s*(?:\d|\b[a-d]\b)\s*[,;]\s*(?:\d|\b[a-d]\b)\s*[-–—:]\s*(?:\d|\b[a-d]\b)/.test(optionsText)) {
    return 'match-the-following';
  }

  // ---- 3. Pair based --------------------------------------------------------
  if (/consider the following pairs/.test(text)) return 'pair-based';
  if (/\bpairs?\b/.test(text) && /(?:correctly matched|is|are)\b/.test(text) && countEnumeratedItems(raw) >= 2) {
    return 'pair-based';
  }

  // ---- 4. Statement based ---------------------------------------------------
  const enumerated = countEnumeratedItems(raw);
  const mentionsStatement = /\bstatements?\b/.test(text);
  if (/consider the following statements?/.test(text)) return 'statement-based';
  if (/how many of the (?:above|following|given) statements?/.test(text)) return 'statement-based';
  if (new RegExp(`\\bstatement\\s*[-–—]?\\s*(?:${ROMAN}|\\d)\\s*[:.)]`, 'i').test(raw)) return 'statement-based';
  if (/\bwhich of the (?:above|following) statements?\b/.test(text)) return 'statement-based';
  if (mentionsStatement && enumerated >= 2) return 'statement-based';
  if (mentionsStatement && /\b(correct|incorrect|true|false)\b/.test(text)) return 'statement-based';

  // ---- 5. Sequence / chronological order ------------------------------------
  if (/chronological order|correct sequence|correct order|arrange the following|ascending order|descending order/.test(text)) {
    return 'sequence-order';
  }

  // ---- 6. Enumerated list stems that aren't explicitly "statements" ---------
  if (enumerated >= 2 || hasTable(raw)) return 'list-based';

  // ---- 7. Fill in the blank -------------------------------------------------
  if (/_{3,}/.test(raw) || /\.{4,}/.test(raw)) return 'fill-in-the-blank';

  // ---- 8. Negative / odd-one-out --------------------------------------------
  if (/\bexcept\b/.test(text)) return 'odd-one-out';
  if (/\b(?:is|are|was|were)\s+not\b/.test(text) || /\bnot\s+(?:correct|true|a member|an?\b)/.test(text)) {
    return 'odd-one-out';
  }
  if (/\bincorrect(?:ly)?\b/.test(text) || /\bodd one\b/.test(text)) return 'odd-one-out';

  return 'direct';
};

/** Fisher–Yates shuffle returning a new array. */
export const shuffleArray = <T>(array: T[]): T[] => {
  const out = [...array];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

interface Slot<T> {
  item: T;
  /** Adjacency constraint key — the structural pattern. */
  pattern: QuestionPattern;
  /** Finer key (pattern + subject) used only to spread items evenly. */
  spreadKey: string;
  pos: number;
}

/**
 * Finds the insertion index in `arr` where an item of `pattern` can sit without
 * touching another item of the same pattern. Prefers the gap nearest to
 * `preferIdx` so the even spread built in step 2 is disturbed as little as
 * possible. Returns -1 when no conflict-free gap exists.
 */
const findConflictFreeGap = <T>(
  arr: Slot<T>[],
  pattern: QuestionPattern,
  preferIdx: number
): number => {
  let best = -1;
  let bestDistance = Infinity;
  for (let k = 0; k <= arr.length; k++) {
    const leftOk = k === 0 || arr[k - 1].pattern !== pattern;
    const rightOk = k === arr.length || arr[k].pattern !== pattern;
    if (!leftOk || !rightOk) continue;
    const distance = Math.abs(k - preferIdx);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = k;
    }
  }
  return best;
};

/**
 * Randomises questions while keeping same-pattern questions apart.
 *
 * Step 1 — group by `pattern::subject` and shuffle each group.
 * Step 2 — give every question a virtual position spread evenly over the paper
 *          (each group gets a random phase so groups don't line up), then sort.
 * Step 3 — repair remaining same-pattern neighbours by relocating one of the two
 *          offenders to the nearest conflict-free gap.
 */
export const arrangeQuestions = <T extends PatternInput>(questions: T[]): T[] => {
  if (!questions || questions.length <= 2) return shuffleArray(questions || []);

  const total = questions.length;

  // --- Step 1: group ---------------------------------------------------------
  const patternOf = new Map<T, QuestionPattern>();
  const groups = new Map<string, T[]>();
  for (const q of questions) {
    const pattern = detectQuestionPattern(q);
    patternOf.set(q, pattern);
    const spreadKey = `${pattern}::${(q.subject || '').toLowerCase().trim()}`;
    const bucket = groups.get(spreadKey);
    if (bucket) bucket.push(q);
    else groups.set(spreadKey, [q]);
  }

  // Everything is the same pattern and subject — nothing to interleave.
  if (groups.size <= 1) return shuffleArray(questions);

  // --- Step 2: even spread with a random phase per group --------------------
  let slots: Slot<T>[] = [];
  for (const [spreadKey, items] of groups) {
    const shuffled = shuffleArray(items);
    const phase = Math.random();
    const step = total / shuffled.length;
    shuffled.forEach((item, i) => {
      slots.push({
        item,
        pattern: patternOf.get(item)!,
        spreadKey,
        // Small jitter keeps equal-sized groups from producing a rigid A,B,A,B cycle.
        pos: (i + phase) * step + (Math.random() - 0.5) * step * 0.25,
      });
    });
  }
  slots.sort((a, b) => a.pos - b.pos);

  // --- Step 3: repair same-pattern neighbours -------------------------------
  // Each successful relocation strictly reduces the number of same-pattern
  // adjacencies, so this converges. It stops early once the paper is clean, or
  // once no further move is possible — which happens only when one pattern makes
  // up more than half the paper, where some adjacency is unavoidable.
  const maxPasses = Math.min(12, slots.length);
  for (let pass = 0; pass < maxPasses; pass++) {
    let conflicts = 0;
    let progress = false;

    for (let i = 1; i < slots.length; i++) {
      if (slots[i].pattern !== slots[i - 1].pattern) continue;

      let fixed = false;
      // Try relocating the later offender first, then the earlier one.
      for (const idx of [i, i - 1]) {
        const moving = slots[idx];
        const rest = [...slots.slice(0, idx), ...slots.slice(idx + 1)];
        const gap = findConflictFreeGap(rest, moving.pattern, idx);
        if (gap < 0) continue;
        rest.splice(gap, 0, moving);
        slots = rest;
        fixed = true;
        progress = true;
        break;
      }
      if (!fixed) conflicts++;
    }

    if (conflicts === 0 || !progress) break;
  }

  return slots.map((s) => s.item);
};

/** Debug/diagnostic helper: how many questions of each pattern are in a set. */
export const summarisePatterns = (questions: PatternInput[]): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const q of questions) {
    const label = PATTERN_LABELS[detectQuestionPattern(q)];
    counts[label] = (counts[label] || 0) + 1;
  }
  return counts;
};

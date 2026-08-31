/** Marker class on the generated Column I / Column II grid, used to skip it during list formatting. */
const COLUMN_GRID_CLASS = 'acemock-column-grid';

export const formatColumns = (text: string) => {
  if (!text) return text;
  
  // If the text already contains a Markdown table syntax, do not attempt to split it manually
  if (text.match(/\|\s*[-:]+\s*\|/)) {
    return text;
  }
  
  // Split by lines for better multi-line parsing
  const lines = text.split('\n');
  
  // Find Column I / List I and Column II / List II header positions
  const col1HeaderPattern = /^(?:Column\s*I|List\s*I|List-I|Column-I)\s*[:\-]?\s*$/i;
  const col2HeaderPattern = /^(?:Column\s*II|List\s*II|List-II|Column-II)\s*[:\-]?\s*$/i;
  
  let col1HeaderIdx = -1;
  let col2HeaderIdx = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (col1HeaderPattern.test(trimmed) && col1HeaderIdx === -1) {
      col1HeaderIdx = i;
    } else if (col2HeaderPattern.test(trimmed) && col2HeaderIdx === -1) {
      col2HeaderIdx = i;
    }
  }
  
  // If we didn't find line-based headers, try the old inline regex approach
  if (col1HeaderIdx === -1 || col2HeaderIdx === -1) {
    const inlineRegex = /(.*?)(?:Column\s*I|List\s*I|List-I|Column-I)[:\s]+(.*?)(?:Column\s*II|List\s*II|List-II|Column-II)[:\s]+(.*)/is;
    const match = text.match(inlineRegex);
    if (match) {
      const preamble = match[1].trim();
      let col1 = formatColumnList(match[2]);
      let col2 = formatColumnList(match[3]);
      return buildColumnsHtml(preamble, col1, col2, '');
    }
    return text;
  }
  
  // Extract preamble (everything before Column I header)
  const preamble = lines.slice(0, col1HeaderIdx).join('\n').trim();
  
  // Extract Column I items (between Column I header and Column II header)
  const col1Lines = lines.slice(col1HeaderIdx + 1, col2HeaderIdx)
    .map(l => l.trim())
    .filter(l => l.length > 0);
  
  // Extract Column II items and trailing text (after Column II header)
  const afterCol2Lines = lines.slice(col2HeaderIdx + 1)
    .map(l => l.trim())
    .filter(l => l.length > 0);
  
  // Separate Column II items from trailing text (like "Choose the correct match:")
  // Items in Column II will have markers like (i), (ii), (a), (1), etc. or start with letters/numbers
  const col2Items: string[] = [];
  let trailingText = '';
  const itemPattern = /^\(?[a-zA-Z0-9ivxIVX]{1,4}[.)]\s/;
  
  let foundTrailing = false;
  for (const line of afterCol2Lines) {
    if (!foundTrailing && itemPattern.test(line)) {
      col2Items.push(line);
    } else if (!foundTrailing && col2Items.length > 0 && !itemPattern.test(line)) {
      // This is trailing text after the items end
      foundTrailing = true;
      trailingText += line + '\n';
    } else if (foundTrailing) {
      trailingText += line + '\n';
    } else {
      // Still in column II items but doesn't match pattern - might be wrapped text
      col2Items.push(line);
    }
  }
  
  const col1Html = formatColumnItems(col1Lines);
  const col2Html = formatColumnItems(col2Items);
  
  return buildColumnsHtml(preamble, col1Html, col2Html, trailingText.trim());
};

const formatColumnItems = (items: string[]): string => {
  if (items.length === 0) return '';
  
  let html = '<div class="flex flex-col gap-1.5">';
  for (const item of items) {
    // Try to separate marker from content: (a) Text, (i) Text, a. Text, 1. Text, etc.
    const markerMatch = item.match(/^(\(?[a-zA-Z0-9ivxIVX]{1,4}[.):])\s*(.*)/);
    if (markerMatch) {
      html += `<div><strong>${markerMatch[1]}</strong> ${markerMatch[2]}</div>`;
    } else {
      html += `<div>${item}</div>`;
    }
  }
  html += '</div>';
  return html;
};

const formatColumnList = (listStr: string) => {
  // Parse items that may be separated by newlines or inline with markers
  const lines = listStr.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  if (lines.length > 1) {
    return formatColumnItems(lines);
  }
  
  // Try inline splitting by markers like (a), (b), (i), (ii), etc.
  const parts = listStr.split(/(?:^|[,;\s])\s*(?:\()?([a-eA-EP-S]|\d+|[ivxIVX]{1,4})[.)]\s/g);
  
  if (parts.length <= 1) {
    return listStr.trim();
  }

  let html = '<div class="flex flex-col gap-1.5">';
  if (parts[0] && parts[0].trim()) {
    html += `<div>${parts[0].trim()}</div>`;
  }
  for (let i = 1; i < parts.length; i += 2) {
    if (parts[i]) {
      const marker = parts[i].match(/^[a-eA-E]$/) ? `(${parts[i]})` : `${parts[i]}.`;
      html += `<div><strong>${marker}</strong> ${parts[i + 1] ? parts[i + 1].trim() : ''}</div>`;
    }
  }
  html += '</div>';
  return html;
};

const buildColumnsHtml = (preamble: string, col1Html: string, col2Html: string, trailing: string): string => {
  // NOTE: this markup is deliberately emitted on a *single line* with no internal
  // newlines or indentation. The question body is rendered with `whitespace-pre-wrap`,
  // so any newline inside raw HTML would show up as visible blank space.
  const grid =
    `<div class="${COLUMN_GRID_CLASS} grid grid-cols-1 md:grid-cols-2 gap-3 my-3 bg-slate-50/80 dark:bg-slate-800/80 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm text-sm">` +
    `<div class="flex flex-col">` +
    `<div class="font-bold text-slate-800 dark:text-slate-100 mb-2 border-b border-slate-200 dark:border-slate-700 pb-1">Column I</div>` +
    `<div class="text-slate-700 dark:text-slate-300 leading-relaxed">${col1Html}</div>` +
    `</div>` +
    `<div class="flex flex-col md:border-l md:border-slate-200 dark:md:border-slate-700 md:pl-4">` +
    `<div class="font-bold text-slate-800 dark:text-slate-100 mb-2 border-b border-slate-200 dark:border-slate-700 pb-1">Column II</div>` +
    `<div class="text-slate-700 dark:text-slate-300 leading-relaxed">${col2Html}</div>` +
    `</div>` +
    `</div>`;

  let result = preamble ? `${preamble}\n\n` : '';
  result += grid;
  if (trailing) {
    result += `\n\n${trailing}`;
  }
  return result;
};

export const formatListItems = (text: string) => {
  if (!text) return text;

  // The generated column grid is emitted as a single newline-free line (see
  // `buildColumnsHtml`), so we can format the surrounding prose line by line
  // without ever touching the markup inside the grid.
  return text
    .split('\n')
    .map((line) => (line.includes(COLUMN_GRID_CLASS) ? line : formatListItemsRaw(line)))
    .join('\n');
};

// A parenthesised letter is only a list marker when it actually starts an item.
// In prose like "...one labelled as Assertion (A) and the other as Reason (R)."
// the "(A)" is a *label* inside the sentence, so it must not be pushed onto a new
// line. These two guards tell the difference.
const LABEL_BEFORE_MARKER = /(?:\bas|\bassertion|\breason|\bstatements?|\blabell?ed|\bmarked|\bcalled|\bnamely|\bviz\.?)[\s,]*$/i;
const SENTENCE_CONTINUES_AFTER_MARKER =
  /^(?:and|or|but|the|is|are|was|were|which|while|whereas|respectively|as|to|of|in|on|for|with|that|then|both|either|neither|above|below)\b/i;

/** Should this marker begin a new visual line, or is it an inline label? */
const startsListItem = (before: string, after: string): boolean => {
  if (LABEL_BEFORE_MARKER.test(before)) return false;
  if (SENTENCE_CONTINUES_AFTER_MARKER.test(after)) return false;
  return true;
};

/**
 * Bolds enumeration markers and puts each on its own line.
 * Operates on a single line at a time (see `formatListItems`), so offset 0 means
 * "start of line" and a marker found mid-line is scrutinised before breaking.
 */
const applyMarkerFormatting = (
  text: string,
  pattern: RegExp,
  render: (marker: string) => string
): string =>
  text.replace(pattern, (match, whitespace: string, marker: string, offset: number, whole: string) => {
    const atLineStart = offset === 0;
    const after = whole.slice(offset + match.length);
    const before = whole.slice(0, offset) + whitespace;

    // Mid-sentence label (e.g. "Assertion (A) and ...") — leave the text alone.
    if (!atLineStart && !startsListItem(before, after)) return match;

    // Already at the start of the line: don't prepend a newline, or we'd emit a
    // blank line above the item.
    return `${atLineStart ? '' : '\n'}<strong>${render(marker)}</strong> `;
  });

const formatListItemsRaw = (text: string) => {
  if (!text) return text;

  let formatted = text;

  // Roman numerals with a dot: "I. ", "ii. "
  formatted = applyMarkerFormatting(
    formatted,
    /(^|[ \t]+)(I{1,3}|IV|V|VI{1,3}|IX|X)\.[ \t]/gi,
    (m) => `${m}.`
  );

  // Roman numerals in parentheses: "(i) ", "(IV) "
  formatted = applyMarkerFormatting(
    formatted,
    /(^|[ \t]+)\((I{1,3}|IV|V|VI{1,3}|IX|X)\)[ \t]/gi,
    (m) => `(${m})`
  );

  // Letters in parentheses: "(a) ", "(A) "
  formatted = applyMarkerFormatting(
    formatted,
    /(^|[ \t]+)\(([A-Ha-h])\)[ \t]/gi,
    (m) => `(${m})`
  );

  // Numbers in parentheses: "(1) ", "(12) "
  formatted = applyMarkerFormatting(
    formatted,
    /(^|[ \t]+)\((\d{1,2})\)[ \t]/gi,
    (m) => `(${m})`
  );

  return formatted;
};

export const formatAssertionReason = (text: string) => {
  if (!text) return text;
  
  let formatted = text;
  
  // Clean up common LLM typos in the preamble where colons are incorrectly added.
  // Accepts both "labeled" and "labelled" spellings.
  formatted = formatted.replace(/(labell?ed as Assertion\s*\([A-Z]\))\s*[:\-]\s*/gi, '$1 ');
  formatted = formatted.replace(/(as Reason\s*\([A-Z]\))\s*[:\-]\s*/gi, '$1.\n');

  // Matches "Assertion (A):", "Assertion:", "Reason (R):", "Reason:" etc. and puts them on new lines.
  // The lookbehinds keep the *direction* sentence intact ("...labelled as Assertion (A)
  // and the other as Reason (R)."), which must stay on one line.
  formatted = formatted.replace(/(?<!labell?ed as )\s*(Assertion(?:\s*\([A-Z]\))?\s*[:\-])\s*/gi, '\n\n<strong>$1</strong> ');
  formatted = formatted.replace(/(?<!as )\s*(Reason(?:\s*\([A-Z]\))?\s*[:\-])\s*/gi, '\n\n<strong>$1</strong> ');
  
  return formatted.trim();
};

export const formatConcludingQuestions = (text: string) => {
  if (!text) return text;
  // Breaks sentences starting with "Which of the", "Choose the", etc. into a new line
  return text.replace(/([.!?])\s+(Which of the|How many of the|Identify the|Select the|Based on the|What is the|Choose the)/gi, '$1\n$2');
};

export const highlightKeywords = (rawText: string) => {
  if (!rawText) return rawText;
  
  let text = formatColumns(rawText);
  text = formatListItems(text);
  text = formatAssertionReason(text);
  text = formatConcludingQuestions(text);

  const keywords = [
    'choose the correct option',
    'choose the incorrect option',
    'choose incorrect one',
    'choose correct one',
    'match the following',
    'match following',
    'choose from assertion reason',
    'assertion',
    'reason',
    'not',
    'except',
    'incorrect',
    'correct',
    'true',
    'false'
  ];

  // Escape string for regex
  const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Sort by length descending so longer phrases are replaced first
  const sortedKeywords = keywords.sort((a, b) => b.length - a.length).map(escapeRegExp);
  
  // Create regex: \b(keyword1|keyword2)\b
  const regex = new RegExp(`\\b(${sortedKeywords.join('|')})\\b`, 'gi');
  
  return text.replace(regex, '<mark class="bg-yellow-200 text-yellow-900 px-1 rounded-sm font-bold shadow-sm">$1</mark>');
};

export const formatColumns = (text: string) => {
  if (!text) return text;
  
  // If the text already contains a Markdown table syntax, do not attempt to split it manually
  if (text.match(/\|\s*[-:]+\s*\|/)) {
    return text;
  }
  
  const regex = /(.*?)(?:Column I|List I|List-I|Column-I)[:\s]+(.*?)(?:Column II|List II|List-II|Column-II)[:\s]+(.*)/is;
  
  const match = text.match(regex);
  if (match) {
    const preamble = match[1].trim();
    
    const formatList = (listStr: string) => {
      const parts = listStr.split(/(?:^|[,;\s])\s*([a-eA-EP-S]|\d+|[ivxIVX]{1,4})[.)]\s/g);
      
      if (parts.length <= 1) {
        return listStr.trim();
      }

      let html = '<div class="flex flex-col gap-2.5">';
      if (parts[0] && parts[0].trim()) {
        html += `<div>${parts[0].trim()}</div>`;
      }
      for (let i = 1; i < parts.length; i += 2) {
        if (parts[i]) {
          html += `<div><strong>${parts[i]}.</strong> ${parts[i + 1] ? parts[i + 1].trim() : ''}</div>`;
        }
      }
      html += '</div>';
      return html;
    };

    let col1 = formatList(match[2]);
    let col2 = formatList(match[3]);
    
    // If it doesn't have clear markers like A. B. C. we can just render the raw text
    return `${preamble}

<div class="grid grid-cols-1 md:grid-cols-2 gap-4 my-6 bg-slate-50/80 dark:bg-slate-800/80 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm text-sm">
  <div class="prose-sm">
    <h4 class="font-bold text-slate-800 dark:text-slate-100 mb-3 border-b border-slate-200 dark:border-slate-700 pb-2">Column I</h4>
    <div class="whitespace-pre-line text-slate-700 dark:text-slate-300 leading-normal">${col1}</div>
  </div>
  <div class="prose-sm md:border-l md:border-slate-200 dark:md:border-slate-700 md:pl-4">
    <h4 class="font-bold text-slate-800 dark:text-slate-100 mb-3 border-b border-slate-200 dark:border-slate-700 pb-2">Column II</h4>
    <div class="whitespace-pre-line text-slate-700 dark:text-slate-300 leading-normal">${col2}</div>
  </div>
</div>`;
  }
  
  return text;
};

export const formatListItems = (text: string) => {
  if (!text) return text;
  
  let formatted = text;
  
  // Format for Roman numerals with dot: " I. ", " ii. "
  formatted = formatted.replace(/\s+(I{1,3}|IV|V|VI{1,3}|IX|X)\.\s/gi, '\n**$1.** ');
  
  // Format for Roman numerals in parentheses: " (i) ", " (IV) "
  formatted = formatted.replace(/\s+\((I{1,3}|IV|V|VI{1,3}|IX|X)\)\s/gi, '\n**($1)** ');

  // Format for letters in parentheses: " (a) ", " (A) "
  formatted = formatted.replace(/\s+\(([A-Ha-h])\)\s/gi, '\n**($1)** ');

  // Format for numbers in parentheses: " (1) ", " (12) "
  formatted = formatted.replace(/\s+\((\d{1,2})\)\s/gi, '\n**($1)** ');

  return formatted;
};

export const formatAssertionReason = (text: string) => {
  if (!text) return text;
  
  let formatted = text;
  
  // Clean up common LLM typos in the preamble where colons are incorrectly added
  formatted = formatted.replace(/(labeled as Assertion\s*\([A-Z]\))\s*[:\-]\s*/gi, '$1 ');
  formatted = formatted.replace(/(as Reason\s*\([A-Z]\))\s*[:\-]\s*/gi, '$1.\n');

  // Matches "Assertion (A):", "Assertion:", "Reason (R):", "Reason:" etc. and puts them on new lines
  formatted = formatted.replace(/(?<!labeled as )\s*(Assertion(?:\s*\([A-Z]\))?\s*[:\-])\s*/gi, '\n\n**$1** ');
  formatted = formatted.replace(/(?<!as )\s*(Reason(?:\s*\([A-Z]\))?\s*[:\-])\s*/gi, '\n\n**$1** ');
  
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

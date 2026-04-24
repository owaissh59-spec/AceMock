import Papa from 'papaparse';
import { Question } from '../types';

// Helper to randomly shuffle an array
const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// Helper to resolve answer like "A", "B", "C", "D" or "A)" to the actual option text
const resolveCorrectAnswer = (options: string[], ans: string): string => {
  const trimmed = String(ans).trim();
  const match = trimmed.match(/^([A-D])\)?$/i);
  if (match) {
    const index = match[1].toUpperCase().charCodeAt(0) - 65; // A -> 0, B -> 1
    if (index >= 0 && index < options.length) {
      return options[index];
    }
  }
  return trimmed;
};

export const parseJSON = (text: string): Question[] => {
  try {
    let data = JSON.parse(text);
    
    // If the root is an object (not an array), look for a questions array inside it
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      if (Array.isArray(data.questions)) {
        data = data.questions;
      } else if (Array.isArray(data.data)) {
        data = data.data;
      } else {
        throw new Error('JSON must be an array of questions or an object containing a "questions" array.');
      }
    }

    if (!Array.isArray(data)) throw new Error('JSON must be an array of questions.');
    
    return data.map((item: any, index: number) => {
      if (!item.id) item.id = String(index + 1);
      
      const qText = item.questionText || item.question;
      const cAnswer = item.correctAnswer || item.correct_answer || item.answer;
      
      let optionsArray: string[] = [];
      if (Array.isArray(item.options)) {
        optionsArray = item.options.map(String);
      } else if (item.options && typeof item.options === 'object') {
        optionsArray = Object.values(item.options).map(String);
      }
      
      if (!qText || optionsArray.length !== 4 || !cAnswer) {
        throw new Error(`Invalid schema at index ${index}. Must have question/questionText, options (array or object of 4), and correctAnswer/correct_answer.`);
      }
      
      const resolvedAnswer = resolveCorrectAnswer(optionsArray, String(cAnswer));
      const shuffledOptions = shuffleArray(optionsArray);

      return {
        id: String(item.id),
        questionText: String(qText),
        options: shuffledOptions,
        correctAnswer: resolvedAnswer,
        explanation: item.explanation ? String(item.explanation) : undefined
      };
    });
  } catch (error: any) {
    throw new Error('Failed to parse JSON: ' + error.message);
  }
};

export const parseCSV = (text: string): Promise<Question[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => {
        const h = header.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        if (h === 'questiontext' || h === 'question' || h === 'q') return 'questionText';
        if (h === 'answer' || h === 'ans' || h === 'correctanswer' || h === 'correct') return 'correctAnswer';
        if (h === 'explanation' || h === 'exp' || h === 'reason') return 'explanation';
        if (h === 'option1' || h === 'opt1' || h === 'optiona' || h === 'opta' || h === 'a') return 'option1';
        if (h === 'option2' || h === 'opt2' || h === 'optionb' || h === 'optb' || h === 'b') return 'option2';
        if (h === 'option3' || h === 'opt3' || h === 'optionc' || h === 'optc' || h === 'c') return 'option3';
        if (h === 'option4' || h === 'opt4' || h === 'optiond' || h === 'optd' || h === 'd') return 'option4';
        return header.trim();
      },
      complete: (results) => {
        try {
          const parsed = results.data.map((row: any, index: number) => {
            const options = [row.option1, row.option2, row.option3, row.option4].filter(Boolean);
            if (options.length !== 4) {
              throw new Error(`Row ${index + 1} must have option1, option2, option3, and option4.`);
            }
            if (!row.questionText || !row.correctAnswer) {
              throw new Error(`Row ${index + 1} must have questionText and correctAnswer.`);
            }
            
            const stringOptions = options.map(String);
            const resolvedAnswer = resolveCorrectAnswer(stringOptions, row.correctAnswer);
            const shuffledOptions = shuffleArray(stringOptions);
            return {
              id: String(row.id || index + 1),
              questionText: String(row.questionText),
              options: shuffledOptions,
              correctAnswer: resolvedAnswer,
              explanation: row.explanation ? String(row.explanation) : undefined
            };
          });
          resolve(parsed);
        } catch (error: any) {
          reject(new Error('Failed to parse CSV: ' + error.message));
        }
      },
      error: (error: any) => {
        reject(new Error('CSV Parsing Error: ' + error.message));
      }
    });
  });
};

export const parsePlainText = (text: string): Question[] => {
  // A basic block parser. 
  // Expects questions separated by double newlines.
  const blocks = text.trim().split(/\n\s*\n/);
  
  const parsed = blocks.map((block, index) => {
    const lines = block.split('\n').map(l => l.trim()).filter(l => l);
    
    let questionText = '';
    const options: string[] = [];
    let correctAnswer = '';
    let explanation = '';

    for (const line of lines) {
      if (line.match(/^(Q:|Question:|\d+\.)/i)) {
        questionText = line.replace(/^(Q:|Question:|\d+\.)/i, '').trim();
      } else if (line.match(/^[A-D]\)/i)) {
        options.push(line.replace(/^[A-D]\)/i, '').trim());
      } else if (line.match(/^(Ans:|Answer:)/i)) {
        correctAnswer = line.replace(/^(Ans:|Answer:)/i, '').trim();
      } else if (line.match(/^(Exp:|Explanation:)/i)) {
        explanation = line.replace(/^(Exp:|Explanation:)/i, '').trim();
      } else if (!questionText && options.length === 0) {
        // If it's just raw text at the top, assume it's the question
        questionText = line;
      }
    }

    if (!questionText || options.length !== 4 || !correctAnswer) {
      throw new Error(`Invalid format in block ${index + 1}. Ensure Question, 4 Options (A), B), C), D)), and Ans: are present.`);
    }

    const resolvedAnswer = resolveCorrectAnswer(options, correctAnswer);
    const shuffledOptions = shuffleArray(options);

    return {
      id: String(index + 1),
      questionText,
      options: shuffledOptions,
      correctAnswer: resolvedAnswer,
      explanation: explanation || undefined
    };
  });

  return parsed;
};

export const parseMarkdown = (text: string): Question[] => {
  const lines = text.split('\n');
  const questions: Question[] = [];
  
  let currentQuestion: Partial<Question> = {};
  let currentField: 'questionText' | 'explanation' | null = null;
  let options: string[] = [];
  let correctAnswer = '';
  let providedAnswerLetter = '';
  let idCounter = 1;

  const saveCurrentQuestion = () => {
    if (currentQuestion.questionText && options.length > 0) {
      if (providedAnswerLetter) {
        const index = providedAnswerLetter.toUpperCase().charCodeAt(0) - 65;
        if (index >= 0 && index < options.length) {
          correctAnswer = options[index];
        }
      }

      const shuffledOptions = shuffleArray(options);

      questions.push({
        id: String(idCounter++),
        questionText: currentQuestion.questionText.trim(),
        options: shuffledOptions,
        correctAnswer,
        explanation: currentQuestion.explanation?.trim() || undefined
      });
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    const questionMatch = trimmed.match(/^(?:###|##|#)?\s*(?:Q\d*[:.]?|\d+\.)\s*(.*)/i);
    if (questionMatch) {
      saveCurrentQuestion();
      currentQuestion = { questionText: questionMatch[1] };
      options = [];
      correctAnswer = '';
      providedAnswerLetter = '';
      currentField = 'questionText';
      continue;
    }

    const checkboxMatch = trimmed.match(/^-\s*\[([ xX])\]\s*(.+)/);
    if (checkboxMatch) {
      const isCorrect = checkboxMatch[1].toLowerCase() === 'x';
      const optionText = checkboxMatch[2].trim();
      options.push(optionText);
      if (isCorrect) {
        correctAnswer = optionText;
      }
      currentField = null;
      continue;
    }

    const letterMatch = trimmed.match(/^(?:-\s*)?([A-D])(?:[.)])\s+(.+)/i);
    if (letterMatch) {
      const optionText = letterMatch[2].trim();
      options.push(optionText);
      currentField = null;
      continue;
    }

    const answerMatch = trimmed.match(/^(?:\*\*|__)?Answer:(?:\*\*|__)?\s*([A-D])/i);
    if (answerMatch) {
      providedAnswerLetter = answerMatch[1];
      currentField = null;
      continue;
    }

    const explanationMatch = trimmed.match(/^(?:\*\*|__)?Explanation:(?:\*\*|__)?\s*(.*)/i);
    if (explanationMatch) {
      currentQuestion.explanation = explanationMatch[1];
      currentField = 'explanation';
      continue;
    }

    if (trimmed.match(/^---+$/)) {
      continue;
    }

    if (currentField === 'questionText') {
      currentQuestion.questionText += '\n' + line;
    } else if (currentField === 'explanation') {
      currentQuestion.explanation += '\n' + line;
    }
  }

  saveCurrentQuestion();

  if (questions.length === 0) {
    throw new Error('No valid markdown questions found. Please follow the provided format.');
  }

  questions.forEach((q, idx) => {
    if (q.options.length !== 4) {
      throw new Error(`Question ${idx + 1} does not have exactly 4 options. Found ${q.options.length}.`);
    }
    if (!q.correctAnswer) {
      throw new Error(`Question ${idx + 1} does not have a correct answer specified.`);
    }
  });

  return questions;
};

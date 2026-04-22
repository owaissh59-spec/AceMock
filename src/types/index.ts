export interface Question {
  id: string;
  questionText: string;
  options: string[]; // Always 4 options
  correctAnswer: string;
  explanation?: string;
}

export type QuestionStatus = 'unanswered' | 'answered' | 'marked';

export interface ScoringRules {
  correct: number;
  incorrect: number;
  unattempted: number;
}

export interface TestSession {
  testName?: string;
  scoringRules: ScoringRules;
  questions: Question[];
  answers: Record<string, string>; // questionId -> selectedOption
  markedForReview: Record<string, boolean>; // questionId -> isMarked
  timeRemaining: number; // in seconds
  totalTime: number; // in seconds
  isPaused: boolean;
  isSubmitted: boolean;
}

export interface TestResult {
  id: string;
  testName?: string;
  date: string;
  score: number;
  totalScore: number;
  percentage: number;
  correctAnswersCount: number;
  incorrectAnswersCount: number;
  unattemptedCount: number;
  session: TestSession;
}

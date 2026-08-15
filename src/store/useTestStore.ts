import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Question, TestSession, TestResult, ScoringRules, SavedExplanation } from '../types';

const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// Interleave questions from different groups to avoid clustering by type/subject.
// Groups questions by subject (or by detecting question-type patterns in text),
// then deals them out round-robin style, with each group internally shuffled.
const interleaveAndShuffle = (questions: Question[]): Question[] => {
  if (questions.length <= 1) return questions;

  // Group by subject if available; otherwise try to detect type from question text
  const getGroupKey = (q: Question): string => {
    if (q.subject) return q.subject.toLowerCase().trim();
    // Heuristic: detect common question types from text
    const text = q.questionText.toLowerCase();
    if (text.includes('match the following') || text.includes('match the columns')) return '__match__';
    if (text.includes('assertion') && text.includes('reason')) return '__assertion_reason__';
    if (/statement\s*(i|ii|iii|iv|v|1|2|3|4|5)/i.test(q.questionText)) return '__statement__';
    if (text.includes('which of the following statement')) return '__statement__';
    return '__general__';
  };

  const groups: Record<string, Question[]> = {};
  for (const q of questions) {
    const key = getGroupKey(q);
    if (!groups[key]) groups[key] = [];
    groups[key].push(q);
  }

  const groupKeys = Object.keys(groups);

  // If all questions fall into a single group, just do a normal shuffle
  if (groupKeys.length <= 1) {
    return shuffleArray(questions);
  }

  // Shuffle within each group
  for (const key of groupKeys) {
    groups[key] = shuffleArray(groups[key]);
  }

  // Shuffle the order of groups themselves
  const shuffledKeys = shuffleArray(groupKeys);

  // Round-robin interleave: pick one question from each group in turn
  const result: Question[] = [];
  const pointers: Record<string, number> = {};
  for (const key of shuffledKeys) {
    pointers[key] = 0;
  }

  let totalPlaced = 0;
  const totalQuestions = questions.length;

  while (totalPlaced < totalQuestions) {
    for (const key of shuffledKeys) {
      if (pointers[key] < groups[key].length) {
        result.push(groups[key][pointers[key]]);
        pointers[key]++;
        totalPlaced++;
      }
    }
  }

  // Final shuffle pass to break the strict round-robin pattern
  // but only swap adjacent/nearby items to preserve interleaving
  for (let i = result.length - 1; i > 0; i--) {
    // Swap with a random position within a window of 3 positions
    const windowSize = Math.min(3, i);
    const j = i - Math.floor(Math.random() * windowSize);
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
};

interface TestStore {
  // Test Setup Data
  testData: Question[];
  timerMinutes: number;
  testName: string;
  scoringRules: ScoringRules;
  
  // Current Session
  currentSession: TestSession | null;
  
  // History
  history: TestResult[];

  // Saved Explanations
  savedExplanations: SavedExplanation[];

  // Preferences
  theme: 'light' | 'dark';

  // Actions
  setSetupData: (questions: Question[], minutes: number, testName?: string, scoringRules?: ScoringRules) => void;
  startTest: () => void;
  pauseTest: () => void;
  resumeTest: () => void;
  tickTimer: () => void;
  answerQuestion: (questionId: string, answer: string) => void;
  toggleMarkForReview: (questionId: string) => void;
  submitTest: () => void;
  clearHistory: () => void;
  deleteTest: (id: string) => void;
  reattemptTest: (result: TestResult) => void;
  renameTest: (id: string, newName: string) => void;
  toggleTheme: () => void;
  practiceWeakAreas: () => void;
  saveExplanation: (questionText: string, explanation: string, correctAnswer: string, testName?: string) => void;
  removeSavedExplanation: (id: string) => void;
  clearSavedExplanations: () => void;
}

export const useTestStore = create<TestStore>()(
  persist(
    (set, get) => ({
      testData: [],
      timerMinutes: 30,
      testName: 'Untitled Test',
      scoringRules: { correct: 1, incorrect: 0.25, unattempted: 0 },
      currentSession: null,
      history: [],
      savedExplanations: [],
      theme: 'light',

      setSetupData: (questions, minutes, testName, scoringRules) => set({ 
        testData: questions, 
        timerMinutes: minutes, 
        testName: testName || 'Untitled Test',
        scoringRules: scoringRules || { correct: 1, incorrect: 0.25, unattempted: 0 }
      }),
      
      startTest: () => {
        const { testData, timerMinutes, testName, scoringRules } = get();
        set({
          currentSession: {
            testName,
            scoringRules,
            questions: interleaveAndShuffle(testData),
            answers: {},
            markedForReview: {},
            timeRemaining: timerMinutes * 60,
            totalTime: timerMinutes * 60,
            isPaused: false,
            isSubmitted: false,
          }
        });
      },

      pauseTest: () => set((state) => ({
        currentSession: state.currentSession ? { ...state.currentSession, isPaused: true } : null
      })),

      resumeTest: () => set((state) => ({
        currentSession: state.currentSession ? { ...state.currentSession, isPaused: false } : null
      })),

      tickTimer: () => set((state) => {
        if (!state.currentSession || state.currentSession.isPaused || state.currentSession.isSubmitted) return state;
        const newTime = state.currentSession.timeRemaining - 1;
        
        if (newTime <= 0) {
          // Auto submit
          setTimeout(() => get().submitTest(), 0);
          return {
            currentSession: { ...state.currentSession, timeRemaining: 0 }
          };
        }
        
        return {
          currentSession: { ...state.currentSession, timeRemaining: newTime }
        };
      }),

      answerQuestion: (questionId, answer) => set((state) => {
        if (!state.currentSession) return state;
        return {
          currentSession: {
            ...state.currentSession,
            answers: {
              ...state.currentSession.answers,
              [questionId]: answer
            }
          }
        };
      }),

      toggleMarkForReview: (questionId) => set((state) => {
        if (!state.currentSession) return state;
        return {
          currentSession: {
            ...state.currentSession,
            markedForReview: {
              ...state.currentSession.markedForReview,
              [questionId]: !state.currentSession.markedForReview[questionId]
            }
          }
        };
      }),

      submitTest: () => {
        const { currentSession, history } = get();
        if (!currentSession || currentSession.isSubmitted) return;

        let correct = 0;
        let incorrect = 0;
        let unattempted = 0;

        currentSession.questions.forEach((q) => {
          const ans = currentSession.answers[q.id];
          if (!ans) {
            unattempted++;
          } else if (ans === q.correctAnswer) {
            correct++;
          } else {
            incorrect++;
          }
        });

        const rules = currentSession.scoringRules || { correct: 1, incorrect: 0.25, unattempted: 0 };
        const score = (correct * rules.correct) - (incorrect * rules.incorrect) - (unattempted * rules.unattempted);
        const totalScore = currentSession.questions.length * rules.correct;
        const percentage = Math.max(0, (score / totalScore) * 100);

        const newResult: TestResult = {
          id: Date.now().toString(),
          testName: currentSession.testName || 'Untitled Test',
          date: new Date().toISOString(),
          score,
          totalScore,
          percentage,
          correctAnswersCount: correct,
          incorrectAnswersCount: incorrect,
          unattemptedCount: unattempted,
          session: { ...currentSession, isSubmitted: true }
        };

        set({
          currentSession: { ...currentSession, isSubmitted: true },
          history: [newResult, ...history]
        });
      },

      clearHistory: () => set({ history: [] }),
      
      deleteTest: (id) => set((state) => ({
        history: state.history.filter(test => test.id !== id)
      })),
      
      reattemptTest: (result) => set({
        currentSession: {
          testName: result.testName || 'Untitled Test',
          scoringRules: result.session.scoringRules || { correct: 1, incorrect: 0.25, unattempted: 0 },
          questions: interleaveAndShuffle(result.session.questions),
          answers: {},
          markedForReview: {},
          timeRemaining: result.session.totalTime,
          totalTime: result.session.totalTime,
          isPaused: false,
          isSubmitted: false,
        }
      }),

      renameTest: (id, newName) => set((state) => ({
        history: state.history.map(test => 
          test.id === id ? { ...test, testName: newName } : test
        )
      })),

      toggleTheme: () => set((state) => ({
        theme: state.theme === 'light' ? 'dark' : 'light'
      })),

      practiceWeakAreas: () => {
        const { history } = get();
        
        // First pass: collect questions that have been answered CORRECTLY in any session.
        // If a question was once wrong but later answered correctly (e.g. in a weak-areas
        // practice session), it should no longer be considered weak.
        const correctlyAnswered = new Set<string>();
        history.forEach((result) => {
          result.session.questions.forEach((q) => {
            const ans = result.session.answers[q.id];
            if (ans && ans === q.correctAnswer) {
              const key = q.questionText.slice(0, 100);
              correctlyAnswered.add(key);
            }
          });
        });

        // Second pass: collect wrong/unattempted questions, excluding any that
        // were answered correctly in a later (or any) session.
        const weakQuestions: Question[] = [];
        const seenIds = new Set<string>();
        
        history.forEach((result) => {
          result.session.questions.forEach((q) => {
            const ans = result.session.answers[q.id];
            const isWrongOrSkipped = !ans || ans !== q.correctAnswer;
            // Use questionText as dedup key since IDs may repeat across tests
            const key = q.questionText.slice(0, 100);
            if (isWrongOrSkipped && !seenIds.has(key) && !correctlyAnswered.has(key)) {
              seenIds.add(key);
              weakQuestions.push(q);
            }
          });
        });

        if (weakQuestions.length === 0) return;

        // Questions collected from different past tests can share the same `id`
        // (ids are assigned per-test as "1", "2", "3"... during parsing, not globally).
        // Re-key them here so `answers`/`markedForReview` lookups in this session
        // never collide across questions pulled from different source tests.
        const shuffled = shuffleArray(weakQuestions).map((q, idx) => ({
          ...q,
          id: `weak-${idx}`,
        }));
        const timeMinutes = Math.max(shuffled.length, 10);

        set({
          currentSession: {
            testName: 'Practice: Weak Areas',
            scoringRules: { correct: 1, incorrect: 0, unattempted: 0 },
            questions: shuffled,
            answers: {},
            markedForReview: {},
            timeRemaining: timeMinutes * 60,
            totalTime: timeMinutes * 60,
            isPaused: false,
            isSubmitted: false,
          }
        });
      },

      saveExplanation: (questionText, explanation, correctAnswer, testName) => {
        const { savedExplanations } = get();
        // Avoid duplicates based on question text
        const alreadySaved = savedExplanations.some(
          e => e.questionText.slice(0, 100) === questionText.slice(0, 100)
        );
        if (alreadySaved) return;

        const newExplanation: SavedExplanation = {
          id: Date.now().toString(),
          questionText,
          explanation,
          correctAnswer,
          savedAt: new Date().toISOString(),
          testName
        };
        set({ savedExplanations: [...savedExplanations, newExplanation] });
      },

      removeSavedExplanation: (id) => set((state) => ({
        savedExplanations: state.savedExplanations.filter(e => e.id !== id)
      })),

      clearSavedExplanations: () => set({ savedExplanations: [] })
    }),
    {
      name: 'mock-test-storage',
      version: 1, // Bump this and add handling in `migrate` whenever the persisted shape changes, so app updates never silently discard user data
      partialize: (state) => ({ history: state.history, theme: state.theme, currentSession: state.currentSession, savedExplanations: state.savedExplanations }), // Persist history, theme, current session, and saved explanations
      migrate: (persistedState, _version) => {
        // Future schema changes: transform `persistedState` from older `version`s here
        // instead of letting zustand discard incompatible old data.
        return persistedState as TestStore;
      },
    }
  )
);

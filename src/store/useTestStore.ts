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
            questions: shuffleArray(testData),
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
          questions: shuffleArray(result.session.questions),
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
        // Collect all wrong and unattempted questions from history
        const weakQuestions: Question[] = [];
        const seenIds = new Set<string>();
        
        history.forEach((result) => {
          result.session.questions.forEach((q) => {
            const ans = result.session.answers[q.id];
            const isWrongOrSkipped = !ans || ans !== q.correctAnswer;
            // Use questionText as dedup key since IDs may repeat across tests
            const key = q.questionText.slice(0, 100);
            if (isWrongOrSkipped && !seenIds.has(key)) {
              seenIds.add(key);
              weakQuestions.push(q);
            }
          });
        });

        if (weakQuestions.length === 0) return;

        const shuffled = shuffleArray(weakQuestions);
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
      partialize: (state) => ({ history: state.history, theme: state.theme, currentSession: state.currentSession, savedExplanations: state.savedExplanations }), // Persist history, theme, current session, and saved explanations
    }
  )
);

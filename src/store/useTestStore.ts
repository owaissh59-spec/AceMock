import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Question, TestSession, TestResult, ScoringRules } from '../types';

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
            questions: testData,
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
          questions: result.session.questions,
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
      }))
    }),
    {
      name: 'mock-test-storage',
      partialize: (state) => ({ history: state.history, theme: state.theme }), // Persist history and theme
    }
  )
);

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Question, TestSession, TestResult, ScoringRules, SavedExplanation } from '../types';
import { arrangeQuestions, shuffleArray } from '../utils/questionPattern';

/** Name prefix used to identify weak-area practice sessions in history. */
const WEAK_AREA_PREFIX = 'Weak Areas Practice';

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
  getWeakQuestionPool: () => Question[];
  practiceWeakAreas: (count?: number) => void;
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
            questions: arrangeQuestions(testData),
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
          questions: arrangeQuestions(result.session.questions),
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

      // Builds the pool of "weak" questions: everything answered wrong or left
      // unattempted that has never since been answered correctly.
      getWeakQuestionPool: () => {
        const { history } = get();

        // First pass: collect questions that have been answered CORRECTLY in any session.
        // If a question was once wrong but later answered correctly (e.g. in a weak-areas
        // practice session), it should no longer be considered weak.
        const correctlyAnswered = new Set<string>();
        history.forEach((result) => {
          result.session.questions.forEach((q) => {
            const ans = result.session.answers[q.id];
            if (ans && ans === q.correctAnswer) {
              correctlyAnswered.add(q.questionText.slice(0, 100));
            }
          });
        });

        // Second pass: collect wrong/unattempted questions, excluding any that
        // were answered correctly in a later (or any) session.
        const weakQuestions: Question[] = [];
        const seenKeys = new Set<string>();

        history.forEach((result) => {
          result.session.questions.forEach((q) => {
            const ans = result.session.answers[q.id];
            const isWrongOrSkipped = !ans || ans !== q.correctAnswer;
            // Use questionText as dedup key since IDs may repeat across tests
            const key = q.questionText.slice(0, 100);
            if (isWrongOrSkipped && !seenKeys.has(key) && !correctlyAnswered.has(key)) {
              seenKeys.add(key);
              weakQuestions.push(q);
            }
          });
        });

        return weakQuestions;
      },

      practiceWeakAreas: (count) => {
        const { history, getWeakQuestionPool } = get();
        const weakQuestions = getWeakQuestionPool();

        if (weakQuestions.length === 0) return;

        // How many questions the user asked for (default: the whole pool).
        const requested = count && count > 0 ? Math.min(Math.floor(count), weakQuestions.length) : weakQuestions.length;

        // Randomly pick `requested` questions out of the pool.
        // Questions collected from different past tests can share the same `id`
        // (ids are assigned per-test as "1", "2", "3"... during parsing, not globally).
        // Re-key them here so `answers`/`markedForReview` lookups in this session
        // never collide across questions pulled from different source tests.
        const picked = shuffleArray(weakQuestions)
          .slice(0, requested)
          .map((q, idx) => ({ ...q, id: `weak-${idx}` }));

        // Spread question patterns so the practice paper reads like a real test.
        const arranged = arrangeQuestions(picked);

        // 1 minute per question — this practice run is a standalone test with its own record.
        const timeMinutes = arranged.length;

        // Number the sessions so each practice run is distinguishable in history.
        const attemptNumber =
          history.filter((r) => (r.testName || '').startsWith(WEAK_AREA_PREFIX)).length + 1;

        set({
          currentSession: {
            testName: `${WEAK_AREA_PREFIX} #${attemptNumber} (${arranged.length} Q)`,
            scoringRules: { correct: 1, incorrect: 0, unattempted: 0 },
            questions: arranged,
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
        // Avoid duplicates based on the FULL question text plus correct answer.
        // (Matching on only the first 100 chars caused different questions that
        // share an intro/stem to be treated as the same saved explanation.)
        const alreadySaved = savedExplanations.some(
          e => e.questionText.trim() === questionText.trim() && e.correctAnswer === correctAnswer
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

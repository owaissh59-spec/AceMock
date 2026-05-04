import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTestStore } from '../store/useTestStore';
import { CheckCircle2, XCircle, MinusCircle, ArrowLeft, Trophy, AlertTriangle, Lightbulb, ChevronLeft, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { cn } from '../utils/cn';
import { highlightKeywords } from '../utils/highlighter';

const Analysis = () => {
  const navigate = useNavigate();
  const { currentSession } = useTestStore();
  const [activeTab, setActiveTab] = useState<'right' | 'wrong' | 'unattempted'>('right');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);

  // If no session, go to dashboard
  useEffect(() => {
    if (!currentSession) {
      navigate('/');
    }
  }, [currentSession, navigate]);

  if (!currentSession) return null;

  const questions = currentSession.questions;
  const answers = currentSession.answers;

  const rightQuestions = questions.filter(q => answers[q.id] === q.correctAnswer);
  const wrongQuestions = questions.filter(q => answers[q.id] && answers[q.id] !== q.correctAnswer);
  const unattemptedQuestions = questions.filter(q => !answers[q.id]);

  const rules = currentSession.scoringRules || { correct: 1, incorrect: 0.25, unattempted: 0 };
  const score = (rightQuestions.length * rules.correct) - (wrongQuestions.length * rules.incorrect) - (unattemptedQuestions.length * rules.unattempted);
  const totalScore = questions.length * rules.correct;

  const getActiveList = () => {
    if (activeTab === 'wrong') return wrongQuestions;
    if (activeTab === 'unattempted') return unattemptedQuestions;
    return rightQuestions;
  };

  const currentList = getActiveList();

  const handleNext = useCallback(() => {
    if (currentIndex < currentList.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, currentList.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLInputElement;
      if (activeEl?.tagName === 'TEXTAREA' || activeEl?.tagName === 'INPUT') return;
      
      if (e.ctrlKey) {
        if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          setZoomLevel(prev => Math.max(0.5, prev - 0.1));
        } else if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          setZoomLevel(prev => Math.min(1.0, prev + 0.1));
        }
        return;
      }

      if (e.key === 'Enter' || e.key === '=' || e.key === '+') {
        e.preventDefault();
        handleNext();
      } else if (e.key.toLowerCase() === 'p' || e.key === '-' || e.key === '_') {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev]);

  const handleTabChange = (tab: 'right' | 'wrong' | 'unattempted') => {
    setActiveTab(tab);
    setCurrentIndex(0);
  };

  const getTabContent = () => {
    if (currentList.length === 0) {
      return (
        <div className="p-12 text-center text-slate-500 dark:text-slate-400">
          <p className="text-lg">No questions in this category.</p>
        </div>
      );
    }

    const q = currentList[currentIndex];

    return (
      <div className="flex flex-col h-full bg-white dark:bg-slate-800" style={{ zoom: zoomLevel } as React.CSSProperties}>
        <div className="p-4 border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <span className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Question {currentIndex + 1} of {currentList.length}
          </span>
        </div>

        <div className="p-4 md:p-8 flex-1">
          <div className="flex items-start gap-3 md:gap-4 mb-4">
            <div className="w-7 h-7 md:w-8 md:h-8 flex-shrink-0 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center font-bold text-sm text-slate-600 dark:text-slate-300">
              Q
            </div>
            <div className="prose prose-sm md:prose-slate dark:prose-invert prose-p:leading-relaxed prose-p:mb-2 prose-p:mt-0 prose-pre:bg-slate-800 prose-pre:text-slate-100 prose-th:bg-slate-100 dark:prose-th:bg-slate-800 prose-td:border-slate-200 dark:prose-td:border-slate-700 max-w-none mt-0.5 md:mt-1 overflow-x-auto whitespace-pre-wrap text-slate-800 dark:text-slate-200">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                {highlightKeywords(q.questionText)}
              </ReactMarkdown>
            </div>
          </div>

          <div className="ml-0 md:ml-12 space-y-2 mb-6">
            {q.options.map((opt, i) => {
              const isCorrect = opt === q.correctAnswer;
              const isSelected = answers[q.id] === opt;
              
              let optionClass = "border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300";
              if (isCorrect) optionClass = "border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-400 font-medium ring-1 ring-green-500 dark:ring-green-600";
              else if (isSelected && !isCorrect) optionClass = "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-400 line-through opacity-70";

              return (
                <div key={i} className={cn("p-4 rounded-xl border-2 transition-all", optionClass)}>
                  {opt}
                  {isCorrect && <CheckCircle2 className="w-5 h-5 inline-block ml-2 text-green-600 dark:text-green-500" />}
                  {isSelected && !isCorrect && <XCircle className="w-5 h-5 inline-block ml-2 text-red-500 dark:text-red-400" />}
                </div>
              );
            })}
          </div>

          {q.explanation && (
            <div className="ml-0 md:ml-12 bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-lg p-3 md:p-4 flex flex-col md:flex-row gap-2 md:gap-3 text-sm text-blue-900 dark:text-blue-300 mb-6">
              <Lightbulb className="w-5 h-5 text-blue-500 dark:text-blue-400 flex-shrink-0" />
              <div>
                <span className="font-semibold block mb-1">Explanation:</span>
                <div className="prose prose-sm md:prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {q.explanation}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center ml-0 md:ml-12 mt-6">
            <button 
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Shortcut: 'P' or '-'"
            >
              <ChevronLeft className="w-5 h-5" /> Previous
            </button>
            <button 
              onClick={handleNext}
              disabled={currentIndex === currentList.length - 1}
              className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Shortcut: 'Enter' or '+'"
            >
              Next <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full p-3 md:p-6 min-h-screen">
      <button 
        onClick={() => {
          useTestStore.setState({ currentSession: null }); // Clear session to go back to clean state
          navigate('/');
        }}
        className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-2 mb-8 transition-colors font-medium mt-4"
      >
        <ArrowLeft className="w-5 h-5" /> Back to Dashboard
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Performance Analysis</h1>
        <p className="text-slate-500 dark:text-slate-400">Review your answers and learn from your mistakes.</p>
      </div>

      {/* Score Overview Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 mb-8 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center shadow-inner">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider text-sm mb-1">Total Score</p>
            <div className="text-5xl font-black text-slate-900 dark:text-white">
              {score.toFixed(2).replace(/\.00$/, '')} <span className="text-2xl text-slate-400 dark:text-slate-500 font-normal">/ {totalScore.toFixed(2).replace(/\.00$/, '')}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-6 w-full md:w-auto">
          <div className="flex-1 md:flex-none bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/50 rounded-xl p-4 text-center">
            <div className="flex justify-center mb-1 text-green-600 dark:text-green-500"><CheckCircle2 className="w-6 h-6" /></div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">{rightQuestions.length}</div>
            <div className="text-xs font-semibold text-green-600 dark:text-green-500 uppercase tracking-wider">Right</div>
          </div>
          <div className="flex-1 md:flex-none bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-xl p-4 text-center">
            <div className="flex justify-center mb-1 text-red-500 dark:text-red-400"><XCircle className="w-6 h-6" /></div>
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">{wrongQuestions.length}</div>
            <div className="text-xs font-semibold text-red-600 dark:text-red-500 uppercase tracking-wider">Wrong</div>
          </div>
          <div className="flex-1 md:flex-none bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl p-4 text-center">
            <div className="flex justify-center mb-1 text-slate-400 dark:text-slate-500"><MinusCircle className="w-6 h-6" /></div>
            <div className="text-2xl font-bold text-slate-700 dark:text-slate-300">{unattemptedQuestions.length}</div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Skipped</div>
          </div>
        </div>
      </div>

      {/* Note about negative marking */}
      <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 p-4 rounded-xl mb-8">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <p>Scoring formula applied: <strong>+{rules.correct}</strong> for correct answers, <strong>-{rules.incorrect}</strong> for incorrect answers. {rules.unattempted > 0 ? `Unattempted questions carry a -${rules.unattempted} penalty.` : 'Unattempted questions carry no penalty.'}</p>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden relative">
        <div className="flex border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 bg-white dark:bg-slate-800">
          <button 
            onClick={() => handleTabChange('right')}
            className={cn("flex-1 py-3 md:py-4 text-xs md:text-sm font-semibold transition-colors border-b-2", activeTab === 'right' ? "border-green-500 text-green-600 dark:text-green-400 bg-green-50/30 dark:bg-green-900/20" : "border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700")}
          >
            Right ({rightQuestions.length})
          </button>
          <button 
            onClick={() => handleTabChange('wrong')}
            className={cn("flex-1 py-3 md:py-4 text-xs md:text-sm font-semibold transition-colors border-b-2", activeTab === 'wrong' ? "border-red-500 text-red-600 dark:text-red-400 bg-red-50/30 dark:bg-red-900/20" : "border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700")}
          >
            Wrong ({wrongQuestions.length})
          </button>
          <button 
            onClick={() => handleTabChange('unattempted')}
            className={cn("flex-1 py-3 md:py-4 text-xs md:text-sm font-semibold transition-colors border-b-2", activeTab === 'unattempted' ? "border-slate-800 dark:border-slate-200 text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-700" : "border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700")}
          >
            Unattempted ({unattemptedQuestions.length})
          </button>
        </div>

        <div className="bg-slate-50/30 dark:bg-slate-900/30 min-h-[400px]">
          {getTabContent()}
        </div>
      </div>
    </div>
  );
};

export default Analysis;

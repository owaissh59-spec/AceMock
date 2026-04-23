import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTestStore } from '../store/useTestStore';
import { Clock, Pause, Play, Bookmark, ChevronLeft, ChevronRight, Send, Menu, X, Moon, Sun } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { cn } from '../utils/cn';
import { highlightKeywords } from '../utils/highlighter';

const ActiveTest = () => {
  const navigate = useNavigate();
  const { currentSession, tickTimer, pauseTest, resumeTest, answerQuestion, toggleMarkForReview, submitTest, theme, toggleTheme } = useTestStore();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showPalette, setShowPalette] = useState(false);

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      tickTimer();
    }, 1000);
    return () => clearInterval(timer);
  }, [tickTimer]);

  // Navigate away if no session
  useEffect(() => {
    if (!currentSession) {
      navigate('/');
    } else if (currentSession.isSubmitted) {
      navigate('/analysis');
    }
  }, [currentSession, navigate]);

  const handleNext = useCallback(() => {
    if (currentSession && currentIndex < currentSession.questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, currentSession]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  const currentQuestion = currentSession?.questions[currentIndex];

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentSession || currentSession.isPaused || showPalette) return;
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      
      if (e.key === 'Enter') {
        e.preventDefault();
        handleNext();
      } else if (e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrev();
      } else if (e.key.toLowerCase() === 'r' && currentQuestion) {
        e.preventDefault();
        toggleMarkForReview(currentQuestion.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSession, showPalette, handleNext, handlePrev, currentQuestion, toggleMarkForReview]);

  if (!currentSession || !currentQuestion) return null;

  const isAnswered = (id: string) => !!currentSession.answers[id];
  const isMarked = (id: string) => !!currentSession.markedForReview[id];

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSubmit = () => {
    if (window.confirm('Are you sure you want to submit the test?')) {
      submitTest();
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden relative">
      {/* Pause Overlay */}
      {currentSession.isPaused && (
        <div className="absolute inset-0 z-50 bg-white/30 dark:bg-slate-900/50 backdrop-blur-md flex flex-col items-center justify-center">
          <div className="bg-white dark:bg-slate-800 p-10 rounded-2xl shadow-2xl text-center max-w-md w-full border border-slate-100 dark:border-slate-700">
            <Pause className="w-16 h-16 text-primary dark:text-blue-400 mx-auto mb-6 bg-blue-50 dark:bg-primary/10 p-4 rounded-full" />
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Test Paused</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8">The timer is frozen. Resume when you're ready.</p>
            <button 
              onClick={resumeTest}
              className="w-full bg-primary hover:bg-blue-600 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-500/20"
            >
              <Play className="w-6 h-6 fill-current" /> Resume Test
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className={cn("flex-1 flex flex-col transition-all duration-300", currentSession.isPaused && "blur-md pointer-events-none")}>
        
        {/* Header */}
        <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 h-16 md:h-20 px-4 md:px-8 flex items-center justify-between flex-shrink-0 relative z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowPalette(true)} 
              className="lg:hidden p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white hidden sm:block">Mock Test</h1>
          </div>
          
          <div className="flex items-center gap-2 md:gap-6">
            <button
              onClick={toggleTheme}
              className="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 md:w-5 md:h-5" /> : <Moon className="w-4 h-4 md:w-5 md:h-5" />}
            </button>

            <div className={cn(
              "flex items-center gap-1.5 md:gap-2 font-mono text-lg md:text-2xl font-bold px-3 py-1.5 md:px-4 md:py-2 rounded-lg border",
              currentSession.timeRemaining < 300 
                ? "text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20" 
                : "text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
            )}>
              <Clock className="w-5 h-5 md:w-6 md:h-6" />
              {formatTime(currentSession.timeRemaining)}
            </div>
            
            <button 
              onClick={pauseTest}
              className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors text-sm md:text-base"
            >
              <Pause className="w-4 h-4 md:w-5 md:h-5 fill-current" /> <span className="hidden md:inline">Pause</span>
            </button>
            
            <button 
              onClick={handleSubmit}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 md:px-6 md:py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm text-sm md:text-base"
            >
              <Send className="w-4 h-4" /> <span className="hidden md:inline">Submit</span>
            </button>
          </div>
        </header>

        {/* Question Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center">
          <div className="max-w-3xl w-full">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden mb-6">
              
              <div className="p-4 md:p-8 border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                <span className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Question {currentIndex + 1} of {currentSession.questions.length}
                </span>
                <button 
                  onClick={() => toggleMarkForReview(currentQuestion.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors border",
                    isMarked(currentQuestion.id) 
                      ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800/50" 
                      : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                  )}
                  title="Shortcut: 'R'"
                >
                  <Bookmark className={cn("w-4 h-4", isMarked(currentQuestion.id) && "fill-current")} />
                  Review
                </button>
              </div>

              <div className="p-4 md:p-8">
                <div className="prose prose-sm md:prose-slate dark:prose-invert prose-p:leading-relaxed prose-pre:bg-slate-800 prose-pre:text-slate-100 prose-th:bg-slate-100 dark:prose-th:bg-slate-800 prose-td:border-slate-200 dark:prose-td:border-slate-700 max-w-none mb-8 overflow-x-auto whitespace-pre-wrap text-slate-800 dark:text-slate-200">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                    {highlightKeywords(currentQuestion.questionText)}
                  </ReactMarkdown>
                </div>

                <div className="space-y-3">
                  {currentQuestion.options.map((option, idx) => {
                    const selected = currentSession.answers[currentQuestion.id] === option;
                    return (
                      <label 
                        key={idx}
                        className={cn(
                          "flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all",
                          selected 
                            ? "border-primary dark:border-blue-500 bg-blue-50 dark:bg-primary/10 text-slate-900 dark:text-white shadow-sm" 
                            : "border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-200 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                        )}
                      >
                        <input 
                          type="radio" 
                          name={`question-${currentQuestion.id}`}
                          value={option}
                          checked={selected}
                          onClick={(e) => {
                            if (selected) {
                              e.preventDefault();
                              answerQuestion(currentQuestion.id, '');
                            } else {
                              answerQuestion(currentQuestion.id, option);
                            }
                          }}
                          onChange={() => {}}
                          className="w-5 h-5 text-primary dark:text-blue-500 border-slate-300 dark:border-slate-600 bg-transparent focus:ring-primary dark:focus:ring-blue-500 mr-3 md:mr-4 flex-shrink-0 cursor-pointer"
                        />
                        <span className="text-sm md:text-base font-medium">{option}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center">
              <button 
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Shortcut: 'P'"
              >
                <ChevronLeft className="w-5 h-5" /> Previous
              </button>
              <button 
                onClick={handleNext}
                disabled={currentIndex === currentSession.questions.length - 1}
                className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Shortcut: 'Enter'"
              >
                Next <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Mobile Palette Overlay */}
      {showPalette && (
        <div 
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setShowPalette(false)}
        />
      )}

      {/* Navigation Palette (Sidebar) */}
      <div className={cn(
        "fixed lg:static top-0 right-0 h-full w-80 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 flex flex-col transition-transform duration-300 z-50",
        showPalette ? "translate-x-0 shadow-2xl" : "translate-x-full lg:translate-x-0",
        currentSession.isPaused && "blur-md pointer-events-none"
      )}>
        <div className="p-6 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white">Navigation Palette</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Jump to any question.</p>
          </div>
          <button 
            onClick={() => setShowPalette(false)}
            className="lg:hidden p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="grid grid-cols-5 gap-3">
            {currentSession.questions.map((q, idx) => {
              const answered = isAnswered(q.id);
              const marked = isMarked(q.id);
              const active = idx === currentIndex;

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={cn(
                    "relative w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm transition-all outline-none",
                    active ? "ring-2 ring-primary dark:ring-blue-500 ring-offset-2 dark:ring-offset-slate-800" : "",
                    answered ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50" : 
                    "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600",
                  )}
                >
                  {idx + 1}
                  {marked && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 border-2 border-white dark:border-slate-800 rounded-full"></span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-8 space-y-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
            <div className="flex items-center gap-3 text-sm font-medium text-slate-600 dark:text-slate-300">
              <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800"></div> Answered
            </div>
            <div className="flex items-center gap-3 text-sm font-medium text-slate-600 dark:text-slate-300">
              <div className="w-4 h-4 rounded bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600"></div> Unanswered
            </div>
            <div className="flex items-center gap-3 text-sm font-medium text-slate-600 dark:text-slate-300">
              <div className="relative w-4 h-4 rounded bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-purple-500 rounded-full"></span>
              </div> 
              Marked for Review
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActiveTest;

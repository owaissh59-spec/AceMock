import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTestStore } from '../store/useTestStore';
import { Clock, Pause, Play, Bookmark, ChevronLeft, ChevronRight, Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { cn } from '../utils/cn';
import { highlightKeywords } from '../utils/highlighter';

const ActiveTest = () => {
  const navigate = useNavigate();
  const { currentSession, tickTimer, pauseTest, resumeTest, answerQuestion, toggleMarkForReview, submitTest } = useTestStore();
  
  const [currentIndex, setCurrentIndex] = useState(0);

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

  if (!currentSession) return null;

  const currentQuestion = currentSession.questions[currentIndex];
  const isAnswered = (id: string) => !!currentSession.answers[id];
  const isMarked = (id: string) => !!currentSession.markedForReview[id];

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleNext = () => {
    if (currentIndex < currentSession.questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleSubmit = () => {
    if (window.confirm('Are you sure you want to submit the test?')) {
      submitTest();
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">
      {/* Pause Overlay */}
      {currentSession.isPaused && (
        <div className="absolute inset-0 z-50 bg-white/30 backdrop-blur-md flex flex-col items-center justify-center">
          <div className="bg-white p-10 rounded-2xl shadow-2xl text-center max-w-md w-full border border-slate-100">
            <Pause className="w-16 h-16 text-primary mx-auto mb-6 bg-blue-50 p-4 rounded-full" />
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Test Paused</h2>
            <p className="text-slate-500 mb-8">The timer is frozen. Resume when you're ready.</p>
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
        <header className="bg-white border-b border-slate-200 h-20 px-8 flex items-center justify-between flex-shrink-0">
          <h1 className="text-xl font-bold text-slate-800">Mock Test</h1>
          
          <div className="flex items-center gap-6">
            <div className={cn(
              "flex items-center gap-2 font-mono text-2xl font-bold px-4 py-2 rounded-lg border",
              currentSession.timeRemaining < 300 ? "text-red-600 border-red-200 bg-red-50" : "text-slate-700 border-slate-200 bg-slate-50"
            )}>
              <Clock className="w-6 h-6" />
              {formatTime(currentSession.timeRemaining)}
            </div>
            
            <button 
              onClick={pauseTest}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
            >
              <Pause className="w-5 h-5 fill-current" /> Pause
            </button>
            
            <button 
              onClick={handleSubmit}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
            >
              <Send className="w-4 h-4" /> Submit Test
            </button>
          </div>
        </header>

        {/* Question Area */}
        <div className="flex-1 overflow-y-auto p-8 flex justify-center">
          <div className="max-w-3xl w-full">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
              
              <div className="p-8 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                  Question {currentIndex + 1} of {currentSession.questions.length}
                </span>
                <button 
                  onClick={() => toggleMarkForReview(currentQuestion.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors border",
                    isMarked(currentQuestion.id) 
                      ? "bg-purple-100 text-purple-700 border-purple-200" 
                      : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                  )}
                >
                  <Bookmark className={cn("w-4 h-4", isMarked(currentQuestion.id) && "fill-current")} />
                  Review
                </button>
              </div>

              <div className="p-8">
                <div className="prose prose-slate prose-p:leading-relaxed prose-pre:bg-slate-800 prose-pre:text-slate-100 prose-th:bg-slate-100 prose-td:border-slate-200 max-w-none mb-8">
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
                            ? "border-primary bg-blue-50 text-slate-900 shadow-sm" 
                            : "border-slate-100 bg-white text-slate-600 hover:border-slate-200 hover:bg-slate-50"
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
                          className="w-5 h-5 text-primary border-slate-300 focus:ring-primary mr-4 cursor-pointer"
                        />
                        <span className="text-base font-medium">{option}</span>
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
                className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5" /> Previous
              </button>
              <button 
                onClick={handleNext}
                disabled={currentIndex === currentSession.questions.length - 1}
                className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Palette (Sidebar) */}
      <div className={cn("w-80 bg-white border-l border-slate-200 flex flex-col transition-all", currentSession.isPaused && "blur-md pointer-events-none")}>
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-800">Navigation Palette</h3>
          <p className="text-sm text-slate-500 mt-1">Jump to any question.</p>
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
                    active ? "ring-2 ring-primary ring-offset-2" : "",
                    answered ? "bg-green-100 text-green-700 hover:bg-green-200" : 
                    "bg-slate-100 text-slate-600 hover:bg-slate-200",
                  )}
                >
                  {idx + 1}
                  {marked && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 border-2 border-white rounded-full"></span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-8 space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
              <div className="w-4 h-4 rounded bg-green-100 border border-green-200"></div> Answered
            </div>
            <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
              <div className="w-4 h-4 rounded bg-slate-100 border border-slate-200"></div> Unanswered
            </div>
            <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
              <div className="relative w-4 h-4 rounded bg-slate-100 border border-slate-200">
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

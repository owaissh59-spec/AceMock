import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTestStore } from '../store/useTestStore';
import { CheckCircle2, XCircle, MinusCircle, ArrowLeft, Trophy, AlertTriangle, Lightbulb } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { cn } from '../utils/cn';
import { highlightKeywords } from '../utils/highlighter';

const Analysis = () => {
  const navigate = useNavigate();
  const { currentSession } = useTestStore();
  const [activeTab, setActiveTab] = useState<'right' | 'wrong' | 'unattempted'>('right');

  // If no session, go to dashboard
  useEffect(() => {
    if (!currentSession) {
      navigate('/');
    }
  }, [currentSession, navigate]);

  if (!currentSession) return null;

  // We find the current result from history (it should be the first one if we just submitted)
  // or we compute it if we are just viewing an old session.
  // Actually, we can just compute it directly here based on currentSession for immediate viewing,
  // or use the history one if it exists. Let's just compute it for simplicity and consistency.
  const questions = currentSession.questions;
  const answers = currentSession.answers;

  const rightQuestions = questions.filter(q => answers[q.id] === q.correctAnswer);
  const wrongQuestions = questions.filter(q => answers[q.id] && answers[q.id] !== q.correctAnswer);
  const unattemptedQuestions = questions.filter(q => !answers[q.id]);

  const rules = currentSession.scoringRules || { correct: 1, incorrect: 0.25, unattempted: 0 };
  const score = (rightQuestions.length * rules.correct) - (wrongQuestions.length * rules.incorrect) - (unattemptedQuestions.length * rules.unattempted);
  const totalScore = questions.length * rules.correct;

  const getTabContent = () => {
    let list = rightQuestions;
    if (activeTab === 'wrong') list = wrongQuestions;
    if (activeTab === 'unattempted') list = unattemptedQuestions;

    if (list.length === 0) {
      return (
        <div className="p-12 text-center text-slate-500">
          <p className="text-lg">No questions in this category.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4 md:space-y-6 p-2 md:p-6">
        {list.map((q, idx) => (
          <div key={q.id} className="bg-white border border-slate-200 rounded-xl p-3 md:p-6 shadow-sm">
            <div className="flex items-start gap-3 md:gap-4 mb-4">
              <div className="w-7 h-7 md:w-8 md:h-8 flex-shrink-0 bg-slate-100 rounded-full flex items-center justify-center font-bold text-sm text-slate-600">
                {idx + 1}
              </div>
              <div className="prose prose-sm md:prose-slate prose-p:leading-relaxed prose-pre:bg-slate-800 prose-pre:text-slate-100 prose-th:bg-slate-100 prose-td:border-slate-200 max-w-none mt-0.5 md:mt-1 overflow-x-auto">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                  {highlightKeywords(q.questionText)}
                </ReactMarkdown>
              </div>
            </div>

            <div className="ml-0 md:ml-12 space-y-2 mb-6">
              {q.options.map((opt, i) => {
                const isCorrect = opt === q.correctAnswer;
                const isSelected = answers[q.id] === opt;
                
                let optionClass = "border-slate-100 bg-white text-slate-600";
                if (isCorrect) optionClass = "border-green-200 bg-green-50 text-green-800 font-medium ring-1 ring-green-500";
                else if (isSelected && !isCorrect) optionClass = "border-red-200 bg-red-50 text-red-800 line-through opacity-70";

                return (
                  <div key={i} className={cn("p-3 rounded-lg border", optionClass)}>
                    {opt}
                    {isCorrect && <CheckCircle2 className="w-4 h-4 inline-block ml-2 text-green-600" />}
                    {isSelected && !isCorrect && <XCircle className="w-4 h-4 inline-block ml-2 text-red-500" />}
                  </div>
                );
              })}
            </div>

            {q.explanation && (
              <div className="ml-0 md:ml-12 bg-blue-50/50 border border-blue-100 rounded-lg p-3 md:p-4 flex flex-col md:flex-row gap-2 md:gap-3 text-sm text-blue-900">
                <Lightbulb className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <div>
                  <span className="font-semibold block mb-1">Explanation:</span>
                  <div className="prose prose-sm prose-slate max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {q.explanation}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto p-3 md:p-6 min-h-screen">
      <button 
        onClick={() => {
          useTestStore.setState({ currentSession: null }); // Clear session to go back to clean state
          navigate('/');
        }}
        className="text-slate-500 hover:text-slate-900 flex items-center gap-2 mb-8 transition-colors font-medium mt-4"
      >
        <ArrowLeft className="w-5 h-5" /> Back to Dashboard
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Performance Analysis</h1>
        <p className="text-slate-500">Review your answers and learn from your mistakes.</p>
      </div>

      {/* Score Overview Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-8 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center shadow-inner">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <div>
            <p className="text-slate-500 font-medium uppercase tracking-wider text-sm mb-1">Total Score</p>
            <div className="text-5xl font-black text-slate-900">
              {score.toFixed(2).replace(/\.00$/, '')} <span className="text-2xl text-slate-400 font-normal">/ {totalScore.toFixed(2).replace(/\.00$/, '')}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-6 w-full md:w-auto">
          <div className="flex-1 md:flex-none bg-green-50 border border-green-100 rounded-xl p-4 text-center">
            <div className="flex justify-center mb-1 text-green-600"><CheckCircle2 className="w-6 h-6" /></div>
            <div className="text-2xl font-bold text-green-700">{rightQuestions.length}</div>
            <div className="text-xs font-semibold text-green-600 uppercase tracking-wider">Right</div>
          </div>
          <div className="flex-1 md:flex-none bg-red-50 border border-red-100 rounded-xl p-4 text-center">
            <div className="flex justify-center mb-1 text-red-500"><XCircle className="w-6 h-6" /></div>
            <div className="text-2xl font-bold text-red-700">{wrongQuestions.length}</div>
            <div className="text-xs font-semibold text-red-600 uppercase tracking-wider">Wrong</div>
          </div>
          <div className="flex-1 md:flex-none bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
            <div className="flex justify-center mb-1 text-slate-400"><MinusCircle className="w-6 h-6" /></div>
            <div className="text-2xl font-bold text-slate-700">{unattemptedQuestions.length}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Skipped</div>
          </div>
        </div>
      </div>

      {/* Note about negative marking */}
      <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 p-4 rounded-xl mb-8">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <p>Scoring formula applied: <strong>+{rules.correct}</strong> for correct answers, <strong>-{rules.incorrect}</strong> for incorrect answers. {rules.unattempted > 0 ? `Unattempted questions carry a -${rules.unattempted} penalty.` : 'Unattempted questions carry no penalty.'}</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200">
          <button 
            onClick={() => setActiveTab('right')}
            className={cn("flex-1 py-3 md:py-4 text-xs md:text-sm font-semibold transition-colors border-b-2", activeTab === 'right' ? "border-green-500 text-green-600 bg-green-50/30" : "border-transparent text-slate-500 hover:bg-slate-50")}
          >
            Right ({rightQuestions.length})
          </button>
          <button 
            onClick={() => setActiveTab('wrong')}
            className={cn("flex-1 py-3 md:py-4 text-xs md:text-sm font-semibold transition-colors border-b-2", activeTab === 'wrong' ? "border-red-500 text-red-600 bg-red-50/30" : "border-transparent text-slate-500 hover:bg-slate-50")}
          >
            Wrong ({wrongQuestions.length})
          </button>
          <button 
            onClick={() => setActiveTab('unattempted')}
            className={cn("flex-1 py-3 md:py-4 text-xs md:text-sm font-semibold transition-colors border-b-2", activeTab === 'unattempted' ? "border-slate-800 text-slate-800 bg-slate-50" : "border-transparent text-slate-500 hover:bg-slate-50")}
          >
            Unattempted ({unattemptedQuestions.length})
          </button>
        </div>

        <div className="bg-slate-50/30 min-h-[400px]">
          {getTabContent()}
        </div>
      </div>
    </div>
  );
};

export default Analysis;

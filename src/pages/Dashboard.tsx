import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTestStore } from '../store/useTestStore';
import { Play, Clock, CheckCircle2, XCircle, MinusCircle, Trash2, RotateCcw, Search, Edit2, Moon, Sun } from 'lucide-react';
import { cn } from '../utils/cn';
import { PerformanceChart } from '../components/PerformanceChart';

const Dashboard = () => {
  const navigate = useNavigate();
  const history = useTestStore((state) => state.history);
  const clearHistory = useTestStore((state) => state.clearHistory);
  const deleteTest = useTestStore((state) => state.deleteTest);
  const renameTest = useTestStore((state) => state.renameTest);
  const theme = useTestStore((state) => state.theme);
  const toggleTheme = useTestStore((state) => state.toggleTheme);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');

  const filteredHistory = history.filter(result => {
    if (!searchQuery.trim()) return true;
    
    const searchLower = searchQuery.toLowerCase();
    
    const dateStr = new Date(result.date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).toLowerCase();
    
    const scoreStr = result.percentage.toFixed(1).toLowerCase();
    
    const testNameMatch = (result.testName || 'untitled test').toLowerCase().includes(searchLower);
    
    const hasMatchingQuestion = result.session.questions?.some(q => 
      q.questionText.toLowerCase().includes(searchLower)
    );

    return testNameMatch || dateStr.includes(searchLower) || scoreStr.includes(searchLower) || hasMatchingQuestion;
  });

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this test result?')) {
      deleteTest(id);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 min-h-screen flex flex-col">
      <header className="flex justify-between items-center mb-10 mt-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">AceMock</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Practice offline, ace your exams.</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors shadow-sm"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button 
            onClick={() => navigate('/setup')}
            className="bg-primary hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium shadow-sm transition-all flex items-center gap-2"
          >
            <Play className="w-5 h-5" />
            <span className="hidden sm:inline">Start New Test</span>
          </button>
        </div>
      </header>

      {history.length >= 2 && <PerformanceChart history={history} />}

      <section className="flex-1">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4 flex-1">
            <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-200">Test History</h2>
            {history.length > 0 && (
              <div className="relative max-w-sm w-full ml-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  placeholder="Search by date, score, or topic..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>
            )}
          </div>
          {history.length > 0 && (
            <button 
              onClick={() => window.confirm('Clear all history?') && clearHistory()}
              className="text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors flex items-center gap-1 text-sm font-medium whitespace-nowrap ml-4"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Clear History</span>
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-12 text-center text-slate-500 dark:text-slate-400 shadow-sm">
            <Clock className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
            <p className="text-lg">No test history found.</p>
            <p className="text-sm">Your past tests will appear here.</p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-12 text-center text-slate-500 dark:text-slate-400 shadow-sm">
            <Search className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
            <p className="text-lg">No tests found matching "{searchQuery}".</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredHistory.map((result) => (
              <div key={result.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow relative group/card">
                
                <button 
                  onClick={(e) => handleDelete(result.id, e)}
                  className="absolute top-4 right-4 p-2 bg-white dark:bg-slate-800 rounded-lg text-slate-400 hover:text-red-500 opacity-0 group-hover/card:opacity-100 transition-all border border-slate-200 dark:border-slate-700 shadow-sm z-10"
                  title="Delete Test"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="flex justify-between items-start mb-2 group">
                  {editingTestId === result.id ? (
                    <input
                      autoFocus
                      type="text"
                      className="font-semibold text-slate-900 dark:text-white text-lg border-b-2 border-primary outline-none bg-transparent w-full mr-2"
                      value={editNameValue}
                      onChange={(e) => setEditNameValue(e.target.value)}
                      onBlur={() => {
                        renameTest(result.id, editNameValue.trim() || 'Untitled Test');
                        setEditingTestId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          renameTest(result.id, editNameValue.trim() || 'Untitled Test');
                          setEditingTestId(null);
                        } else if (e.key === 'Escape') {
                          setEditingTestId(null);
                        }
                      }}
                    />
                  ) : (
                    <h3 
                      className="font-semibold text-slate-900 dark:text-white text-lg truncate pr-10 flex items-center gap-2 cursor-pointer" 
                      title={result.testName || 'Untitled Test'}
                      onClick={() => {
                        setEditingTestId(result.id);
                        setEditNameValue(result.testName || 'Untitled Test');
                      }}
                    >
                      {result.testName || 'Untitled Test'}
                      <Edit2 className="w-4 h-4 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </h3>
                  )}
                </div>
                
                <div className="flex items-center gap-2 mb-4">
                  <span className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap",
                    result.percentage >= 80 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : 
                    result.percentage >= 50 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" : 
                    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  )}>
                    {result.percentage.toFixed(1)}%
                  </span>
                  <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                    {new Date(result.date).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
                
                <div className="mb-6">
                  <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
                    {result.score.toFixed(2)} <span className="text-lg text-slate-400 dark:text-slate-500 font-normal">/ {result.totalScore}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm mb-6 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700/50">
                  <div className="flex items-center gap-1 text-green-600 dark:text-green-500 font-medium">
                    <CheckCircle2 className="w-4 h-4" /> {result.correctAnswersCount}
                  </div>
                  <div className="flex items-center gap-1 text-red-500 dark:text-red-400 font-medium">
                    <XCircle className="w-4 h-4" /> {result.incorrectAnswersCount}
                  </div>
                  <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500 font-medium">
                    <MinusCircle className="w-4 h-4" /> {result.unattemptedCount}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      useTestStore.setState({ currentSession: result.session });
                      navigate('/analysis');
                    }}
                    className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium transition-colors"
                  >
                    View Analysis
                  </button>
                  <button 
                    onClick={() => {
                      useTestStore.getState().reattemptTest(result);
                      navigate('/test');
                    }}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reattempt
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className="mt-12 mb-6 text-center text-sm text-slate-400 dark:text-slate-500">
        Built by Sheikh Owais
      </footer>
    </div>
  );
};

export default Dashboard;

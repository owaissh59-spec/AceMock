import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTestStore } from '../store/useTestStore';
import { parseJSON, parseCSV, parsePlainText, parseMarkdown } from '../utils/parser';
import { FileJson, FileText, Settings, AlertCircle, ArrowLeft, Upload, Moon, Sun } from 'lucide-react';
import { cn } from '../utils/cn';
import { Question } from '../types';

type Format = 'json' | 'csv' | 'text' | 'markdown';

const SetupTest = () => {
  const navigate = useNavigate();
  const setSetupData = useTestStore((state) => state.setSetupData);
  const startTest = useTestStore((state) => state.startTest);
  const theme = useTestStore((state) => state.theme);
  const toggleTheme = useTestStore((state) => state.toggleTheme);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [format, setFormat] = useState<Format>('json');
  const [inputData, setInputData] = useState('');
  const [timerMinutes, setTimerMinutes] = useState<number | ''>(30);
  const [testName, setTestName] = useState('');
  const [correctScore, setCorrectScore] = useState(1);
  const [incorrectScore, setIncorrectScore] = useState(0.25);
  const [unattemptedScore, setUnattemptedScore] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<Question[] | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        setInputData(content);
        setParsedQuestions(null);
      }
    };
    reader.readAsText(file);
    
    // Reset input so the same file can be uploaded again if needed
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleLoadQuestions = async () => {
    setError(null);
    if (!inputData.trim()) {
      setError('Please provide test data.');
      return;
    }

    try {
      let parsedData: Question[] = [];
      if (format === 'json') {
        parsedData = parseJSON(inputData);
      } else if (format === 'csv') {
        parsedData = await parseCSV(inputData);
      } else if (format === 'markdown') {
        parsedData = parseMarkdown(inputData);
      } else if (format === 'text') {
        parsedData = parsePlainText(inputData);
      }

      if (parsedData.length === 0) {
        throw new Error('No valid questions found.');
      }

      setParsedQuestions(parsedData);
      setTimerMinutes(parsedData.length);
      
      if (format === 'json') {
        try {
          const raw = JSON.parse(inputData);
          const topic = raw.topic || raw.Topic || raw.subject || raw.Subject || raw[0]?.topic || raw[0]?.subject || raw[0]?.Topic || raw[0]?.Subject || 'Mock Test';
          setTestName(topic);

          const totalQ = raw.total_questions || raw.totalQuestions || raw.time || raw.timer || raw[0]?.total_questions || raw[0]?.totalQuestions;
          if (totalQ) {
            const parsedMinutes = parseInt(totalQ, 10);
            if (!isNaN(parsedMinutes)) {
              setTimerMinutes(parsedMinutes);
            }
          }
        } catch {
          setTestName('Mock Test');
        }
      } else {
        setTestName('Mock Test');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to parse data. Please check the format.');
    }
  };

  const handleStart = async () => {
    if (!parsedQuestions) return;
    setSetupData(parsedQuestions, Number(timerMinutes) || 30, testName, { correct: correctScore, incorrect: incorrectScore, unattempted: unattemptedScore });
    startTest();
    navigate('/test');
  };

  const getPlaceholder = () => {
    if (format === 'json') return `[\n  {\n    "questionText": "What is the capital of France?",\n    "options": ["London", "Berlin", "Paris", "Madrid"],\n    "correctAnswer": "Paris",\n    "explanation": "Paris is the capital of France."\n  }\n]`;
    if (format === 'csv') return `questionText,option1,option2,option3,option4,correctAnswer,explanation\nWhat is 2+2?,1,2,3,4,4,Because math.`;
    if (format === 'markdown') return `### 1. What is the capital of France?\n\n| City   | Country |\n|--------|---------|\n| Paris  | France  |\n| London | UK      |\n\n- [ ] London\n- [ ] Berlin\n- [x] Paris\n- [ ] Madrid\n\n**Explanation:** Paris is the capital of France.`;
    return `1. What is the capital of France?\nA) London\nB) Berlin\nC) Paris\nD) Madrid\nAns: Paris\nExp: Paris is the capital.`;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 min-h-screen">
      <div className="flex justify-between items-center mb-8 mt-4">
        <button 
          onClick={() => navigate('/')}
          className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-2 transition-colors font-medium"
        >
          <ArrowLeft className="w-5 h-5" /> Back to Dashboard
        </button>
        <button
          onClick={toggleTheme}
          className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors shadow-sm"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-8 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Setup Mock Test</h1>
          <p className="text-slate-500 dark:text-slate-400">Paste your test data and configure settings before starting.</p>
        </div>

        <div className="p-8 space-y-8">
          {/* Format Selection */}
          <section>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Data Format
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { id: 'json', label: 'JSON', icon: <FileJson className="w-5 h-5" /> },
                { id: 'csv', label: 'CSV', icon: <FileText className="w-5 h-5" /> },
                { id: 'markdown', label: 'Markdown', icon: <FileText className="w-5 h-5" /> },
                { id: 'text', label: 'Plain Text', icon: <FileText className="w-5 h-5" /> }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setFormat(f.id as Format);
                    setParsedQuestions(null);
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all",
                    format === f.id 
                      ? "border-primary bg-blue-50/50 dark:bg-primary/10 text-primary dark:text-blue-400" 
                      : "border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-600 text-slate-600 dark:text-slate-400"
                  )}
                >
                  {f.icon}
                  <span className="mt-2 font-medium">{f.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Data Input */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wider">
                Test Data
              </h2>
              {(format === 'json' || format === 'csv' || format === 'markdown') && (
                <div>
                  <input 
                    type="file" 
                    accept={format === 'json' ? '.json' : format === 'csv' ? '.csv' : '.md'}
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 text-sm text-primary dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium px-3 py-1.5 bg-blue-50 dark:bg-primary/10 hover:bg-blue-100 dark:hover:bg-primary/20 rounded-lg transition-colors"
                  >
                    <Upload className="w-4 h-4" /> Upload {format.toUpperCase()}
                  </button>
                </div>
              )}
            </div>
            <textarea
              className="w-full h-64 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none font-mono text-sm resize-y transition-all text-slate-900 dark:text-slate-300"
              placeholder={getPlaceholder()}
              value={inputData}
              onChange={(e) => {
                setInputData(e.target.value);
                setParsedQuestions(null);
              }}
            />
            {error && (
              <div className="mt-3 flex items-center gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}
          </section>

          {/* Load Questions Button (if not loaded) */}
          {!parsedQuestions && (
            <div className="flex justify-end pt-4">
              <button
                onClick={handleLoadQuestions}
                className="bg-primary hover:bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold shadow-sm transition-all"
              >
                Load Questions
              </button>
            </div>
          )}

          {/* Settings */}
          {parsedQuestions && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wider">
                Test Settings
              </h2>
              <span className="text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full border border-green-200 dark:border-green-800">
                {parsedQuestions.length} Questions Loaded
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Test Topic/Name (Optional)</label>
                <input 
                  type="text" 
                  placeholder="e.g. Weekly Math Quiz"
                  className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none font-medium text-slate-900 dark:text-white transition-all"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Timer Configuration (Minutes)</label>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <input 
                      type="number" 
                      min="1"
                      max="300"
                      className="w-32 p-3 pl-4 pr-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none font-semibold text-slate-900 dark:text-white transition-all"
                      value={timerMinutes}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setTimerMinutes('');
                        } else {
                          const parsed = parseInt(val, 10);
                          if (!isNaN(parsed)) setTimerMinutes(parsed);
                        }
                      }}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm pointer-events-none">
                      min
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">Duration of the mock test.</p>
                </div>
              </div>

              <div className="md:col-span-2 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wider mb-4">Scoring Rules</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-green-600 dark:text-green-500 uppercase tracking-wider mb-2">Correct Answer</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">+</span>
                      <input 
                        type="number" 
                        step="0.01"
                        min="0"
                        className="w-full p-3 pl-8 bg-green-50/50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/50 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none font-semibold text-slate-900 dark:text-white transition-all"
                        value={correctScore}
                        onChange={(e) => setCorrectScore(Number(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-red-600 dark:text-red-500 uppercase tracking-wider mb-2">Incorrect Answer Penalty</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">-</span>
                      <input 
                        type="number" 
                        step="0.01"
                        min="0"
                        className="w-full p-3 pl-8 bg-red-50/50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/50 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none font-semibold text-slate-900 dark:text-white transition-all"
                        value={incorrectScore}
                        onChange={(e) => setIncorrectScore(Number(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Unattempted Penalty</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">-</span>
                      <input 
                        type="number" 
                        step="0.01"
                        min="0"
                        className="w-full p-3 pl-8 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 outline-none font-semibold text-slate-900 dark:text-white transition-all"
                        value={unattemptedScore}
                        onChange={(e) => setUnattemptedScore(Number(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700/50 flex justify-end">
              <button
                onClick={handleStart}
                className="bg-primary hover:bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold shadow-sm transition-all flex items-center gap-2"
              >
                Start Test Now
              </button>
            </div>
          </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetupTest;

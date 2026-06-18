import React from 'react';
import { Question } from '../types';
import { cn } from '../utils/cn';
import { BookOpen } from 'lucide-react';

interface SubjectAnalysisProps {
  questions: Question[];
  answers: Record<string, string>;
}

interface SubjectStats {
  subject: string;
  total: number;
  correct: number;
  incorrect: number;
  unattempted: number;
  percentage: number;
}

export const SubjectAnalysis: React.FC<SubjectAnalysisProps> = ({ questions, answers }) => {
  // Group questions by subject
  const subjectMap = new Map<string, { total: number; correct: number; incorrect: number; unattempted: number }>();

  questions.forEach((q) => {
    const subject = q.subject || 'General';
    if (!subjectMap.has(subject)) {
      subjectMap.set(subject, { total: 0, correct: 0, incorrect: 0, unattempted: 0 });
    }
    const stats = subjectMap.get(subject)!;
    stats.total++;
    const ans = answers[q.id];
    if (!ans) {
      stats.unattempted++;
    } else if (ans === q.correctAnswer) {
      stats.correct++;
    } else {
      stats.incorrect++;
    }
  });

  // Only show if there are multiple subjects
  if (subjectMap.size <= 1 && subjectMap.has('General')) return null;

  const subjectStats: SubjectStats[] = Array.from(subjectMap.entries())
    .map(([subject, stats]) => ({
      subject,
      ...stats,
      percentage: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0
    }))
    .sort((a, b) => a.percentage - b.percentage); // Weakest first

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 md:p-8 mb-8">
      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-6">
        <BookOpen className="w-5 h-5 text-primary dark:text-blue-400" /> Subject-wise Analysis
      </h2>

      <div className="space-y-4">
        {subjectStats.map((stat) => (
          <div key={stat.subject} className="group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[60%]">
                {stat.subject}
              </span>
              <div className="flex items-center gap-3 text-xs font-medium">
                <span className="text-green-600 dark:text-green-400">{stat.correct} ✓</span>
                <span className="text-red-500 dark:text-red-400">{stat.incorrect} ✗</span>
                <span className="text-slate-400 dark:text-slate-500">{stat.unattempted} —</span>
                <span className={cn(
                  "font-bold",
                  stat.percentage >= 80 ? "text-green-600 dark:text-green-400" :
                  stat.percentage >= 50 ? "text-yellow-600 dark:text-yellow-400" :
                  "text-red-600 dark:text-red-400"
                )}>
                  {stat.percentage.toFixed(0)}%
                </span>
              </div>
            </div>
            {/* Progress bar */}
            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full flex">
                <div
                  className="bg-green-500 dark:bg-green-400 transition-all duration-500"
                  style={{ width: `${(stat.correct / stat.total) * 100}%` }}
                />
                <div
                  className="bg-red-400 dark:bg-red-500 transition-all duration-500"
                  style={{ width: `${(stat.incorrect / stat.total) * 100}%` }}
                />
                <div
                  className="bg-slate-200 dark:bg-slate-600 transition-all duration-500"
                  style={{ width: `${(stat.unattempted / stat.total) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-6 pt-4 border-t border-slate-100 dark:border-slate-700/50 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-green-500 dark:bg-green-400" /> Correct
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-red-400 dark:bg-red-500" /> Incorrect
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-slate-200 dark:bg-slate-600" /> Unattempted
        </div>
      </div>
    </div>
  );
};

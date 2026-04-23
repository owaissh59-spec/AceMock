import React from 'react';
import { TestResult } from '../types';
import { TrendingUp } from 'lucide-react';
import { cn } from '../utils/cn';

interface PerformanceChartProps {
  history: TestResult[];
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({ history }) => {
  if (!history || history.length < 2) return null; // Need at least 2 tests to show progress

  // History is newest first. We need oldest first for a timeline.
  const chronologicalHistory = [...history].reverse();
  
  // To avoid overflowing the chart, let's take the last 15 tests if there are many.
  const displayHistory = chronologicalHistory.slice(-15);

  const averageScore = Math.round(
    history.reduce((acc, curr) => acc + curr.percentage, 0) / history.length
  );
  
  const bestScore = Math.max(...history.map(h => Math.round(h.percentage)));

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm mb-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary dark:text-blue-400" /> Performance Trend
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Your recent test scores over time</p>
        </div>
        
        <div className="flex gap-6">
          <div className="text-right">
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Average</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{averageScore}%</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Best</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{bestScore}%</p>
          </div>
        </div>
      </div>

      <div className="h-48 flex items-end gap-2">
        {displayHistory.map((result, idx) => {
          const height = Math.max(result.percentage, 5); // Minimum 5% height for visibility
          return (
            <div 
              key={result.id} 
              className="flex-1 flex flex-col items-center group relative h-full"
            >
              {/* Tooltip */}
              <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 dark:bg-slate-700 text-white text-xs py-1.5 px-3 rounded-lg pointer-events-none whitespace-nowrap z-10 shadow-lg font-medium border border-slate-600">
                {result.percentage.toFixed(1)}% <br/>
                <span className="text-slate-300 dark:text-slate-400 font-normal">
                  {new Date(result.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
                {/* Tooltip Arrow */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[100%] w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-800 dark:border-t-slate-700"></div>
              </div>
              
              {/* Bar */}
              <div className="w-full relative flex items-end justify-center h-full bg-slate-50 dark:bg-slate-900 rounded-t-md overflow-hidden border-b border-transparent dark:border-slate-800">
                <div 
                  style={{ height: `${height}%` }}
                  className={cn(
                    "w-full rounded-t-md transition-all duration-500 border-t-2",
                    result.percentage >= 80 ? "bg-green-400 dark:bg-green-600 border-green-500 dark:border-green-400 group-hover:bg-green-500 dark:group-hover:bg-green-500" :
                    result.percentage >= 50 ? "bg-yellow-400 dark:bg-yellow-600 border-yellow-500 dark:border-yellow-400 group-hover:bg-yellow-500 dark:group-hover:bg-yellow-500" :
                    "bg-red-400 dark:bg-red-600 border-red-500 dark:border-red-400 group-hover:bg-red-500 dark:group-hover:bg-red-500"
                  )}
                />
              </div>
              
              {/* X-axis label */}
              <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-semibold truncate w-full text-center uppercase tracking-wider">
                T{idx + 1}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

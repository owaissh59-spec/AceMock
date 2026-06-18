import React from 'react';
import { cn } from '../utils/cn';

interface ProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({ percentage, size = 56, strokeWidth = 5 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(0, Math.min(100, percentage)) / 100) * circumference;

  const getColor = (pct: number) => {
    if (pct >= 80) return { stroke: 'stroke-green-500 dark:stroke-green-400', text: 'text-green-700 dark:text-green-400' };
    if (pct >= 50) return { stroke: 'stroke-yellow-500 dark:stroke-yellow-400', text: 'text-yellow-700 dark:text-yellow-400' };
    return { stroke: 'stroke-red-500 dark:stroke-red-400', text: 'text-red-700 dark:text-red-400' };
  };

  const colors = getColor(percentage);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-slate-100 dark:stroke-slate-700"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={cn(colors.stroke, "transition-all duration-700 ease-out")}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      {/* Percentage text */}
      <span className={cn("absolute text-xs font-bold", colors.text)}>
        {Math.round(percentage)}%
      </span>
    </div>
  );
};

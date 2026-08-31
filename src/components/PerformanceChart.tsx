import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { TestResult } from '../types';
import { TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../utils/cn';

interface PerformanceChartProps {
  history: TestResult[];
}

/** Minimum on-screen width of a single bar. Below this the chart starts scrolling. */
const MIN_BAR_WIDTH = 34;
/** How far the arrow buttons jump, in pixels. */
const SCROLL_STEP = 260;

interface HoverState {
  result: TestResult;
  index: number;
  /** Viewport coordinates of the hovered bar, used to place the fixed tooltip. */
  x: number;
  y: number;
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({ history }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ active: false, startX: 0, startScrollLeft: 0, moved: false });
  const [hover, setHover] = useState<HoverState | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // History is newest first. Reverse it so the chart reads oldest -> newest.
  // Every test is plotted; the chart scrolls instead of dropping older results.
  const chronologicalHistory = [...history].reverse();
  const testCount = chronologicalHistory.length;

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft < maxScroll - 1);
  }, []);

  // Start pinned to the latest test (right edge) and re-pin when a new test lands.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = el.scrollWidth;
    updateScrollState();
  }, [testCount, updateScrollState]);

  useEffect(() => {
    updateScrollState();
    window.addEventListener('resize', updateScrollState);
    return () => window.removeEventListener('resize', updateScrollState);
  }, [updateScrollState]);

  // Hide the tooltip while scrolling — it is positioned against the viewport.
  const handleScroll = () => {
    updateScrollState();
    setHover(null);
  };

  const scrollBy = (delta: number) => {
    scrollRef.current?.scrollBy({ left: delta, behavior: 'smooth' });
  };

  // --- Click-and-drag sliding (touch/trackpad scrolling already works natively) ---
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return; // let the browser handle native touch scrolling
    const el = scrollRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    dragRef.current = { active: true, startX: e.clientX, startScrollLeft: el.scrollLeft, moved: false };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const el = scrollRef.current;
    if (!drag.active || !el) return;
    const dx = e.clientX - drag.startX;
    if (!drag.moved && Math.abs(dx) < 4) return; // tolerate a tiny jitter so hovering still works
    if (!drag.moved) {
      drag.moved = true;
      setIsDragging(true);
      setHover(null);
    }
    el.scrollLeft = drag.startScrollLeft - dx;
  };

  const endDrag = () => {
    if (dragRef.current.active) {
      dragRef.current.active = false;
      if (dragRef.current.moved) setIsDragging(false);
    }
  };

  if (!history || history.length < 2) return null; // Need at least 2 tests to show progress

  const averageScore = Math.round(
    history.reduce((acc, curr) => acc + curr.percentage, 0) / history.length
  );
  const bestScore = Math.max(...history.map((h) => Math.round(h.percentage)));

  const showControls = canScrollLeft || canScrollRight;

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm mb-10">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary dark:text-blue-400" /> Performance Trend
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            All {testCount} tests, oldest to newest
            {showControls && <span className="hidden sm:inline"> — scroll or drag to explore</span>}
          </p>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Average</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{averageScore}%</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Best</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{bestScore}%</p>
          </div>

          {showControls && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => scrollBy(-SCROLL_STEP)}
                disabled={!canScrollLeft}
                aria-label="Scroll to older tests"
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => scrollBy(SCROLL_STEP)}
                disabled={!canScrollRight}
                aria-label="Scroll to newer tests"
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="relative">
        {/* Average reference line, drawn over the bar area only */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-48 z-[1]">
          <div
            className="absolute inset-x-0 border-t border-dashed border-slate-300 dark:border-slate-600"
            style={{ bottom: `${Math.min(averageScore, 100)}%` }}
          >
            <span className="absolute right-0 -top-4 text-[10px] font-semibold text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 px-1 rounded">
              avg {averageScore}%
            </span>
          </div>
        </div>

        {/* Fade hints at the scrollable edges */}
        {canScrollLeft && (
          <div className="pointer-events-none absolute left-0 top-0 h-48 w-8 z-[2] bg-gradient-to-r from-white dark:from-slate-800 to-transparent" />
        )}
        {canScrollRight && (
          <div className="pointer-events-none absolute right-0 top-0 h-48 w-8 z-[2] bg-gradient-to-l from-white dark:from-slate-800 to-transparent" />
        )}

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          onPointerCancel={endDrag}
          className={cn(
            'overflow-x-auto overflow-y-hidden pb-1 select-none',
            isDragging ? 'cursor-grabbing' : canScrollLeft || canScrollRight ? 'cursor-grab' : ''
          )}
        >
          <div className="flex items-end gap-2 w-full">
            {chronologicalHistory.map((result, idx) => {
              const height = Math.max(result.percentage, 5); // Minimum 5% height for visibility
              const isHovered = hover?.result.id === result.id;
              return (
                <div
                  key={result.id}
                  className="flex flex-col items-center"
                  style={{ flex: `1 0 ${MIN_BAR_WIDTH}px`, minWidth: MIN_BAR_WIDTH }}
                  onMouseEnter={(e) => {
                    if (dragRef.current.active) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHover({
                      result,
                      index: idx,
                      x: rect.left + rect.width / 2,
                      y: rect.top,
                    });
                  }}
                  onMouseLeave={() => setHover(null)}
                >
                  {/* Bar */}
                  <div className="w-full relative flex items-end justify-center h-48 bg-slate-50 dark:bg-slate-900 rounded-t-md overflow-hidden border-b border-transparent dark:border-slate-800">
                    <div
                      style={{ height: `${height}%` }}
                      className={cn(
                        'w-full rounded-t-md transition-all duration-300 border-t-2',
                        result.percentage >= 80
                          ? 'bg-green-400 dark:bg-green-600 border-green-500 dark:border-green-400'
                          : result.percentage >= 50
                          ? 'bg-yellow-400 dark:bg-yellow-600 border-yellow-500 dark:border-yellow-400'
                          : 'bg-red-400 dark:bg-red-600 border-red-500 dark:border-red-400',
                        isHovered && 'brightness-110 saturate-150'
                      )}
                    />
                  </div>

                  {/* X-axis label */}
                  <span
                    className={cn(
                      'text-[10px] mt-2 font-semibold truncate w-full text-center uppercase tracking-wider',
                      isHovered
                        ? 'text-slate-700 dark:text-slate-200'
                        : 'text-slate-400 dark:text-slate-500'
                    )}
                  >
                    T{idx + 1}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tooltip — rendered fixed to the viewport so it is never clipped by the scroll area */}
      {hover && (
        <div
          className="fixed z-50 pointer-events-none -translate-x-1/2 -translate-y-full"
          style={{ left: hover.x, top: hover.y - 10 }}
        >
          <div className="bg-slate-800 dark:bg-slate-700 text-white text-xs py-2 px-3 rounded-lg shadow-xl border border-slate-600 max-w-[16rem]">
            <p className="font-bold text-[13px] leading-snug mb-1 break-words">
              T{hover.index + 1}. {hover.result.testName || 'Untitled Test'}
            </p>
            <p className="font-semibold">
              {hover.result.percentage.toFixed(1)}%
              <span className="text-slate-300 dark:text-slate-400 font-normal">
                {' '}
                ({hover.result.score.toFixed(2)} / {hover.result.totalScore})
              </span>
            </p>
            <p className="text-slate-300 dark:text-slate-400 mt-0.5">
              <span className="text-green-400 font-semibold">{hover.result.correctAnswersCount}</span>
              {' · '}
              <span className="text-red-400 font-semibold">{hover.result.incorrectAnswersCount}</span>
              {' · '}
              <span className="text-slate-400 font-semibold">{hover.result.unattemptedCount}</span>
              {' correct/wrong/skipped'}
            </p>
            <p className="text-slate-400 dark:text-slate-500 mt-1">
              {new Date(hover.result.date).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          {/* Tooltip arrow */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-800 dark:border-t-slate-700" />
        </div>
      )}
    </div>
  );
};

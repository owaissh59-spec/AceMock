import { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { cn } from '../utils/cn';

const shortcuts = [
  { key: '1-4', description: 'Select option' },
  { key: 'Enter / +', description: 'Next question' },
  { key: 'P / -', description: 'Previous question' },
  { key: 'R', description: 'Mark for review' },
];

export const KeyboardShortcuts = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "p-2 rounded-lg border transition-colors",
          open
            ? "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400"
            : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
        )}
        aria-label="Keyboard shortcuts"
        title="Keyboard shortcuts"
      >
        <HelpCircle className="w-4 h-4 md:w-5 md:h-5" />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          {/* Tooltip panel */}
          <div className="absolute right-0 top-12 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-4 w-64 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Keyboard Shortcuts</h4>
              <button
                onClick={() => setOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {shortcuts.map((s) => (
                <div key={s.key} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-300">{s.description}</span>
                  <kbd className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-xs font-mono text-slate-700 dark:text-slate-300">
                    {s.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

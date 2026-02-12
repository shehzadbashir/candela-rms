import { useEffect } from 'react';

interface ShortcutHandlers {
  onF1?: () => void;
  onF2?: () => void;
  onF3?: () => void;
  onF4?: () => void;
  onF5?: () => void;
  onF6?: () => void;
  onF7?: () => void;
  onF8?: () => void;
  onF9?: () => void;
  onF10?: () => void;
  onF11?: () => void;
  onF12?: () => void;
  onCtrlS?: () => void;
  onCtrlP?: () => void;
  onCtrlN?: () => void;
  onEscape?: () => void;
  onEnter?: () => void;
  onPlus?: () => void;
  onMinus?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default for function keys
      if (e.key.startsWith('F') && handlers[`on${e.key}` as keyof ShortcutHandlers]) {
        e.preventDefault();
        handlers[`on${e.key}` as keyof ShortcutHandlers]?.();
      }

      // Ctrl + S
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handlers.onCtrlS?.();
      }

      // Ctrl + P
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        handlers.onCtrlP?.();
      }

      // Ctrl + N
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        handlers.onCtrlN?.();
      }

      // Escape
      if (e.key === 'Escape') {
        handlers.onEscape?.();
      }

      // Enter
      if (e.key === 'Enter') {
        handlers.onEnter?.();
      }

      // Plus key
      if (e.key === '+' || e.key === '=') {
        handlers.onPlus?.();
      }

      // Minus key
      if (e.key === '-' || e.key === '_') {
        handlers.onMinus?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
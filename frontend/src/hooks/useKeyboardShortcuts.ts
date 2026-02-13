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
      // Function keys (F1-F12)
      if (e.key.startsWith('F')) {
        e.preventDefault();
        const key = e.key as string;
        const handlerKey = `on${key}` as keyof ShortcutHandlers;
        const handler = handlers[handlerKey];
        if (handler) {
          handler();
        }
      }

      // Ctrl combinations
      if (e.ctrlKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            handlers.onCtrlS?.();
            break;
          case 'p':
            e.preventDefault();
            handlers.onCtrlP?.();
            break;
          case 'n':
            e.preventDefault();
            handlers.onCtrlN?.();
            break;
        }
      }

      // Other keys
      switch (e.key) {
        case 'Escape':
          handlers.onEscape?.();
          break;
        case 'Enter':
          handlers.onEnter?.();
          break;
        case '+':
        case '=':
          handlers.onPlus?.();
          break;
        case '-':
        case '_':
          handlers.onMinus?.();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
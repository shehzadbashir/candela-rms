import { useEffect, useRef } from 'react';

interface UseBarcodeScannerProps {
  onScan: (barcode: string) => void;
  minLength?: number;
  timeout?: number;
}

export function useBarcodeScanner({ 
  onScan, 
  minLength = 8, 
  timeout = 100 
}: UseBarcodeScannerProps) {
  const buffer = useRef('');
  const timer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if input is focused (user typing normally)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Clear buffer on Enter (scanner sends Enter after barcode)
      if (e.key === 'Enter') {
        if (buffer.current.length >= minLength) {
          onScan(buffer.current);
        }
        buffer.current = '';
        if (timer.current) {
          clearTimeout(timer.current);
        }
        return;
      }

      // Add character to buffer
      if (e.key.length === 1) {
        buffer.current += e.key;

        // Reset timer
        if (timer.current) {
          clearTimeout(timer.current);
        }
        timer.current = setTimeout(() => {
          if (buffer.current.length >= minLength) {
            onScan(buffer.current);
          }
          buffer.current = '';
        }, timeout);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, [onScan, minLength, timeout]);
}
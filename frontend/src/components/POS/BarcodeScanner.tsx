import { useEffect, useRef } from 'react';
import { useTranslation } from 'next-i18next';
import { HiOutlineCamera } from 'react-icons/hi';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  inputRef?: React.RefObject<HTMLInputElement>;
}

export default function BarcodeScanner({ onScan, inputRef }: BarcodeScannerProps) {
  const { t } = useTranslation('common');
  const internalRef = useRef<HTMLInputElement>(null);
  const ref = inputRef || internalRef;
  const buffer = useRef('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // If Enter is pressed, process the barcode
      if (e.key === 'Enter') {
        if (buffer.current.length > 0) {
          onScan(buffer.current);
          buffer.current = '';
        }
        return;
      }

      // Accumulate characters
      if (e.key.length === 1) {
        buffer.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onScan]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ref.current?.value) {
      onScan(ref.current.value);
      ref.current.value = '';
    }
  };

  return (
    <form onSubmit={handleManualSubmit} className="flex items-center space-x-2">
      <div className="relative flex-1">
        <input
          ref={ref}
          type="text"
          placeholder={t('pos.scanBarcode')}
          className="w-full px-4 py-2 pl-10 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
        />
        <HiOutlineCamera className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
      </div>
      <button
        type="submit"
        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
      >
        {t('pos.add')}
      </button>
    </form>
  );
}
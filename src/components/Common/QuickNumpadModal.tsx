import React, { useState } from 'react';
import { Delete, Check, X } from 'lucide-react';

interface QuickNumpadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (val: number) => void;
  title: string;
  initialValue?: number;
  unit?: string;
  allowDecimals?: boolean;
}

export const QuickNumpadModal: React.FC<QuickNumpadModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  initialValue = 0,
  unit = '',
  allowDecimals = true,
}) => {
  const [valStr, setValStr] = useState<string>(initialValue > 0 ? String(initialValue) : '');

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (digit === '.' && !allowDecimals) return;
    if (digit === '.' && valStr.includes('.')) return;
    if (valStr === '0' && digit !== '.') {
      setValStr(digit);
    } else {
      setValStr((prev) => prev + digit);
    }
  };

  const handleBackspace = () => {
    setValStr((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setValStr('');
  };

  const handleConfirm = () => {
    const num = parseFloat(valStr) || 0;
    onConfirm(num);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 w-full max-w-xs shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Display Screen */}
        <div className="p-4 bg-slate-100 dark:bg-slate-800/80 rounded-2xl text-right font-mono">
          <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {valStr || '0'} <span className="text-xs font-normal text-slate-400">{unit}</span>
          </div>
        </div>

        {/* Numpad Grid */}
        <div className="grid grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="py-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold text-lg rounded-xl shadow-2xs active:scale-95 transition-all cursor-pointer"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={allowDecimals ? () => handleDigit('.') : handleClear}
            className="py-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold text-lg rounded-xl shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            {allowDecimals ? '.' : 'C'}
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="py-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold text-lg rounded-xl shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="py-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 font-bold text-lg rounded-xl shadow-2xs flex items-center justify-center active:scale-95 transition-all cursor-pointer"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Submit Button */}
        <button
          type="button"
          onClick={handleConfirm}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
        >
          <Check className="w-4 h-4" />
          <span>تأكيد الإدخال</span>
        </button>
      </div>
    </div>
  );
};

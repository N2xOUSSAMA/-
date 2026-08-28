import React from 'react';
import { Keyboard, X } from 'lucide-react';

interface ShortcutGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutGuideModal: React.FC<ShortcutGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'F2', label: 'التركيز على حقل البحث / الباركود' },
    { key: 'F4', label: 'إتمام البيع نقداً (Cash Checkout)' },
    { key: 'F7', label: 'فتح حاسبة الوزن للسلع الموزونة' },
    { key: 'F8', label: 'تعليق الطلب الحالي (Hold Cart)' },
    { key: 'F9', label: 'استرجاع الطلبات المعلقة (Held Orders)' },
    { key: 'Esc', label: 'إغلاق النوافذ المنبثقة والعودة' },
    { key: 'Del / Backspace', label: 'حذف العنصر المحدد من السلة' },
    { key: 'Ctrl + P', label: 'طباعة الإيصال أو التقرير' },
    { key: 'Ctrl + F', label: 'البحث السريع في القوائم' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                دليل اختصارات لوحة المفاتيح
              </h3>
              <p className="text-[11px] text-slate-400">
                تسريع عمليات البيع وإدارة الكشك عبر اختصارات سريعة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto pr-1">
          {shortcuts.map((sc, i) => (
            <div
              key={i}
              className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-2"
            >
              <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                {sc.label}
              </span>
              <kbd className="px-2 py-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-[11px] font-mono font-bold text-slate-800 dark:text-slate-200 shadow-2xs shrink-0">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            إغلاق الدليل
          </button>
        </div>
      </div>
    </div>
  );
};

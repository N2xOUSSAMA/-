import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}

interface NotificationToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const NotificationToastContainer: React.FC<NotificationToastProps> = ({
  toasts,
  onDismiss,
}) => {
  if (!toasts || toasts.length === 0) return null;

  const iconMap = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />,
    info: <Info className="w-4 h-4 text-blue-500 shrink-0" />,
  };

  const borderMap = {
    success: 'border-emerald-200 dark:border-emerald-900/60 bg-white/95 dark:bg-slate-900/95',
    error: 'border-rose-200 dark:border-rose-900/60 bg-white/95 dark:bg-slate-900/95',
    info: 'border-blue-200 dark:border-blue-900/60 bg-white/95 dark:bg-slate-900/95',
  };

  return (
    <div className="fixed bottom-5 left-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto p-3.5 rounded-2xl border shadow-xl backdrop-blur-md flex items-start justify-between gap-3 animate-in slide-in-from-bottom-3 duration-200 ${borderMap[toast.type]}`}
        >
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5">{iconMap[toast.type]}</div>
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {toast.title}
              </p>
              {toast.message && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  {toast.message}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => onDismiss(toast.id)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};

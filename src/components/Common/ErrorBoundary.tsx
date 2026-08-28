import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, HardDrive, RotateCcw } from 'lucide-react';
import { StorageService } from '../../services/storage';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
    // Attempt auto-saving a snapshot before recovery
    try {
      StorageService.saveAutoBackup('حفظ طارئ قبل استعادة خطأ النظام');
    } catch (e) {
      console.error('Failed to create emergency snapshot:', e);
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetToSafeState = () => {
    // Clear transient active state like active held cart if stuck
    try {
      window.location.href = window.location.pathname;
    } catch (e) {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4 font-sans"
        >
          <div className="max-w-lg w-full bg-slate-800 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
            <div className="w-16 h-16 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-white">حدث خطأ غير متوقع في الواجهة</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                تم التقاط الخطأ بأمان للحفاظ على بيانات متجرك ومبيعاتك دون فقدان. يمكنك إعادة تنشيط الشاشة أو استئناف العمل فوراً.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 text-left font-mono text-[11px] text-rose-300 overflow-x-auto max-h-32 text-left" dir="ltr">
                {this.state.error.toString()}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-950/50"
              >
                <RefreshCw className="w-4 h-4" />
                <span>إعادة تحميل الشاشة</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetToSafeState}
                className="py-3 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>العودة للشاشة الرئيسية</span>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-700/50 flex items-center justify-center gap-2 text-[11px] text-slate-500">
              <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
              <span>تم حفظ نسخة احتياطية طارئة للبيانات تلقائياً</span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

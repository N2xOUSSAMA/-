import React, { useState } from 'react';
import { User } from '../../types';
import { StorageService } from '../../services/storage';
import { ShieldCheck, Lock, Delete, UserCheck, KeyRound, ArrowRight, X, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AuthModalProps {
  currentUser: User | null;
  onLoginSuccess: (user: User) => void;
  isOpen: boolean;
  onClose?: () => void;
  requiredRole?: 'admin';
  title?: string;
  subtitle?: string;
  onReturnToWelcome?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  currentUser,
  onLoginSuccess,
  isOpen,
  onClose,
  requiredRole,
  title,
  subtitle,
  onReturnToWelcome,
}) => {
  const users = StorageService.getUsers();
  const [selectedUser, setSelectedUser] = useState<User>(
    requiredRole === 'admin'
      ? users.find((u) => u.role === 'admin') || users[0]
      : currentUser || users[0]
  );
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isKeyboardMode, setIsKeyboardMode] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (pin.length < 12) {
      const newPin = pin + digit;
      setPin(newPin);
      setError('');
      if (newPin.length === 6) {
        verifyPin(newPin, selectedUser);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  const verifyPin = (pinToVerify: string, userToVerify: User) => {
    if (StorageService.verifyPin(pinToVerify, userToVerify.pin)) {
      StorageService.setActiveUserId(userToVerify.id);
      StorageService.playSuccessBeep();
      setPin('');
      setError('');
      onLoginSuccess(userToVerify);
    } else {
      setError('الرمز السري / كلمة المرور غير صحيحة، يرجى المحاولة مجدداً');
      StorageService.playBeep();
      setTimeout(() => setPin(''), 500);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) {
      setError('يرجى كتابة الرمز السري');
      return;
    }
    verifyPin(pin, selectedUser);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-5 text-white text-center relative">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 left-4 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-2.5 border border-emerald-500/30 shadow-inner">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-base sm:text-lg font-bold">
            {title || (requiredRole === 'admin' ? 'التحقق من صلاحية المدير' : 'تأكيد الهوية وكلمة المرور')}
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            {subtitle || (requiredRole === 'admin'
              ? 'يرجى إدخال رمز PIN للمدير العام'
              : `أدخل كلمة المرور لتأكيد الدخول باسم ${selectedUser.name}`)}
          </p>
        </div>

        <div className="p-5 space-y-5">
          {/* User selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 block">اختر الحساب:</label>
            <div className="grid grid-cols-3 gap-2">
              {users
                .filter((u) => !requiredRole || u.role === requiredRole)
                .map((u) => {
                  const isSelected = selectedUser.id === u.id;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        setSelectedUser(u);
                        setPin('');
                        setError('');
                      }}
                      className={`flex flex-col items-center p-2.5 rounded-2xl border text-center transition-all ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 shadow-sm ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 text-slate-700'
                      }`}
                    >
                      <span className="text-2xl mb-0.5">{u.avatar || '👤'}</span>
                      <span className="text-xs font-bold truncate max-w-full">{u.name}</span>
                      <span
                        className={`text-[9px] mt-0.5 px-1.5 py-0.2 rounded-full ${
                          u.role === 'admin'
                            ? 'bg-purple-100 text-purple-700 font-bold'
                            : 'bg-blue-100 text-blue-700 font-bold'
                        }`}
                      >
                        {u.role === 'admin' ? 'مدير' : 'كاشير'}
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* User phone & PIN display */}
          <form onSubmit={handleSubmit} className="text-center space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 font-mono px-1">
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>الهاتف: {selectedUser.phone || '0550000000'}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsKeyboardMode(!isKeyboardMode)}
                className="text-[11px] text-emerald-600 hover:text-emerald-700 font-bold underline cursor-pointer"
              >
                {isKeyboardMode ? 'استخدام لوحة الأرقام' : 'كتابة كلمة المرور'}
              </button>
            </div>

            {isKeyboardMode ? (
              <div className="space-y-2">
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value);
                    setError('');
                  }}
                  placeholder="أدخل كلمة المرور أو PIN..."
                  autoFocus
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-center text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  dir="ltr"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  تأكيد الدخول
                </button>
              </div>
            ) : (
              /* PIN Dots */
              <div className="flex justify-center gap-2 py-1">
                {[0, 1, 2, 3, 4, 5].map((idx) => {
                  const filled = pin.length > idx;
                  return (
                    <div
                      key={idx}
                      className={`w-4 h-4 rounded-full border-2 transition-all ${
                        filled
                          ? 'bg-emerald-600 border-emerald-600 scale-110 shadow-xs'
                          : 'border-slate-300 bg-slate-100'
                      }`}
                    />
                  );
                })}
              </div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs font-bold text-rose-600 bg-rose-50 p-2 rounded-xl border border-rose-200"
              >
                {error}
              </motion.div>
            )}
          </form>

          {/* Keypad */}
          {!isKeyboardMode && (
            <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleDigit(digit)}
                  className="h-12 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-2xl text-lg font-bold text-slate-800 transition-colors shadow-2xs cursor-pointer"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClear}
                className="h-12 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-2xl text-xs font-bold transition-colors cursor-pointer"
              >
                مسح الكل
              </button>
              <button
                type="button"
                onClick={() => handleDigit('0')}
                className="h-12 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-2xl text-lg font-bold text-slate-800 transition-colors shadow-2xs cursor-pointer"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="h-12 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-2xl flex items-center justify-center transition-colors cursor-pointer"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Return to Welcome Portal or Close */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
            {onReturnToWelcome && (
              <button
                type="button"
                onClick={onReturnToWelcome}
                className="text-xs text-slate-500 hover:text-slate-800 font-bold flex items-center gap-1 py-1"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>العودة لصفحة الترحيب الرئيسية</span>
              </button>
            )}

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-slate-500 hover:text-slate-800 font-bold py-1 px-2"
              >
                إلغاء
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

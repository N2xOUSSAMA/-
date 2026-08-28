import React, { useState, useEffect } from 'react';
import { StoreSettings, User, TrialSessionInfo } from '../../types';
import { StorageService } from '../../services/storage';
import {
  Store,
  Lock,
  Phone,
  KeyRound,
  ShieldCheck,
  Smartphone,
  CheckCircle2,
  Sparkles,
  Scale,
  Flame,
  Printer,
  CreditCard,
  Barcode,
  Users,
  TrendingUp,
  MessageCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  Copy,
  Check,
  HelpCircle,
  Zap,
  Globe,
  Layers,
  ChevronDown,
  ChevronUp,
  Clock,
  Hourglass,
  AlertTriangle,
  Trash2,
  Play,
  CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface WelcomeLandingPortalProps {
  settings: StoreSettings;
  users: User[];
  onLoginSuccess: (user: User) => void;
}

export const WelcomeLandingPortal: React.FC<WelcomeLandingPortalProps> = ({
  settings,
  users,
  onLoginSuccess,
}) => {
  // Tabs: 'login' | 'request_account'
  const [activeTab, setActiveTab] = useState<'login' | 'request_account'>('login');

  // Login form state
  const [phone, setPhone] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // 24-Hour Trial Sandbox State
  const [trialInfo, setTrialInfo] = useState<TrialSessionInfo | null>(null);
  const [isTrialExpired, setIsTrialExpired] = useState<boolean>(false);
  const [trialCountdown, setTrialCountdown] = useState<string>('24:00:00');
  const [isTrialStarting, setIsTrialStarting] = useState<boolean>(false);
  const [showPortalTerminateModal, setShowPortalTerminateModal] = useState<boolean>(false);

  // Request account form state for custom WhatsApp message
  const [applicantName, setApplicantName] = useState<string>('');
  const [applicantKioskName, setApplicantKioskName] = useState<string>('');
  const [applicantCity, setApplicantCity] = useState<string>('تبسة');
  const [applicantPhone, setApplicantPhone] = useState<string>('');
  const [copiedNumber, setCopiedNumber] = useState<boolean>(false);

  // Feature accordion / FAQ state
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Clean WhatsApp Number
  const rawAdminWhatsApp = settings.adminWhatsApp || '213555123456';
  const cleanWhatsAppNumber = rawAdminWhatsApp.replace(/[^0-9]/g, '');

  // Periodic trial status and countdown updater
  useEffect(() => {
    const checkTrial = () => {
      const info = StorageService.getTrialSessionInfo();
      const expired = StorageService.isTrialExpiredOnDevice();
      const countdown = StorageService.getTrialCountdown();

      setTrialInfo(info);
      setIsTrialExpired(expired);
      setTrialCountdown(countdown.formatted);
    };

    checkTrial();
    const interval = setInterval(checkTrial, 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle Login with Phone and 6-digit PIN
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const cleanPhone = phone.trim().replace(/[\s-]/g, '');
    const cleanPin = pin.trim();

    if (!cleanPhone) {
      setLoginError('يرجى كتابة رقم الهاتف المسجل بالحساب');
      return;
    }

    if (!cleanPin || cleanPin.length < 4) {
      setLoginError('يرجى إدخال الرمز السري (PIN) المكون من 6 أرقام');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      // Find matching user by phone (or id/name fallback) and securely verify hashed PIN
      const matchedUser = StorageService.authenticateUser(cleanPhone, cleanPin);

      if (matchedUser) {
        if (matchedUser.isActive === false) {
          setLoginError('هذا الحساب موقوف حالياً. يرجى التواصل مع الإدارة للتفعيل.');
          setIsSubmitting(false);
          return;
        }

        StorageService.setActiveUserId(matchedUser.id);
        StorageService.playSuccessBeep();
        onLoginSuccess(matchedUser);
      } else {
        setLoginError('رقم الهاتف أو الرمز السري غير صحيح. يرجى التأكد من البيانات أو طلب تفعيل حساب.');
        StorageService.playBeep();
      }
      setIsSubmitting(false);
    }, 300);
  };

  // Launch 24-Hour Isolated Sandbox Trial
  const handleStartTrial = () => {
    setIsTrialStarting(true);
    setLoginError('');

    setTimeout(() => {
      const res = StorageService.startOrResumeTrialSession();
      setIsTrialStarting(false);

      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setLoginError(res.error || 'لا يمكن فتح حساب تجريبي جديد.');
        setIsTrialExpired(true);
      }
    }, 250);
  };

  // Manually terminate trial & wipe data via modal
  const handleConfirmTerminateFromPortal = () => {
    StorageService.terminateAndClearTrialSession(true);
    setIsTrialExpired(true);
    setTrialInfo(null);
    setShowPortalTerminateModal(false);
  };

  // Construct WhatsApp Link with Pre-filled message
  const constructWhatsAppUrl = () => {
    const details = [
      `السلام عليكم ورحمة الله أخي الكريم 🌹`,
      `أود الاستفسار والاشتراك في *برنامج كشك متعدد الخدمات العصري (Multi-Services POS)* لإنشاء وتفعيل حساب جديد.`,
      applicantName ? `👤 *الاسم:* ${applicantName}` : '',
      applicantKioskName ? `🏪 *اسم الكشك / المحل:* ${applicantKioskName}` : '',
      applicantCity ? `📍 *الولاية / المدينة:* ${applicantCity}` : '',
      applicantPhone ? `📱 *رقم الهاتف المخصص:* ${applicantPhone}` : '',
      `\nيرجى التكرم بتزويدي بتفاصيل التفعيل ورابط الحساب. شكراً جزيلاً!`
    ]
      .filter(Boolean)
      .join('\n');

    const encodedText = encodeURIComponent(details);
    return `https://wa.me/${cleanWhatsAppNumber}?text=${encodedText}`;
  };

  const handleCopyWhatsAppNumber = () => {
    navigator.clipboard.writeText(rawAdminWhatsApp);
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col justify-between select-none overflow-x-hidden">
      {/* ======================================================== */}
      {/* TOP NOTIFICATION / BADGE BAR */}
      {/* ======================================================== */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 text-white text-[11px] sm:text-xs py-1.5 px-4 text-center font-bold flex items-center justify-center gap-2 shadow-sm">
        <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">🇩🇿 برنامج جزائري أصيل</span>
        <span>كشك متعدد الخدمات العصري - متوافق 100% مع الكمبيوتر، التابلت، والهواتف الذكية</span>
      </div>

      {/* ======================================================== */}
      {/* NAVIGATION BAR */}
      {/* ======================================================== */}
      <header className="px-4 sm:px-8 py-4 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-400/30">
              <Store className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-sm sm:text-base text-white tracking-tight">
                  {settings.storeName || 'كشك متعدد الخدمات العصري'}
                </h1>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                  PRO V2
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                المنصة المتكاملة لإدارة الأكشاك ومحلات الخدمات بالجزائر
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => {
                setActiveTab('login');
                const el = document.getElementById('auth-portal-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'login'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-400/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5 text-emerald-300" />
              <span>تسجيل الدخول</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('request_account');
                const el = document.getElementById('auth-portal-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'request_account'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/30'
                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">طلب تفعيل حساب</span>
              <span className="sm:hidden">واتساب</span>
            </button>
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* HERO & WELCOME SECTION */}
      {/* ======================================================== */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-12 w-full">
        {/* Welcome Headline */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>نظام كشك متعدد الخدمات والشحن الرقمي المتكامل</span>
          </div>

          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight">
            أهلاً بكم في نظام <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400">تسيير الأكشاك الشامل</span>
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            المنصة المصممة خصيصاً لتلبية جميع عمليات البيع اليومية: فليكسي مع حاسبة الفائدة المباشرة، بطاقات الألعاب والإنترنت، بيع السجائر، بيع المكسرات بالميزان، خدمات الطباعة والنسخ، مع توليد الباركود وكشف الأرباح والديون.
          </p>
        </div>

        {/* ======================================================== */}
        {/* INTERACTIVE 2-TAB AUTH & WHATSAPP PORTAL SECTION */}
        {/* ======================================================== */}
        <div
          id="auth-portal-section"
          className="max-w-3xl mx-auto bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-7 shadow-2xl shadow-emerald-950/20 backdrop-blur-xl relative overflow-hidden"
        >
          {/* Subtle Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

          {/* Tab Selector Headers */}
          <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setLoginError('');
              }}
              className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 ${
                activeTab === 'login'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-900/40 ring-1 ring-emerald-400/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>هل لديك حساب؟ (دخول)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('request_account');
                setLoginError('');
              }}
              className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 ${
                activeTab === 'request_account'
                  ? 'bg-gradient-to-r from-indigo-600 to-emerald-600 text-white shadow-lg shadow-indigo-900/40 ring-1 ring-indigo-400/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>طلب إنشاء وتفعيل حساب 🔒</span>
            </button>
          </div>

          {/* ======================================================== */}
          {/* TAB 1: LOGIN (هل لديك حساب) */}
          {/* ======================================================== */}
          {activeTab === 'login' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>تسجيل الدخول إلى حسابك</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    أدخل رقم هاتفك المسجل والرمز السري (PIN المكون من 6 أرقام)
                  </p>
                </div>
                <span className="text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-bold">
                  سريع ومحمي
                </span>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* Phone Field */}
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      رقم الهاتف المسجل في النظام:
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      مثال: 0550000000 أو 0660000001
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      placeholder="05xxxxxxxx أو 06xxxxxxxx أو 07xxxxxxxx"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-2xl text-sm font-mono font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-left"
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* Password / PIN Field */}
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-emerald-400" />
                      الرمز السري / كلمة المرور:
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="text-[11px] text-slate-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                    >
                      {showPin ? (
                        <>
                          <EyeOff className="w-3 h-3" />
                          <span>إخفاء الرمز</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3 h-3" />
                          <span>إظهار الرمز</span>
                        </>
                      )}
                    </button>
                  </label>
                  <div className="relative">
                    <input
                      type={showPin ? 'text' : 'password'}
                      required
                      maxLength={30}
                      placeholder="أدخل الرمز السري أو كلمة المرور..."
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-2xl text-sm sm:text-base font-mono font-bold text-white tracking-wider placeholder:text-slate-600 placeholder:text-xs placeholder:tracking-normal focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-center"
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* Error Banner */}
                {loginError && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-bold text-center"
                  >
                    {loginError}
                  </motion.div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 active:from-emerald-700 active:to-teal-700 text-white font-black rounded-2xl text-sm shadow-xl shadow-emerald-950/40 flex items-center justify-center gap-2 transition-all ring-2 ring-emerald-400/30 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>جاري تسجيل الدخول...</span>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>تسجيل الدخول وفتح برنامج الكشك</span>
                    </>
                  )}
                </button>
              </form>

              {/* ======================================================== */}
              {/* 24-HOUR ISOLATED SANDBOX TRIAL (حساب تجريبي منفرد 24 ساعة) */}
              {/* ======================================================== */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">
                        الحساب التجريبي والمعاينة الفورية (24 ساعة فقط)
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        حساب مستقل ومعزول لكل شخص - يُحذف تلقائياً بعد 24 ساعة
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold">
                    معاينة معزولة
                  </span>
                </div>

                {/* State 1: Trial has Expired */}
                {isTrialExpired ? (
                  <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-200 space-y-2.5">
                    <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>انتهت صلاحية التجربة المجانية (24 ساعة)</span>
                    </div>
                    <p className="text-[11px] text-rose-300/90 leading-relaxed">
                      تم انتهاء مدة الـ 24 ساعة وحذف كافة البيانات التجريبية تلقائياً. لا يمكن فتح حساب تجريبي جديد على هذا الجهاز. للحصول على حساب دائم خاص بكشكك، تواصل مع الإدارة لتفعيله.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('request_account')}
                      className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>طلب تفعيل حساب دائم لكشكك عبر واتساب</span>
                    </button>
                  </div>
                ) : trialInfo && trialInfo.isTrialActive ? (
                  /* State 2: Active Running Trial Session */
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-teal-950/60 border border-emerald-500/40 text-emerald-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-xs text-emerald-300">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                        <span>لديك جلسة تجريبية نشطة حالياً!</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-mono font-bold bg-slate-900/90 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-emerald-400">
                        <Hourglass className="w-3 h-3 text-amber-400 animate-spin" />
                        <span>متبقي: {trialCountdown}</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-300">
                      بياناتك التجريبية معزولة تماماً وخاصة بك وحدك. يمكنك استئناف التجربة فوراً أو إنهائها في أي وقت.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        type="button"
                        onClick={handleStartTrial}
                        disabled={isTrialStarting}
                        className="flex-1 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-950/50"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{isTrialStarting ? 'جاري الفتح...' : 'استئناف ودخول الحساب التجريبي'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowPortalTerminateModal(true)}
                        className="py-2.5 px-3 bg-slate-800/80 hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-500/40 border border-slate-700 text-slate-300 font-bold rounded-xl text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer"
                        title="إنهاء التجربة وحذف البيانات"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>إنهاء التجربة وحذف البيانات</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* State 3: Brand New visitor -> Launch 24h Trial */
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-all space-y-3">
                    <div className="space-y-1">
                      <div className="text-xs text-slate-300 flex items-center gap-1.5 font-bold">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span>جرّب كافة وظائف النظام بحساب منفرد وخاص بك:</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px] text-slate-400 pt-1">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>حساب منفرد 100% لا يختلط مع غيرك</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>فتح فوري بكافة الصلاحيات والميزات</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>صالح لمدة 24 ساعة كاملة</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle className="w-3 h-3 text-rose-400 shrink-0" />
                          <span>حذف تلقائي للبيانات بعد 24 ساعة</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleStartTrial}
                      disabled={isTrialStarting}
                      className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-500 hover:from-amber-400 hover:to-teal-400 text-slate-950 font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-950/30 ring-2 ring-amber-400/20 active:scale-[0.99] disabled:opacity-50"
                    >
                      <Zap className="w-4 h-4 fill-current" />
                      <span>
                        {isTrialStarting
                          ? 'جاري تجهيز الحساب التجريبي المنفرد...'
                          : '🚀 فتح حساب تجريبي جديد فوراً (صالحة لمدة 24 ساعة)'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: REQUEST ACCOUNT VIA WHATSAPP (طلب إنشاء وتفعيل حساب) */}
          {/* ======================================================== */}
          {activeTab === 'request_account' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Exclusive System Notice */}
              <div className="p-4 bg-indigo-950/50 border border-indigo-500/30 rounded-2xl text-xs text-indigo-200 space-y-2">
                <div className="flex items-center gap-2 text-indigo-300 font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>نظام خاص ومحمي - التسجيل والتفعيل عبر الإدارة حصرياً</span>
                </div>
                <p className="text-[11px] text-indigo-300/80 leading-relaxed">
                  حفاظاً على أمان النظام وخصوصية بيانات الأكشاك، لا يمكن لأي شخص إنشاء حساب مباشرة. يتم فتح وتسجيل الحسابات في السيرفر عبر المشرف/المالك بعد التواصل عبر واتساب.
                </p>
              </div>

              {/* Optional Quick Inquiry Form */}
              <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                <div className="text-xs font-bold text-slate-300 mb-1">
                  املأ بيانات كشكك لإنشاء رسالة واتساب جاهزة ومجهزة:
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">الاسم الكامل:</label>
                    <input
                      type="text"
                      placeholder="مثال: أسامة عوايشية"
                      value={applicantName}
                      onChange={(e) => setApplicantName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">اسم الكشك / المحل:</label>
                    <input
                      type="text"
                      placeholder="مثال: كشك النصر للخدمات"
                      value={applicantKioskName}
                      onChange={(e) => setApplicantKioskName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">الولاية / البلدية:</label>
                    <input
                      type="text"
                      placeholder="مثال: تبسة، الجزائر العاصمة، عنابة..."
                      value={applicantCity}
                      onChange={(e) => setApplicantCity(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">رقم الهاتف للربط:</label>
                    <input
                      type="tel"
                      placeholder="05xxxxxxxx"
                      value={applicantPhone}
                      onChange={(e) => setApplicantPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>

              {/* Direct WhatsApp Action Button */}
              <div className="space-y-3">
                <a
                  href={constructWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-4 bg-[#25D366] hover:bg-[#20bd5a] active:bg-[#1da850] text-slate-950 font-black rounded-2xl text-sm sm:text-base shadow-xl shadow-emerald-950/50 flex items-center justify-center gap-3 transition-all transform hover:scale-[1.01]"
                >
                  <MessageCircle className="w-5 h-5 text-slate-950 fill-current" />
                  <span>تواصل عبر واتساب لطلب فتح وتفعيل الحساب الآن</span>
                </a>

                <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2 px-1">
                  <div className="flex items-center gap-1.5">
                    <span>رقم واتساب المباشر للإدارة:</span>
                    <span className="font-mono font-bold text-emerald-400" dir="ltr">
                      +{cleanWhatsAppNumber}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyWhatsAppNumber}
                    className="text-[11px] text-slate-300 hover:text-emerald-400 flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700"
                  >
                    {copiedNumber ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">تم النسخ!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>نسخ رقم الواتساب</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* What You Get After Activation */}
              <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>ماذا ستحصل فور تفعيل حسابك من الإدارة؟</span>
                </h4>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>تفعيل رقم هاتفك ورمز سري 6 أرقام خاص بك</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>تخصيص اسم الكشك وشعار فواتيرك وورق الطابعة</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>تشغيل البرنامج على الهاتف والكمبيوتر بنفس الوقت</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>دعم فني وتحديثات متواصلة لجميع الخدمات</span>
                  </li>
                </ul>
              </div>
            </motion.div>
          )}
        </div>

        {/* ======================================================== */}
        {/* DETAILED PROGRAM CAPABILITIES & FEATURES SHOWCASE */}
        {/* ======================================================== */}
        <div className="space-y-6 pt-6">
          <div className="text-center space-y-2">
            <h3 className="text-xl sm:text-2xl font-black text-white">
              مميزات البرنامج المخصصة لأصحاب الأكشاك 🇩🇿
            </h3>
            <p className="text-xs text-slate-400">
              كل ما يحتاجه التاجر الجزائري في برنامج كاشير ومخزون واحد متكامل
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Feature 1: Flexy & Digital Cards */}
            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 transition-all space-y-3 group">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Smartphone className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-white">⚡ فليكسي وبطاقات رقمية</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                حاسبة فائدة فورية لجيزي، موبيليس، وأوريدو، مع رصيد بطاقات فري فاير، ببجي، بلايستيشن ونتفلكس.
              </p>
            </div>

            {/* Feature 2: Nuts & Weighted Items */}
            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 transition-all space-y-3 group">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Scale className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-white">🥜 مكسرات وحاسبة الميزان</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                البيع السريع بالمبلغ (50 دج، 100 دج، 200 دج...) أو بالوزن مع تحويل تلقائي وحساب الكميات المتبقية.
              </p>
            </div>

            {/* Feature 3: Cigarettes & Tobacco */}
            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-rose-500/40 transition-all space-y-3 group">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Flame className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-white">🚬 بيع السجائر بالحبة والعلبة</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                دعم بيع السجائر بالحبة الفردية أو العلبة والخرطوشة مع تقرير منفصل لأرباح السجائر.
              </p>
            </div>

            {/* Feature 4: Printing & Photocopy */}
            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-blue-500/40 transition-all space-y-3 group">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Printer className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-white">🖨️ طباعة، سحب ووثائق</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                حاسبة تكلفة أوراق الطباعة A4، الألوان، الأبيض والأسود، والتغليف الحراري (Plastification).
              </p>
            </div>

            {/* Feature 5: Barcode Printing */}
            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-purple-500/40 transition-all space-y-3 group">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Barcode className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-white">🏷️ توليد وطباعة الباركود</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                توليد باركود جزائري وطباعة ملصقات الرفوف والرول الحراري بدقة 100% على مقاس الورقة.
              </p>
            </div>

            {/* Feature 6: Customers & Credit */}
            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-teal-500/40 transition-all space-y-3 group">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-white">👥 سجل الزبائن والكريدي</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                كتابة ديون الزبائن، تسديد الدفعات جزئياً أو كلياً، مع كشف حساب مفصل لكل زبون.
              </p>
            </div>

            {/* Feature 7: Shift & Profits */}
            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 transition-all space-y-3 group">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-white">📊 الأرباح وإغلاق الصندوق</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                تقارير الأرباح الصافية اليومية والشهرية، تسليم الوردية ومطابقة كاش الصندوق الفعلي.
              </p>
            </div>

            {/* Feature 8: Multi-Device */}
            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 transition-all space-y-3 group">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Globe className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-white">💻📱 لجميع الأجهزة</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                يعمل على الكمبيوتر، التابلت، الهواتف الذكية مع دعم ماسح الباركود بالكاميرا أو أجهزة الليزر.
              </p>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* FAQ ACCORDION */}
        {/* ======================================================== */}
        <div className="max-w-3xl mx-auto space-y-3 pt-4">
          <h3 className="text-base sm:text-lg font-bold text-white text-center mb-4">
            الأسئلة الشائعة حول البرنامج والتفعيل
          </h3>

          {[
            {
              q: 'كيف يمكنني الحصول على حساب جديد في البرنامج؟',
              a: 'يمكنك ببساطة الضغط على خانة "طلب إنشاء وتفعيل حساب جديد" ثم النقر على زر واتساب للتواصل المباشر مع الإدارة لتفعيل رقم هاتفك ورمز سري خاص بك.',
            },
            {
              q: 'هل يعمل البرنامج على الهواتف والكمبيوتر في نفس الوقت؟',
              a: 'نعم، النظام متوافق بالكامل مع جميع الشاشات (كمبيوتر، لابتوب، لوحة إلكترونية تابلت، أو هاتف ذكي) مع دعم قارئ الباركود والطابعات الحرارية.',
            },
            {
              q: 'هل بيانات كشكي ومبيعاتي محمية؟',
              a: 'نعم، بياناتك محفوظة ومحكمة ولا يمكن لأي شخص الدخول لحسابك إلا عبر رقم هاتفك المعتمد ورمز PIN السداسي السري الخاص بك.',
            },
            {
              q: 'كيف يعمل بيع الفليكسي وبطاقات الألعاب؟',
              a: 'يوفر البرنامج أزراراً سريعة لجميع فئات الفليكسي مع حاسبة فائدة تحسب ربحك الصافي تلقائياً، بالإضافة إلى أقسام منظمة لبطاقات فري فاير وببجي وغيرها.',
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                className="w-full p-4 text-right flex items-center justify-between text-xs sm:text-sm font-bold text-slate-200 hover:text-white"
              >
                <span>{item.q}</span>
                {expandedFaq === idx ? (
                  <ChevronUp className="w-4 h-4 text-emerald-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
              </button>
              {expandedFaq === idx && (
                <div className="px-4 pb-4 text-xs text-slate-400 leading-relaxed border-t border-slate-800/60 pt-2">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* ======================================================== */}
      {/* FOOTER */}
      {/* ======================================================== */}
      <footer className="bg-slate-950 border-t border-slate-800/80 px-4 sm:px-8 py-6 text-center text-xs text-slate-500 space-y-2 mt-8">
        <div className="flex flex-wrap items-center justify-center gap-4 text-slate-400 font-bold">
          <span>{settings.storeName || 'كشك متعدد الخدمات العصري'}</span>
          <span>•</span>
          <span>تبسة - الجزائر 🇩🇿</span>
          <span>•</span>
          <a
            href={constructWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:underline flex items-center gap-1"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>تواصل مع الدعم عبر واتساب</span>
          </a>
        </div>
        <p className="text-[11px] text-slate-600">
          جميع الحقوق محفوظة © {new Date().getFullYear()} - نظام تسيير الأكشاك والخدمات المتعددة
        </p>
      </footer>

      {/* ======================================================== */}
      {/* TERMINATE TRIAL CONFIRMATION MODAL (PORTAL) */}
      {/* ======================================================== */}
      {showPortalTerminateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 select-none">
          <div className="w-full max-w-md bg-slate-900 rounded-3xl shadow-2xl border border-slate-700 overflow-hidden text-white">
            <div className="bg-gradient-to-r from-rose-700 to-rose-800 p-5 text-center">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-inner">
                <Trash2 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-base font-black">إنهاء التجربة وحذف البيانات فوراً</h3>
              <p className="text-xs text-rose-100 mt-0.5">
                تأكيد حذف الحساب التجريبي المعزول
              </p>
            </div>

            <div className="p-5 space-y-4 text-center">
              <div className="p-3.5 bg-rose-950/60 rounded-2xl border border-rose-500/40 text-rose-200 text-xs leading-relaxed font-medium">
                هل أنت متأكد من رغبتك في إنهاء التجربة الآن؟ سيتم مسح كافة البيانات التجريبية نهائياً ولن تتمكن من فتح حساب تجريبي جديد على هذا الجهاز.
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleConfirmTerminateFromPortal}
                  className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>نعم، إنهاء التجربة ومسح البيانات</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPortalTerminateModal(false)}
                  className="py-3 px-5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  إلغاء ومتابعة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

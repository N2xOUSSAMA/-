import React, { useState, useEffect } from 'react';
import { StoreSettings, User } from './types';
import { StorageService } from './services/storage';
import { POSView } from './components/POS/POSView';
import { InventoryView } from './components/Inventory/InventoryView';
import { SalesHistoryView } from './components/Sales/SalesHistoryView';
import { CustomersView } from './components/Customers/CustomersView';
import { ReportsView } from './components/Reports/ReportsView';
import { SettingsView } from './components/Settings/SettingsView';
import { AuthModal } from './components/Auth/AuthModal';
import { WelcomeLandingPortal } from './components/Auth/WelcomeLandingPortal';
import {
  ShoppingBag,
  Package,
  FileText,
  Users,
  TrendingUp,
  Settings,
  Lock,
  LogOut,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Store,
  Clock,
  Hourglass,
  MessageCircle,
  Trash2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Menu,
  PanelRightClose,
  PanelRightOpen,
  LayoutGrid,
  Moon,
  Sun,
  X,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export default function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<StoreSettings>(StorageService.getSettings());
  const [activeTab, setActiveTab] = useState<
    'pos' | 'inventory' | 'sales' | 'customers' | 'reports' | 'settings'
  >('pos');

  // Sidebar collapse toggle for extra wide screens or compact view
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  // Live time ticker
  const [currentTime, setCurrentTime] = useState<string>('');

  // Admin permission modal when cashier clicks settings/reports
  const [isAdminAuthModalOpen, setIsAdminAuthModalOpen] = useState<boolean>(false);
  const [adminAuthRequiredForTab, setAdminAuthRequiredForTab] = useState<
    'reports' | 'settings' | null
  >(null);

  // Stats badges
  const [lowStockCount, setLowStockCount] = useState<number>(0);
  const [debtCount, setDebtCount] = useState<number>(0);

  // Trial countdown ticker and terminate modal
  const [trialCountdownStr, setTrialCountdownStr] = useState<string>('');
  const [isTerminateTrialModalOpen, setIsTerminateTrialModalOpen] = useState<boolean>(false);
  const [trialExpiredMessageModal, setTrialExpiredMessageModal] = useState<boolean>(false);

  // Cashier Welcome Modal state
  const [isCashierWelcomeModalOpen, setIsCashierWelcomeModalOpen] = useState<boolean>(false);

  // Initialize data
  useEffect(() => {
    const loadedUsers = StorageService.getUsers();
    setUsers(loadedUsers);

    const activeId = StorageService.getActiveUserId();
    const foundUser = loadedUsers.find((u) => u.id === activeId);

    if (foundUser && foundUser.isActive !== false) {
      setCurrentUser(foundUser);
      StorageService.setActiveUserId(foundUser.id);
      setSettings(StorageService.getSettings(foundUser.id));
      // Run daily automatic backup silently if not done today
      StorageService.runDailyAutoBackupIfNeeded(foundUser.id);
    } else {
      setCurrentUser(null);
      StorageService.setActiveUserId(null);
    }

    refreshBadges();
  }, []);

  // Sync Dark Mode class and dynamic font with HTML root
  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
      const activeFont = settings.darkModeFont || 'tajawal';
      document.documentElement.setAttribute('data-font', activeFont);
    } else {
      document.documentElement.classList.remove('dark');
      const activeFont = settings.lightModeFont || 'cairo';
      document.documentElement.setAttribute('data-font', activeFont);
    }
  }, [settings.darkMode, settings.darkModeFont, settings.lightModeFont]);

  // Live clock updater
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('ar-DZ', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Continuous trial timer and auto-expire watcher
  useEffect(() => {
    if (!currentUser?.isTrial) return;

    const checkTrial = () => {
      const countdown = StorageService.getTrialCountdown();
      setTrialCountdownStr(countdown.formatted);

      if (countdown.isExpired) {
        StorageService.terminateAndClearTrialSession(true);
        setCurrentUser(null);
        setTrialExpiredMessageModal(true);
      }
    };

    checkTrial();
    const interval = setInterval(checkTrial, 1000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const refreshBadges = () => {
    const prods = StorageService.getProducts();
    const low = prods.filter((p) => p.stock > 0 && p.stock <= p.minStockAlert).length;
    setLowStockCount(low);

    const custs = StorageService.getCustomers();
    const debts = custs.filter((c) => c.balanceDebt > 0).length;
    setDebtCount(debts);
  };

  const handleLoginSuccess = (user: User) => {
    StorageService.setActiveUserId(user.id);
    setCurrentUser(user);
    setSettings(StorageService.getSettings(user.id));
    setActiveTab('pos');

    // Welcome modal shows ONLY ONCE for new accounts
    const hasSeenWelcome = StorageService.hasUserSeenWelcome(user.id);
    if (!hasSeenWelcome) {
      setIsCashierWelcomeModalOpen(true);
      StorageService.markUserWelcomed(user.id);
    } else {
      setIsCashierWelcomeModalOpen(false);
    }

    const updatedUsers = StorageService.getUsers();
    setUsers(updatedUsers);
    refreshBadges();
  };

  const handleAdminModalSuccess = (adminUser: User) => {
    setIsAdminAuthModalOpen(false);
    if (adminAuthRequiredForTab) {
      setActiveTab(adminAuthRequiredForTab);
      setAdminAuthRequiredForTab(null);
    }
  };

  const handleLogout = () => {
    StorageService.setActiveUserId(null);
    setCurrentUser(null);
    setIsAdminAuthModalOpen(false);
    setIsCashierWelcomeModalOpen(false);
  };

  const handleConfirmTerminateTrial = () => {
    StorageService.terminateAndClearTrialSession(true);
    setCurrentUser(null);
    setIsTerminateTrialModalOpen(false);
  };

  const handleOpenWhatsAppUpgrade = () => {
    const rawAdminWhatsApp = settings.adminWhatsApp || '213555123456';
    const cleanWhatsApp = rawAdminWhatsApp.replace(/[^0-9]/g, '');
    const text = encodeURIComponent(
      'السلام عليكم أخي الكريم 🌹 قمت بتجربة نظام كشك متعدد الخدمات وأعجبني جداً! أود الاشتراك وتفعيل حساب رسمي دائم لكشكي.'
    );
    window.open(`https://wa.me/${cleanWhatsApp}?text=${text}`, '_blank');
  };

  const handleTabClick = (
    tab: 'pos' | 'inventory' | 'sales' | 'customers' | 'reports' | 'settings'
  ) => {
    // Check if the current user explicitly locked Reports or Settings with their personal PIN
    if (tab === 'reports' && currentUser?.lockReportsWithPin) {
      setAdminAuthRequiredForTab(tab);
      setIsAdminAuthModalOpen(true);
      return;
    }
    if (tab === 'settings' && currentUser?.lockSettingsWithPin) {
      setAdminAuthRequiredForTab(tab);
      setIsAdminAuthModalOpen(true);
      return;
    }
    setActiveTab(tab);
    refreshBadges();
  };

  const toggleSound = () => {
    const newSettings = { ...settings, soundEnabled: !settings.soundEnabled };
    setSettings(newSettings);
    StorageService.saveSettings(newSettings);
  };

  const toggleDarkMode = () => {
    const newSettings = { ...settings, darkMode: !settings.darkMode };
    setSettings(newSettings);
    StorageService.saveSettings(newSettings);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Nav Items Configuration with distinct vibrant color schemes
  const navItems = [
    {
      id: 'pos' as const,
      label: 'نقطة البيع',
      icon: ShoppingBag,
      badge: null,
    },
    {
      id: 'inventory' as const,
      label: 'المخزون والسلع',
      icon: Package,
      badge: lowStockCount,
    },
    {
      id: 'sales' as const,
      label: 'سجل المبيعات',
      icon: FileText,
      badge: null,
    },
    {
      id: 'customers' as const,
      label: 'العملاء والديون',
      icon: Users,
      badge: debtCount,
    },
    {
      id: 'reports' as const,
      label: 'التقارير والأرباح',
      icon: TrendingUp,
      badge: currentUser?.lockReportsWithPin ? 'قفل' : null,
    },
    {
      id: 'settings' as const,
      label: currentUser?.role === 'admin' ? 'الإعدادات والمستخدمين' : 'إعدادات الكاشير',
      icon: Settings,
      badge: currentUser?.lockSettingsWithPin ? 'قفل' : null,
    },
  ];

  // If no user is logged in, show the Welcome & Auth Landing Portal
  if (!currentUser) {
    return (
      <WelcomeLandingPortal
        settings={settings}
        users={users}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-900 select-none overflow-hidden text-slate-900 font-sans">
      {/* ======================================================== */}
      {/* 24-HOUR TRIAL ACTIVE NOTIFICATION BAR */}
      {/* ======================================================== */}
      {currentUser.isTrial && (
        <div className="bg-gradient-to-r from-amber-600 via-emerald-700 to-teal-700 text-white px-3 sm:px-6 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs font-bold shadow-md z-40 border-b border-amber-400/30 shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-1 bg-white/20 rounded-lg">
              <Hourglass className="w-3.5 h-3.5 text-amber-200 animate-spin" />
            </span>
            <span className="font-black text-amber-100">وضع الحساب التجريبي المعزول (24 ساعة)</span>
            <span className="hidden md:inline text-emerald-100/90 font-medium text-[11px]">
              • حساب خاص بك وحدك • تُحذف البيانات التجريبية تلقائياً عند انتهاء الوقت
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-slate-950/80 px-2.5 py-1 rounded-xl font-mono text-amber-300 border border-amber-400/40 text-xs font-black flex items-center gap-1 shadow-inner">
              <Clock className="w-3 h-3" />
              <span>متبقي: {trialCountdownStr || '24:00:00'}</span>
            </div>

            <button
              onClick={handleOpenWhatsAppUpgrade}
              className="bg-emerald-400 hover:bg-emerald-300 text-slate-950 px-2.5 py-1 rounded-xl text-[11px] font-black flex items-center gap-1 transition-all shadow-xs cursor-pointer"
            >
              <MessageCircle className="w-3 h-3" />
              <span className="hidden sm:inline">طلب تفعيل حساب دائم</span>
              <span className="sm:hidden">تفعيل دائم</span>
            </button>

            <button
              onClick={() => setIsTerminateTrialModalOpen(true)}
              className="bg-rose-950/70 hover:bg-rose-900 text-rose-200 border border-rose-400/40 px-2.5 py-1 rounded-xl text-[10px] sm:text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
              title="إنهاء التجربة وحذف البيانات فوراً"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>إنهاء التجربة</span>
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TOP HEADER NAVIGATION BAR */}
      {/* ======================================================== */}
      <header className="bg-slate-900 text-white border-b border-slate-800 px-3 sm:px-4 py-2 flex items-center justify-between gap-3 shadow-md shrink-0 z-30">
        {/* Brand & Store Name */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 text-white flex items-center justify-center shadow-md shadow-emerald-950/40">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-black text-white leading-tight">
              {settings.storeName}
            </h1>
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>كشك متعدد الخدمات</span>
            </div>
          </div>
        </div>

        {/* Horizontal Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-2xl border border-slate-800 overflow-x-auto no-scrollbar">
          {navItems.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`py-2 px-3 sm:px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer relative ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge !== null && tab.badge !== undefined && (
                  <span
                    className={`text-[10px] font-black px-1.5 py-0.2 rounded-full shadow-xs ${
                      typeof tab.badge === 'number'
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'bg-slate-800 text-amber-300 border border-amber-400/40 text-[9px] flex items-center gap-0.5'
                    }`}
                  >
                    {typeof tab.badge === 'string' && tab.badge === 'قفل' ? (
                      <>
                        <Lock className="w-2.5 h-2.5 inline" />
                        <span>إدارة</span>
                      </>
                    ) : (
                      tab.badge
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Header Controls: Time + Audio + Fullscreen + Cashier & Logout */}
        <div className="flex items-center gap-2">
          {/* Live Clock Badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-mono font-bold text-amber-300 shadow-inner">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{currentTime || '00:00:00'}</span>
          </div>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={toggleSound}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              settings.soundEnabled
                ? 'bg-slate-800/80 border-slate-700 text-teal-400 hover:bg-slate-700'
                : 'bg-rose-950/40 border-rose-800/50 text-rose-400 hover:bg-rose-900/50'
            }`}
            title={settings.soundEnabled ? 'كتم أصوات التنبيه' : 'تفعيل أصوات التنبيه'}
          >
            {settings.soundEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>

          {/* Dark Mode Toggle */}
          <button
            type="button"
            onClick={toggleDarkMode}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              settings.darkMode
                ? 'bg-indigo-950/60 border-indigo-700/60 text-indigo-300 hover:bg-indigo-900/60 shadow-xs'
                : 'bg-amber-950/40 border-amber-700/50 text-amber-400 hover:bg-amber-900/50'
            }`}
            title={settings.darkMode ? 'التبديل إلى الوضع النهاري الفاتح (Light Mode)' : 'التبديل إلى الوضع الليلي الداكن (Dark Mode)'}
          >
            {settings.darkMode ? (
              <Moon className="w-4 h-4 text-indigo-400" />
            ) : (
              <Sun className="w-4 h-4 text-amber-400" />
            )}
          </button>

          {/* Fullscreen */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer hidden sm:flex"
            title="ملء الشاشة"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          {/* Current User & Logout */}
          <div className="flex items-center gap-2 pl-1 border-r border-slate-800 pr-2">
            <div className="flex items-center gap-1.5">
              <span className="text-base p-1 bg-slate-800 rounded-xl">
                {currentUser.avatar || '👤'}
              </span>
              <div className="hidden sm:block text-right">
                <div className="text-xs font-bold text-white leading-tight">
                  {currentUser.name}
                </div>
                <div className="text-[10px] text-emerald-400 font-medium leading-none">
                  {currentUser.role === 'admin' ? 'مدير عام' : 'كاشير'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-600 text-rose-300 hover:text-white transition-all cursor-pointer"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* MAIN VIEW CONTENT CONTAINER */}
      {/* ======================================================== */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-100 relative min-w-0">
        {activeTab === 'pos' && (
          <POSView
            currentUser={currentUser}
            settings={settings}
            onRefreshData={refreshBadges}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}
        {activeTab === 'inventory' && (
          <InventoryView
            currentUser={currentUser}
            settings={settings}
            onRefreshData={refreshBadges}
            onBackToPOS={() => setActiveTab('pos')}
          />
        )}
        {activeTab === 'sales' && (
          <SalesHistoryView
            currentUser={currentUser}
            settings={settings}
            onRefreshData={refreshBadges}
            onBackToPOS={() => setActiveTab('pos')}
          />
        )}
        {activeTab === 'customers' && (
          <CustomersView
            currentUser={currentUser}
            settings={settings}
            onRefreshData={refreshBadges}
            onBackToPOS={() => setActiveTab('pos')}
          />
        )}
        {activeTab === 'reports' && (
          <ReportsView
            currentUser={currentUser}
            settings={settings}
            onRefreshData={refreshBadges}
            onBackToPOS={() => setActiveTab('pos')}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsView
            currentUser={currentUser}
            settings={settings}
            onUpdateSettings={(newSettings) => setSettings(newSettings)}
            onUpdateCurrentUser={(updatedUser) => {
              setCurrentUser(updatedUser);
              const updatedUsers = StorageService.getUsers();
              setUsers(updatedUsers);
            }}
            onRefreshData={refreshBadges}
            onBackToPOS={() => setActiveTab('pos')}
          />
        )}
      </main>

      {/* ======================================================== */}
      {/* TERMINATE TRIAL CONFIRMATION MODAL */}
      {/* ======================================================== */}
      {isTerminateTrialModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 select-none">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-rose-600 to-rose-700 p-5 text-white text-center">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-inner">
                <Trash2 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-base font-black">إنهاء الجلسة التجريبية وحذف البيانات</h3>
              <p className="text-xs text-rose-100 mt-0.5">
                تأكيد الخروج من الحساب التجريبي المعزول (24 ساعة)
              </p>
            </div>

            <div className="p-5 space-y-4 text-center">
              <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-200 text-rose-800 text-xs leading-relaxed font-medium">
                هل أنت متأكد من رغبتك في إنهاء الحساب التجريبي الآن؟ سيتم مسح كافة المبيعات والبيانات التجريبية والعودة للبوابة الرئيسية.
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleConfirmTerminateTrial}
                  className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>نعم، إنهاء التجربة ومسح البيانات</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsTerminateTrialModalOpen(false)}
                  className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  إلغاء ومتابعة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TRIAL EXPIRED NOTIFICATION MODAL */}
      {/* ======================================================== */}
      {trialExpiredMessageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 select-none">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 p-5 text-white text-center">
              <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-amber-500/30">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black">انتهت مدة الحساب التجريبي (24 ساعة)</h3>
              <p className="text-xs text-slate-400 mt-0.5">شكراً لتجربتك نظام كشك متعدد الخدمات</p>
            </div>

            <div className="p-5 space-y-4 text-center">
              <p className="text-xs text-slate-600 leading-relaxed">
                تم انتهاء صلاحية الـ 24 ساعة المخصصة للتجربة وحذف كافة البيانات التجريبية تلقائياً. للحصول على حساب دائم خاص بكشكك، تواصل مع الإدارة عبر واتساب.
              </p>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setTrialExpiredMessageModal(false);
                    handleOpenWhatsAppUpgrade();
                  }}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>طلب تفعيل حساب رسمي لكشكك عبر واتساب</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTrialExpiredMessageModal(false)}
                  className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  العودة للبوابة الرئيسية
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* CASHIER / NEW ACCOUNT WELCOME MODAL */}
      {/* ======================================================== */}
      {isCashierWelcomeModalOpen && currentUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 select-none animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-6 text-white text-center relative">
              <button
                type="button"
                onClick={() => setIsCashierWelcomeModalOpen(false)}
                className="absolute top-4 left-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
                title="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner ring-4 ring-white/10">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-black">
                مرحباً بك، {currentUser.name}! 🌟
              </h3>
              <p className="text-xs text-emerald-100 mt-1 font-medium">
                أهلاً وسهلاً بك في نظام كشك متعدد الخدمات (Multi-Services POS)
              </p>
            </div>

            {/* Content Body */}
            <div className="p-5 space-y-4">
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 text-xs leading-relaxed font-medium">
                ✨ <strong>حسابك جاهز بنجاح:</strong> تم فتح الجلسة والمتجر نظيف وفارغ تماماً (0 منتجات، 0 عملاء، 0 ديون) لتتمكن من إضافة أصناف كشكك وعملائك وبدء البيع فوراً.
              </div>

              {/* Account / Kiosk Details */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] text-slate-400 font-bold mb-0.5">اسم الكشك / المتجر</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 truncate">
                    {currentUser.kioskName || settings.storeName || 'كشك متعدد الخدمات'}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] text-slate-400 font-bold mb-0.5">الولاية / المدينة</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 truncate">
                    {currentUser.city || settings.storeAddress || 'تبسة / الجزائر'}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] text-slate-400 font-bold mb-0.5">نوع الحساب والصلاحيات</div>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{currentUser.role === 'admin' ? 'مدير عام كامل الصلاحيات' : 'كاشير مبيعات ونقطة بيع'}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] text-slate-400 font-bold mb-0.5">حالة المتجر والديون</div>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>0 د.ج ديون (بداية نظيفة)</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsCashierWelcomeModalOpen(false);
                    setActiveTab('pos');
                  }}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>بدء العمل في نقطة البيع (شاشة POS الأولى)</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCashierWelcomeModalOpen(false);
                      setActiveTab('inventory');
                    }}
                    className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Package className="w-3.5 h-3.5 text-emerald-600" />
                    <span>إضافة منتجات للمخزون</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsCashierWelcomeModalOpen(false);
                      setActiveTab('customers');
                    }}
                    className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    <span>إضافة عملاء جدد</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* AUTH CHECK MODAL (FOR RESTRICTED TABS) */}
      {/* ======================================================== */}
      <AuthModal
        isOpen={isAdminAuthModalOpen}
        currentUser={currentUser}
        title={
          adminAuthRequiredForTab === 'reports'
            ? 'تأكيد الرمز السري لعرض التقارير'
            : 'تأكيد الرمز السري لفتح الإعدادات'
        }
        subtitle={`أدخل كلمة المرور / رمز PIN الخاص بحساب ${currentUser.name} أو حساب المدير لفتح هذه الشاشة`}
        onLoginSuccess={handleAdminModalSuccess}
        onClose={() => {
          setIsAdminAuthModalOpen(false);
          setAdminAuthRequiredForTab(null);
        }}
        onReturnToWelcome={handleLogout}
      />
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { StoreSettings, User } from '../../types';
import { StorageService } from '../../services/storage';
import {
  Settings,
  Store,
  Printer,
  ShieldCheck,
  Database,
  Smartphone,
  Monitor,
  Download,
  Upload,
  RefreshCw,
  Check,
  KeyRound,
  DollarSign,
  HelpCircle,
  Volume2,
  ArrowRight,
  Moon,
  Sun,
  Type,
  Palette,
  Eye,
  EyeOff,
  Copy,
  UserPlus,
  Trash2,
  Edit3,
  Lock,
  Unlock,
  Crown,
  CheckCircle2,
  AlertTriangle,
  Users,
  Shield,
  FileText,
  Activity,
  Layers,
  Sparkles,
  Phone,
  UserCheck,
  UserX,
  TrendingUp,
  Sliders,
  ShoppingBag,
  Package,
  User as UserIcon,
} from 'lucide-react';

interface SettingsViewProps {
  currentUser: User;
  settings: StoreSettings;
  onUpdateSettings: (newSettings: StoreSettings) => void;
  onUpdateCurrentUser?: (updatedUser: User) => void;
  onRefreshData?: () => void;
  onBackToPOS?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  settings,
  onUpdateSettings,
  onUpdateCurrentUser,
  onRefreshData,
  onBackToPOS,
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const [formData, setFormData] = useState<StoreSettings>({ ...settings });
  const [users, setUsers] = useState<User[]>([]);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('تم حفظ الإعدادات بنجاح!');

  // For Admin: 'store' | 'appearance' | 'admin_panel' | 'backup' | 'guide'
  // For Cashier: 'cashier_profile' | 'appearance' | 'cashier_workspace' | 'cashier_security' | 'guide'
  const [activeTab, setActiveTab] = useState<string>(isAdmin ? 'store' : 'cashier_profile');

  // Eye toggle state for viewing passwords per user ID: { [userId]: boolean }
  const [visiblePasswords, setVisiblePasswords] = useState<{ [userId: string]: boolean }>({});
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);

  // User Deletion Modal Confirmation State (Fix deletion issue in iframe / avoid blocked window.confirm)
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // User search query for Admin Panel
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');

  // Guide category switcher: 'cashier' | 'shortcuts' | 'faq'
  const [guideCategory, setGuideCategory] = useState<'cashier' | 'shortcuts' | 'faq'>('cashier');

  // Cashier Profile Edit State
  const [cashierName, setCashierName] = useState<string>(currentUser?.name || '');
  const [cashierPhone, setCashierPhone] = useState<string>(currentUser?.phone || '');
  const [cashierPin, setCashierPin] = useState<string>(currentUser?.plainPin || '');
  const [cashierAvatar, setCashierAvatar] = useState<string>(currentUser?.avatar || '👨‍💻');
  const [cashierShowPin, setCashierShowPin] = useState<boolean>(false);

  // Cashier Personal Privacy Locks
  const [lockReportsWithPin, setLockReportsWithPin] = useState<boolean>(
    Boolean(currentUser?.lockReportsWithPin)
  );
  const [lockSettingsWithPin, setLockSettingsWithPin] = useState<boolean>(
    Boolean(currentUser?.lockSettingsWithPin)
  );

  // User Add/Edit Modal (Admin Only)
  const [userModalOpen, setUserModalOpen] = useState<boolean>(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<User | null>(null);
  const [modalName, setModalName] = useState<string>('');
  const [modalPhone, setModalPhone] = useState<string>('');
  const [modalPin, setModalPin] = useState<string>('');
  const [modalRole, setModalRole] = useState<'admin' | 'cashier'>('cashier');
  const [modalShowPin, setModalShowPin] = useState<boolean>(false);

  // Quick Password Reset Modal (Admin Only)
  const [resetPinModalUser, setResetPinModalUser] = useState<User | null>(null);
  const [quickNewPin, setQuickNewPin] = useState<string>('');
  const [quickShowPin, setQuickShowPin] = useState<boolean>(true);

  // Load latest users from storage
  const loadUsersList = () => {
    const loaded = StorageService.getUsers();
    setUsers(loaded);
  };

  useEffect(() => {
    loadUsersList();
  }, []);

  // Update initial form state if currentUser changes
  useEffect(() => {
    if (currentUser) {
      setCashierName(currentUser.name || '');
      setCashierPhone(currentUser.phone || '');
      setCashierPin(currentUser.plainPin || '');
      setCashierAvatar(currentUser.avatar || '👨‍💻');
      setLockReportsWithPin(Boolean(currentUser.lockReportsWithPin));
      setLockSettingsWithPin(Boolean(currentUser.lockSettingsWithPin));
    }
  }, [currentUser]);

  // Ensure non-admin users cannot stay on admin_panel or store tab
  useEffect(() => {
    if (!isAdmin && (activeTab === 'admin_panel' || activeTab === 'store' || activeTab === 'backup')) {
      setActiveTab('cashier_profile');
    }
  }, [isAdmin, activeTab]);

  const handleSaveStoreSettings = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.saveSettings(formData);
    onUpdateSettings(formData);
    StorageService.playSuccessBeep();
    setSaveSuccessMsg('تم حفظ إعدادات المتجر وبيانات الوصل بنجاح!');
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Save Cashier Personal Profile & Store Details
  const handleSaveCashierProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashierName.trim()) {
      alert('يرجى كتابة اسم الكاشير');
      return;
    }
    if (!cashierPhone.trim()) {
      alert('يرجى إدخال رقم الهاتف المخصص لتسجيل الدخول');
      return;
    }
    const cleanPin = cashierPin.trim();
    if (cleanPin && cleanPin.length < 4) {
      alert('يجب أن تتكون كلمة المرور / رمز PIN من 4 خانات على الأقل');
      return;
    }

    const currentUsers = StorageService.getUsers();
    const isPhoneDuplicate = currentUsers.some(
      (u) =>
        u.id !== currentUser.id &&
        u.phone?.replace(/[\s-]/g, '') === cashierPhone.trim().replace(/[\s-]/g, '')
    );

    if (isPhoneDuplicate) {
      alert('رقم الهاتف هذا مسجل بالفعل لمستخدم آخر! يرجى اختيار رقم مختلف.');
      return;
    }

    // Save Store / Kiosk Settings so cashier can customize store details
    StorageService.saveSettings(formData);
    onUpdateSettings(formData);

    const updatedUser: User = {
      ...currentUser,
      name: cashierName.trim(),
      phone: cashierPhone.trim(),
      avatar: cashierAvatar,
      pin: cleanPin ? StorageService.hashPin(cleanPin) : currentUser.pin,
      plainPin: cleanPin || currentUser.plainPin,
      lockReportsWithPin,
      lockSettingsWithPin,
    };

    const updatedUsers = currentUsers.map((u) => (u.id === currentUser.id ? updatedUser : u));
    StorageService.saveUsers(updatedUsers);
    setUsers(updatedUsers);

    if (onUpdateCurrentUser) {
      onUpdateCurrentUser(updatedUser);
    }
    if (onRefreshData) {
      onRefreshData();
    }

    StorageService.playSuccessBeep();
    setSaveSuccessMsg('تم تحديث بيانات حسابك وبيانات المتجر بنجاح!');
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Save Cashier Preferences (Appearance, Sound, Receipt Size, Custom Lock)
  const handleSaveCashierPreferences = () => {
    StorageService.saveSettings(formData);
    onUpdateSettings(formData);

    const currentUsers = StorageService.getUsers();
    const updatedUser: User = {
      ...currentUser,
      lockReportsWithPin,
      lockSettingsWithPin,
    };

    const updatedUsers = currentUsers.map((u) => (u.id === currentUser.id ? updatedUser : u));
    StorageService.saveUsers(updatedUsers);
    setUsers(updatedUsers);

    if (onUpdateCurrentUser) {
      onUpdateCurrentUser(updatedUser);
    }

    StorageService.playSuccessBeep();
    setSaveSuccessMsg('تم حفظ تفضيلات الكاشير وخيارات الخصوصية بنجاح!');
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const handleCopyPassword = (userId: string, pass: string) => {
    if (!pass) return;
    navigator.clipboard.writeText(pass);
    setCopiedUserId(userId);
    setTimeout(() => setCopiedUserId(null), 2000);
  };

  const handleOpenAddUser = () => {
    setSelectedUserForEdit(null);
    setModalName('');
    setModalPhone('');
    setModalPin('123456');
    setModalRole('cashier');
    setModalShowPin(true);
    setUserModalOpen(true);
  };

  const handleOpenEditUser = (u: User) => {
    setSelectedUserForEdit(u);
    setModalName(u.name);
    setModalPhone(u.phone || '');
    setModalPin(u.plainPin || '');
    setModalRole(u.role);
    setModalShowPin(false);
    setUserModalOpen(true);
  };

  const handleSaveUserForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalName.trim()) {
      alert('يرجى إدخال اسم المستخدم أو الكاشير');
      return;
    }
    if (!modalPhone.trim()) {
      alert('يرجى إدخال رقم الهاتف المخصص لتسجيل الدخول');
      return;
    }

    const cleanPin = modalPin.trim();
    if (!selectedUserForEdit && (!cleanPin || cleanPin.length < 4)) {
      alert('يجب أن تتكون كلمة المرور أو رمز PIN من 4 خانات على الأقل');
      return;
    }

    if (selectedUserForEdit && cleanPin && cleanPin.length < 4) {
      alert('يجب أن تتكون كلمة المرور الجديدة من 4 خانات على الأقل');
      return;
    }

    const existingUsers = StorageService.getUsers();

    if (!selectedUserForEdit) {
      // Adding new user
      const isPhoneDuplicate = existingUsers.some(
        (u) => u.phone?.replace(/[\s-]/g, '') === modalPhone.trim().replace(/[\s-]/g, '')
      );
      if (isPhoneDuplicate) {
        alert('رقم الهاتف هذا مسجل بالفعل لمستخدم آخر! يرجى اختيار رقم مختلف.');
        return;
      }

      const newUser: User = {
        id: 'usr_' + Date.now(),
        name: modalName.trim(),
        role: modalRole,
        pin: StorageService.hashPin(cleanPin),
        plainPin: cleanPin,
        phone: modalPhone.trim(),
        avatar: modalRole === 'admin' ? '👑' : '👨‍💻',
        isActive: true,
        isTrial: false,
        kioskName: formData.storeName || 'كشك متعدد الخدمات',
        city: formData.storeAddress || 'تبسة',
        createdAt: new Date().toISOString().split('T')[0],
      };

      const updated = [...existingUsers, newUser];
      StorageService.saveUsers(updated);
      setUsers(updated);
      StorageService.playSuccessBeep();
      alert(`تم إضافة حساب ${modalRole === 'admin' ? 'المدير' : 'الكاشير'} "${newUser.name}" بنجاح!`);
    } else {
      // Editing existing user
      const updated = existingUsers.map((u) => {
        if (u.id === selectedUserForEdit.id) {
          const finalPin = cleanPin ? StorageService.hashPin(cleanPin) : u.pin;
          const finalPlainPin = cleanPin ? cleanPin : u.plainPin;
          return {
            ...u,
            name: modalName.trim(),
            phone: modalPhone.trim(),
            role: modalRole,
            pin: finalPin,
            plainPin: finalPlainPin,
            avatar: modalRole === 'admin' ? '👑' : '👨‍💻',
          };
        }
        return u;
      });

      StorageService.saveUsers(updated);
      setUsers(updated);
      StorageService.playSuccessBeep();
      alert(`تم تحديث بيانات حساب "${modalName}" بنجاح!`);
    }

    setUserModalOpen(false);
    setSelectedUserForEdit(null);
  };

  const handleToggleUserActive = (u: User) => {
    if (u.id === currentUser.id) {
      alert('لا يمكنك إيقاف حسابك الحالي المسجل به الدخول!');
      return;
    }

    const updated = users.map((item) =>
      item.id === u.id ? { ...item, isActive: item.isActive === false ? true : false } : item
    );
    StorageService.saveUsers(updated);
    setUsers(updated);
    StorageService.playBeep();
  };

  const handleDeleteUser = (u: User) => {
    if (u.id === 'user_admin') {
      alert('لا يمكن حذف حساب المدير العام الرئيسي!');
      return;
    }
    if (u.id === currentUser.id) {
      alert('لا يمكنك حذف الحساب المسجل به حالياً!');
      return;
    }
    setUserToDelete(u);
  };

  const handleConfirmDeleteUser = () => {
    if (!userToDelete) return;
    if (userToDelete.id === 'user_admin' || userToDelete.id === currentUser.id) {
      setUserToDelete(null);
      return;
    }

    const success = StorageService.deleteUser(userToDelete.id);
    if (success) {
      const updated = StorageService.getUsers();
      setUsers(updated);
      if (onRefreshData) onRefreshData();
      StorageService.playSuccessBeep();
      setSaveSuccessMsg(`تم حذف حساب "${userToDelete.name}" نهائياً من النظام.`);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      // Fallback in case deleteUser returned false
      const filtered = users.filter((item) => item.id !== userToDelete.id);
      StorageService.saveUsers(filtered);
      setUsers(filtered);
      if (onRefreshData) onRefreshData();
      StorageService.playSuccessBeep();
      setSaveSuccessMsg(`تم حذف حساب "${userToDelete.name}" بنجاح.`);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
    setUserToDelete(null);
  };

  const handleQuickResetPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPinModalUser) return;
    if (!quickNewPin.trim() || quickNewPin.trim().length < 4) {
      alert('يجب ألا تقل كلمة المرور الجديدة عن 4 خانات');
      return;
    }

    const updated = users.map((u) => {
      if (u.id === resetPinModalUser.id) {
        return {
          ...u,
          pin: StorageService.hashPin(quickNewPin.trim()),
          plainPin: quickNewPin.trim(),
        };
      }
      return u;
    });

    StorageService.saveUsers(updated);
    setUsers(updated);
    StorageService.playSuccessBeep();
    alert(`تم تغيير وتحديث كلمة المرور لحساب "${resetPinModalUser.name}" بنجاح!`);
    setResetPinModalUser(null);
    setQuickNewPin('');
  };

  const handleExportBackup = () => {
    const backupJson = StorageService.exportBackup();
    const blob = new Blob([backupJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pos_kiosk_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const res = StorageService.importBackup(content);
        alert(res.message);
        if (res.success) {
          if (onRefreshData) onRefreshData();
          window.location.reload();
        }
      }
    };
    reader.readAsText(file);
  };

  const handleResetDemo = () => {
    if (confirm('تحذير: سيتم إعادة ضبط النظام واستعادة البيانات التجريبية الافتراضية للكشك. هل تود المتابعة؟')) {
      StorageService.resetToDemo();
      alert('تمت استعادة البيانات التجريبية بنجاح!');
      if (onRefreshData) onRefreshData();
      window.location.reload();
    }
  };

  const handleClearStoreCleanSlate = () => {
    if (
      confirm(
        '⚠️ تصفير شامل: سيتم مسح كافة المنتجات، العملاء، الديون، والمبيعات بالكامل، ليصبح المتجر نظيفاً وفارغاً 100% (0 منتجات، 0 عملاء، 0 ديون) لتبدأ بإدخال بياناتك الحقيقية من الصفر.\n\nهل أنت متأكد من تصفير المتجر الآن؟'
      )
    ) {
      StorageService.clearAllStoreDataCleanSlate();
      alert('✅ تم تصفير وتفريغ المتجر بنجاح! المتجر الآن نظيف تماماً ومستعد لإضافة منتجاتك وعملائك.');
      if (onRefreshData) onRefreshData();
      window.location.reload();
    }
  };

  const handleLoadSampleProducts = () => {
    if (
      confirm(
        'هل تود تحميل قائمة أصناف ونماذج تجريبية للكشك (فليكسي، سجائر، مكسرات، إكسسوارات) للتجربة والمعاينة؟'
      )
    ) {
      StorageService.loadSampleDemoProducts();
      alert('✅ تم تحميل المنتجات النموذجية بنجاح!');
      if (onRefreshData) onRefreshData();
      window.location.reload();
    }
  };

  // System Stats for Admin Panel
  const allProducts = StorageService.getProducts();
  const allSales = StorageService.getSales();
  const activeUsersCount = users.filter((u) => u.isActive !== false).length;

  // Cashier Personal Stats
  const cashierSalesList = allSales.filter(
    (s) => s.cashierId === currentUser?.id || s.cashierName === currentUser?.name
  );
  const cashierTotalRevenue = cashierSalesList.reduce((sum, s) => sum + s.grandTotal, 0);
  const cashierTotalInvoices = cashierSalesList.length;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-100 dark:bg-slate-950 overflow-hidden select-none">
      {/* Top Header */}
      <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-xs shrink-0">
        <div className="flex items-center gap-3">
          {onBackToPOS && (
            <button
              onClick={onBackToPOS}
              className="py-2 px-3.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="الرجوع إلى شاشة الكاشير"
            >
              <ArrowRight className="w-4 h-4" />
              <span>رجوع للكاشير</span>
            </button>
          )}

          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Settings className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              {isAdmin ? 'إعدادات النظام والتحكم الشامل' : 'إعدادات حساب الكاشير ومساحة العمل'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isAdmin
                ? 'تخصيص بيانات المتجر، الفواتير، المظهر، وإدارة حسابات الكاشير والمشرفين'
                : `تخصيص ملفك الشخصي (${currentUser?.name})، كلمة المرور، المظهر، وخيارات الخصوصية`}
            </p>
          </div>
        </div>

        {/* Tab Navigation Buttons */}
        <div className="flex flex-wrap bg-slate-100 dark:bg-slate-800/90 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs gap-1">
          {/* ADMIN TABS */}
          {isAdmin && (
            <>
              {/* Tab: Store Settings */}
              <button
                onClick={() => setActiveTab('store')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'store'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                <Store className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>بيانات المتجر والوصل</span>
              </button>

              {/* Tab: Appearance */}
              <button
                onClick={() => setActiveTab('appearance')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'appearance'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                <Palette className="w-3.5 h-3.5 text-indigo-500" />
                <span>المظهر والخطوط</span>
              </button>

              {/* Tab: Admin Panel (EXCLUSIVE) */}
              <button
                onClick={() => setActiveTab('admin_panel')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'admin_panel'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                    : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 border border-purple-200/60 dark:border-purple-800/50'
                }`}
              >
                <Crown className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                <span>المدير (تحكم شامل)</span>
                <span className="bg-amber-400 text-slate-950 text-[9px] px-1.5 py-0.2 rounded-full font-black">
                  خاص
                </span>
              </button>

              {/* Tab: Backup */}
              <button
                onClick={() => setActiveTab('backup')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'backup'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                <Database className="w-3.5 h-3.5 text-blue-500" />
                <span>النسخ الاحتياطي</span>
              </button>
            </>
          )}

          {/* CASHIER TABS */}
          {!isAdmin && (
            <>
              {/* Tab: Store & Cashier Profile */}
              <button
                onClick={() => setActiveTab('cashier_profile')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'cashier_profile'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                <Store className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>بيانات المتجر والملف الشخصي</span>
              </button>

              {/* Tab: Appearance */}
              <button
                onClick={() => setActiveTab('appearance')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'appearance'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                <Palette className="w-3.5 h-3.5 text-indigo-500" />
                <span>المظهر والخطوط</span>
              </button>

              {/* Tab: Cashier Workspace & Sound */}
              <button
                onClick={() => setActiveTab('cashier_workspace')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'cashier_workspace'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                <Sliders className="w-3.5 h-3.5 text-blue-500" />
                <span>الأصوات والطابعة</span>
              </button>

              {/* Tab: Privacy & Custom Locks */}
              <button
                onClick={() => setActiveTab('cashier_security')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'cashier_security'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                <span>قفل الخصوصية المخصص</span>
              </button>
            </>
          )}

          {/* Guide Tab (Both Admin & Cashier) */}
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'guide'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>دليل الاستخدام</span>
          </button>
        </div>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 p-3 sm:p-6 overflow-y-auto max-w-5xl mx-auto w-full">
        {/* ======================================================== */}
        {/* CASHIER TAB 1: PERSONAL PROFILE, STORE DATA & PASSWORD */}
        {/* ======================================================== */}
        {!isAdmin && activeTab === 'cashier_profile' && (
          <div className="space-y-4">
            {/* Cashier Greeting & Performance Card */}
            <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white rounded-3xl p-5 shadow-lg border border-blue-800/40 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center text-3xl shadow-inner">
                    {cashierAvatar || currentUser?.avatar || '👨‍💻'}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30 px-2 py-0.5 rounded-full inline-block mb-1">
                      حساب كاشير شخصي
                    </span>
                    <h3 className="text-base font-black text-white">{currentUser?.name}</h3>
                    <p className="text-xs text-slate-300">
                      رقم الدخول: <span className="font-mono font-bold text-emerald-300">{currentUser?.phone}</span>
                    </p>
                  </div>
                </div>

                {/* Quick stats */}
                <div className="flex items-center gap-2 bg-white/10 p-2.5 rounded-2xl border border-white/10 text-xs">
                  <div className="text-right pl-3 border-l border-white/20">
                    <span className="text-[10px] text-slate-300 block">فواتيرك الصادرة:</span>
                    <span className="font-mono font-black text-white text-sm">{cashierTotalInvoices} فاتورة</span>
                  </div>
                  <div className="text-right pr-2">
                    <span className="text-[10px] text-slate-300 block">إجمالي مبيعاتك:</span>
                    <span className="font-mono font-black text-emerald-300 text-sm">
                      {cashierTotalRevenue.toLocaleString()} {settings.currencySymbol}
                    </span>
                  </div>
                </div>
              </div>

              {/* Avatar Selector Chips */}
              <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-slate-300 font-bold">اختر أيقونة حسابك:</span>
                {['👨‍💻', '🧔', '🧑‍💼', '👩‍💻', '👤', '🌟', '🚀', '🏪', '🛒'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setCashierAvatar(emoji)}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-base transition-transform cursor-pointer ${
                      cashierAvatar === emoji
                        ? 'bg-white text-slate-900 ring-2 ring-emerald-400 scale-110 shadow-sm'
                        : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Profile & Store Edit Form */}
            <form onSubmit={handleSaveCashierProfile} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-5">
              {/* Section 1: Cashier Personal Account */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>1. بيانات حساب الكاشير وكلمة المرور</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      اسم الكاشير (يظهر بالفواتير) *
                    </label>
                    <input
                      type="text"
                      required
                      value={cashierName}
                      onChange={(e) => setCashierName(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-bold focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      رقم الهاتف المخصص لتسجيل الدخول *
                    </label>
                    <input
                      type="text"
                      required
                      value={cashierPhone}
                      onChange={(e) => setCashierPhone(e.target.value)}
                      placeholder="0550000000"
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      كلمة المرور / الرمز السري الخاص بك (PIN) *
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type={cashierShowPin ? 'text' : 'password'}
                        required
                        value={cashierPin}
                        onChange={(e) => setCashierPin(e.target.value)}
                        placeholder="أدخل كلمة المرور الجديدة"
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 pl-20"
                      />

                      <div className="absolute left-2 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setCashierShowPin(!cashierShowPin)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                          title={cashierShowPin ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                        >
                          {cashierShowPin ? <EyeOff className="w-4 h-4 text-emerald-600" /> : <Eye className="w-4 h-4" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(cashierPin);
                            alert('تم نسخ كلمة المرور إلى الحافظة!');
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                          title="نسخ كلمة المرور"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      اضغط على أيقونة العين 👁️ لإظهار كلمة المرور والتأكد منها.
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 2: Store / Kiosk Details */}
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
                  <Store className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>2. بيانات المتجر والكشك والوصل المطبوع</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      اسم المتجر / الكشك (أعلى الفاتورة)
                    </label>
                    <input
                      type="text"
                      value={formData.storeName}
                      onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                      placeholder="مثال: كشك الأمانة والبركة"
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      رقم هاتف المتجر
                    </label>
                    <input
                      type="text"
                      value={formData.storePhone}
                      onChange={(e) => setFormData({ ...formData, storePhone: e.target.value })}
                      placeholder="0550000000"
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      عنوان الكشك / الولاية
                    </label>
                    <input
                      type="text"
                      value={formData.storeAddress}
                      onChange={(e) => setFormData({ ...formData, storeAddress: e.target.value })}
                      placeholder="مثال: الجزائر العاصمة - باب الزوار"
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      رمز العملة
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={formData.currencySymbol}
                        onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                        placeholder="د.ج"
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 text-center"
                      />
                      <input
                        type="text"
                        value={formData.currencyCode}
                        onChange={(e) => setFormData({ ...formData, currencyCode: e.target.value })}
                        placeholder="DZD"
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-200 text-center"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      رسالة شكر وترحيب أسفل الوصل المطبوع
                    </label>
                    <input
                      type="text"
                      value={formData.receiptFooterNote}
                      onChange={(e) => setFormData({ ...formData, receiptFooterNote: e.target.value })}
                      placeholder="شكراً لزيارتكم، دمتم في رعاية الله وحفظه"
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="submit"
                  className="py-3 px-6 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-2xl font-bold text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  حفظ وتطبيق بيانات الحساب والمتجر
                </button>

                {saveSuccess && (
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-xl">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    {saveSuccessMsg}
                  </span>
                )}
              </div>
            </form>
          </div>
        )}

        {/* ======================================================== */}
        {/* CASHIER TAB 2: WORKSPACE, SOUNDS & PRINTER */}
        {/* ======================================================== */}
        {!isAdmin && activeTab === 'cashier_workspace' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-500" />
                تخصيص مساحة عمل الكاشير والصوتيات والطابعة
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Sound Setting */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-xs">
                    <Volume2 className="w-4 h-4 text-emerald-600" />
                    <span>أصوات الكاشير والتنبيهات:</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    إصدار صوت صفارة تأكيدية عند مسح الباركود وإتمام الفاتورة.
                  </p>
                  <div className="pt-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="cashierSound"
                      checked={formData.soundEnabled}
                      onChange={(e) => setFormData({ ...formData, soundEnabled: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                    />
                    <label htmlFor="cashierSound" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                      تفعيل المؤثرات الصوتية للكاشير
                    </label>
                  </div>
                </div>

                {/* Thermal Printer Paper Size */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-xs">
                    <Printer className="w-4 h-4 text-blue-600" />
                    <span>طابعة الإيصالات المفضلة:</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    اختر المقاس المناسب لطابعة الإيصالات الحرارية المتصلة بجهازك.
                  </p>
                  <select
                    value={formData.receiptPaperSize}
                    onChange={(e) => setFormData({ ...formData, receiptPaperSize: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200"
                  >
                    <option value="80mm">80mm (طابعة كاشير قياسية عريضة)</option>
                    <option value="58mm">58mm (طابعة محمولة بلوتوث صغيرة)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSaveCashierPreferences}
                  className="py-3 px-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  حفظ إعدادات مساحة العمل
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* CASHIER TAB 3: CUSTOM PRIVACY LOCKS (OPTIONAL) */}
        {/* ======================================================== */}
        {!isAdmin && activeTab === 'cashier_security' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-500" />
                  <span>قفل الخصوصية المخصص للكاشير (اختياري)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  بشكل افتراضي، **شاشة الأرباح وشاشة الإعدادات مفتوحتان بدون كلمة مرور**. إذا رغبت في حماية تقاريرك الخاصة أو إعداداتك من تطفل الآخرين عند مغادرة الكاشير، يمكنك تفعيل القفل برمزك السري الخاص.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                {/* Lock 1: Reports & Profits */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        قفل شاشة التقارير والأرباح بكلمة المرور
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {lockReportsWithPin
                        ? '🔒 الشاشة مقفلة بكلمة مرورك الشخصية لحماية أرباحك'
                        : '🔓 الشاشة مفتوحة ومباشرة بدون طلب كلمة مرور (الوضع الافتراضي)'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const updated = !lockReportsWithPin;
                      setLockReportsWithPin(updated);
                    }}
                    className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      lockReportsWithPin
                        ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {lockReportsWithPin ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    <span>{lockReportsWithPin ? 'القفل مفعّل (مقفلة)' : 'مفتوحة بدون قفل'}</span>
                  </button>
                </div>

                {/* Lock 2: Settings */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Settings className="w-4 h-4 text-indigo-600" />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        قفل شاشة الإعدادات بكلمة المرور
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {lockSettingsWithPin
                        ? '🔒 شاشة الإعدادات مقفلة بكلمة مرورك الشخصية'
                        : '🔓 شاشة الإعدادات مفتوحة ومباشرة بدون كلمة مرور (الوضع الافتراضي)'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const updated = !lockSettingsWithPin;
                      setLockSettingsWithPin(updated);
                    }}
                    className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      lockSettingsWithPin
                        ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {lockSettingsWithPin ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    <span>{lockSettingsWithPin ? 'القفل مفعّل (مقفلة)' : 'مفتوحة بدون قفل'}</span>
                  </button>
                </div>
              </div>

              {/* Save Lock Settings */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveCashierPreferences}
                  className="py-3 px-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  حفظ خيارات القفل المخصص
                </button>

                {saveSuccess && (
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-xl">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    {saveSuccessMsg}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ADMIN TAB 1: STORE & RECEIPT SETTINGS */}
        {/* ======================================================== */}
        {isAdmin && activeTab === 'store' && (
          <form onSubmit={handleSaveStoreSettings} className="space-y-4">
            {/* Store Information Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
                <Store className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                هوية المتجر وبيانات الفاتورة
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    اسم المتجر / المحل *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.storeName}
                    onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-bold focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    رقم هاتف المحل
                  </label>
                  <input
                    type="text"
                    value={formData.storePhone}
                    onChange={(e) => setFormData({ ...formData, storePhone: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    رقم واتساب الإدارة (لاستقبال طلبات التفعيل والدعم)
                  </label>
                  <input
                    type="text"
                    value={formData.adminWhatsApp || ''}
                    onChange={(e) => setFormData({ ...formData, adminWhatsApp: e.target.value })}
                    placeholder="مثال: 213555123456 أو 0553514215"
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    عنوان المحل / الولاية
                  </label>
                  <input
                    type="text"
                    value={formData.storeAddress}
                    onChange={(e) => setFormData({ ...formData, storeAddress: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    الرقم الضريبي / السجل التجاري (إن وجد)
                  </label>
                  <input
                    type="text"
                    value={formData.taxRegistrationNumber}
                    onChange={(e) => setFormData({ ...formData, taxRegistrationNumber: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    رمز العملة
                  </label>
                  <select
                    value={formData.currencySymbol}
                    onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-bold focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500"
                  >
                    <option value="د.ج">دينار جزائري (د.ج)</option>
                    <option value="ر.س">ريال سعودي (ر.س)</option>
                    <option value="د.إ">درهم إماراتي (د.إ)</option>
                    <option value="د.ت">دينار تونسي (د.ت)</option>
                    <option value="د.ك">دينار كويتي (د.ك)</option>
                    <option value="ج.م">جنيه مصري (ج.م)</option>
                    <option value="درهم">درهم مغربي</option>
                    <option value="$">دولار ($)</option>
                    <option value="€">يورو (€)</option>
                  </select>
                </div>
              </div>

              {/* Tax Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="enableTax"
                    checked={formData.enableTax}
                    onChange={(e) => setFormData({ ...formData, enableTax: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                  />
                  <label htmlFor="enableTax" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    تفعيل حساب ضريبة القيمة المضافة (VAT / الرسم)
                  </label>
                </div>

                {formData.enableTax && (
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      نسبة الضريبة (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.taxRatePercent}
                      onChange={(e) =>
                        setFormData({ ...formData, taxRatePercent: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Receipt & Thermal Printer Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                تخصيص الإيصال الحراري والطابعة
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    ترويسة الفاتورة (أعلى الوصل)
                  </label>
                  <input
                    type="text"
                    value={formData.receiptHeader}
                    onChange={(e) => setFormData({ ...formData, receiptHeader: e.target.value })}
                    placeholder="أهلاً وسهلاً بكم..."
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    رسالة التذييل (أسفل الوصل)
                  </label>
                  <input
                    type="text"
                    value={formData.receiptFooter}
                    onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
                    placeholder="شكراً لزيارتكم ونتمنى رؤيتكم مجدداً..."
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    مقاس ورق الطابعة الحرارية
                  </label>
                  <select
                    value={formData.receiptPaperSize}
                    onChange={(e) => setFormData({ ...formData, receiptPaperSize: e.target.value as any })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-bold"
                  >
                    <option value="80mm">80mm (طابعة إيصالات كاشير قياسية عريضة)</option>
                    <option value="58mm">58mm (طابعة إيصالات محمولة بلوتوث صغيرة)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    المؤثرات الصوتية للكاشير
                  </label>
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="soundEnabled"
                      checked={formData.soundEnabled}
                      onChange={(e) => setFormData({ ...formData, soundEnabled: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                    />
                    <label
                      htmlFor="soundEnabled"
                      className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-1.5"
                    >
                      <Volume2 className="w-4 h-4 text-emerald-600" />
                      <span>تفعيل صوت التنبيه عند مسح الباركود وإتمام البيع</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                className="py-3 px-6 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-2xl font-bold text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                حفظ بيانات المتجر والوصل
              </button>

              {saveSuccess && (
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {saveSuccessMsg}
                </span>
              )}
            </div>
          </form>
        )}

        {/* ======================================================== */}
        {/* TAB: APPEARANCE & FONTS (SHARED FOR ADMIN & CASHIER) */}
        {/* ======================================================== */}
        {activeTab === 'appearance' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
                <Palette className="w-4 h-4 text-indigo-500" />
                المظهر والوضع الليلي (Dark Mode)
              </h3>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                    {formData.darkMode ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6 text-amber-500" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {formData.darkMode ? 'الوضع الليلي الداكن مفعل' : 'الوضع النهاري الفاتح مفعل'}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      تغيير ثيم التطبيق بالكامل مع دعم التباين العالي وراحة العين
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const newDark = !formData.darkMode;
                    setFormData({ ...formData, darkMode: newDark });
                    StorageService.saveSettings({ ...formData, darkMode: newDark });
                    onUpdateSettings({ ...formData, darkMode: newDark });
                    if (newDark) {
                      document.documentElement.classList.add('dark');
                      document.documentElement.setAttribute('data-font', formData.darkModeFont || 'tajawal');
                    } else {
                      document.documentElement.classList.remove('dark');
                      document.documentElement.setAttribute('data-font', formData.lightModeFont || 'cairo');
                    }
                  }}
                  className={`py-2.5 px-5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs ${
                    formData.darkMode
                      ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                      : 'bg-amber-500 text-slate-950 hover:bg-amber-400 font-black'
                  }`}
                >
                  {formData.darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  <span>{formData.darkMode ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}</span>
                </button>
              </div>

              {/* Fonts Selection */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-3">
                  <Type className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    تخصيص الخطوط العربية المعتمدة
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Light Mode Font Choice */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Sun className="w-4 h-4 text-amber-500" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        خط الوضع النهاري (Light Mode):
                      </span>
                    </div>
                    <select
                      value={formData.lightModeFont || 'cairo'}
                      onChange={(e) => {
                        const newFont = e.target.value as any;
                        setFormData({ ...formData, lightModeFont: newFont });
                        StorageService.saveSettings({ ...formData, lightModeFont: newFont });
                        onUpdateSettings({ ...formData, lightModeFont: newFont });
                        if (!formData.darkMode) {
                          document.documentElement.setAttribute('data-font', newFont);
                        }
                      }}
                      className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 mb-2 cursor-pointer"
                    >
                      <option value="cairo">خط كايرو (Cairo) - حاد وهندسي ممتاز للنهار</option>
                      <option value="alexandria">خط الإسكندرية (Alexandria) - عصري وتطبيقي</option>
                      <option value="almarai">خط المراعي (Almarai) - أنيق ومريح للأرقام</option>
                      <option value="tajawal">خط تجوال (Tajawal) - انسيابي ومتوازن</option>
                      <option value="ibm-plex">خط آي بي إم (IBM Plex Sans) - احترافي تقني</option>
                    </select>
                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs text-center font-bold">
                      معاينة: تجربة الخط العربي في شاشة الكاشير والمبيعات 123456789
                    </div>
                  </div>

                  {/* Dark Mode Font Choice */}
                  <div className="p-4 bg-slate-900 dark:bg-slate-950 border border-slate-700 rounded-2xl text-white">
                    <div className="flex items-center gap-2 mb-2">
                      <Moon className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs font-bold text-slate-200">خط الوضع الليلي (Dark Mode):</span>
                    </div>
                    <select
                      value={formData.darkModeFont || 'tajawal'}
                      onChange={(e) => {
                        const newFont = e.target.value as any;
                        setFormData({ ...formData, darkModeFont: newFont });
                        StorageService.saveSettings({ ...formData, darkModeFont: newFont });
                        onUpdateSettings({ ...formData, darkModeFont: newFont });
                        if (formData.darkMode) {
                          document.documentElement.setAttribute('data-font', newFont);
                        }
                      }}
                      className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-indigo-500 mb-2 cursor-pointer"
                    >
                      <option value="tajawal">خط تجوال (Tajawal) - فائق الوضوح ومريح للعين ليلاً</option>
                      <option value="ibm-plex">خط آي بي إم (IBM Plex Sans) - دقة عالية بدون وهج</option>
                      <option value="alexandria">خط الإسكندرية (Alexandria) - واضح على الشاشات الداكنة</option>
                      <option value="almarai">خط المراعي (Almarai) - تناسق مثالي</option>
                      <option value="cairo">خط كايرو (Cairo) - خط كلاسيكي بارز</option>
                    </select>
                    <div className="p-2.5 bg-slate-800/90 rounded-xl border border-slate-700 text-slate-200 text-xs text-center font-bold">
                      معاينة: تجربة الخط العربي على الشاشات المظلمة 123456789
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ADMIN TAB 3: ADMIN & USERS CONTROL PANEL (ADMIN ONLY) */}
        {/* ======================================================== */}
        {isAdmin && activeTab === 'admin_panel' && (
          <div className="space-y-4">
            {/* Admin Header Hero Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-indigo-950 text-white rounded-3xl p-5 shadow-lg border border-purple-800/40 relative overflow-hidden">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-amber-400/20 text-amber-300 rounded-xl border border-amber-400/30">
                      <Crown className="w-5 h-5" />
                    </span>
                    <h3 className="text-base font-black text-white">
                      لوحة تحكم المدير العام (صلاحيات كاملة وتحكم بالمستخدمين)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                    من هنا يمكنك التحكم في كامل النظام، إضافة مستخدمين وكاشير جدد، متابعة وتعديل بياناتهم، ورؤية أو تعديل كلمات المرور والرموز السرية بضغطة زر.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleOpenAddUser}
                  className="py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-md transition-all whitespace-nowrap cursor-pointer shrink-0"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ إضافة مستخدم أو كاشير جديد</span>
                </button>
              </div>

              {/* System Quick Stats Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5 pt-4 border-t border-purple-800/40 text-xs">
                <div className="bg-white/10 backdrop-blur-xs p-2.5 rounded-2xl border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-300" />
                    <span className="text-[11px] font-bold text-slate-300">المستخدمين:</span>
                  </div>
                  <span className="font-mono font-black text-white text-sm">{users.length}</span>
                </div>

                <div className="bg-white/10 backdrop-blur-xs p-2.5 rounded-2xl border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-[11px] font-bold text-slate-300">حسابات نشطة:</span>
                  </div>
                  <span className="font-mono font-black text-emerald-300 text-sm">{activeUsersCount}</span>
                </div>

                <div className="bg-white/10 backdrop-blur-xs p-2.5 rounded-2xl border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-300" />
                    <span className="text-[11px] font-bold text-slate-300">السلع بالمخزن:</span>
                  </div>
                  <span className="font-mono font-black text-cyan-200 text-sm">{allProducts.length}</span>
                </div>

                <div className="bg-white/10 backdrop-blur-xs p-2.5 rounded-2xl border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-300" />
                    <span className="text-[11px] font-bold text-slate-300">إجمالي الفواتير:</span>
                  </div>
                  <span className="font-mono font-black text-amber-200 text-sm">{allSales.length}</span>
                </div>
              </div>
            </div>

            {/* Users Accounts List & Passwords Control */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span>سجل الحسابات، الصلاحيات، وكلمات المرور</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    اضغط على أيقونة العين 👁️ لإظهار كلمة المرور أو نسخها مباشرة
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {/* Search users input */}
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="بحث باسم الحساب أو الهاتف..."
                    className="w-full sm:w-56 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-purple-500 font-bold"
                  />

                  <span className="text-[11px] font-bold px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                    {users.length} مستخدم
                  </span>
                </div>
              </div>

              {/* Users Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {users
                  .filter(
                    (u) =>
                      u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                      (u.phone && u.phone.includes(userSearchQuery))
                  )
                  .map((u) => {
                  const isEyeOpen = Boolean(visiblePasswords[u.id]);
                  const displayPassword =
                    u.plainPin ||
                    (u.id === 'user_admin'
                      ? 'oussama12$'
                      : u.id === 'user_cashier1'
                      ? '000000'
                      : '111111');
                  const isCurrent = u.id === currentUser.id;

                  return (
                    <div
                      key={u.id}
                      className={`p-4 rounded-3xl border flex flex-col justify-between transition-all relative overflow-hidden ${
                        u.isActive === false
                          ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60 opacity-85'
                          : u.role === 'admin'
                          ? 'bg-purple-50/40 dark:bg-purple-950/20 border-purple-200/80 dark:border-purple-800/50 shadow-xs'
                          : 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80'
                      }`}
                    >
                      {/* Top Badges */}
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl p-1 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                              {u.avatar || (u.role === 'admin' ? '👑' : '👨‍💻')}
                            </span>
                            <div>
                              <h5 className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                <span>{u.name}</span>
                                {isCurrent && (
                                  <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.2 rounded-md">
                                    أنت
                                  </span>
                                )}
                              </h5>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                                  u.role === 'admin'
                                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300'
                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300'
                                }`}
                              >
                                {u.role === 'admin' ? '👑 مدير عام (صلاحيات كاملة)' : '👨‍💻 كاشير (مبيعات)'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                                u.isActive !== false
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              }`}
                            >
                              {u.isActive !== false ? 'مفعل' : 'موقوف'}
                            </span>
                          </div>
                        </div>

                        {/* Account Details */}
                        <div className="mt-3.5 space-y-2 bg-white dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 text-xs">
                          {/* Phone / Login */}
                          <div className="flex items-center justify-between gap-1 text-slate-600 dark:text-slate-300">
                            <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>رقم الدخول:</span>
                            </span>
                            <span className="font-mono font-bold text-slate-900 dark:text-slate-100" dir="ltr">
                              {u.phone || '0550000000'}
                            </span>
                          </div>

                          {/* Password with Eye Toggle */}
                          <div className="flex items-center justify-between gap-1 text-slate-600 dark:text-slate-300 pt-1.5 border-t border-slate-100 dark:border-slate-700">
                            <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                              <KeyRound className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              <span>كلمة المرور:</span>
                            </span>

                            <div className="flex items-center gap-1.5">
                              {/* Password Text or Mask */}
                              <div
                                className="font-mono font-black text-xs px-2 py-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 min-w-[5rem] text-center"
                                dir="ltr"
                              >
                                {isEyeOpen ? (
                                  <span className="text-emerald-700 dark:text-emerald-400 select-all">
                                    {displayPassword}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 tracking-widest text-[11px]">
                                    ••••••••
                                  </span>
                                )}
                              </div>

                              {/* Eye Button */}
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(u.id)}
                                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                                title={isEyeOpen ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور (عين)'}
                              >
                                {isEyeOpen ? (
                                  <EyeOff className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                ) : (
                                  <Eye className="w-4 h-4 text-slate-500 hover:text-slate-900" />
                                )}
                              </button>

                              {/* Copy Button */}
                              <button
                                type="button"
                                onClick={() => handleCopyPassword(u.id, displayPassword)}
                                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                                title="نسخ كلمة المرور"
                              >
                                {copiedUserId === u.id ? (
                                  <Check className="w-4 h-4 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5 pt-3 mt-3 border-t border-slate-200/60 dark:border-slate-700/60">
                        {/* Quick Reset Pin Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setResetPinModalUser(u);
                            setQuickNewPin('');
                          }}
                          className="flex-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 dark:text-emerald-300 rounded-xl text-[11px] font-bold border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        >
                          <KeyRound className="w-3 h-3" />
                          <span>تغيير الرمز</span>
                        </button>

                        {/* Edit User Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditUser(u)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-xl transition-colors cursor-pointer"
                          title="تعديل بيانات الحساب"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Toggle Active/Inactive */}
                        <button
                          type="button"
                          onClick={() => handleToggleUserActive(u)}
                          disabled={u.id === currentUser.id}
                          className={`p-1.5 rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                            u.isActive !== false
                              ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          }`}
                          title={u.isActive !== false ? 'إيقاف الحساب مؤقتاً' : 'تفعيل الحساب'}
                        >
                          {u.isActive !== false ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        </button>

                        {/* Delete User */}
                        {u.id !== 'user_admin' && u.id !== currentUser.id && (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 rounded-xl transition-colors cursor-pointer"
                            title="حذف الحساب نهائياً"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ADMIN TAB 4: BACKUP & DATA RESTORATION (ADMIN ONLY) */}
        {/* ======================================================== */}
        {isAdmin && activeTab === 'backup' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-500" />
                النسخ الاحتياطي وحفظ بيانات الكشك
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Export Backup Card */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Download className="w-4 h-4 text-emerald-600" />
                      تصدير وحفظ نسخة احتياطية
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      تنزيل ملف JSON يحتوي على كامل قاعدة بيانات الكشك (السلع، المبيعات، العملاء والديون، والمصروفات).
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleExportBackup}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>تحميل نسخة احتياطية الآن</span>
                  </button>
                </div>

                {/* Import Backup Card */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Upload className="w-4 h-4 text-blue-600" />
                      استعادة نسخة سابقة
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      رفع ملف JSON تم تصديره مسبقاً لاستعادة كافة البيانات إلى هذا الجهاز أو جهاز آخر.
                    </p>
                  </div>

                  <label className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer text-center">
                    <Upload className="w-4 h-4" />
                    <span>اختيار ملف واستعادة البيانات</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportBackup}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Clean Slate - Wipe All Data to Zero */}
              <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    تفريغ وتصفير المتجر للبدء من الصفر (0 منتجات، 0 عملاء، 0 ديون)
                  </h4>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                    يجعل المتجر نظيفاً وفارغاً بنسبة 100% لتتمكن من إدخال أصنافك ومنتجاتك وعملائك الحقيقيين.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleClearStoreCleanSlate}
                  className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs whitespace-nowrap cursor-pointer transition-all flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>تصفير المتجر والبدء نظيفاً</span>
                </button>
              </div>

              {/* Load Sample Demo Products (Optional) */}
              <div className="p-4 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    تحميل نموذج أصناف تجريبية للأكشاك (اختياري)
                  </h4>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">
                    إدراج قائمة منتجات جاهزة (فليكسي، سجائر، مكسرات، إكسسوارات) لتجربة النظام وسرعة البيع.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleLoadSampleProducts}
                  className="py-2.5 px-4 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs whitespace-nowrap cursor-pointer transition-all flex items-center justify-center gap-1.5"
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>تحميل أصناف نموذجية</span>
                </button>
              </div>

              {/* Reset Demo Data Danger Zone */}
              <div className="p-4 bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    إعادة ضبط المصنع واستعادة التهيئة
                  </h4>
                  <p className="text-[11px] text-rose-600 dark:text-rose-400">
                    سيتم استبدال البيانات الحالية بالتهيئة الافتراضية مع الحفاظ على حساب المدير العام.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleResetDemo}
                  className="py-2 px-4 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-xs whitespace-nowrap cursor-pointer transition-colors"
                >
                  إعادة تهيئة النظام
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: COMPREHENSIVE GUIDE & SYSTEM MANUAL (SHARED) */}
        {/* ======================================================== */}
        {activeTab === 'guide' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>دليل المستخدم الشامل وطرق التشغيل الاحترافية</span>
                </h3>

                {/* Category Switcher Tabs */}
                <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl text-xs">
                  <button
                    type="button"
                    onClick={() => setGuideCategory('cashier')}
                    className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                      guideCategory === 'cashier'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    👨‍💻 دليل التشغيل والكاشير
                  </button>

                  <button
                    type="button"
                    onClick={() => setGuideCategory('shortcuts')}
                    className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                      guideCategory === 'shortcuts'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    ⌨️ الاختصارات والعمل بدون إنترنت
                  </button>

                  <button
                    type="button"
                    onClick={() => setGuideCategory('faq')}
                    className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                      guideCategory === 'faq'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    ❓ أسئلة شائعة
                  </button>
                </div>
              </div>

              {/* GUIDE CONTENT 1: CASHIER */}
              {guideCategory === 'cashier' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <ShoppingBag className="w-4 h-4 text-emerald-600" />
                      <span>1. البيع السريع وإضافة السلع</span>
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed space-y-1">
                      <span className="block">• <strong>النقر المباشر:</strong> اضغط على أي بطاقة منتج في شاشة البيع لإضافته فوراً للسلة.</span>
                      <span className="block">• <strong>الماسح الضوئي (الباركود):</strong> استخدم قارئ الباركود اليدوي المتصل عبر USB/Bluetooth أو كاميرا الجهاز لإضافة السلعة تلقائياً.</span>
                      <span className="block">• <strong>البحث الفوري:</strong> اكتب اسم السلعة أو جزءاً منه في شريط البحث بالأعلى لتظهر مباشرة.</span>
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>2. بيع السجائر والتبغ (بالعلبة / بالحبة)</span>
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed space-y-1">
                      <span className="block">• عند الضغط على أي صنف سجائر أو شمة، تفتح نافذة الاختيار الذكي:</span>
                      <span className="block">• خيار <strong>"علبة كاملة"</strong> بسعر الباكي الافتراضي.</span>
                      <span className="block">• خيار <strong>"بالحبة"</strong> لحساب السعر الفردي تلقائياً وخصم رصيد المخزن بدقة متناهية.</span>
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-blue-600" />
                      <span>3. بيع المكسرات والحلويات بالوزن (الميزان)</span>
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed space-y-1">
                      <span className="block">• انقر على أيقونة الميزان ⚖️ لحساب السعر بالجرام أو بالمبلغ المطلوب مباشرة (مثال: طلب العميل 200 د.ج لوز أو 150 غرام كاوكاو).</span>
                      <span className="block">• يحسب النظام الإجمالي ويضيفه للفاتورة بضغطة واحدة.</span>
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-purple-600" />
                      <span>4. تعليق الطلبات والديون والكريدي</span>
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed space-y-1">
                      <span className="block">• <strong>تعليق السلة (Hold):</strong> يمكنك حفظ سلة زبون معلقة وخدمة زبون آخر ثم استعادتها فوراً.</span>
                      <span className="block">• <strong>البيع بالكريدي:</strong> اختر اسم العميل من قائمة الكريدي لتسجيل الفاتورة على حسابه وتحديث مديونيته تلقائياً.</span>
                    </p>
                  </div>
                </div>
              )}

              {/* GUIDE CONTENT 3: SHORTCUTS & OFFLINE */}
              {guideCategory === 'shortcuts' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Monitor className="w-4 h-4 text-indigo-600" />
                      <span>1. اختصارات لوحة المفاتيح السريعة</span>
                    </h4>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-2">
                      <div className="flex items-center justify-between p-1.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                        <span>إتمام الفاتورة نقداً والطباعة:</span>
                        <kbd className="font-mono font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-emerald-600">Enter / F12</kbd>
                      </div>
                      <div className="flex items-center justify-between p-1.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                        <span>التركيز في شريط البحث السريع:</span>
                        <kbd className="font-mono font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-blue-600">F2 / Ctrl+F</kbd>
                      </div>
                      <div className="flex items-center justify-between p-1.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                        <span>إلغاء أو تفريغ السلة الحالية:</span>
                        <kbd className="font-mono font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-rose-600">Escape</kbd>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-emerald-600" />
                      <span>2. العمل بدون إنترنت وتثبيت التطبيق (PWA)</span>
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed space-y-1">
                      <span className="block">• البرنامج يعمل <strong>100% بدون اتصال بالإنترنت (Offline First)</strong> على جميع الهواتف والحواسيب والشاشات اللمسية.</span>
                      <span className="block">• يمكنك الضغط على خيار <strong>"إضافة إلى الشاشة الرئيسية"</strong> في متصفح كروم أو سفاري ليعمل كتطبيق أصلي ومستقل.</span>
                      <span className="block">• دعم الطابعات الحرارية عبر USB و Bluetooth وشبكة Wi-Fi المحلية.</span>
                    </p>
                  </div>
                </div>
              )}

              {/* GUIDE CONTENT 4: FAQ */}
              {guideCategory === 'faq' && (
                <div className="space-y-3">
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-1.5">
                      <span className="text-emerald-600 font-black">س:</span>
                      كيف أربط طابعة الفواتير الحرارية (بلوتوث أو USB)؟
                    </h5>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      ج: من تبويب الإعدادات اختر "الأصوات والطابعة"، ثم اضغط "اختيار طابعة Bluetooth/USB" للاتصال المباشر، أو اختر خيار الطباعة القياسي (ESC/POS) المتوافق مع كافة الطابعات الحرارية مقاس 58mm و 80mm.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-1.5">
                      <span className="text-emerald-600 font-black">س:</span>
                      نسيت كلمة مرور حساب كاشير، كيف أسترجعها؟
                    </h5>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      ج: يسجل المدير الدخول بحساب المدير العام، ثم يفتح تبويب "لوحة تحكم المدير"، ويضغط على أيقونة العين 👁️ بجوار الحساب لرؤية كلمة المرور أو يضغط على زر "تغيير الرمز" لتعيين كلمة مرور جديدة فوراً.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-1.5">
                      <span className="text-emerald-600 font-black">س:</span>
                      هل يمكن تعديل بيانات المتجر واسم الكشك من حساب الكاشير؟
                    </h5>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      ج: نعم، من تبويب "بيانات المتجر والملف الشخصي" في حساب الكاشير، يمكنك تعديل اسم الكشك، رقم الهاتف، العنوان، ورسالة أسفل الوصل المطبوع، ثم الضغط على "حفظ وتطبيق".
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL: DELETE USER CONFIRMATION (ADMIN ONLY) */}
      {/* ======================================================== */}
      {userToDelete && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 select-none animate-fadeIn">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-rose-200 dark:border-rose-900/60 overflow-hidden">
            <div className="bg-gradient-to-r from-rose-950 via-rose-900 to-red-950 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-rose-800/50 rounded-xl">
                  <Trash2 className="w-5 h-5 text-rose-300" />
                </span>
                <div>
                  <h4 className="text-xs font-black">تأكيد حذف الحساب نهائياً</h4>
                  <p className="text-[10px] text-rose-200">إجراء أمني لا يمكن التراجع عنه</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="text-white/80 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-center">
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/40 rounded-3xl border border-rose-200 dark:border-rose-900/60 flex items-center justify-center text-3xl mx-auto shadow-inner">
                {userToDelete.avatar || '👨‍💻'}
              </div>

              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                  هل أنت متأكد من حذف حساب "{userToDelete.name}"؟
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  رقم الدخول: <span className="font-mono font-bold text-slate-700 dark:text-slate-200">{userToDelete.phone}</span>
                </p>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 text-right">
                ⚠️ تنبيه: سيتم حذف بيانات هذا المستخدم نهائياً من قاعدة البيانات المحلية ولن يتمكن من تسجيل الدخول مرة أخرى.
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleConfirmDeleteUser}
                  className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md transition-colors cursor-pointer"
                >
                  نعم، احذف الحساب الآن
                </button>
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  className="py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD / EDIT USER (ADMIN ONLY) */}
      {/* ======================================================== */}
      {userModalOpen && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 select-none">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-indigo-950 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-white/10 rounded-xl">
                  <UserPlus className="w-5 h-5 text-emerald-400" />
                </span>
                <div>
                  <h3 className="text-sm font-black">
                    {selectedUserForEdit ? 'تعديل بيانات المستخدم' : 'إضافة مستخدم / كاشير جديد'}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    {selectedUserForEdit ? `تعديل الحساب "${selectedUserForEdit.name}"` : 'إنشاء حساب جديد وتسجيل رقم الدخول وكلمة المرور'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setUserModalOpen(false)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUserForm} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  اسم المستخدم / الكاشير *
                </label>
                <input
                  type="text"
                  required
                  value={modalName}
                  onChange={(e) => setModalName(e.target.value)}
                  placeholder="مثال: أحمد عبد الله (كاشير المساء)"
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  رقم الهاتف (يُستخدم للدخول إلى النظام) *
                </label>
                <input
                  type="text"
                  required
                  value={modalPhone}
                  onChange={(e) => setModalPhone(e.target.value)}
                  placeholder="مثال: 0550000000"
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  نوع الصلاحية والحساب *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setModalRole('cashier')}
                    className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      modalRole === 'cashier'
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-300 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span>👨‍💻 كاشير (مبيعات)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalRole('admin')}
                    className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      modalRole === 'admin'
                        ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-500 text-purple-700 dark:text-purple-300 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Crown className="w-3.5 h-3.5 text-amber-500" />
                    <span>👑 مدير عام</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  كلمة المرور / الرمز السري (PIN) *
                </label>
                <div className="relative flex items-center">
                  <input
                    type={modalShowPin ? 'text' : 'password'}
                    required={!selectedUserForEdit}
                    value={modalPin}
                    onChange={(e) => setModalPin(e.target.value)}
                    placeholder={selectedUserForEdit ? 'اتركه فارغاً إذا لم ترغب في التغيير' : 'مثال: 123456'}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 pl-10"
                  />
                  <button
                    type="button"
                    onClick={() => setModalShowPin(!modalShowPin)}
                    className="absolute left-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                  >
                    {modalShowPin ? <EyeOff className="w-4 h-4 text-emerald-600" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  4 خانات على الأقل (أرقام أو حروف).
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition-colors cursor-pointer"
                >
                  {selectedUserForEdit ? 'حفظ التعديلات' : 'إضافة الحساب الآن'}
                </button>

                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: QUICK RESET PIN (ADMIN ONLY) */}
      {/* ======================================================== */}
      {resetPinModalUser && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 select-none">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="bg-slate-900 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-emerald-400" />
                <h4 className="text-xs font-bold">تغيير كلمة مرور {resetPinModalUser.name}</h4>
              </div>
              <button
                type="button"
                onClick={() => setResetPinModalUser(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickResetPin} className="p-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  كلمة المرور / الرمز الجديد (PIN):
                </label>
                <div className="relative flex items-center">
                  <input
                    type={quickShowPin ? 'text' : 'password'}
                    required
                    autoFocus
                    value={quickNewPin}
                    onChange={(e) => setQuickNewPin(e.target.value)}
                    placeholder="مثال: 123456"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 pl-10"
                  />
                  <button
                    type="button"
                    onClick={() => setQuickShowPin(!quickShowPin)}
                    className="absolute left-2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {quickShowPin ? <EyeOff className="w-4 h-4 text-emerald-600" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  تحديث كلمة المرور
                </button>
                <button
                  type="button"
                  onClick={() => setResetPinModalUser(null)}
                  className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

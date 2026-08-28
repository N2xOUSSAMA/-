import React, { useState, useEffect } from 'react';
import { Expense, Product, Sale, StoreSettings, User, ShiftLog } from '../../types';
import { StorageService } from '../../services/storage';
import {
  TrendingUp,
  DollarSign,
  PieChart,
  ShoppingBag,
  CreditCard,
  Banknote,
  Clock,
  Plus,
  Trash2,
  Printer,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Receipt,
  X,
  ArrowRight,
  User as UserIcon,
  Users,
  CheckCircle2,
  Filter,
  FileSpreadsheet,
  FileDown,
  Download,
  FileText,
  Eye,
  Store,
} from 'lucide-react';

interface ReportsViewProps {
  currentUser: User;
  settings: StoreSettings;
  onRefreshData?: () => void;
  onBackToPOS?: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  currentUser,
  settings,
  onRefreshData,
  onBackToPOS,
}) => {
  const isAdmin = currentUser.role === 'admin';
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('today');

  // Cashier filter: 'all' for admin (or specific userId), or locked to currentUser.id for cashiers
  const [selectedCashierId, setSelectedCashierId] = useState<string>(
    isAdmin ? 'all' : currentUser.id
  );

  // Add Expense Modal
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState<boolean>(false);
  const [expenseTitle, setExpenseTitle] = useState<string>('');
  const [expenseAmount, setExpenseAmount] = useState<number>(0);
  const [expenseCategory, setExpenseCategory] = useState<string>('فواتير ومرافق');
  const [expenseNotes, setExpenseNotes] = useState<string>('');

  // Daily Shift / Z-Report Modal
  const [isZReportOpen, setIsZReportOpen] = useState<boolean>(false);
  const [openingCash, setOpeningCash] = useState<number>(1000);

  // PDF Report Modal
  const [isPDFReportOpen, setIsPDFReportOpen] = useState<boolean>(false);

  // Invoice Detail Modal
  const [selectedInvoice, setSelectedInvoice] = useState<Sale | null>(null);

  // Export success flash alert
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const loadData = () => {
    setSales(StorageService.getSales());
    setExpenses(StorageService.getExpenses());
    setProducts(StorageService.getProducts());
    setAllUsers(StorageService.getUsers());
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseTitle.trim() || expenseAmount <= 0) return;

    const newExp: Expense = {
      id: 'exp_' + Date.now(),
      title: expenseTitle.trim(),
      amount: Number(expenseAmount),
      category: expenseCategory,
      date: new Date().toISOString().split('T')[0],
      notes: expenseNotes.trim(),
      recordedBy: currentUser.name,
    };

    const updated = [newExp, ...expenses];
    setExpenses(updated);
    StorageService.saveExpenses(updated);
    StorageService.playSuccessBeep();
    setExpenseTitle('');
    setExpenseAmount(0);
    setExpenseNotes('');
    setIsAddExpenseOpen(false);
  };

  const handleDeleteExpense = (id: string) => {
    if (confirm('هل تود حذف هذا المصروف؟')) {
      const updated = expenses.filter((e) => e.id !== id);
      setExpenses(updated);
      StorageService.saveExpenses(updated);
    }
  };

  // Date filtering
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Target cashier for filtering
  const activeFilterUser = allUsers.find((u) => u.id === selectedCashierId);

  const filteredSales = sales.filter((s) => {
    if (s.status === 'refunded') return false;

    // Filter by cashier if selected or if user is cashier
    if (!isAdmin || selectedCashierId !== 'all') {
      const targetUser = activeFilterUser || currentUser;
      const matchesCashierId = s.cashierId === targetUser.id;
      const matchesCashierName = s.cashierName === targetUser.name;
      if (!matchesCashierId && !matchesCashierName) {
        return false;
      }
    }

    const sDate = new Date(s.date);
    const sDateStr = s.date.split('T')[0];
    if (timeRange === 'today') return sDateStr === todayStr;
    if (timeRange === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      return sDate >= weekAgo;
    }
    if (timeRange === 'month') {
      const monthAgo = new Date();
      monthAgo.setDate(now.getDate() - 30);
      return sDate >= monthAgo;
    }
    return true;
  });

  const filteredExpenses = expenses.filter((e) => {
    if (timeRange === 'today') return e.date === todayStr;
    if (timeRange === 'week') {
      const expDate = new Date(e.date);
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      return expDate >= weekAgo;
    }
    if (timeRange === 'month') {
      const expDate = new Date(e.date);
      const monthAgo = new Date();
      monthAgo.setDate(now.getDate() - 30);
      return expDate >= monthAgo;
    }
    return true;
  });

  // KPI Calculations
  const totalRevenue = filteredSales.reduce((sum, s) => sum + s.grandTotal, 0);
  const grossProfit = filteredSales.reduce((sum, s) => sum + s.profitTotal, 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = grossProfit - (isAdmin && selectedCashierId === 'all' ? totalExpenses : 0);
  const invoicesCount = filteredSales.length;
  const averageInvoiceValue = invoicesCount > 0 ? totalRevenue / invoicesCount : 0;

  // Breakdown by payment method
  const cashSalesTotal = filteredSales
    .filter((s) => s.paymentMethod === 'cash')
    .reduce((sum, s) => sum + s.paidAmount, 0);

  const cardSalesTotal = filteredSales
    .filter((s) => s.paymentMethod === 'card')
    .reduce((sum, s) => sum + s.grandTotal, 0);

  const debtSalesTotal = filteredSales
    .filter((s) => s.paymentMethod === 'debt')
    .reduce((sum, s) => sum + (s.grandTotal - s.paidAmount), 0);

  const transferSalesTotal = filteredSales
    .filter((s) => s.paymentMethod === 'transfer')
    .reduce((sum, s) => sum + s.grandTotal, 0);

  // Best selling products calculation for this filtered selection
  const productSalesMap: { [prodId: string]: { name: string; qty: number; total: number } } = {};
  filteredSales.forEach((sale) => {
    sale.items.forEach((item) => {
      if (!productSalesMap[item.productId]) {
        productSalesMap[item.productId] = { name: item.name, qty: 0, total: 0 };
      }
      productSalesMap[item.productId].qty += item.quantity;
      productSalesMap[item.productId].total += item.total;
    });
  });

  const topProducts = Object.values(productSalesMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  const timeRangeLabelAr =
    timeRange === 'today'
      ? 'اليوم'
      : timeRange === 'week'
      ? 'آخر 7 أيام'
      : timeRange === 'month'
      ? 'آخر 30 يوم'
      : 'كامل السجل';

  const activeCashierName =
    !isAdmin || selectedCashierId !== 'all'
      ? activeFilterUser?.name || currentUser.name
      : 'جميع الكاشيرات (إجمالي المتجر)';

  // Export CSV Function (with UTF-8 BOM for Arabic support)
  const handleExportCSV = () => {
    const lines: string[] = [];

    // 1. Report Metadata
    lines.push(`"تقرير المبيعات والأرباح - ${settings.storeName}"`);
    lines.push(`"الفترة الزمنية:","${timeRangeLabelAr}"`);
    lines.push(`"الحساب / الكاشير:","${activeCashierName}"`);
    lines.push(`"تاريخ ووقت الاستخراج:","${new Date().toLocaleString('ar-DZ')}"`);
    lines.push(`"العملة المستخدمة:","${settings.currencySymbol}"`);
    lines.push('');

    // 2. Financial KPIs
    lines.push('=== الملخص المالي والمؤشرات الرئيسية ===');
    lines.push('المؤشر,القيمة,العملة / الوحدة');
    lines.push(`إجمالي المبيعات,${totalRevenue.toFixed(2)},${settings.currencySymbol}`);
    lines.push(`صافي الأرباح المحققة,${grossProfit.toFixed(2)},${settings.currencySymbol}`);
    lines.push(`إجمالي المصروفات,${totalExpenses.toFixed(2)},${settings.currencySymbol}`);
    lines.push(`صافي الربح بعد المصاريف,${netProfit.toFixed(2)},${settings.currencySymbol}`);
    lines.push(`الكاش النقدي المحصل بالدرج,${cashSalesTotal.toFixed(2)},${settings.currencySymbol}`);
    lines.push(`مبيعات البطاقة البنكية,${cardSalesTotal.toFixed(2)},${settings.currencySymbol}`);
    lines.push(`مبيعات الآجل (الديون والكريدي),${debtSalesTotal.toFixed(2)},${settings.currencySymbol}`);
    lines.push(`مبيعات التحويل البنكي,${transferSalesTotal.toFixed(2)},${settings.currencySymbol}`);
    lines.push(`إجمالي عدد الفواتير,${invoicesCount},فاتورة`);
    lines.push(`متوسط قيمة الفاتورة,${averageInvoiceValue.toFixed(2)},${settings.currencySymbol}`);
    lines.push('');

    // 3. Sales & Invoices Breakdown
    lines.push('=== سجل فواتير المبيعات التفصيلية ===');
    lines.push('رقم الفاتورة,التاريخ والوقت,الكاشير,طريقة الدفع,عدد الأصناف,إجمالي الفاتورة,الربح المحقق,المبلغ المدفوع,المتبقي آجل,حالة الدفع');
    filteredSales.forEach((s) => {
      const dateFormatted = s.date.replace('T', ' ').substring(0, 19);
      const paymentMethodAr =
        s.paymentMethod === 'cash'
          ? 'نقداً'
          : s.paymentMethod === 'card'
          ? 'بطاقة بنكية'
          : s.paymentMethod === 'debt'
          ? 'آجل (كريدي)'
          : 'تحويل بنكي';
      const itemsCount = s.items.reduce((sum, item) => sum + item.quantity, 0);
      const remainingDebt = Math.max(0, s.grandTotal - s.paidAmount);
      const paymentStatus = s.paymentMethod === 'debt' && remainingDebt > 0 ? 'غير مسدد كامل' : 'مسدد بالكامل';
      lines.push(`"${s.id}","${dateFormatted}","${s.cashierName || 'كاشير'}","${paymentMethodAr}",${itemsCount},${s.grandTotal.toFixed(2)},${s.profitTotal.toFixed(2)},${s.paidAmount.toFixed(2)},${remainingDebt.toFixed(2)},"${paymentStatus}"`);
    });
    lines.push('');

    // 4. Expenses Breakdown
    lines.push('=== سجل المصروفات والنفقات ===');
    lines.push('رقم المصروف,التاريخ,بيان المصروف,التصنيف,المسجل,المبلغ,ملاحظات');
    filteredExpenses.forEach((exp) => {
      lines.push(`"${exp.id}","${exp.date}","${(exp.title || '').replace(/"/g, '""')}","${exp.category}","${exp.recordedBy || 'المسؤول'}",${exp.amount.toFixed(2)},"${(exp.notes || '').replace(/"/g, '""')}"`);
    });
    lines.push('');

    // 5. Top Products
    lines.push('=== أكثر المنتجات مبيعاً بالفترة ===');
    lines.push('الترتيب,اسم المنتج,الكمية المباعة (قطعة),إجمالي قيمة المبيعات');
    topProducts.forEach((p, idx) => {
      lines.push(`${idx + 1},"${p.name.replace(/"/g, '""')}",${p.qty},${p.total.toFixed(2)}`);
    });

    const csvContent = '\uFEFF' + lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateFileStr = new Date().toISOString().split('T')[0];
    link.download = `تقرير_المبيعات_والأرباح_${timeRange}_${dateFileStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportNotice('تم تصدير ملف CSV بنجاح! يمكنك فتحه في Excel وجداول البيانات.');
    setTimeout(() => setExportNotice(null), 4000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-100 dark:bg-slate-950 overflow-hidden select-none">
      {/* Header */}
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
              <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              {!isAdmin || selectedCashierId !== 'all'
                ? `تقرير مبيعات وأرباح: ${activeFilterUser?.name || currentUser.name}`
                : 'التقارير المالية والأرباح وسير العمل'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {!isAdmin
                ? `يتم احتساب أرباح ومبيعات حسابك (${currentUser.name}) وصندوقك النقدي بشكل مستقل ومباشر`
                : 'لوحة قياس الأداء المالي، تتبع أرباح المبيعات، وإغلاق الصندوق اليومي'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Admin Cashier Selector Filter */}
          {isAdmin && (
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <Users className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span className="font-bold text-slate-600 dark:text-slate-300">عرض أرباح:</span>
              <select
                value={selectedCashierId}
                onChange={(e) => setSelectedCashierId(e.target.value)}
                className="bg-white dark:bg-slate-900 font-bold text-slate-900 dark:text-slate-100 rounded-lg px-2 py-1 border border-slate-200 dark:border-slate-700 text-xs cursor-pointer focus:outline-none"
              >
                <option value="all">جميع الحسابات (إجمالي المتجر)</option>
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.role === 'admin' ? '👑 ' : '👨‍💻 '} {u.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Time Range Selector */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <button
              onClick={() => setTimeRange('today')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                timeRange === 'today'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              اليوم
            </button>
            <button
              onClick={() => setTimeRange('week')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                timeRange === 'week'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              الأسبوع
            </button>
            <button
              onClick={() => setTimeRange('month')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                timeRange === 'month'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              الشهر
            </button>
            <button
              onClick={() => setTimeRange('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                timeRange === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              الكل
            </button>
          </div>

          {/* Export & Actions */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleExportCSV}
              className="py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              title="تصدير بيانات وأرباح الفترة كملف Excel / CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>تصدير CSV</span>
            </button>

            <button
              onClick={() => setIsPDFReportOpen(true)}
              className="py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:hover:bg-blue-900 dark:text-blue-300 border border-blue-300 dark:border-blue-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              title="توليد تقرير مالي رسمي بصيغة PDF / طباعة A4"
            >
              <FileDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>تقرير PDF</span>
            </button>

            <button
              onClick={() => setIsZReportOpen(true)}
              className="py-2 px-3 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Receipt className="w-3.5 h-3.5 text-emerald-400" />
              <span>إغلاق الصندوق (Z)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-4 max-w-7xl mx-auto w-full">
        {/* Flash notice on export */}
        {exportNotice && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 rounded-2xl text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{exportNotice}</span>
            </div>
            <button
              onClick={() => setExportNotice(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
            >
              ✕
            </button>
          </div>
        )}
        {/* Banner for Cashier or Specific Filter */}
        {(!isAdmin || selectedCashierId !== 'all') && (
          <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white p-3.5 rounded-3xl border border-emerald-800/40 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-xl">
                {activeFilterUser?.avatar || currentUser.avatar || '👨‍💻'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-black text-white">
                    حساب الكاشير المستقل: {activeFilterUser?.name || currentUser.name}
                  </h3>
                  <span className="text-[10px] bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 px-2 py-0.2 rounded-full font-bold">
                    حساب أرباح مستقل
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  جميع الأرقام أدناه محسوبة خصيصاً لمبيعات وأرباح وصندوق هذا الحساب فقط.
                </p>
              </div>
            </div>

            {isAdmin && selectedCashierId !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedCashierId('all')}
                className="py-1.5 px-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[11px] font-bold transition-colors cursor-pointer"
              >
                العودة لإجمالي المتجر
              </button>
            )}
          </div>
        )}

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Revenue */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {!isAdmin || selectedCashierId !== 'all' ? 'مبيعاتك المحققة' : 'إجمالي المبيعات'}
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-950 dark:text-slate-100 font-mono mt-2">
              {totalRevenue.toLocaleString()}
              <span className="text-xs font-sans font-bold text-slate-400 mr-1">
                {settings.currencySymbol}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              من {invoicesCount} فاتورة (معدل {averageInvoiceValue.toFixed(0)} {settings.currencySymbol})
            </div>
          </div>

          {/* Profits (OPEN FOR CASHIER & ADMIN - EACH CALCULATES ITS OWN) */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-emerald-200 dark:border-emerald-800/60 bg-gradient-to-br from-emerald-50/40 dark:from-emerald-950/20 to-white dark:to-slate-900 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                {!isAdmin || selectedCashierId !== 'all' ? 'أرباح مبيعاتك الصافية' : 'صافي الأرباح المحققة'}
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono mt-2">
              {grossProfit.toLocaleString()}
              <span className="text-xs font-sans font-bold text-emerald-600 dark:text-emerald-400 mr-1">
                {settings.currencySymbol}
              </span>
            </div>
            <div className="text-[11px] text-emerald-800 dark:text-emerald-300/80 mt-1">
              (فارق سعر البيع عن سعر الشراء للسلع)
            </div>
          </div>

          {/* Expenses */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">إجمالي المصروفات</span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 flex items-center justify-center">
                <ArrowDownRight className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-rose-700 dark:text-rose-400 font-mono mt-2">
              {totalExpenses.toLocaleString()}
              <span className="text-xs font-sans font-bold text-slate-400 mr-1">
                {settings.currencySymbol}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{filteredExpenses.length} عملية صرف مسجلة</div>
          </div>

          {/* Cash In Hand */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {!isAdmin || selectedCashierId !== 'all' ? 'كاش درجك المحصل' : 'الكاش النقدي المحصل'}
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center">
                <Banknote className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-blue-900 dark:text-blue-300 font-mono mt-2">
              {cashSalesTotal.toLocaleString()}
              <span className="text-xs font-sans font-bold text-slate-400 mr-1">
                {settings.currencySymbol}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">المبلغ الموجود بالدرج نقداً</div>
          </div>
        </div>

        {/* Middle Section: Top Products & Payment Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top Selling Products */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  {!isAdmin || selectedCashierId !== 'all'
                    ? 'أكثر المنتجات التي بعتها بالفترة'
                    : 'أكثر المنتجات مبيعاً بالفترة'}
                </h3>
                <span className="text-[10px] text-slate-400">حسب عدد القطع</span>
              </div>

              <div className="space-y-2.5">
                {topProducts.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">
                    لا توجد مبيعات مسجلة في هذه الفترة
                  </p>
                ) : (
                  topProducts.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700/80 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{item.name}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            مبيعات: {item.total.toFixed(2)} {settings.currencySymbol}
                          </div>
                        </div>
                      </div>

                      <div className="text-left">
                        <span className="font-mono font-bold text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950 px-2 py-0.5 rounded-md">
                          {item.qty} قطعة
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Payment Methods Breakdown */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-1.5">
                <PieChart className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                توزيع المبيعات حسب طرق الدفع
              </h3>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <Banknote className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>نقداً (Cash)</span>
                  </div>
                  <div className="text-base font-black font-mono text-slate-900 dark:text-slate-100 mt-1">
                    {cashSalesTotal.toLocaleString()} {settings.currencySymbol}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <CreditCard className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>بطاقة بنكية</span>
                  </div>
                  <div className="text-base font-black font-mono text-slate-900 dark:text-slate-100 mt-1">
                    {cardSalesTotal.toLocaleString()} {settings.currencySymbol}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>آجل (ديون جديدة)</span>
                  </div>
                  <div className="text-base font-black font-mono text-rose-700 dark:text-rose-400 mt-1">
                    {debtSalesTotal.toLocaleString()} {settings.currencySymbol}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <Layers className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>تحويل بنكي</span>
                  </div>
                  <div className="text-base font-black font-mono text-slate-900 dark:text-slate-100 mt-1">
                    {transferSalesTotal.toLocaleString()} {settings.currencySymbol}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Expenses Manager Section */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <ArrowDownRight className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                سجل المصروفات والنفقات اليومية
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                تسجيل مصاريف المحل لخصمها من صافي الأرباح وحساب الكاش بدقة
              </p>
            </div>

            <button
              onClick={() => setIsAddExpenseOpen(true)}
              className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:hover:bg-rose-900 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ إضافة مصروف</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-3">التاريخ</th>
                  <th className="py-2.5 px-3">البيان</th>
                  <th className="py-2.5 px-3">التصنيف</th>
                  <th className="py-2.5 px-3">المسجل</th>
                  <th className="py-2.5 px-3">المبلغ</th>
                  <th className="py-2.5 px-3 text-center">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-slate-400 text-xs">
                      لا توجد مصروفات مسجلة في هذه الفترة
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">{exp.date}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">{exp.title}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md text-[11px]">
                          {exp.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 text-[11px]">{exp.recordedBy || 'المسؤول'}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-rose-600 dark:text-rose-400">
                        {exp.amount.toLocaleString()} {settings.currencySymbol}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-md cursor-pointer transition-colors"
                          title="حذف المصروف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sales Invoices Breakdown Section */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                سجل فواتير المبيعات التفصيلية ({filteredSales.length} فاتورة)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                عرض ومراجعة كافة الفواتير الصادرة خلال الفترة مع تفاصيل الأرباح وطرق الدفع
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                className="py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title="تصدير جدول الفواتير إلى CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تصدير CSV</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[380px]">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3">رقم الفاتورة</th>
                  <th className="py-2.5 px-3">الوقت والتاريخ</th>
                  <th className="py-2.5 px-3">الكاشير</th>
                  <th className="py-2.5 px-3">طريقة الدفع</th>
                  <th className="py-2.5 px-3">الأصناف</th>
                  <th className="py-2.5 px-3">الإجمالي</th>
                  <th className="py-2.5 px-3 text-emerald-800 dark:text-emerald-400">الربح</th>
                  <th className="py-2.5 px-3 text-center">معاينة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-400 text-xs">
                      لا توجد فواتير مبيعات مسجلة في هذه الفترة
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((sale) => {
                    const itemsCount = sale.items.reduce((sum, item) => sum + item.quantity, 0);
                    return (
                      <tr key={sale.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                          #{sale.id.slice(-6)}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {sale.date.replace('T', ' ').substring(0, 16)}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                          {sale.cashierName || 'كاشير'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              sale.paymentMethod === 'cash'
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                : sale.paymentMethod === 'card'
                                ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300'
                                : sale.paymentMethod === 'debt'
                                ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                                : 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300'
                            }`}
                          >
                            {sale.paymentMethod === 'cash'
                              ? 'نقداً'
                              : sale.paymentMethod === 'card'
                              ? 'بطاقة'
                              : sale.paymentMethod === 'debt'
                              ? 'آجل'
                              : 'تحويل'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                          {itemsCount} قطعة ({sale.items.length} نوع)
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                          {sale.grandTotal.toFixed(2)} {settings.currencySymbol}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-800 dark:text-emerald-400">
                          +{sale.profitTotal.toFixed(2)} {settings.currencySymbol}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => setSelectedInvoice(sale)}
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1 text-[10px] font-bold"
                            title="عرض تفاصيل الفاتورة"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>عرض</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* ADD EXPENSE MODAL */}
      {/* ======================================================== */}
      {isAddExpenseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 select-none">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowDownRight className="w-5 h-5 text-rose-400" />
                <h3 className="text-sm font-bold">تسجيل مصروف جديد</h3>
              </div>
              <button
                onClick={() => setIsAddExpenseOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="p-5 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  بيان المصروف *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: فاتورة كهرباء، أكياس، صيانة..."
                  value={expenseTitle}
                  onChange={(e) => setExpenseTitle(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-rose-500"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    المبلغ ({settings.currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    required
                    value={expenseAmount || ''}
                    onChange={(e) => setExpenseAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    التصنيف
                  </label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-rose-500"
                  >
                    <option value="فواتير ومرافق">فواتير ومرافق (كهرباء، ماء)</option>
                    <option value="إيجار المحل">إيجار المحل</option>
                    <option value="مستلزمات وتغليف">مستلزمات وتغليف (أكياس، أوراق)</option>
                    <option value="عمالة ويوميات">عمالة ويوميات</option>
                    <option value="صيانة ونظافة">صيانة ونظافة</option>
                    <option value="أخرى">مصروفات أخرى</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">ملاحظات</label>
                <input
                  type="text"
                  placeholder="ملاحظات توضيحية..."
                  value={expenseNotes}
                  onChange={(e) => setExpenseNotes(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-rose-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-bold text-xs shadow-xs transition-all cursor-pointer"
                >
                  حفظ المصروف
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddExpenseOpen(false)}
                  className="py-3 px-4 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl font-bold text-xs cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Z-REPORT / DAILY CLOSING SHIFT MODAL */}
      {/* ======================================================== */}
      {isZReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-xs p-4 overflow-y-auto select-none">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col my-auto max-h-[92vh]">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between no-print">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold">تقرير إغلاق الصندوق (Z-Report)</h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {new Date().toLocaleDateString('ar-SA')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsZReportOpen(false)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div
                id="printable-receipt"
                className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-slate-100 space-y-2.5"
              >
                <div className="text-center pb-2 border-b border-dashed border-slate-300 dark:border-slate-700">
                  <h4 className="text-base font-bold font-sans">{settings.storeName}</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">تقرير جرد وإغلاق الصندوق اليومي</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {new Date().toLocaleString('ar-SA')}
                  </p>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span>الموظف / الكاشير:</span>
                    <span className="font-bold">{activeFilterUser?.name || currentUser.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>عدد الفواتير الصادرة اليوم:</span>
                    <span className="font-bold">{invoicesCount}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-dashed border-slate-300 dark:border-slate-700 space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span>رصيد العهدة الافتتاحي (كاش بداية):</span>
                    <span>{openingCash.toFixed(2)} {settings.currencySymbol}</span>
                  </div>
                  <div className="flex justify-between text-emerald-800 dark:text-emerald-400 font-bold">
                    <span>+ مبيعات الكاش المحصلة:</span>
                    <span>+{cashSalesTotal.toFixed(2)} {settings.currencySymbol}</span>
                  </div>
                  <div className="flex justify-between text-rose-800 dark:text-rose-400 font-bold">
                    <span>- المصروفات النقدية المسددة:</span>
                    <span>-{totalExpenses.toFixed(2)} {settings.currencySymbol}</span>
                  </div>
                  <div className="flex justify-between font-black text-sm pt-1 border-t border-slate-300 dark:border-slate-700 text-slate-950 dark:text-white">
                    <span>الكاش المتوقع بالدرج:</span>
                    <span>{(openingCash + cashSalesTotal - totalExpenses).toFixed(2)} {settings.currencySymbol}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-dashed border-slate-300 dark:border-slate-700 space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>مبيعات البطاقة البنكية:</span>
                    <span>{cardSalesTotal.toFixed(2)} {settings.currencySymbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>مبيعات الآجل (ديون):</span>
                    <span>{debtSalesTotal.toFixed(2)} {settings.currencySymbol}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 dark:text-slate-100 pt-1 border-t border-slate-200 dark:border-slate-700">
                    <span>إجمالي المبيعات الشامل:</span>
                    <span>{totalRevenue.toFixed(2)} {settings.currencySymbol}</span>
                  </div>
                </div>
              </div>

              {/* Adjust opening cash */}
              <div className="space-y-1 no-print">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  تعديل كاش البداية (العهدة):
                </label>
                <input
                  type="number"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex gap-2 no-print">
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  طباعة التقرير اليومي
                </button>
                <button
                  onClick={() => setIsZReportOpen(false)}
                  className="py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl font-bold text-xs cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* FULL FINANCIAL PDF REPORT MODAL (A4 PRINTABLE) */}
      {/* ======================================================== */}
      {isPDFReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto select-none">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col my-auto max-h-[95vh]">
            {/* Top Toolbar (No-Print) */}
            <div className="p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 no-print">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">معاينة وتصدير التقرير المالي (PDF / A4)</h3>
                  <p className="text-[11px] text-slate-400">
                    تقرير محاسبي شامل وجاهز للطباعة أو الحفظ كملف PDF
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCSV}
                  className="py-2 px-3.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>تنزيل CSV</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة أو حفظ PDF</span>
                </button>
                <button
                  onClick={() => setIsPDFReportOpen(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div className="p-6 sm:p-8 overflow-y-auto bg-slate-100 dark:bg-slate-950 flex justify-center">
              <div
                id="printable-report"
                className="w-full bg-white text-slate-900 p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 text-right space-y-6"
                dir="rtl"
              >
                {/* Report Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Store className="w-6 h-6 text-slate-900" />
                      <h1 className="text-xl font-black">{settings.storeName}</h1>
                    </div>
                    {settings.storePhone && (
                      <p className="text-xs text-slate-600 mt-1">الهاتف: {settings.storePhone}</p>
                    )}
                    {settings.storeAddress && (
                      <p className="text-xs text-slate-600">{settings.storeAddress}</p>
                    )}
                  </div>

                  <div className="text-left">
                    <span className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-bold rounded-lg mb-1">
                      تقرير مالي ومحاسبي
                    </span>
                    <p className="text-xs text-slate-600 font-mono">
                      تاريخ الاستخراج: {new Date().toLocaleString('ar-DZ')}
                    </p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">
                      الفترة: {timeRangeLabelAr}
                    </p>
                  </div>
                </div>

                {/* Scope Metadata */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-wrap justify-between gap-3 text-xs">
                  <div>
                    <span className="text-slate-500">نطاق الحساب / الكاشير: </span>
                    <span className="font-bold text-slate-900">{activeCashierName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">إجمالي الفواتير الصادرة: </span>
                    <span className="font-bold text-slate-900 font-mono">{invoicesCount} فاتورة</span>
                  </div>
                  <div>
                    <span className="text-slate-500">العملة: </span>
                    <span className="font-bold text-slate-900">{settings.currencySymbol}</span>
                  </div>
                </div>

                {/* Financial KPI Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-[11px] text-slate-500">إجمالي المبيعات</div>
                    <div className="text-base font-black font-mono text-slate-900 mt-0.5">
                      {totalRevenue.toFixed(2)} {settings.currencySymbol}
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <div className="text-[11px] text-emerald-800">إجمالي الأرباح المحققة</div>
                    <div className="text-base font-black font-mono text-emerald-800 mt-0.5">
                      +{grossProfit.toFixed(2)} {settings.currencySymbol}
                    </div>
                  </div>

                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                    <div className="text-[11px] text-rose-800">المصروفات والنفقات</div>
                    <div className="text-base font-black font-mono text-rose-800 mt-0.5">
                      -{totalExpenses.toFixed(2)} {settings.currencySymbol}
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="text-[11px] text-blue-800">صافي الربح الفعلي</div>
                    <div className="text-base font-black font-mono text-blue-800 mt-0.5">
                      {netProfit.toFixed(2)} {settings.currencySymbol}
                    </div>
                  </div>
                </div>

                {/* Payment Breakdown Mini Table */}
                <div>
                  <h3 className="text-xs font-bold text-slate-900 mb-2">تفصيل المقبوضات وطرق الدفع:</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                    <div className="p-2 border border-slate-200 rounded-lg flex justify-between">
                      <span className="font-sans text-slate-600">نقداً (كاش):</span>
                      <span className="font-bold">{cashSalesTotal.toFixed(2)}</span>
                    </div>
                    <div className="p-2 border border-slate-200 rounded-lg flex justify-between">
                      <span className="font-sans text-slate-600">بطاقة بنكية:</span>
                      <span className="font-bold">{cardSalesTotal.toFixed(2)}</span>
                    </div>
                    <div className="p-2 border border-slate-200 rounded-lg flex justify-between">
                      <span className="font-sans text-slate-600">آجل (كريدي):</span>
                      <span className="font-bold text-rose-600">{debtSalesTotal.toFixed(2)}</span>
                    </div>
                    <div className="p-2 border border-slate-200 rounded-lg flex justify-between">
                      <span className="font-sans text-slate-600">تحويل:</span>
                      <span className="font-bold">{transferSalesTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Top Products Table */}
                {topProducts.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 mb-2">أعلى 5 منتجات مبيعاً بالفترة:</h3>
                    <table className="w-full text-xs text-right border border-slate-200">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-2">#</th>
                          <th className="p-2">اسم المنتج</th>
                          <th className="p-2 text-center">الكمية المباعة</th>
                          <th className="p-2 text-left">إجمالي المبيعات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {topProducts.map((p, idx) => (
                          <tr key={idx}>
                            <td className="p-2 font-mono">{idx + 1}</td>
                            <td className="p-2 font-bold">{p.name}</td>
                            <td className="p-2 text-center font-mono">{p.qty} قطعة</td>
                            <td className="p-2 text-left font-mono font-bold">
                              {p.total.toFixed(2)} {settings.currencySymbol}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Invoices List Table */}
                <div>
                  <h3 className="text-xs font-bold text-slate-900 mb-2">
                    سجل فواتير المبيعات الصادرة ({filteredSales.length} فاتورة):
                  </h3>
                  <table className="w-full text-[11px] text-right border border-slate-200">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-1.5">رقم الفاتورة</th>
                        <th className="p-1.5">الوقت والتاريخ</th>
                        <th className="p-1.5">الكاشير</th>
                        <th className="p-1.5">طريقة الدفع</th>
                        <th className="p-1.5">الأصناف</th>
                        <th className="p-1.5">المبلغ</th>
                        <th className="p-1.5 text-left">الربح</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredSales.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-4 text-slate-400">
                            لا توجد فواتير مبيعات
                          </td>
                        </tr>
                      ) : (
                        filteredSales.slice(0, 30).map((s) => (
                          <tr key={s.id}>
                            <td className="p-1.5 font-mono font-bold">#{s.id.slice(-6)}</td>
                            <td className="p-1.5 font-mono text-slate-500">
                              {s.date.replace('T', ' ').substring(0, 16)}
                            </td>
                            <td className="p-1.5">{s.cashierName || 'كاشير'}</td>
                            <td className="p-1.5">
                              {s.paymentMethod === 'cash'
                                ? 'نقداً'
                                : s.paymentMethod === 'card'
                                ? 'بطاقة'
                                : s.paymentMethod === 'debt'
                                ? 'آجل'
                                : 'تحويل'}
                            </td>
                            <td className="p-1.5">{s.items.reduce((sum, item) => sum + item.quantity, 0)} قطعة</td>
                            <td className="p-1.5 font-mono font-bold">
                              {s.grandTotal.toFixed(2)} {settings.currencySymbol}
                            </td>
                            <td className="p-1.5 text-left font-mono font-bold text-emerald-800">
                              +{s.profitTotal.toFixed(2)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  {filteredSales.length > 30 && (
                    <p className="text-[10px] text-slate-500 mt-1">
                      * يظهر أول 30 فاتورة في المعاينة الورقية. للحصول على القائمة الكاملة يرجى تصدير ملف CSV.
                    </p>
                  )}
                </div>

                {/* Expenses Table */}
                {filteredExpenses.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 mb-2">
                      سجل المصروفات المسجلة ({filteredExpenses.length}):
                    </h3>
                    <table className="w-full text-[11px] text-right border border-slate-200">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-1.5">التاريخ</th>
                          <th className="p-1.5">البيان</th>
                          <th className="p-1.5">التصنيف</th>
                          <th className="p-1.5">المسجل</th>
                          <th className="p-1.5 text-left">المبلغ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredExpenses.map((exp) => (
                          <tr key={exp.id}>
                            <td className="p-1.5 font-mono text-slate-500">{exp.date}</td>
                            <td className="p-1.5 font-bold">{exp.title}</td>
                            <td className="p-1.5">{exp.category}</td>
                            <td className="p-1.5">{exp.recordedBy || 'المسؤول'}</td>
                            <td className="p-1.5 text-left font-mono font-bold text-rose-800">
                              {exp.amount.toFixed(2)} {settings.currencySymbol}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Signatures Footer */}
                <div className="pt-8 border-t border-slate-300 grid grid-cols-2 gap-8 text-xs text-center">
                  <div>
                    <p className="font-bold text-slate-800">توقيع المسؤول / الكاشير</p>
                    <div className="h-12 border-b border-dashed border-slate-300 mt-2"></div>
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">اعتماد إدارة الكشك / المحل</p>
                    <div className="h-12 border-b border-dashed border-slate-300 mt-2"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* INVOICE DETAIL VIEW MODAL */}
      {/* ======================================================== */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 select-none">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold">تفاصيل الفاتورة #{selectedInvoice.id.slice(-6)}</h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {selectedInvoice.date.replace('T', ' ').substring(0, 19)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-slate-500 dark:text-slate-400">الكاشير: </span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{selectedInvoice.cashierName || 'كاشير'}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">طريقة الدفع: </span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {selectedInvoice.paymentMethod === 'cash'
                      ? 'نقداً'
                      : selectedInvoice.paymentMethod === 'card'
                      ? 'بطاقة'
                      : selectedInvoice.paymentMethod === 'debt'
                      ? 'آجل'
                      : 'تحويل'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">المبلغ الإجمالي: </span>
                  <span className="font-bold font-mono text-slate-900 dark:text-slate-100">
                    {selectedInvoice.grandTotal.toFixed(2)} {settings.currencySymbol}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">الربح المحقق: </span>
                  <span className="font-bold font-mono text-emerald-800 dark:text-emerald-400">
                    +{selectedInvoice.profitTotal.toFixed(2)} {settings.currencySymbol}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">الأصناف المباعة بالفاتورة:</h4>
                <div className="space-y-1.5">
                  {selectedInvoice.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-slate-100">{item.product.name}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          {item.quantity} × {item.price.toFixed(2)} {settings.currencySymbol}
                        </div>
                      </div>
                      <div className="text-left font-mono">
                        <div className="font-black text-slate-900 dark:text-slate-100">
                          {item.total.toFixed(2)} {settings.currencySymbol}
                        </div>
                        <div className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400">
                          ربح: +{(item.profit * item.quantity).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="py-2.5 px-5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

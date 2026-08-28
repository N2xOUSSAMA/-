import React, { useState, useEffect } from 'react';
import { Sale, StoreSettings, User } from '../../types';
import { StorageService } from '../../services/storage';
import { ReceiptModal } from '../POS/ReceiptModal';
import {
  FileText,
  Search,
  Printer,
  RotateCcw,
  Calendar,
  CreditCard,
  Banknote,
  Clock,
  ArrowRightLeft,
  Eye,
  Download,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Trash2,
  ArrowRight,
  Landmark,
} from 'lucide-react';

interface SalesHistoryViewProps {
  currentUser: User;
  settings: StoreSettings;
  onRefreshData?: () => void;
  onBackToPOS?: () => void;
}

export const SalesHistoryView: React.FC<SalesHistoryViewProps> = ({
  currentUser,
  settings,
  onRefreshData,
  onBackToPOS,
}) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');

  // Selected Sale for Details / Thermal Reprint
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);

  // In-app Delete Modal
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [restoreStockOnDelete, setRestoreStockOnDelete] = useState<boolean>(true);

  // In-app Refund Modal
  const [saleToRefund, setSaleToRefund] = useState<Sale | null>(null);
  const [refundReason, setRefundReason] = useState<string>('');

  // In-app Toast Banner
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const loadData = () => {
    setSales(StorageService.getSales());
  };

  useEffect(() => {
    loadData();
  }, []);

  const openRefundModal = (sale: Sale) => {
    if (sale.status === 'refunded') {
      showToast('تم استرجاع هذه الفاتورة مسبقاً', 'error');
      return;
    }
    setSaleToRefund(sale);
    setRefundReason('');
  };

  const executeRefund = () => {
    if (!saleToRefund) return;
    const res = StorageService.refundSale(saleToRefund.id, refundReason.trim() || undefined);
    if (res.success) {
      showToast(res.message, 'success');
      loadData();
      if (onRefreshData) onRefreshData();
    } else {
      showToast(res.message, 'error');
    }
    setSaleToRefund(null);
  };

  const openDeleteModal = (sale: Sale) => {
    setSaleToDelete(sale);
    setRestoreStockOnDelete(sale.status !== 'refunded');
  };

  const executeDelete = () => {
    if (!saleToDelete) return;
    const res = StorageService.deleteSale(saleToDelete.id, restoreStockOnDelete);
    if (res.success) {
      showToast(res.message, 'success');
      loadData();
      if (onRefreshData) onRefreshData();
    } else {
      showToast(res.message, 'error');
    }
    setSaleToDelete(null);
  };

  const handleExportCSV = () => {
    const headers = [
      'رقم الفاتورة',
      'التاريخ والوقت',
      'الكاشير',
      'العميل',
      'طريقة الدفع',
      'المجموع الفرعي',
      'الخصم',
      'الضريبة',
      'الإجمالي',
      'الربح',
      'الحالة',
    ];
    const rows = filteredSales.map((s) => [
      `"${s.invoiceNumber}"`,
      `"${new Date(s.date).toLocaleString('ar-SA')}"`,
      `"${s.cashierName}"`,
      `"${s.customerName || 'عميل عام'}"`,
      s.paymentMethod,
      s.subtotal,
      s.discountTotal,
      s.taxTotal,
      s.grandTotal,
      s.profitTotal,
      s.status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sales_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter logic
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const filteredSales = sales.filter((s) => {
    const saleDate = new Date(s.date);
    const saleDateStr = s.date.split('T')[0];

    // Date filter
    if (dateFilter === 'today') {
      if (saleDateStr !== todayStr) return false;
    } else if (dateFilter === 'week') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      if (saleDate < oneWeekAgo) return false;
    } else if (dateFilter === 'month') {
      const oneMonthAgo = new Date();
      oneMonthAgo.setDate(now.getDate() - 30);
      if (saleDate < oneMonthAgo) return false;
    }

    // Payment method filter
    if (paymentFilter !== 'all' && s.paymentMethod !== paymentFilter) {
      return false;
    }

    // Query
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      const matchesNum = s.invoiceNumber.toLowerCase().includes(q);
      const matchesCust = s.customerName?.toLowerCase().includes(q);
      const matchesCashier = s.cashierName.toLowerCase().includes(q);
      if (!matchesNum && !matchesCust && !matchesCashier) return false;
    }

    return true;
  });

  const totalFilteredSales = filteredSales
    .filter((s) => s.status !== 'refunded')
    .reduce((sum, s) => sum + s.grandTotal, 0);

  const totalFilteredProfit = filteredSales
    .filter((s) => s.status !== 'refunded')
    .reduce((sum, s) => sum + s.profitTotal, 0);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-100 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          {onBackToPOS && (
            <button
              onClick={onBackToPOS}
              className="py-2 px-3.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
              title="الرجوع إلى شاشة الكاشير"
            >
              <ArrowRight className="w-4 h-4" />
              <span>رجوع للكاشير</span>
            </button>
          )}

          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              سجل المبيعات والفواتير
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              عرض وتتبع الفواتير، إعادة الطباعة، استرجاع المبيعات، وحذف الفواتير
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="py-2 px-3.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تصدير Excel/CSV</span>
          </button>
        </div>
      </div>

      {/* Stats Ribbon */}
      <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500">عدد الفواتير المكتملة</div>
          <div className="text-base sm:text-lg font-black text-slate-900 font-mono mt-1">
            {filteredSales.filter((s) => s.status !== 'refunded').length} <span className="text-xs font-sans text-slate-400">فاتورة</span>
          </div>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500">إجمالي المبيعات بالفترة</div>
          <div className="text-base sm:text-lg font-black text-emerald-700 font-mono mt-1">
            {totalFilteredSales.toLocaleString()} <span className="text-xs font-sans text-slate-400">{settings.currencySymbol}</span>
          </div>
        </div>

        {currentUser.role === 'admin' && (
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-semibold text-slate-500">صافي الأرباح المحققة</div>
            <div className="text-base sm:text-lg font-black text-slate-900 font-mono mt-1">
              {totalFilteredProfit.toLocaleString()} <span className="text-xs font-sans text-slate-400">{settings.currencySymbol}</span>
            </div>
          </div>
        )}

        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500">فواتير مسترجعة</div>
          <div className="text-base sm:text-lg font-black text-rose-600 font-mono mt-1">
            {filteredSales.filter((s) => s.status === 'refunded').length}
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-3 sm:p-4 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="بحث برقم الفاتورة، اسم العميل، أو الكاشير..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-9 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:bg-white focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Date buttons */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              onClick={() => setDateFilter('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                dateFilter === 'today' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              اليوم
            </button>
            <button
              onClick={() => setDateFilter('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                dateFilter === 'week' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              آخر 7 أيام
            </button>
            <button
              onClick={() => setDateFilter('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                dateFilter === 'month' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              هذا الشهر
            </button>
            <button
              onClick={() => setDateFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                dateFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              الكل ({sales.length})
            </button>
          </div>

          {/* Payment filter */}
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium"
          >
            <option value="all">جميع طرق الدفع</option>
            <option value="cash">نقداً (Cash)</option>
            <option value="ccp">حساب CCP / بريدي موب</option>
            <option value="card">بطاقة بنكية (Card)</option>
            <option value="debt">آجل (دين)</option>
            <option value="transfer">تحويل</option>
          </select>
        </div>
      </div>

      {/* Table of Invoices */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="p-3.5">رقم الفاتورة</th>
                  <th className="p-3.5">التاريخ والوقت</th>
                  <th className="p-3.5">العميل</th>
                  <th className="p-3.5">الكاشير</th>
                  <th className="p-3.5">طريقة الدفع</th>
                  <th className="p-3.5">عدد الأصناف</th>
                  <th className="p-3.5">المبلغ الإجمالي</th>
                  <th className="p-3.5">الحالة</th>
                  <th className="p-3.5 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      لا توجد فواتير مطابقة للفترة المحددة
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((sale) => {
                    const isRefunded = sale.status === 'refunded';
                    return (
                      <tr
                        key={sale.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isRefunded ? 'bg-rose-50/40 opacity-85' : ''
                        }`}
                      >
                        <td className="p-3.5 font-mono font-bold text-slate-900">
                          #{sale.invoiceNumber}
                        </td>
                        <td className="p-3.5 text-slate-600 font-mono text-[11px]">
                          {new Date(sale.date).toLocaleString('ar-SA')}
                        </td>
                        <td className="p-3.5 font-semibold text-slate-800">
                          {sale.customerName || (
                            <span className="text-slate-400 font-normal">عميل نقدي</span>
                          )}
                        </td>
                        <td className="p-3.5 text-slate-600">{sale.cashierName}</td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                              sale.paymentMethod === 'cash'
                                ? 'bg-emerald-50 text-emerald-800'
                                : sale.paymentMethod === 'ccp'
                                ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                : sale.paymentMethod === 'card'
                                ? 'bg-blue-50 text-blue-800'
                                : sale.paymentMethod === 'debt'
                                ? 'bg-amber-50 text-amber-900'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {sale.paymentMethod === 'cash'
                              ? 'نقدي'
                              : sale.paymentMethod === 'ccp'
                              ? 'CCP / بريدي موب'
                              : sale.paymentMethod === 'card'
                              ? 'بطاقة'
                              : sale.paymentMethod === 'debt'
                              ? 'آجل'
                              : 'تحويل'}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-slate-600">
                          {sale.items.reduce((s, i) => s + i.quantity, 0)} قطعة
                        </td>
                        <td className="p-3.5 font-mono font-black text-slate-950 text-sm">
                          {sale.grandTotal.toFixed(2)} {settings.currencySymbol}
                        </td>
                        <td className="p-3.5">
                          {isRefunded ? (
                            <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-200">
                              <XCircle className="w-3 h-3 text-rose-600" />
                              مسترجعة
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              مكتملة
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* View / Print Receipt */}
                            <button
                              onClick={() => {
                                setSelectedSale(sale);
                                setIsReceiptOpen(true);
                              }}
                              className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg transition-colors flex items-center gap-1"
                              title="عرض وطباعة الوصل"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span className="text-[11px] font-bold">وصل</span>
                            </button>

                            {/* Refund */}
                            {!isRefunded && (
                              <button
                                onClick={() => openRefundModal(sale)}
                                className="p-1.5 hover:bg-amber-50 text-amber-700 hover:text-amber-900 rounded-lg transition-colors flex items-center gap-1"
                                title="إرجاع الفاتورة"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span className="text-[11px] font-bold">إرجاع</span>
                              </button>
                            )}

                            {/* Delete Invoice */}
                            <button
                              onClick={() => openDeleteModal(sale)}
                              className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                                isRefunded
                                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200'
                                  : 'hover:bg-rose-50 text-slate-500 hover:text-rose-600'
                              }`}
                              title="حذف الفاتورة نهائياً من السجل"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="text-[11px] font-bold">حذف</span>
                            </button>
                          </div>
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

      {/* In-App Toast Banner */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 animate-bounce-short">
          <div
            className={`px-5 py-3 rounded-2xl shadow-xl border flex items-center gap-3 text-sm font-bold ${
              toast.type === 'success'
                ? 'bg-slate-900 text-emerald-400 border-slate-700 ring-4 ring-slate-900/10'
                : 'bg-rose-900 text-rose-100 border-rose-700 ring-4 ring-rose-900/10'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-300 shrink-0" />
            )}
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* In-App Delete Confirmation Modal */}
      {saleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-right space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 border-b border-slate-100 pb-3">
              <div className="p-3 bg-rose-50 rounded-2xl">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">تأكيد حذف الفاتورة نهائياً</h3>
                <p className="text-xs text-slate-500 font-medium">
                  فاتورة رقم #{saleToDelete.invoiceNumber}
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>تاريخ الفاتورة:</span>
                <span className="font-bold text-slate-900">
                  {new Date(saleToDelete.date).toLocaleString('ar-SA')}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>إجمالي المبلغ:</span>
                <span className="font-bold text-slate-900">
                  {saleToDelete.grandTotal.toFixed(2)} {settings.currencySymbol}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>عدد المنتجات:</span>
                <span className="font-bold text-slate-900">
                  {saleToDelete.items.reduce((s, i) => s + i.quantity, 0)} قطعة
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>حالة الفاتورة:</span>
                <span className="font-bold text-slate-900">
                  {saleToDelete.status === 'refunded' ? 'مسترجعة' : 'مكتملة'}
                </span>
              </div>
            </div>

            {/* Stock Restoration Checkbox if not refunded */}
            {saleToDelete.status !== 'refunded' && (
              <label className="flex items-center gap-3 p-3 bg-emerald-50 rounded-2xl border border-emerald-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={restoreStockOnDelete}
                  onChange={(e) => setRestoreStockOnDelete(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500 border-slate-300"
                />
                <div className="text-xs text-emerald-950 font-bold">
                  إعادة إرجاع كميات الأصناف إلى المخزون تلقائياً
                  <span className="block text-[10px] text-emerald-700 font-normal">
                    (يُنصح به لتصحيح كميات المنتجات)
                  </span>
                </div>
              </label>
            )}

            <p className="text-xs text-slate-500 leading-relaxed">
              هل أنت متأكد من رغبتك في حذف هذا السجل نهائياً؟ لا يمكن التراجع عن هذه العملية بعد إتمامها.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSaleToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={executeDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold shadow-md shadow-rose-600/20 flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>نعم، حذف نهائي</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Refund Modal */}
      {saleToRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-right space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-amber-600 border-b border-slate-100 pb-3">
              <div className="p-3 bg-amber-50 rounded-2xl">
                <RotateCcw className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">إرجاع واسترداد الفاتورة</h3>
                <p className="text-xs text-slate-500 font-medium">
                  فاتورة رقم #{saleToRefund.invoiceNumber}
                </p>
              </div>
            </div>

            <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 text-xs space-y-2">
              <div className="flex justify-between text-slate-700">
                <span>المبلغ المسترد:</span>
                <span className="font-bold text-amber-900 text-sm">
                  {saleToRefund.grandTotal.toFixed(2)} {settings.currencySymbol}
                </span>
              </div>
              <p className="text-[11px] text-amber-800">
                سيتم إعادة المنتجات تلقائياً إلى المخزون وتحديث الحسابات.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                سبب الإرجاع (اختياري):
              </label>
              <input
                type="text"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="مثال: رغبة العميل، منتج غير مطابق..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSaleToRefund(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={executeRefund}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-bold shadow-md shadow-amber-600/20 flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>تأكيد الإرجاع</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thermal Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        sale={selectedSale}
        settings={settings}
      />
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Customer, DebtPayment, PaymentMethod, StoreSettings, User } from '../../types';
import { StorageService } from '../../services/storage';
import {
  Users,
  UserPlus,
  Search,
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
  DollarSign,
  Printer,
  X,
  CreditCard,
  Banknote,
  FileText,
  ArrowRight,
} from 'lucide-react';

interface CustomersViewProps {
  currentUser: User;
  settings: StoreSettings;
  onRefreshData?: () => void;
  onBackToPOS?: () => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  currentUser,
  settings,
  onRefreshData,
  onBackToPOS,
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [debtPayments, setDebtPayments] = useState<DebtPayment[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterDebtOnly, setFilterDebtOnly] = useState<boolean>(false);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [selectedCustomerForPay, setSelectedCustomerForPay] = useState<Customer | null>(null);

  // Payment Form State
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [payNotes, setPayNotes] = useState<string>('');

  // Add / Edit Customer Form
  const [editingCust, setEditingCust] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    notes: '',
  });

  const loadData = () => {
    setCustomers(StorageService.getCustomers());
    setDebtPayments(StorageService.getDebtPayments());
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditingCust(null);
    setFormData({ name: '', phone: '', address: '', notes: '' });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCust(c);
    setFormData({
      name: c.name,
      phone: c.phone,
      address: c.address || '',
      notes: c.notes || '',
    });
    setIsAddModalOpen(true);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const currentList = StorageService.getCustomers();
    if (editingCust) {
      const updated = currentList.map((c) =>
        c.id === editingCust.id
          ? {
              ...c,
              name: formData.name.trim(),
              phone: formData.phone.trim(),
              address: formData.address.trim(),
              notes: formData.notes.trim(),
            }
          : c
      );
      StorageService.saveCustomers(updated);
    } else {
      const newCust: Customer = {
        id: 'cust_' + Date.now(),
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        notes: formData.notes.trim(),
        balanceDebt: 0,
        totalSpent: 0,
        createdAt: new Date().toISOString().split('T')[0],
      };
      StorageService.saveCustomers([...currentList, newCust]);
    }

    StorageService.playSuccessBeep();
    loadData();
    if (onRefreshData) onRefreshData();
    setIsAddModalOpen(false);
  };

  const handleOpenPayDebt = (c: Customer) => {
    setSelectedCustomerForPay(c);
    setPayAmount(c.balanceDebt);
    setPayMethod('cash');
    setPayNotes('سداد جزء من حساب الدين');
    setIsPaymentModalOpen(true);
  };

  const handleRecordDebtPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerForPay || payAmount <= 0) return;

    const payment: DebtPayment = {
      id: 'debt_pay_' + Date.now(),
      customerId: selectedCustomerForPay.id,
      customerName: selectedCustomerForPay.name,
      amount: Number(payAmount),
      date: new Date().toISOString(),
      paymentMethod: payMethod,
      notes: payNotes,
      receivedBy: currentUser.name,
    };

    StorageService.recordDebtPayment(payment);
    StorageService.playSuccessBeep();
    loadData();
    if (onRefreshData) onRefreshData();
    setIsPaymentModalOpen(false);
    alert(`تم تسجيل سداد مبلغ ${payAmount} ${settings.currencySymbol} وتحديث رصيد العميل بنجاح`);
  };

  // Filter logic
  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      (c.address && c.address.toLowerCase().includes(q));

    const matchesDebt = filterDebtOnly ? c.balanceDebt > 0 : true;

    return matchesSearch && matchesDebt;
  });

  const totalOutstandingDebts = customers.reduce((sum, c) => sum + c.balanceDebt, 0);
  const customersWithDebtCount = customers.filter((c) => c.balanceDebt > 0).length;

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
              <Users className="w-5 h-5 text-emerald-600" />
              دليل العملاء وسجل الديون
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              إدارة حسابات الزبائن، تتبع المبيعات الآجلة، وتسجيل دفعات السداد
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>إضافة عميل جديد</span>
        </button>
      </div>

      {/* Stats Summary */}
      <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3.5">
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500">إجمالي عدد العملاء</div>
          <div className="text-base sm:text-lg font-black text-slate-900 font-mono mt-1">
            {customers.length} <span className="text-xs font-sans text-slate-400">عميل مسجل</span>
          </div>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500">إجمالي الديون المستحقة لك</div>
          <div className="text-base sm:text-lg font-black text-rose-700 font-mono mt-1">
            {totalOutstandingDebts.toLocaleString()} <span className="text-xs font-sans text-slate-400">{settings.currencySymbol}</span>
          </div>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500">عملاء لديهم ديون جارية</div>
          <div className="text-base sm:text-lg font-black text-amber-700 font-mono mt-1">
            {customersWithDebtCount} <span className="text-xs font-sans text-slate-400">عميل</span>
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="p-3 sm:p-4 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ابحث باسم العميل، الهاتف، أو العنوان..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-9 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:bg-white focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterDebtOnly(!filterDebtOnly)}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 ${
              filterDebtOnly
                ? 'bg-rose-50 border-rose-300 text-rose-800 shadow-2xs'
                : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>عرض أصحاب الديون فقط ({customersWithDebtCount})</span>
          </button>
        </div>
      </div>

      {/* Customer Cards & Table Grid */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {customers.length === 0 ? (
            <div className="col-span-full py-16 px-4 text-center flex flex-col items-center justify-center max-w-md mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3 ring-8 ring-emerald-50">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-base font-black text-slate-800 mb-1">
                سجل العملاء والديون نظيف (0 عملاء)
              </h3>
              <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                لا يوجد أي عملاء أو ديون مسجلة. يمكنك البدء بإضافة عملائك الدائمين لتسجيل مبيعات الكريدي ومتابعة الدفعات.
              </p>
              <button
                type="button"
                onClick={handleOpenAdd}
                className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>إضافة أول عميل إلى السجل</span>
              </button>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400">
              لا يوجد عملاء مطابقين للبحث
            </div>
          ) : (
            filteredCustomers.map((cust) => {
              const hasDebt = cust.balanceDebt > 0;
              return (
                <div
                  key={cust.id}
                  className={`bg-white rounded-2xl border p-4 shadow-2xs transition-all flex flex-col justify-between ${
                    hasDebt ? 'border-amber-200 bg-amber-50/20' : 'border-slate-200'
                  }`}
                >
                  <div>
                    {/* Top Row: Name and Debt Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{cust.name}</h4>
                        {cust.createdAt && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            مسجل منذ: {cust.createdAt}
                          </span>
                        )}
                      </div>

                      {hasDebt ? (
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full inline-block">
                            دين مستحق
                          </span>
                          <div className="text-sm font-mono font-black text-rose-700 mt-0.5">
                            {cust.balanceDebt.toFixed(2)} {settings.currencySymbol}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                          الحساب مسدد بالكامل
                        </span>
                      )}
                    </div>

                    {/* Contact & Details */}
                    <div className="mt-3 space-y-1 text-xs text-slate-600">
                      {cust.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-mono">{cust.phone}</span>
                        </div>
                      )}
                      {cust.address && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{cust.address}</span>
                        </div>
                      )}
                      {cust.notes && (
                        <p className="text-[11px] text-slate-500 italic bg-slate-50 p-1.5 rounded-lg mt-1">
                          "{cust.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions Bottom Bar */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="text-[11px] text-slate-500 font-mono">
                      إجمالي المشتريات: {cust.totalSpent.toFixed(2)} {settings.currencySymbol}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {hasDebt && (
                        <button
                          onClick={() => handleOpenPayDebt(cust)}
                          className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>سداد دين</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenEdit(cust)}
                        className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg text-xs"
                        title="تعديل بيانات العميل"
                      >
                        تعديل
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* RECORD DEBT PAYMENT MODAL */}
      {/* ======================================================== */}
      {isPaymentModalOpen && selectedCustomerForPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold">تسجيل سداد دين</h3>
                  <p className="text-[11px] text-slate-400">
                    العميل: {selectedCustomerForPay.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordDebtPayment} className="p-5 space-y-4">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex justify-between items-center text-xs">
                <span className="font-bold text-rose-900">إجمالي الدين الحالي:</span>
                <span className="font-mono font-black text-rose-700 text-base">
                  {selectedCustomerForPay.balanceDebt.toFixed(2)} {settings.currencySymbol}
                </span>
              </div>

              {/* Amount to pay */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700">المبلغ المسدد الآن *</label>
                  <button
                    type="button"
                    onClick={() => setPayAmount(selectedCustomerForPay.balanceDebt)}
                    className="text-[11px] font-bold text-emerald-700 hover:underline"
                  >
                    سداد كامل المبلغ
                  </button>
                </div>
                <input
                  type="number"
                  step="any"
                  min="1"
                  max={selectedCustomerForPay.balanceDebt}
                  required
                  value={payAmount || ''}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-lg font-mono font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-500"
                  autoFocus
                />
              </div>

              {/* Payment Method */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">طريقة الاستلام:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'cash', label: 'نقداً', icon: Banknote },
                    { id: 'card', label: 'بطاقة', icon: CreditCard },
                    { id: 'transfer', label: 'تحويل', icon: FileText },
                  ].map((m) => {
                    const isSelected = payMethod === m.id;
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPayMethod(m.id as PaymentMethod)}
                        className={`p-2 rounded-xl border text-center flex items-center justify-center gap-1 text-xs font-bold transition-all ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-600 text-emerald-900'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Remaining balance preview */}
              <div className="p-3 bg-emerald-50 rounded-xl text-xs text-emerald-900 flex justify-between font-semibold">
                <span>المتبقي في ذمة العميل بعد هذا السداد:</span>
                <span className="font-mono font-bold">
                  {Math.max(0, selectedCustomerForPay.balanceDebt - payAmount).toFixed(2)}{' '}
                  {settings.currencySymbol}
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-2xl font-bold text-xs shadow-sm transition-all"
                >
                  تأكيد استلام المبلغ
                </button>
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="py-3 px-4 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-2xl font-bold text-xs"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ADD / EDIT CUSTOMER MODAL */}
      {/* ======================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold">
                  {editingCust ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-5 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">اسم العميل *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: يوسف المحمود"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-emerald-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">رقم الهاتف</label>
                <input
                  type="tel"
                  placeholder="05..."
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">العنوان</label>
                <input
                  type="text"
                  placeholder="المدينة، الحي..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">ملاحظات إضافية</label>
                <input
                  type="text"
                  placeholder="ملاحظات حول طريقة السداد أو التوصيل..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-xs shadow-sm transition-all"
                >
                  حفظ العميل
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="py-3 px-4 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-2xl font-bold text-xs"
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

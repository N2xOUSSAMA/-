import React, { useState, useEffect } from 'react';
import { Category, Product, StoreSettings, User } from '../../types';
import { StorageService } from '../../services/storage';
import { BarcodePrintModal } from './BarcodePrintModal';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  Barcode,
  Edit2,
  Trash2,
  TrendingUp,
  Download,
  Filter,
  CheckCircle2,
  Printer,
  Sparkles,
  Layers,
  ArrowUpDown,
  X,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';

interface InventoryViewProps {
  currentUser: User;
  settings: StoreSettings;
  onRefreshData?: () => void;
  onBackToPOS?: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  currentUser,
  settings,
  onRefreshData,
  onBackToPOS,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  // Modals
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isStockAdjustModalOpen, setIsStockAdjustModalOpen] = useState<boolean>(false);
  const [stockAdjustProduct, setStockAdjustProduct] = useState<Product | null>(null);
  const [adjustQuantity, setAdjustQuantity] = useState<number>(10);
  const [adjustType, setAdjustType] = useState<'add' | 'set'>('add');

  // Print Barcode Label Modal
  const [isBarcodePrintModalOpen, setIsBarcodePrintModalOpen] = useState<boolean>(false);
  const [printBarcodeProduct, setPrintBarcodeProduct] = useState<Product | null>(null);
  const [barcodePrintCount, setBarcodePrintCount] = useState<number>(4);

  // Form State for Add / Edit
  const [formData, setFormData] = useState<{
    barcode: string;
    name: string;
    categoryId: string;
    costPrice: number;
    sellingPrice: number;
    stock: number;
    minStockAlert: number;
    unit: string;
    notes: string;
  }>({
    barcode: '',
    name: '',
    categoryId: 'cat_food',
    costPrice: 0,
    sellingPrice: 0,
    stock: 10,
    minStockAlert: 5,
    unit: 'قطعة',
    notes: '',
  });

  // Category Add Modal
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>('');

  // Delete Product Confirmation Modal
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const loadData = () => {
    setProducts(StorageService.getProducts());
    setCategories(StorageService.getCategories());
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAddModal = () => {
    const generatedBarcode = `${settings.barcodePrefix || '613'}${Math.floor(1000000 + Math.random() * 9000000)}`;
    setEditingProduct(null);
    setFormData({
      barcode: generatedBarcode,
      name: '',
      categoryId: categories[1]?.id || 'cat_food',
      costPrice: 0,
      sellingPrice: 0,
      stock: 10,
      minStockAlert: 5,
      unit: 'قطعة',
      notes: '',
    });
    setIsAddEditModalOpen(true);
  };

  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      barcode: p.barcode,
      name: p.name,
      categoryId: p.categoryId,
      costPrice: p.costPrice,
      sellingPrice: p.sellingPrice,
      stock: p.stock,
      minStockAlert: p.minStockAlert,
      unit: p.unit,
      notes: p.notes || '',
    });
    setIsAddEditModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.barcode.trim()) {
      alert('يرجى ملء اسم المنتج والباركود');
      return;
    }

    const currentProds = StorageService.getProducts();

    // Check duplicate barcode
    const duplicate = currentProds.find(
      (p) => p.barcode === formData.barcode.trim() && p.id !== editingProduct?.id
    );
    if (duplicate) {
      alert(`الباركود "${formData.barcode}" مستخدم مسبقاً للمنتج: ${duplicate.name}`);
      return;
    }

    if (editingProduct) {
      // Update
      const updated = currentProds.map((p) =>
        p.id === editingProduct.id
          ? {
              ...p,
              barcode: formData.barcode.trim(),
              name: formData.name.trim(),
              categoryId: formData.categoryId,
              costPrice: Number(formData.costPrice),
              sellingPrice: Number(formData.sellingPrice),
              stock: Number(formData.stock),
              minStockAlert: Number(formData.minStockAlert),
              unit: formData.unit.trim(),
              notes: formData.notes.trim(),
            }
          : p
      );
      StorageService.saveProducts(updated);
    } else {
      // Create new
      const newProd: Product = {
        id: 'prod_' + Date.now(),
        barcode: formData.barcode.trim(),
        name: formData.name.trim(),
        categoryId: formData.categoryId,
        costPrice: Number(formData.costPrice),
        sellingPrice: Number(formData.sellingPrice),
        stock: Number(formData.stock),
        minStockAlert: Number(formData.minStockAlert),
        unit: formData.unit.trim(),
        notes: formData.notes.trim(),
        isAvailable: true,
      };
      StorageService.saveProducts([newProd, ...currentProds]);
    }

    StorageService.playSuccessBeep();
    loadData();
    if (onRefreshData) onRefreshData();
    setIsAddEditModalOpen(false);
  };

  const handleDeleteProduct = (product: Product) => {
    setProductToDelete(product);
  };

  const confirmDeleteProduct = () => {
    if (!productToDelete) return;
    const currentProds = StorageService.getProducts();
    const updated = currentProds.filter((p) => p.id !== productToDelete.id);
    StorageService.saveProducts(updated);
    StorageService.playSuccessBeep();
    loadData();
    if (onRefreshData) onRefreshData();
    setProductToDelete(null);
  };

  // Stock In / Adjust Submit
  const handleStockAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockAdjustProduct) return;

    let newStock = stockAdjustProduct.stock;
    if (adjustType === 'add') {
      newStock += Number(adjustQuantity);
    } else {
      newStock = Number(adjustQuantity);
    }

    const currentProds = StorageService.getProducts();
    const updated = currentProds.map((p) =>
      p.id === stockAdjustProduct.id ? { ...p, stock: Math.max(0, newStock) } : p
    );
    StorageService.saveProducts(updated);
    StorageService.playSuccessBeep();
    loadData();
    if (onRefreshData) onRefreshData();
    setIsStockAdjustModalOpen(false);
  };

  // Add category
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const newCat: Category = {
      id: 'cat_' + Date.now(),
      name: newCategoryName.trim(),
      color: 'slate',
    };
    const updated = [...categories, newCat];
    setCategories(updated);
    StorageService.saveCategories(updated);
    setNewCategoryName('');
    setIsAddCategoryOpen(false);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['الباركود', 'اسم المنتج', 'التصنيف', 'سعر الشراء', 'سعر البيع', 'الكمية المتوفرة', 'الوحدة', 'هامش الربح'];
    const rows = products.map((p) => {
      const cat = categories.find((c) => c.id === p.categoryId)?.name || '';
      const margin = p.sellingPrice - p.costPrice;
      return [
        `"${p.barcode}"`,
        `"${p.name}"`,
        `"${cat}"`,
        p.costPrice,
        p.sellingPrice,
        p.stock,
        `"${p.unit}"`,
        margin,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      p.name.toLowerCase().includes(query) ||
      p.barcode.toLowerCase().includes(query) ||
      (p.notes && p.notes.toLowerCase().includes(query));

    let matchesStock = true;
    if (stockFilter === 'low') {
      matchesStock = p.stock > 0 && p.stock <= p.minStockAlert;
    } else if (stockFilter === 'out') {
      matchesStock = p.stock <= 0;
    }

    return matchesCat && matchesSearch && matchesStock;
  });

  // Calculate inventory metrics
  const totalItemsCount = products.reduce((sum, p) => sum + p.stock, 0);
  const totalCostValue = products.reduce((sum, p) => sum + p.costPrice * p.stock, 0);
  const totalSellingValue = products.reduce((sum, p) => sum + p.sellingPrice * p.stock, 0);
  const potentialProfit = totalSellingValue - totalCostValue;
  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= p.minStockAlert).length;
  const outOfStockCount = products.filter((p) => p.stock <= 0).length;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-100 overflow-hidden">
      {/* Top Header Bar */}
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
              <Package className="w-5 h-5 text-emerald-600" />
              إدارة المخزون والمنتجات
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              إجمالي {products.length} صنف مسجل في قاعدة البيانات
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsBarcodePrintModalOpen(true)}
            className="py-2.5 px-3.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
            title="طباعة وتوليد ملصقات الباركود للسلع والرفوف"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-600" />
            <span>طباعة ملصقات الباركود</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="py-2.5 px-3.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تصدير Excel/CSV</span>
          </button>

          <button
            onClick={() => setIsAddCategoryOpen(true)}
            className="py-2.5 px-3.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>إضافة تصنيف</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة منتج جديد</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards (For Admin / Manager Overview) */}
      <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500">إجمالي قطع المخزون</div>
          <div className="text-base sm:text-lg font-black text-slate-900 font-mono mt-1">
            {totalItemsCount.toLocaleString()} <span className="text-xs font-sans text-slate-400">وحدة</span>
          </div>
        </div>

        {currentUser.role === 'admin' && (
          <>
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-semibold text-slate-500">قيمة الشراء (رأس المال)</div>
              <div className="text-base sm:text-lg font-black text-slate-900 font-mono mt-1">
                {totalCostValue.toLocaleString()} <span className="text-xs font-sans text-slate-400">{settings.currencySymbol}</span>
              </div>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-semibold text-slate-500">القيمة البيعية المتوقعة</div>
              <div className="text-base sm:text-lg font-black text-emerald-700 font-mono mt-1">
                {totalSellingValue.toLocaleString()} <span className="text-xs font-sans text-slate-400">{settings.currencySymbol}</span>
              </div>
            </div>
          </>
        )}

        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500">تنبيهات النواقص</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-bold text-amber-700 font-mono">
              {lowStockCount} منخفض
            </span>
            {outOfStockCount > 0 && (
              <span className="text-xs font-bold text-rose-700 font-mono bg-rose-50 px-1 rounded">
                {outOfStockCount} نفد
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 sm:p-4 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ابحث بالاسم أو الباركود..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-9 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:bg-white focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium"
          >
            <option value="all">جميع التصنيفات ({products.length})</option>
            {categories
              .filter((c) => c.id !== 'cat_all')
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>

          {/* Stock state filter */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              onClick={() => setStockFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                stockFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setStockFilter('low')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                stockFilter === 'low' ? 'bg-amber-100 text-amber-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              أوشكت ({lowStockCount})
            </button>
            <button
              onClick={() => setStockFilter('out')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                stockFilter === 'out' ? 'bg-rose-100 text-rose-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              نافدة ({outOfStockCount})
            </button>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="p-3.5">الباركود</th>
                  <th className="p-3.5">اسم المنتج</th>
                  <th className="p-3.5">التصنيف</th>
                  {currentUser.role === 'admin' && <th className="p-3.5">سعر الشراء</th>}
                  <th className="p-3.5">سعر البيع</th>
                  {currentUser.role === 'admin' && <th className="p-3.5">الربح للقطعة</th>}
                  <th className="p-3.5">المخزون الحالي</th>
                  <th className="p-3.5 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      لا توجد منتجات مطابقة لخيارات البحث الحالية
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const catName = categories.find((c) => c.id === p.categoryId)?.name || 'غير محدد';
                    const profitPerItem = p.sellingPrice - p.costPrice;
                    const profitMarginPercent =
                      p.sellingPrice > 0 ? ((profitPerItem / p.sellingPrice) * 100).toFixed(0) : 0;
                    const isOut = p.stock <= 0;
                    const isLow = p.stock > 0 && p.stock <= p.minStockAlert;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Barcode */}
                        <td className="p-3.5 font-mono text-slate-600 font-semibold">
                          <span className="bg-slate-100 px-2 py-0.5 rounded-md text-[11px] border border-slate-200">
                            {p.barcode}
                          </span>
                        </td>

                        {/* Name */}
                        <td className="p-3.5 font-bold text-slate-900">
                          <div>{p.name}</div>
                          {p.notes && (
                            <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                              {p.notes}
                            </div>
                          )}
                        </td>

                        {/* Category */}
                        <td className="p-3.5 text-slate-600">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg text-[11px]">
                            {catName}
                          </span>
                        </td>

                        {/* Cost Price (Admin only) */}
                        {currentUser.role === 'admin' && (
                          <td className="p-3.5 font-mono text-slate-700">
                            {p.costPrice.toFixed(2)} {settings.currencySymbol}
                          </td>
                        )}

                        {/* Selling Price */}
                        <td className="p-3.5 font-mono font-bold text-emerald-800">
                          {p.sellingPrice.toFixed(2)} {settings.currencySymbol}
                        </td>

                        {/* Margin (Admin only) */}
                        {currentUser.role === 'admin' && (
                          <td className="p-3.5">
                            <span className="font-mono text-emerald-700 font-bold">
                              +{profitPerItem.toFixed(2)} {settings.currencySymbol}
                            </span>
                            <span className="text-[10px] text-slate-400 mr-1">
                              ({profitMarginPercent}%)
                            </span>
                          </td>
                        )}

                        {/* Stock */}
                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`font-mono font-bold px-2 py-0.5 rounded-md text-xs ${
                                isOut
                                  ? 'bg-rose-100 text-rose-800'
                                  : isLow
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-emerald-50 text-emerald-800'
                              }`}
                            >
                              {p.stock} {p.unit}
                            </span>
                            {isLow && (
                              <span className="text-[10px] text-amber-700 font-bold">
                                (الحد: {p.minStockAlert})
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* Stock in / adjust */}
                            <button
                              onClick={() => {
                                setStockAdjustProduct(p);
                                setAdjustQuantity(10);
                                setAdjustType('add');
                                setIsStockAdjustModalOpen(true);
                              }}
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg transition-colors text-xs font-bold flex items-center gap-1"
                              title="تزويد / تعديل الكمية"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>توريد</span>
                            </button>

                            {/* Barcode Print */}
                            <button
                              onClick={() => {
                                setPrintBarcodeProduct(p);
                                setIsBarcodePrintModalOpen(true);
                              }}
                              className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
                              title="طباعة ملصق الباركود"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit */}
                            <button
                              onClick={() => handleOpenEditModal(p)}
                              className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg transition-colors"
                              title="تعديل بيانات المنتج"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete (Admin only) */}
                            {currentUser.role === 'admin' && (
                              <button
                                onClick={() => handleDeleteProduct(p)}
                                className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                                title="حذف المنتج"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
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

      {/* ======================================================== */}
      {/* ADD / EDIT PRODUCT MODAL */}
      {/* ======================================================== */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold">
                  {editingProduct ? 'تعديل بيانات المنتج' : 'إضافة منتج جديد للمخزن'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddEditModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 space-y-4 overflow-y-auto">
              {/* Barcode with auto-generate */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700">رمز الباركود *</label>
                  <button
                    type="button"
                    onClick={() => {
                      const gen = `${settings.barcodePrefix || '613'}${Math.floor(1000000 + Math.random() * 9000000)}`;
                      setFormData((prev) => ({ ...prev, barcode: gen }));
                    }}
                    className="text-[11px] text-emerald-700 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Sparkles className="w-3 h-3" />
                    توليد باركود تلقائي
                  </button>
                </div>
                <div className="relative">
                  <Barcode className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="مثال: 6130001001"
                    className="w-full pl-3 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Product Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">اسم المنتج *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: حليب معقم كامل الدسم 1 لتر"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-emerald-500"
                />
              </div>

              {/* Category & Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">التصنيف</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-emerald-500"
                  >
                    {categories
                      .filter((c) => c.id !== 'cat_all')
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">الوحدة</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="قطعة، علبة، كغ..."
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Cost Price & Selling Price */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    سعر الشراء (التكلفة)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={formData.costPrice || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-emerald-800">
                    سعر البيع للجمهور *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={formData.sellingPrice || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-mono font-bold text-emerald-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Profit Margin Preview */}
                <div className="col-span-2 pt-1 text-[11px] flex justify-between text-slate-600 border-t border-slate-200">
                  <span>صافي الربح المتوقع للقطعة:</span>
                  <span className="font-bold font-mono text-emerald-700">
                    {(formData.sellingPrice - formData.costPrice).toFixed(2)} {settings.currencySymbol}
                    {formData.sellingPrice > 0 &&
                      ` (${(((formData.sellingPrice - formData.costPrice) / formData.sellingPrice) * 100).toFixed(0)}%)`}
                  </span>
                </div>
              </div>

              {/* Initial Stock & Alert Threshold */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">الكمية المتوفرة حالياً</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={formData.stock}
                    onChange={(e) =>
                      setFormData({ ...formData, stock: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">حد تنبيه النقص</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={formData.minStockAlert}
                    onChange={(e) =>
                      setFormData({ ...formData, minStockAlert: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:bg-white focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">ملاحظات إضافية (تاريخ صلاحية، موقع الرف...)</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="مثال: الرف رقم 3"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-emerald-500"
                />
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-2xl font-bold text-xs shadow-sm transition-all"
                >
                  حفظ المنتج
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddEditModalOpen(false)}
                  className="py-3 px-5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-2xl font-bold text-xs"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STOCK IN / ADJUST MODAL */}
      {/* ======================================================== */}
      {isStockAdjustModalOpen && stockAdjustProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold">تزويد أو جرد المخزون</h3>
              </div>
              <button
                onClick={() => setIsStockAdjustModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleStockAdjustSubmit} className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="text-xs font-bold text-slate-900">{stockAdjustProduct.name}</div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                  الباركود: {stockAdjustProduct.barcode} • المتوفر حالياً: {stockAdjustProduct.stock} {stockAdjustProduct.unit}
                </div>
              </div>

              {/* Adjust Type */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustType('add')}
                  className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                    adjustType === 'add'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  + إضافة كمية واردة
                </button>

                <button
                  type="button"
                  onClick={() => setAdjustType('set')}
                  className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                    adjustType === 'set'
                      ? 'bg-blue-50 border-blue-500 text-blue-900'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  تعديل الكمية بالضبط
                </button>
              </div>

              {/* Quantity input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  {adjustType === 'add' ? 'الكمية المراد إضافتها:' : 'الكمية الفعلية بعد الجرد:'}
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={adjustQuantity}
                  onChange={(e) => setAdjustQuantity(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                  autoFocus
                />
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl text-xs text-emerald-900 font-semibold flex justify-between">
                <span>الرصيد الجديد المتوقع:</span>
                <span className="font-mono font-bold">
                  {adjustType === 'add'
                    ? stockAdjustProduct.stock + adjustQuantity
                    : adjustQuantity}{' '}
                  {stockAdjustProduct.unit}
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs"
                >
                  حفظ وتحديث المخزون
                </button>
                <button
                  type="button"
                  onClick={() => setIsStockAdjustModalOpen(false)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* BARCODE LABEL PRINT MODAL */}
      {/* ======================================================== */}
      <BarcodePrintModal
        isOpen={isBarcodePrintModalOpen}
        onClose={() => {
          setIsBarcodePrintModalOpen(false);
          setPrintBarcodeProduct(null);
        }}
        products={products}
        settings={settings}
        preselectedProduct={printBarcodeProduct}
      />

      {/* ======================================================== */}
      {/* DELETE PRODUCT MODAL */}
      {/* ======================================================== */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-100 p-5 text-right space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 border-b border-slate-100 pb-3">
              <div className="p-3 bg-rose-50 rounded-2xl">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">تأكيد حذف المنتج</h3>
                <p className="text-xs text-slate-500 font-medium">{productToDelete.name}</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>الباركود:</span>
                <span className="font-bold text-slate-900 font-mono">{productToDelete.barcode}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>سعر البيع:</span>
                <span className="font-bold text-slate-900">
                  {productToDelete.sellingPrice.toFixed(2)} {settings.currencySymbol}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>الكمية الحالية:</span>
                <span className="font-bold text-slate-900">
                  {productToDelete.stock} {productToDelete.unit}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              هل أنت متأكد من رغبتك في حذف هذا الصنف نهائياً من قاعدة بيانات المخزون؟
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={confirmDeleteProduct}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold shadow-md shadow-rose-600/20 flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>حذف نهائي</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ADD CATEGORY MODAL */}
      {/* ======================================================== */}
      {isAddCategoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">إضافة تصنيف جديد</h3>
              <button
                onClick={() => setIsAddCategoryOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddCategory} className="p-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  اسم التصنيف الجديد *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: خضار وفواكه، إلكترونيات..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-emerald-500"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs"
                >
                  إضافة
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddCategoryOpen(false)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
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

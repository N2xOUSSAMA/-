import React, { useState, useEffect, useRef } from 'react';
import {
  CartItem,
  Category,
  Customer,
  HeldOrder,
  PaymentMethod,
  Product,
  DeletedProduct,
  Sale,
  StoreSettings,
  User,
} from '../../types';
import { StorageService } from '../../services/storage';
import { BarcodeScannerModal } from '../Common/BarcodeScannerModal';
import { ReceiptModal } from './ReceiptModal';
import { BarcodePrintModal } from '../Inventory/BarcodePrintModal';
import {
  Search,
  Barcode,
  Camera,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Clock,
  ArrowRightLeft,
  UserPlus,
  Percent,
  Layers,
  Sparkles,
  ShoppingBag,
  AlertTriangle,
  RotateCcw,
  Undo2,
  History,
  Archive,
  RefreshCw,
  Calendar,
  Check,
  X,
  FileText,
  User as UserIcon,
  Gamepad2,
  Smartphone,
  Landmark,
  Play,
  Pause,
  Flame,
  Zap,
  SlidersHorizontal,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  MoveHorizontal,
  LayoutGrid,
  Rows3,
  Edit3,
  Coins,
  PhoneCall,
  Cigarette,
  Save,
  Scale,
  Printer,
  Package,
} from 'lucide-react';

interface POSViewProps {
  currentUser: User;
  settings: StoreSettings;
  onRefreshData?: () => void;
  onNavigateTab?: (tab: 'pos' | 'inventory' | 'sales' | 'customers' | 'reports' | 'settings') => void;
}

interface ProductShelfRowProps {
  category: Category;
  products: Product[];
  cartItems: CartItem[];
  settings: StoreSettings;
  onAddToCart: (prod: Product, qty: number) => void;
  onOpenFlexy?: (prod?: Product) => void;
  onOpenCigarette?: (prod: Product) => void;
  onOpenNutsWeight?: (prod: Product) => void;
  onOpenPriceEdit?: (prod: Product) => void;
  recentlyAddedId: string | null;
}

export const isFlexyProduct = (prod: Product): boolean => {
  if (!prod || !prod.name) return false;
  if (prod.categoryId === 'cat_flexy_digital') return true;

  const nameLower = prod.name.trim().toLowerCase();
  
  // Exclude phone accessories or physical hardware
  if (
    nameLower.includes('كفر') ||
    nameLower.includes('جراب') ||
    nameLower.includes('شاحن') ||
    nameLower.includes('سلك') ||
    nameLower.includes('سماعة') ||
    nameLower.includes('حامل')
  ) {
    return false;
  }

  return (
    nameLower.includes('فليكسي') ||
    nameLower.includes('تعبئة رصيد') ||
    nameLower.includes('شحن رصيد') ||
    nameLower.includes('شحن موبيليس') ||
    nameLower.includes('شحن جيزي') ||
    nameLower.includes('شحن أوريدو') ||
    nameLower.includes('flexy') ||
    nameLower.includes('recharge')
  );
};

export const isCigaretteProduct = (prod: Product): boolean => {
  if (!prod || !prod.name) return false;

  // 1. If explicit tobacco category, it is tobacco
  if (prod.categoryId === 'cat_tobacco') {
    return true;
  }

  // 2. If it belongs to any non-tobacco category, NEVER treat as cigarette
  const nonTobaccoCategories = [
    'cat_perfume',
    'cat_drinks',
    'cat_snacks',
    'cat_phone_acc',
    'cat_office_print',
    'cat_online_services',
    'cat_watches_gifts',
    'cat_car_travel',
    'cat_small_electronics',
    'cat_nuts_weight',
    'cat_flexy_digital',
  ];
  if (prod.categoryId && nonTobaccoCategories.includes(prod.categoryId)) {
    return false;
  }

  const nameLower = prod.name.trim().toLowerCase();

  // 3. Exclude cosmetic, skincare, hygiene, food, or electronics keywords
  const nonTobaccoKeywords = [
    'كريم', 'cream', 'crème', 'creme',
    'بلسم', 'balm',
    'لوشن', 'lotion',
    'شامبو', 'shampoo',
    'عطر', 'perfume', 'parfum', 'eau de',
    'مكياج', 'ماكياج', 'makeup',
    'سيروم', 'serum',
    'صابون', 'soap',
    'فازلين', 'vaseline',
    'مرطب', 'حريمي', 'نسائي', 'تجميل',
    'مزيل', 'معجون', 'فرشاة', 'حلاقة',
    'شعر', 'بشرة', 'gel', 'جل', 'ماسك', 'mask',
    'زيت', 'أظافر', 'حمرة', 'روج', 'بودرة',
    'شيبس', 'شوكولا', 'بسكويت', 'عصير', 'ماء', 'مشروب',
    'كابل', 'شاحن', 'سماعة', 'كفر'
  ];
  if (nonTobaccoKeywords.some((kw) => nameLower.includes(kw))) {
    return false;
  }

  // 4. Strict tobacco brands & terms
  const tobaccoTerms = [
    'سجائر', 'سيكار', 'سيجار', 'شمة', 'معسل', 'تبغ', 'دخان',
    'مارلبورو', 'marlboro',
    'ونستون', 'winston',
    'قولواز', 'gauloises',
    'روثمان', 'rothmans',
    'كابتن بلاك', 'captain black',
    'شيلسي', 'chelsea',
    'كاريليا', 'karelia',
    'سفير', 'safir',
    'بزنس', 'business',
    'إل إم', 'l&m', 'l & m',
    'شيشة', 'فحم شيشة'
  ];
  if (tobaccoTerms.some((term) => nameLower.includes(term))) {
    return true;
  }

  // 5. Check exact standalone words (e.g. "ريم" for Rym cigarettes, "lm")
  const words = nameLower.split(/[\s,\-_/]+/);
  if (words.some((w) => w === 'ريم' || w === 'الريم' || w === 'rym' || w === 'ryme')) {
    return true;
  }
  if (words.some((w) => w === 'lm')) {
    return true;
  }

  return false;
};

export const isNutOrWeightProduct = (prod: Product): boolean => {
  if (!prod || !prod.name) return false;

  // Non-bulk food categories
  const nonNutCategories = [
    'cat_perfume',
    'cat_phone_acc',
    'cat_tobacco',
    'cat_flexy_digital',
    'cat_office_print',
    'cat_online_services',
    'cat_watches_gifts',
    'cat_car_travel',
    'cat_small_electronics',
    'cat_drinks',
  ];
  if (prod.categoryId && nonNutCategories.includes(prod.categoryId)) {
    return false;
  }

  const nameLower = prod.name.trim().toLowerCase();

  // Exclude cosmetics or packaged non-weight goods
  const cosmeticOrPackedKeywords = [
    'كريم', 'زيت', 'شامبو', 'صابون', 'لوشن', 'عطر', 'بلسم', 'سيروم', 'مرطب', 'تجميل'
  ];
  if (cosmeticOrPackedKeywords.some((kw) => nameLower.includes(kw))) {
    return false;
  }

  if (prod.categoryId === 'cat_nuts_weight') return true;
  if (prod.unit === 'كغ' || prod.unit === 'غرام') return true;

  const nutTerms = [
    'كاوكاو', 'لوز', 'جوز', 'كاجو', 'بيستاش', 'فستق', 'بندق',
    'مكسرات', 'زريعة', 'حلقوم', 'زبيب', 'تين مجفف', 'مشمش مجفف'
  ];

  return nutTerms.some((term) => nameLower.includes(term));
};

interface POSProductCardProps {
  prod: Product;
  settings: StoreSettings;
  cartItems: CartItem[];
  recentlyAddedId: string | null;
  onAddToCart: (prod: Product, qty: number) => void;
  onOpenFlexy?: (prod?: Product) => void;
  onOpenCigarette?: (prod: Product) => void;
  onOpenNutsWeight?: (prod: Product) => void;
  onOpenPriceEdit?: (prod: Product) => void;
  compactWidth?: boolean;
  onDragMovedCheck?: () => boolean;
}

export const POSProductCard: React.FC<POSProductCardProps> = ({
  prod,
  settings,
  cartItems,
  recentlyAddedId,
  onAddToCart,
  onOpenFlexy,
  onOpenCigarette,
  onOpenNutsWeight,
  onOpenPriceEdit,
  compactWidth = false,
  onDragMovedCheck,
}) => {
  const lastClickTimeRef = useRef<number>(0);
  const inCart = cartItems.find((ci) => ci.product.id === prod.id);
  const isOutOfStock = prod.stock <= 0;
  const isLowStock = prod.stock > 0 && prod.stock <= prod.minStockAlert;
  const isJustAdded = recentlyAddedId === prod.id;
  const isCig = isCigaretteProduct(prod);
  const isFlx = isFlexyProduct(prod);
  const isNut = isNutOrWeightProduct(prod);

  // Type accent colors
  const accentGradient = isFlx
    ? 'from-cyan-500 to-blue-500'
    : isCig
    ? 'from-orange-500 to-amber-600'
    : isNut
    ? 'from-amber-500 to-yellow-500'
    : 'from-emerald-500 to-teal-600';

  const typeBadge = isFlx ? (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-black bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-200/70 dark:border-cyan-800/60">
      <Zap className="w-2.5 h-2.5" />
      <span>شحن فليكسي</span>
    </span>
  ) : isNut ? (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-black bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/60">
      <Scale className="w-2.5 h-2.5" />
      <span>ميزان / وزن</span>
    </span>
  ) : isCig ? (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-black bg-orange-50 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-200/70 dark:border-orange-800/60">
      <Cigarette className="w-2.5 h-2.5" />
      <span>سجائر / تبغ</span>
    </span>
  ) : null;

  const handleCardClick = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const now = Date.now();
    if (now - lastClickTimeRef.current < 350) {
      return; // Prevent duplicate double-clicks
    }
    lastClickTimeRef.current = now;

    if (onDragMovedCheck && onDragMovedCheck()) return;
    if (isOutOfStock) return;

    if (isFlx && onOpenFlexy) {
      onOpenFlexy(prod);
    } else if (isCig && onOpenCigarette) {
      onOpenCigarette(prod);
    } else if (isNut && onOpenNutsWeight) {
      onOpenNutsWeight(prod);
    } else {
      onAddToCart(prod, 1);
    }
  };

  return (
    <div
      className={`group relative rounded-2xl border transition-all duration-150 flex flex-col justify-between select-none overflow-hidden ${
        compactWidth ? 'w-44 sm:w-48 shrink-0' : 'w-full'
      } ${
        isOutOfStock
          ? 'bg-slate-100/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-60'
          : isJustAdded
          ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 scale-[1.02] shadow-md ring-2 ring-emerald-500/40'
          : inCart
          ? 'bg-emerald-50/40 dark:bg-emerald-950/30 border-emerald-400/80 dark:border-emerald-700 shadow-2xs ring-1 ring-emerald-500/20'
          : 'bg-white dark:bg-slate-900 hover:bg-slate-50/90 dark:hover:bg-slate-800/90 border-slate-200/90 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-xs'
      }`}
    >
      {/* Top Colorful Accent Strip */}
      <div className={`h-1 w-full bg-linear-to-r ${accentGradient}`} />

      {/* Card Content Top Section */}
      <div className="p-3 flex flex-col flex-1">
        {/* Header Meta: Barcode, Quick Edit, & In-Cart Badge */}
        <div className="flex items-center justify-between gap-1 w-full mb-2">
          {/* Barcode Chip */}
          <div className="flex items-center gap-1 min-w-0">
            <span className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100/90 dark:bg-slate-800/80 px-1.5 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700/60">
              <Barcode className="w-2.5 h-2.5 text-slate-400 shrink-0" />
              <span className="truncate">{prod.barcode ? prod.barcode.slice(-5) : '---'}</span>
            </span>
            {typeBadge}
          </div>

          {/* Quick Actions & Cart Badge */}
          <div className="flex items-center gap-1 shrink-0">
            {onOpenPriceEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onOpenPriceEdit(prod);
                }}
                className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors cursor-pointer"
                title="تعديل السعر السريع"
              >
                <Edit3 className="w-3 h-3 text-blue-500" />
              </button>
            )}

            {inCart && (
              <span className="bg-emerald-600 dark:bg-emerald-500 text-white font-black text-[10px] px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-2xs">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
                <span>{inCart.quantity}</span>
              </span>
            )}
          </div>
        </div>

        {/* Product Info Clickable Body */}
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => handleCardClick(e)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleCardClick();
            }
          }}
          className={`text-right w-full flex-1 flex flex-col justify-between cursor-pointer focus:outline-none ${
            isOutOfStock ? 'cursor-not-allowed opacity-75' : ''
          }`}
        >
          {/* Product Name */}
          <h4 className="text-xs sm:text-[13px] font-extrabold text-slate-900 dark:text-slate-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 leading-snug line-clamp-2 min-h-[2.4rem] tracking-tight transition-colors">
            {prod.name}
          </h4>

          {/* Price & Stock Display Ribbon */}
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-end justify-between gap-1.5">
            {/* Price */}
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
                  {prod.sellingPrice.toLocaleString()}
                </span>
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                  {settings.currencySymbol}
                </span>
              </div>
              <div className="text-[10px] font-medium text-slate-400 dark:text-slate-400">
                لكل {prod.unit}
              </div>
            </div>

            {/* Stock Indicator Pill */}
            <div className="shrink-0">
              {isOutOfStock ? (
                <span className="text-[9px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border border-rose-200/70 dark:border-rose-800/60 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                  نفد
                </span>
              ) : isLowStock ? (
                <span className="text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200/70 dark:border-amber-800/60 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                  <AlertTriangle className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                  بقي {prod.stock}
                </span>
              ) : (
                <span className="text-[9px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md font-mono border border-slate-200/60 dark:border-slate-700/60">
                  {prod.stock} {prod.unit}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Button Strip */}
        <div className="mt-2.5 pt-1">
          {isNut && onOpenNutsWeight && !isOutOfStock ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpenNutsWeight(prod);
              }}
              className="w-full py-1.5 px-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="بيع بالميزان أو بالمبلغ"
            >
              <Scale className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              <span>بيع بالميزان / المبلغ</span>
            </button>
          ) : isCig && onOpenCigarette && !isOutOfStock ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpenCigarette(prod);
              }}
              className="w-full py-1.5 px-2 bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/40 dark:hover:bg-orange-900/60 text-orange-900 dark:text-orange-300 border border-orange-200 dark:border-orange-800 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="بيع بالحبة أو بالعلبة"
            >
              <Cigarette className="w-3 h-3 text-orange-600 dark:text-orange-400" />
              <span>بالحبة / العلبة</span>
            </button>
          ) : isFlx && onOpenFlexy ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpenFlexy(prod);
              }}
              className="w-full py-1.5 px-2 bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/40 dark:hover:bg-cyan-900/60 text-cyan-900 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="شحن رصيد حر"
            >
              <Zap className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
              <span>شحن رصيد</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={isOutOfStock}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCardClick(e);
              }}
              className={`w-full py-1.5 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                isOutOfStock
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-100 hover:bg-emerald-600 active:bg-emerald-700 text-slate-700 hover:text-white dark:bg-slate-800 dark:hover:bg-emerald-600 dark:text-slate-300 dark:hover:text-white border border-slate-200/80 dark:border-slate-700 hover:border-emerald-600'
              }`}
            >
              <Plus className="w-3 h-3" />
              <span>إضافة للسلة</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const ProductShelfRow: React.FC<ProductShelfRowProps> = ({
  category,
  products,
  cartItems,
  settings,
  onAddToCart,
  onOpenFlexy,
  onOpenCigarette,
  onOpenNutsWeight,
  onOpenPriceEdit,
  recentlyAddedId,
}) => {
  const shelfRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [dragMoved, setDragMoved] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!shelfRef.current) return;
    setIsDragging(true);
    setDragMoved(false);
    setStartX(e.pageX - shelfRef.current.offsetLeft);
    setScrollLeft(shelfRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !shelfRef.current) return;
    e.preventDefault();
    const x = e.pageX - shelfRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    if (Math.abs(walk) > 5) setDragMoved(true);
    shelfRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!shelfRef.current) return;
    if (e.deltaY !== 0) {
      shelfRef.current.scrollLeft += e.deltaY;
    }
  };

  const scrollShelf = (direction: 'right' | 'left') => {
    if (!shelfRef.current) return;
    const delta = direction === 'right' ? -360 : 360;
    shelfRef.current.scrollBy({ left: delta, behavior: 'smooth' });
  };

  if (products.length === 0) return null;

  return (
    <div className="mb-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden">
      {/* Shelf Header */}
      <div className="px-3.5 py-2.5 bg-slate-50/90 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block ring-2 ring-emerald-500/20" />
          <span className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
            {category.name}
          </span>
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-200/80 dark:bg-slate-700/80 px-2 py-0.5 rounded-full">
            {products.length} منتج
          </span>
        </div>

        {/* Scroll navigation arrows for this shelf */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => scrollShelf('right')}
            className="p-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-colors shadow-2xs cursor-pointer"
            title="تحريك القائمة لليمين"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollShelf('left')}
            className="p-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-colors shadow-2xs cursor-pointer"
            title="تحريك القائمة لليسار"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Movable Horizontal Products Track */}
      <div
        ref={shelfRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className={`p-3 flex items-stretch gap-3 overflow-x-auto no-scrollbar scroll-smooth cursor-grab ${
          isDragging ? 'cursor-grabbing select-none' : ''
        }`}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {products.map((prod) => (
          <POSProductCard
            key={`shelf_card_${prod.id}`}
            prod={prod}
            settings={settings}
            cartItems={cartItems}
            recentlyAddedId={recentlyAddedId}
            onAddToCart={onAddToCart}
            onOpenFlexy={onOpenFlexy}
            onOpenCigarette={onOpenCigarette}
            onOpenNutsWeight={onOpenNutsWeight}
            onOpenPriceEdit={onOpenPriceEdit}
            compactWidth={true}
            onDragMovedCheck={() => dragMoved}
          />
        ))}
      </div>
    </div>
  );
};

interface DeleteProductShelfRowProps {
  category: Category;
  products: Product[];
  settings: StoreSettings;
  onSelectProduct: (prod: Product) => void;
  onDeleteProduct: (prod: Product) => void;
  selectedProductId: string | null;
}

const DeleteProductShelfRow: React.FC<DeleteProductShelfRowProps> = ({
  category,
  products,
  settings,
  onSelectProduct,
  onDeleteProduct,
  selectedProductId,
}) => {
  const shelfRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [dragMoved, setDragMoved] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!shelfRef.current) return;
    setIsDragging(true);
    setDragMoved(false);
    setStartX(e.pageX - shelfRef.current.offsetLeft);
    setScrollLeft(shelfRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !shelfRef.current) return;
    e.preventDefault();
    const x = e.pageX - shelfRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    if (Math.abs(walk) > 5) setDragMoved(true);
    shelfRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!shelfRef.current) return;
    if (e.deltaY !== 0) {
      shelfRef.current.scrollLeft += e.deltaY;
    }
  };

  const scrollShelf = (direction: 'right' | 'left') => {
    if (!shelfRef.current) return;
    const delta = direction === 'right' ? -360 : 360;
    shelfRef.current.scrollBy({ left: delta, behavior: 'smooth' });
  };

  if (products.length === 0) return null;

  return (
    <div className="mb-4 bg-white dark:bg-slate-900 rounded-2xl border border-rose-200/80 dark:border-rose-900/50 shadow-2xs overflow-hidden">
      {/* Shelf Header */}
      <div className="px-3.5 py-2.5 bg-rose-50/70 dark:bg-rose-950/40 border-b border-rose-200/60 dark:border-rose-900/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block ring-2 ring-rose-500/20" />
          <span className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
            {category.name}
          </span>
          <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/60 px-2 py-0.5 rounded-full">
            {products.length} منتج
          </span>
        </div>

        {/* Scroll navigation arrows */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => scrollShelf('right')}
            className="p-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 text-slate-700 dark:text-slate-300 transition-colors shadow-2xs cursor-pointer"
            title="تحريك القائمة لليمين"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollShelf('left')}
            className="p-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 text-slate-700 dark:text-slate-300 transition-colors shadow-2xs cursor-pointer"
            title="تحريك القائمة لليسار"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Movable Horizontal Track */}
      <div
        ref={shelfRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className={`p-3 flex items-stretch gap-3 overflow-x-auto no-scrollbar scroll-smooth cursor-grab ${
          isDragging ? 'cursor-grabbing select-none' : ''
        }`}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {products.map((prod) => {
          const isSelected = selectedProductId === prod.id;
          return (
            <div
              key={`del_shelf_${prod.id}`}
              onClick={() => {
                if (dragMoved) return;
                onSelectProduct(prod);
              }}
              className={`w-44 sm:w-48 shrink-0 text-right p-3 rounded-2xl border transition-all flex flex-col justify-between cursor-pointer select-none overflow-hidden ${
                isSelected
                  ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-500 shadow-md ring-2 ring-rose-500/30'
                  : 'bg-white dark:bg-slate-900 hover:bg-rose-50/40 dark:hover:bg-slate-800/90 border-slate-200 dark:border-slate-800 hover:border-rose-400 dark:hover:border-rose-700 hover:shadow-xs'
              }`}
            >
              {/* Top Row: Barcode & Price */}
              <div className="flex items-center justify-between w-full mb-1.5">
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                  {prod.barcode ? prod.barcode.slice(-6) : '---'}
                </span>
                <span className="text-xs font-black text-rose-600 dark:text-rose-400 font-mono">
                  {prod.sellingPrice.toLocaleString()} {settings.currencySymbol}
                </span>
              </div>

              {/* Name */}
              <div className="my-1 flex-1">
                <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2 min-h-[2.2rem]">
                  {prod.name}
                </h4>
              </div>

              {/* Bottom Row: Stock & Delete Button */}
              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1 w-full">
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  المخزون: <strong className="text-slate-800 dark:text-slate-200">{prod.stock}</strong>
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteProduct(prod);
                  }}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-xs transition-colors cursor-pointer"
                  title="حذف هذا المنتج ونقله للأرشيف"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>حذف</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const POSView: React.FC<POSViewProps> = ({
  currentUser,
  settings,
  onRefreshData,
  onNavigateTab,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);

  const [selectedCategory, setSelectedCategory] = useState<string>('cat_all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Modals & Drawers
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [isHeldOrdersOpen, setIsHeldOrdersOpen] = useState<boolean>(false);
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState<boolean>(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState<boolean>(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);

  // Checkout State
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paidAmountStr, setPaidAmountStr] = useState<string>('');
  const [invoiceNotes, setInvoiceNotes] = useState<string>('');
  const [overallDiscountPercent, setOverallDiscountPercent] = useState<number>(0);

  // Quick Add Product State
  const [isQuickAddProductOpen, setIsQuickAddProductOpen] = useState<boolean>(false);
  const [newProdBarcode, setNewProdBarcode] = useState<string>('');
  const [newProdName, setNewProdName] = useState<string>('');
  const [newProdCategory, setNewProdCategory] = useState<string>('');
  const [newProdCostPrice, setNewProdCostPrice] = useState<string>('');
  const [newProdSellingPrice, setNewProdSellingPrice] = useState<string>('');
  const [newProdStock, setNewProdStock] = useState<string>('50');
  const [newProdUnit, setNewProdUnit] = useState<string>('قطعة');
  const [newProdAutoAddToCart, setNewProdAutoAddToCart] = useState<boolean>(true);
  const [isScannerForNewProdOpen, setIsScannerForNewProdOpen] = useState<boolean>(false);
  const [quickAddNotice, setQuickAddNotice] = useState<string | null>(null);

  // Quick Delete Product State
  const [isQuickDeleteProductOpen, setIsQuickDeleteProductOpen] = useState<boolean>(false);
  const [deleteModalTab, setDeleteModalTab] = useState<'products' | 'archive'>('products');
  const [deletedProductsList, setDeletedProductsList] = useState<DeletedProduct[]>([]);
  const [archiveSearchInput, setArchiveSearchInput] = useState<string>('');
  const [deleteSearchInput, setDeleteSearchInput] = useState<string>('');
  const [deleteCategoryFilter, setDeleteCategoryFilter] = useState<string>('all');
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isScannerForDeleteProdOpen, setIsScannerForDeleteProdOpen] = useState<boolean>(false);
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null);

  // New Customer Form State
  const [newCustName, setNewCustName] = useState<string>('');
  const [newCustPhone, setNewCustPhone] = useState<string>('');
  const [newCustAddress, setNewCustAddress] = useState<string>('');

  // POS Layout Mode ('shelves' = movable horizontal shelves per category, 'grid' = standard grid)
  const [posLayoutMode, setPosLayoutMode] = useState<'shelves' | 'grid'>('shelves');
  const [deleteLayoutMode, setDeleteLayoutMode] = useState<'shelves' | 'grid'>('shelves');
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);

  // Quick Flexy Top-up Modal State
  const [isFlexyModalOpen, setIsFlexyModalOpen] = useState<boolean>(false);
  const [flexyOperator, setFlexyOperator] = useState<'Mobilis' | 'Djezzy' | 'Ooredoo' | 'Idoom' | 'BaridiMob'>('Mobilis');
  const [flexyPhone, setFlexyPhone] = useState<string>('');
  const [flexyAmount, setFlexyAmount] = useState<string>('100');
  const [flexyFee, setFlexyFee] = useState<string>('0');

  // Cigarettes Piece / Pack Modal State
  const [isCigaretteModalOpen, setIsCigaretteModalOpen] = useState<boolean>(false);
  const [selectedCigaretteProd, setSelectedCigaretteProd] = useState<Product | null>(null);
  const [cigaretteSaleType, setCigaretteSaleType] = useState<'piece' | 'pack'>('piece');
  const [cigarettePieceCount, setCigarettePieceCount] = useState<number>(1);
  const [cigaretteCustomPiecePrice, setCigaretteCustomPiecePrice] = useState<string>('');
  const [cigarettePackCount, setCigarettePackCount] = useState<number>(1);

  // Nuts & Weight / Scale Modal State (حاسبة بيع المكسرات والمواد بالميزان بالمبلغ أو بالوزن)
  const [isNutsWeightModalOpen, setIsNutsWeightModalOpen] = useState<boolean>(false);
  const [selectedNutProduct, setSelectedNutProduct] = useState<Product | null>(null);
  const [nutCalculationMode, setNutCalculationMode] = useState<'by_amount' | 'by_weight'>('by_amount');
  const [nutAmountInput, setNutAmountInput] = useState<string>('100');
  const [nutWeightGramsInput, setNutWeightGramsInput] = useState<string>('200');
  const [nutCustomPricePerKg, setNutCustomPricePerKg] = useState<string>('');
  const [nutNotes, setNutNotes] = useState<string>('');
  const [nutProductSearch, setNutProductSearch] = useState<string>('');

  // Barcode Label Print Modal State
  const [isBarcodePrintModalOpen, setIsBarcodePrintModalOpen] = useState<boolean>(false);
  const [barcodePrintSelectedProduct, setBarcodePrintSelectedProduct] = useState<Product | null>(null);

  // Quick Price Manager & Individual Price Edit Modal States
  const [isPriceManagerOpen, setIsPriceManagerOpen] = useState<boolean>(false);
  const [priceManagerSearch, setPriceManagerSearch] = useState<string>('');
  const [priceManagerCategory, setPriceManagerCategory] = useState<string>('all');
  const [quickPriceEditProduct, setQuickPriceEditProduct] = useState<Product | null>(null);
  const [editSellingPriceInput, setEditSellingPriceInput] = useState<string>('');
  const [editCostPriceInput, setEditCostPriceInput] = useState<string>('');
  const [priceEditNotice, setPriceEditNotice] = useState<string | null>(null);

  // Cart Item Customizer Modal State (سعر حر مخصص، كمية، خصم بدون prompt)
  const [cartItemToEdit, setCartItemToEdit] = useState<{ index: number; item: CartItem } | null>(null);
  const [cartEditUnitPrice, setCartEditUnitPrice] = useState<string>('');
  const [cartEditQuantity, setCartEditQuantity] = useState<number>(1);
  const [cartEditDiscount, setCartEditDiscount] = useState<string>('0');
  const [cartEditSavePermanently, setCartEditSavePermanently] = useState<boolean>(false);

  // Overall Invoice Discount Modal State (بدون prompt)
  const [isOverallDiscountModalOpen, setIsOverallDiscountModalOpen] = useState<boolean>(false);
  const [invoiceDiscountInput, setInvoiceDiscountInput] = useState<string>('0');

  // Categories Bar Scroll Ref
  const categoriesBarRef = useRef<HTMLDivElement>(null);
  const scrollCategoriesBar = (direction: 'right' | 'left') => {
    if (!categoriesBarRef.current) return;
    const delta = direction === 'right' ? -250 : 250;
    categoriesBarRef.current.scrollBy({ left: delta, behavior: 'smooth' });
  };

  // Delete Categories Bar Scroll Ref
  const deleteCategoriesBarRef = useRef<HTMLDivElement>(null);
  const scrollDeleteCategoriesBar = (direction: 'right' | 'left') => {
    if (!deleteCategoriesBarRef.current) return;
    const delta = direction === 'right' ? -250 : 250;
    deleteCategoriesBarRef.current.scrollBy({ left: delta, behavior: 'smooth' });
  };

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Load initial data
  const loadData = () => {
    setProducts(StorageService.getProducts(currentUser?.id));
    setCategories(StorageService.getCategories(currentUser?.id));
    setCustomers(StorageService.getCustomers(currentUser?.id));
    setHeldOrders(StorageService.getHeldOrders(currentUser?.id));
    setDeletedProductsList(StorageService.getDeletedProducts(currentUser?.id));
  };

  useEffect(() => {
    loadData();
    if (currentUser?.id) {
      setCartItems(StorageService.getCart(currentUser.id));
    }
  }, [currentUser?.id]);

  // Persist isolated cart items for current user
  useEffect(() => {
    if (currentUser?.id) {
      StorageService.saveCart(cartItems, currentUser.id);
    }
  }, [cartItems, currentUser?.id]);

  // Hardware barcode scanner auto-focus & listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If user is typing in a form input, skip global barcode interception
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }
      if (e.key === 'F2') {
        e.preventDefault();
        setIsScannerOpen(true);
      }
      if (e.key === 'F4') {
        e.preventDefault();
        if (cartItems.length > 0) setIsCheckoutOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cartItems]);

  // Calculations
  const rawSubtotal = cartItems.reduce((sum, item) => {
    const itemTotal = item.unitPrice * item.quantity;
    const discountAmt =
      item.discountType === 'percentage'
        ? itemTotal * (item.discount / 100)
        : item.discount;
    return sum + (itemTotal - discountAmt);
  }, 0);

  const overallDiscountAmt = (rawSubtotal * overallDiscountPercent) / 100;
  const subtotalAfterDiscount = Math.max(0, rawSubtotal - overallDiscountAmt);
  const taxAmount = settings.enableTax
    ? (subtotalAfterDiscount * settings.taxRatePercent) / 100
    : 0;
  const grandTotal = subtotalAfterDiscount + taxAmount;
  const totalItemsCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const paidAmount = paidAmountStr === '' ? grandTotal : parseFloat(paidAmountStr) || 0;
  const changeAmount = Math.max(0, paidAmount - grandTotal);
  const debtRemaining = Math.max(0, grandTotal - paidAmount);

  // Add Product to Cart
  const addToCart = (product: Product, qty: number = 1) => {
    if (product.stock <= 0) {
      StorageService.playBeep();
      return;
    }

    setCartItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.product.id === product.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        const newQty = updated[existingIndex].quantity + qty;
        if (newQty <= product.stock) {
          updated[existingIndex].quantity = newQty;
          StorageService.playBeep();
        }
        return updated;
      } else {
        StorageService.playBeep();
        return [
          ...prev,
          {
            product,
            quantity: qty,
            unitPrice: product.sellingPrice,
            discount: 0,
            discountType: 'percentage',
          },
        ];
      }
    });
  };

  // Barcode Handler (from input or camera scanner)
  const handleBarcodeScanned = (code: string) => {
    if (!code) return;
    const cleanCode = code.trim();
    const allProds = StorageService.getProducts();
    const found = allProds.find(
      (p) => p.barcode.toLowerCase() === cleanCode.toLowerCase()
    );

    if (found) {
      addToCart(found, 1);
    } else {
      StorageService.playBeep();
      // Auto open quick add product with this manufacturer barcode pre-filled
      setNewProdBarcode(cleanCode);
      setNewProdName('');
      setNewProdCategory(categories.find((c) => c.id !== 'cat_all')?.id || 'cat_drinks');
      setNewProdCostPrice('');
      setNewProdSellingPrice('');
      setNewProdStock('50');
      setNewProdUnit('قطعة');
      setNewProdAutoAddToCart(true);
      setQuickAddNotice(`الباركود الممسوح (${cleanCode}) غير مسجل في المخزون بعد. سجل بيانات المنتج لحفظه لمرة واحدة واعتماده.`);
      setIsQuickAddProductOpen(true);
    }
  };

  const generateRandomBarcode = () => {
    const randomCode = '613' + Math.floor(1000000 + Math.random() * 9000000).toString();
    setNewProdBarcode(randomCode);
  };

  const handleQuickAddProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim()) {
      alert('يرجى كتابة اسم المنتج');
      return;
    }
    const barcodeToUse = newProdBarcode.trim() || ('613' + Math.floor(1000000 + Math.random() * 9000000).toString());
    const sellingPrice = parseFloat(newProdSellingPrice);
    if (isNaN(sellingPrice) || sellingPrice <= 0) {
      alert('يرجى إدخال سعر بيع صحيح');
      return;
    }
    const costPrice = parseFloat(newProdCostPrice) || (sellingPrice * 0.8);
    const stock = parseInt(newProdStock, 10) || 1;

    const allProds = StorageService.getProducts();
    if (allProds.some((p) => p.barcode.toLowerCase() === barcodeToUse.toLowerCase())) {
      alert('عذراً، هذا الباركود مسجل مسبقاً لمنتج آخر');
      return;
    }

    const newProduct: Product = {
      id: 'prod_' + Date.now(),
      barcode: barcodeToUse,
      name: newProdName.trim(),
      categoryId: newProdCategory || (categories.find((c) => c.id !== 'cat_all')?.id || 'cat_drinks'),
      costPrice,
      sellingPrice,
      stock,
      minStockAlert: 5,
      unit: newProdUnit.trim() || 'قطعة',
      isAvailable: true,
    };

    const updated = [newProduct, ...allProds];
    StorageService.saveProducts(updated);
    setProducts(updated);
    StorageService.playSuccessBeep();
    if (onRefreshData) onRefreshData();

    if (newProdAutoAddToCart) {
      addToCart(newProduct, 1);
    }

    setIsQuickAddProductOpen(false);
    setQuickAddNotice(null);
  };

  // Quick Delete Handlers
  const handleSearchOrScanDelete = (query: string) => {
    const clean = query.trim();
    setDeleteSearchInput(clean);
    if (!clean) {
      setProductToDelete(null);
      return;
    }
    const allProds = StorageService.getProducts();
    // 1. Exact barcode match
    const byBarcode = allProds.find((p) => p.barcode.toLowerCase() === clean.toLowerCase());
    if (byBarcode) {
      setProductToDelete(byBarcode);
      StorageService.playBeep();
      return;
    }
    // 2. Partial search
    const byQuery = allProds.find(
      (p) =>
        p.name.toLowerCase().includes(clean.toLowerCase()) ||
        p.barcode.toLowerCase().includes(clean.toLowerCase())
    );
    if (byQuery) {
      setProductToDelete(byQuery);
    } else {
      setProductToDelete(null);
    }
  };

  const handleDeleteProductById = (prod: Product) => {
    const deletedName = prod.name;
    StorageService.deleteProduct(prod.id);
    const updated = StorageService.getProducts();
    setProducts(updated);
    setDeletedProductsList(StorageService.getDeletedProducts());
    
    // Also remove from current cart if present
    setCartItems((prev) => prev.filter((item) => item.product.id !== prod.id));

    StorageService.playSuccessBeep();
    if (onRefreshData) onRefreshData();

    if (productToDelete?.id === prod.id) {
      setProductToDelete(null);
    }
    setDeleteNotice(`تم حذف المنتج "${deletedName}" ونقله إلى سجل المحذوفات. يمكنك استرجاعه في أي وقت.`);
  };

  const handleConfirmDeleteProductFromSystem = () => {
    if (!productToDelete) return;
    handleDeleteProductById(productToDelete);
  };

  const handleRestoreProduct = (deletedProd: DeletedProduct) => {
    const restored = StorageService.restoreProduct(deletedProd.id);
    if (restored) {
      setProducts(StorageService.getProducts());
      setDeletedProductsList(StorageService.getDeletedProducts());
      StorageService.playSuccessBeep();
      if (onRefreshData) onRefreshData();
      setDeleteNotice(`تمت استعادة المنتج "${restored.name}" بنجاح إلى النظام والمخزون!`);
    }
  };

  const handleRestoreAll = () => {
    const count = deletedProductsList.length;
    if (count === 0) return;
    StorageService.restoreAllDeletedProducts();
    setProducts(StorageService.getProducts());
    setDeletedProductsList([]);
    StorageService.playSuccessBeep();
    if (onRefreshData) onRefreshData();
    setDeleteNotice(`تمت استعادة جميع المنتجات المحذوفة (${count} منتج) إلى النظام بنجاح!`);
  };

  const handlePermanentlyDeleteFromArchive = (prod: DeletedProduct) => {
    StorageService.permanentlyDeleteProduct(prod.id);
    setDeletedProductsList(StorageService.getDeletedProducts());
    setDeleteNotice(`تم مسح المنتج "${prod.name}" نهائياً من سجل المحذوفات.`);
  };

  const handleClearArchive = () => {
    StorageService.clearDeletedProducts();
    setDeletedProductsList([]);
    setDeleteNotice('تم إفراغ سجل المحذوفات بالكامل.');
  };

  // Modify Cart Item Quantity
  const updateCartItemQuantity = (index: number, newQty: number) => {
    setCartItems((prev) => {
      if (newQty <= 0) {
        return prev.filter((_, i) => i !== index);
      }
      const item = prev[index];
      if (newQty > item.product.stock) {
        alert(`الكمية المتوفرة في المخزن هي ${item.product.stock} فقط`);
        return prev;
      }
      const updated = [...prev];
      updated[index] = { ...item, quantity: newQty };
      return updated;
    });
  };

  // Modify Cart Item Unit Price (سعر مخصص حسب الاتفاق مع الزبون)
  const updateCartItemUnitPrice = (index: number, newPrice: number) => {
    if (isNaN(newPrice) || newPrice < 0) return;
    setCartItems((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = {
          ...updated[index],
          unitPrice: newPrice,
        };
      }
      return updated;
    });
  };

  // Open individual quick price edit modal
  const handleOpenQuickPriceEdit = (prod: Product) => {
    setQuickPriceEditProduct(prod);
    setEditSellingPriceInput(prod.sellingPrice.toString());
    setEditCostPriceInput(prod.costPrice.toString());
    setPriceEditNotice(null);
  };

  // Save updated prices for product permanently in storage and state
  const handleSaveProductPrices = (productId: string, newSelling: number, newCost: number) => {
    if (isNaN(newSelling) || newSelling < 0) {
      setPriceEditNotice('يرجى إدخال سعر بيع صحيح');
      return;
    }
    const safeCost = isNaN(newCost) || newCost < 0 ? 0 : newCost;

    const allProds = StorageService.getProducts();
    const updated = allProds.map((p) =>
      p.id === productId
        ? {
            ...p,
            sellingPrice: newSelling,
            costPrice: safeCost,
          }
        : p
    );

    StorageService.saveProducts(updated);
    setProducts(updated);

    // Also update this product in active cart if present
    setCartItems((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? {
              ...item,
              unitPrice: newSelling,
              product: {
                ...item.product,
                sellingPrice: newSelling,
                costPrice: safeCost,
              },
            }
          : item
      )
    );

    StorageService.playSuccessBeep();
    setPriceEditNotice(`تم حفظ وتحديث سعر "${quickPriceEditProduct?.name || 'المنتج'}" بنجاح!`);
    setTimeout(() => {
      setQuickPriceEditProduct(null);
      setPriceEditNotice(null);
      if (onRefreshData) onRefreshData();
    }, 800);
  };

  // Open Cart Item Editor Modal (سعر مخصص، كمية، خصم بدون prompt)
  const handleOpenCartItemEdit = (index: number, item: CartItem) => {
    setCartItemToEdit({ index, item });
    setCartEditUnitPrice(item.unitPrice.toString());
    setCartEditQuantity(item.quantity);
    setCartEditDiscount(item.discount.toString());
    setCartEditSavePermanently(false);
  };

  // Save Cart Item Edit
  const handleSaveCartItemEdit = () => {
    if (!cartItemToEdit) return;
    const { index, item } = cartItemToEdit;
    const newPrice = parseFloat(cartEditUnitPrice);
    const newQty = Math.max(1, cartEditQuantity);
    const newDiscount = Math.min(100, Math.max(0, parseFloat(cartEditDiscount) || 0));

    if (isNaN(newPrice) || newPrice < 0) {
      alert('يرجى إدخال سعر صحيح');
      return;
    }

    if (newQty > item.product.stock && !item.product.id.startsWith('flexy_')) {
      alert(`الكمية المتوفرة في المخزن هي ${item.product.stock} فقط`);
    }

    // Update cart item
    setCartItems((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = {
          ...updated[index],
          unitPrice: newPrice,
          quantity: newQty,
          discount: newDiscount,
        };
      }
      return updated;
    });

    // If permanent update is requested, save to database
    if (cartEditSavePermanently && !item.product.id.startsWith('flexy_') && !item.product.id.includes('_loose_')) {
      const allProds = StorageService.getProducts();
      const updated = allProds.map((p) =>
        p.id === item.product.id
          ? {
              ...p,
              sellingPrice: newPrice,
            }
          : p
      );
      StorageService.saveProducts(updated);
      setProducts(updated);
      if (onRefreshData) onRefreshData();
    }

    StorageService.playSuccessBeep();
    setCartItemToEdit(null);
  };

  // Apply Overall Invoice Discount
  const handleApplyOverallDiscount = (percentVal: number) => {
    const val = Math.min(100, Math.max(0, percentVal));
    setOverallDiscountPercent(val);
    setIsOverallDiscountModalOpen(false);
    StorageService.playSuccessBeep();
  };

  // Add Custom Flexy Transaction to Cart (شحن رصيد حر بمبلغ يختاره الزبون 5, 10, 50, 100...)
  const handleAddCustomFlexyToCart = (
    operator: string,
    phone: string,
    amount: number,
    fee: number = 0
  ) => {
    if (amount <= 0 || isNaN(amount)) {
      alert('يرجى تحديد مبلغ شحن صحيح');
      return;
    }

    const finalSellingPrice = amount + (fee || 0);
    const cost = amount * 0.97;
    const phoneClean = phone.trim();

    const flexyProduct: Product = {
      id: `flexy_${operator.toLowerCase()}_${Date.now()}`,
      barcode: `FLX-${operator.toUpperCase().slice(0, 3)}-${amount}`,
      name: `فليكسي ${operator} (${amount} ${settings.currencySymbol})${phoneClean ? ` - هاتف: ${phoneClean}` : ''}`,
      categoryId: 'cat_flexy_digital',
      costPrice: cost,
      sellingPrice: finalSellingPrice,
      stock: 99999,
      minStockAlert: 10,
      unit: 'رصيد',
      notes: phoneClean ? `رقم الزبون: ${phoneClean}` : 'تعبئة رصيد فوري',
      isAvailable: true,
    };

    setCartItems((prev) => [
      ...prev,
      {
        product: flexyProduct,
        quantity: 1,
        unitPrice: finalSellingPrice,
        discount: 0,
        discountType: 'percentage',
        notes: phoneClean ? `الهاتف: ${phoneClean}` : undefined,
      },
    ]);

    StorageService.playSuccessBeep();
    setIsFlexyModalOpen(false);
    setFlexyPhone('');
    setFlexyAmount('100');
    setFlexyFee('0');
  };

  // Add Cigarettes (Loose Pieces or Pack) to Cart (بيع بالحبة أو بالعلبة مع حساب فوري)
  const handleAddCigarettesToCart = (
    baseProduct: Product,
    count: number,
    isPiece: boolean,
    customPricePerPiece?: number
  ) => {
    if (!baseProduct) return;
    if (count <= 0) return;

    if (!isPiece) {
      // Selling by full packs
      addToCart(baseProduct, count);
      setIsCigaretteModalOpen(false);
      return;
    }

    // Selling by individual loose cigarettes (بالحبة)
    const calculatedPiecePrice =
      customPricePerPiece && customPricePerPiece > 0
        ? customPricePerPiece
        : Math.max(10, Math.ceil(baseProduct.sellingPrice / 20));

    const singlePieceCost = baseProduct.costPrice / 20;
    const unitLabel = count === 1 ? 'سيجارة (حبة)' : count === 2 ? 'حبتين' : 'سجائر';
    const pieceProductName = `${baseProduct.name} (${count} ${unitLabel})`;

    const looseProduct: Product = {
      ...baseProduct,
      id: `${baseProduct.id}_loose_${Date.now()}`,
      name: pieceProductName,
      sellingPrice: calculatedPiecePrice,
      costPrice: singlePieceCost,
      unit: 'سيجارة',
      stock: baseProduct.stock * 20,
    };

    setCartItems((prev) => [
      ...prev,
      {
        product: looseProduct,
        quantity: count,
        unitPrice: calculatedPiecePrice,
        discount: 0,
        discountType: 'percentage',
      },
    ]);

    StorageService.playSuccessBeep();
    setIsCigaretteModalOpen(false);
    setSelectedCigaretteProd(null);
  };

  // Add Nuts & Scale Weight Item to Cart (بيع المكسرات والمواد بالميزان - بالمبلغ أو بالغرام/الكغ)
  const handleAddNutsWeightToCart = (
    baseProduct: Product,
    mode: 'by_amount' | 'by_weight',
    amountDZD: number,
    weightInGrams: number,
    customPricePerKg?: number,
    noteText?: string
  ) => {
    if (!baseProduct) return;

    const pricePerKg =
      customPricePerKg && customPricePerKg > 0
        ? customPricePerKg
        : baseProduct.sellingPrice;

    if (pricePerKg <= 0) {
      alert('يرجى تحديد سعر بيع الكيلوغرام');
      return;
    }

    let finalWeightKg = 0;
    let finalAmount = 0;

    if (mode === 'by_amount') {
      if (amountDZD <= 0 || isNaN(amountDZD)) {
        alert('يرجى إدخال مبلغ صحيح');
        return;
      }
      finalAmount = amountDZD;
      finalWeightKg = finalAmount / pricePerKg;
    } else {
      if (weightInGrams <= 0 || isNaN(weightInGrams)) {
        alert('يرجى إدخال وزن صحيح');
        return;
      }
      finalWeightKg = weightInGrams / 1000;
      finalAmount = Math.round(finalWeightKg * pricePerKg);
    }

    const calculatedGrams = Math.round(finalWeightKg * 1000);
    const weightLabel =
      calculatedGrams >= 1000
        ? `${(calculatedGrams / 1000).toFixed(3).replace(/\.?0+$/, '')} كغ`
        : `${calculatedGrams} غ`;

    const nutItemProduct: Product = {
      ...baseProduct,
      id: `${baseProduct.id}_weight_${Date.now()}`,
      name: `${baseProduct.name} (${weightLabel} - ${finalAmount} ${settings.currencySymbol})`,
      costPrice: baseProduct.costPrice * finalWeightKg,
      sellingPrice: finalAmount,
      unit: 'ميزان',
    };

    setCartItems((prev) => [
      ...prev,
      {
        product: nutItemProduct,
        quantity: 1,
        unitPrice: finalAmount,
        discount: 0,
        discountType: 'percentage',
        notes: noteText ? `${weightLabel} | ${noteText}` : `وزن الميزان: ${weightLabel}`,
      },
    ]);

    StorageService.playSuccessBeep();
    setIsNutsWeightModalOpen(false);
    setSelectedNutProduct(null);
    setNutAmountInput('100');
    setNutWeightGramsInput('200');
    setNutCustomPricePerKg('');
    setNutNotes('');
  };

  // Remove Item
  const removeCartItem = (index: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Clear Cart
  const clearCart = () => {
    if (cartItems.length === 0) return;
    if (confirm('هل أنت متأكد من رغبتك في تفريغ السلة؟')) {
      setCartItems([]);
      setSelectedCustomer(null);
      setOverallDiscountPercent(0);
      setPaidAmountStr('');
      setInvoiceNotes('');
    }
  };

  // Hold Order (تعليق الطلب)
  const holdCurrentOrder = () => {
    if (cartItems.length === 0) return;
    const orderName = prompt(
      'أدخل اسم أو رقم للطلب المعلق (مثال: طاولة 4، عميل الانتظار):',
      `طلب معلق #${heldOrders.length + 1}`
    );
    if (!orderName) return;

    const newHeld: HeldOrder = {
      id: 'held_' + Date.now(),
      orderName,
      createdAt: new Date().toISOString(),
      cartItems: [...cartItems],
      customer: selectedCustomer || undefined,
      notes: invoiceNotes,
    };

    const updated = [newHeld, ...heldOrders];
    setHeldOrders(updated);
    StorageService.saveHeldOrders(updated);

    // Reset current cart
    setCartItems([]);
    setSelectedCustomer(null);
    setPaidAmountStr('');
    setInvoiceNotes('');
    alert('تم حفظ الطلب في قائمة الطلبات المعلقة بنجاح');
  };

  // Resume Held Order
  const resumeHeldOrder = (order: HeldOrder) => {
    if (cartItems.length > 0) {
      if (!confirm('سيتم استبدال السلة الحالية بالطلب المعلق، هل تود المتابعة؟')) {
        return;
      }
    }
    setCartItems(order.cartItems);
    setSelectedCustomer(order.customer || null);
    setInvoiceNotes(order.notes || '');

    // remove from held
    const updated = heldOrders.filter((h) => h.id !== order.id);
    setHeldOrders(updated);
    StorageService.saveHeldOrders(updated);
    setIsHeldOrdersOpen(false);
  };

  // Delete Held Order
  const deleteHeldOrder = (id: string) => {
    const updated = heldOrders.filter((h) => h.id !== id);
    setHeldOrders(updated);
    StorageService.saveHeldOrders(updated);
  };

  // Quick Customer Creation
  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;

    const newCustomer: Customer = {
      id: 'cust_' + Date.now(),
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
      address: newCustAddress.trim(),
      balanceDebt: 0,
      totalSpent: 0,
      createdAt: new Date().toISOString().split('T')[0],
    };

    const updated = [...customers, newCustomer];
    setCustomers(updated);
    StorageService.saveCustomers(updated);
    setSelectedCustomer(newCustomer);
    setIsNewCustomerModalOpen(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustAddress('');
  };

  // Complete Checkout & Save Sale
  const handleCompleteSale = () => {
    if (cartItems.length === 0) return;

    if (paymentMethod === 'debt' && !selectedCustomer) {
      alert('يجب تحديد عميل لتسجيل الفاتورة كآجل (دين).');
      return;
    }

    const invoiceNumber = `${Date.now().toString().slice(-6)}`;
    const costTotal = cartItems.reduce(
      (sum, item) => sum + item.product.costPrice * item.quantity,
      0
    );

    const profitTotal = grandTotal - costTotal;

    const newSale: Sale = {
      id: 'sale_' + Date.now(),
      invoiceNumber,
      date: new Date().toISOString(),
      items: cartItems.map((i) => {
        const itemSub = i.unitPrice * i.quantity;
        const discountVal =
          i.discountType === 'percentage'
            ? itemSub * (i.discount / 100)
            : i.discount;
        return {
          productId: i.product.id,
          barcode: i.product.barcode,
          name: i.product.name,
          costPrice: i.product.costPrice,
          unitPrice: i.unitPrice,
          quantity: i.quantity,
          discount: i.discount,
          discountType: i.discountType,
          total: itemSub - discountVal,
          unit: i.product.unit,
        };
      }),
      subtotal: rawSubtotal,
      discountTotal: overallDiscountAmt,
      taxTotal: taxAmount,
      grandTotal,
      profitTotal,
      paidAmount,
      changeAmount,
      paymentMethod,
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer?.name,
      cashierId: currentUser.id,
      cashierName: currentUser.name,
      status: 'completed',
      notes: invoiceNotes,
    };

    // Save to storage
    StorageService.addSale(newSale);
    StorageService.playSuccessBeep();

    // Reload products & customers
    loadData();
    if (onRefreshData) onRefreshData();

    // Set for receipt modal
    setCompletedSale(newSale);
    setIsCheckoutOpen(false);
    setIsMobileCartOpen(false);
    setIsReceiptModalOpen(true);

    // Reset cart
    setCartItems([]);
    setSelectedCustomer(null);
    setOverallDiscountPercent(0);
    setPaidAmountStr('');
    setInvoiceNotes('');
    setPaymentMethod('cash');
  };

  // Filtered products list
  const filteredProducts = products.filter((prod) => {
    const matchesCat =
      selectedCategory === 'cat_all' || prod.categoryId === selectedCategory;
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      prod.name.toLowerCase().includes(query) ||
      prod.barcode.toLowerCase().includes(query) ||
      (prod.notes && prod.notes.toLowerCase().includes(query));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden bg-slate-100">
      {/* ======================================================== */}
      {/* RIGHT/TOP PANEL: PRODUCTS CATALOG & SEARCH & CATEGORIES */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col h-full min-w-0 border-l border-slate-200 bg-slate-50/70">
        {/* Top Action Bar: Search & Quick Barcode */}
        <div className="p-3 bg-white border-b border-slate-200 shadow-2xs space-y-2.5">
          {/* Row 1: Search Box & Hardware Scanner Input & Held Orders */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Search Box */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ابحث باسم المنتج أو الباركود..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-10 py-2 bg-slate-100/90 border border-slate-200/80 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick Hardware Barcode Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (barcodeInputRef.current?.value) {
                  handleBarcodeScanned(barcodeInputRef.current.value);
                  barcodeInputRef.current.value = '';
                }
              }}
              className="flex items-center gap-1.5 shrink-0"
            >
              <div className="relative">
                <Barcode className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={barcodeInputRef}
                  type="text"
                  placeholder="مسح باركود (Enter)"
                  className="w-36 sm:w-44 pl-2 pr-9 py-2 bg-slate-100/90 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>
            </form>

            {/* Held Orders Badge */}
            {heldOrders.length > 0 && (
              <button
                onClick={() => setIsHeldOrdersOpen(true)}
                className="flex items-center gap-1.5 py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold transition-colors shrink-0"
              >
                <Clock className="w-4 h-4 text-amber-600" />
                <span>معلقة ({heldOrders.length})</span>
              </button>
            )}
          </div>

          {/* Row 2: 2x2 Grid-Style Paired Quick Action Buttons (مربعات مساح الكاميرا، طابعة الباركود، الفليكسي، الميزان، والأسعار) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-1.5 pt-1 border-t border-slate-100">
            {/* Box 1: Camera Scanner */}
            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 active:from-emerald-800 active:to-emerald-900 text-white rounded-xl text-xs font-bold shadow-xs transition-all border border-emerald-500/40 cursor-pointer"
              title="فتح كاميرا الهاتف/الكمبيوتر لمسح الباركود"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-100 shrink-0" />
              <span className="truncate">مسح بالكاميرا</span>
            </button>

            {/* Box 2: Barcode Label Printer */}
            <button
              type="button"
              onClick={() => {
                setBarcodePrintSelectedProduct(products.length > 0 ? products[0] : null);
                setIsBarcodePrintModalOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:from-indigo-800 active:to-indigo-900 text-white rounded-xl text-xs font-bold shadow-xs transition-all border border-indigo-500/40 cursor-pointer"
              title="طباعة وتوليد ملصقات الباركود للسلع والرفوف مع اختيار المقاس والكمية"
            >
              <Printer className="w-3.5 h-3.5 text-indigo-200 shrink-0" />
              <span className="truncate">طابعة الباركود</span>
            </button>

            {/* Box 3: Quick Add Product */}
            <button
              type="button"
              onClick={() => {
                setNewProdBarcode('');
                setNewProdName('');
                setNewProdCategory(categories.find((c) => c.id !== 'cat_all')?.id || 'cat_drinks');
                setNewProdCostPrice('');
                setNewProdSellingPrice('');
                setNewProdStock('50');
                setNewProdUnit('قطعة');
                setNewProdAutoAddToCart(true);
                setQuickAddNotice(null);
                setIsQuickAddProductOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 active:from-blue-800 active:to-blue-900 text-white rounded-xl text-xs font-bold shadow-xs transition-all border border-blue-500/40 cursor-pointer"
              title="إضافة منتج أو صنف جديد إلى المخزون فوراً"
            >
              <Plus className="w-3.5 h-3.5 text-blue-100 shrink-0" />
              <span className="truncate">إضافة منتج</span>
            </button>

            {/* Box 4: Quick Price Manager */}
            <button
              type="button"
              onClick={() => {
                setPriceManagerSearch('');
                setPriceManagerCategory('all');
                setIsPriceManagerOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 active:from-violet-800 active:to-purple-900 text-white rounded-xl text-xs font-bold shadow-xs transition-all border border-violet-500/40 cursor-pointer"
              title="التحكم الكامل وتعديل أسعار البيع والشراء لجميع المنتجات فوراً"
            >
              <Coins className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span className="truncate">تعديل الأسعار</span>
            </button>

            {/* Box 5: Flexy Quick Recharge */}
            <button
              type="button"
              onClick={() => {
                setIsFlexyModalOpen(true);
                setFlexyOperator('Mobilis');
                setFlexyAmount('100');
                setFlexyPhone('');
                setFlexyFee('0');
              }}
              className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-gradient-to-r from-teal-600 to-emerald-700 hover:from-teal-500 hover:to-emerald-600 active:from-teal-800 active:to-emerald-900 text-white rounded-xl text-xs font-bold shadow-xs transition-all border border-teal-500/40 cursor-pointer"
              title="شحن رصيد فليكسي بأي مبلغ يطلبه الزبون (موبيليس / جيزي / أوريدو)"
            >
              <Zap className="w-3.5 h-3.5 text-yellow-300 shrink-0" />
              <span className="truncate">فليكسي حر</span>
            </button>

            {/* Box 6: Nuts & Scale Calculator */}
            <button
              type="button"
              onClick={() => {
                const nuts = products.filter(isNutOrWeightProduct);
                if (nuts.length > 0) {
                  setSelectedNutProduct(nuts[0]);
                  setNutCustomPricePerKg(nuts[0].sellingPrice.toString());
                } else {
                  setSelectedNutProduct(null);
                  setNutCustomPricePerKg('');
                }
                setNutCalculationMode('by_amount');
                setNutAmountInput('100');
                setNutWeightGramsInput('200');
                setNutNotes('');
                setNutProductSearch('');
                setIsNutsWeightModalOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-gradient-to-r from-amber-600 to-orange-700 hover:from-amber-500 hover:to-orange-600 active:from-amber-800 active:to-orange-900 text-white rounded-xl text-xs font-bold shadow-xs transition-all border border-amber-500/40 cursor-pointer"
              title="حاسبة بيع المكسرات، الفواكه الجافة والمواد بالميزان (بالغرام أو بالمبلغ)"
            >
              <Scale className="w-3.5 h-3.5 text-amber-200 shrink-0" />
              <span className="truncate">مكسرات وميزان</span>
            </button>

            {/* Box 7: Cigarettes Piece/Pack */}
            <button
              type="button"
              onClick={() => {
                const cigs = products.filter(isCigaretteProduct);
                if (cigs.length > 0) {
                  setSelectedCigaretteProd(cigs[0]);
                }
                setCigarettePieceCount(1);
                setCigaretteSaleType('piece');
                setIsCigaretteModalOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-gradient-to-r from-stone-700 to-neutral-800 hover:from-stone-600 hover:to-neutral-700 active:from-stone-900 active:to-neutral-950 text-white rounded-xl text-xs font-bold shadow-xs transition-all border border-stone-600/40 cursor-pointer"
              title="بيع سجائر بالحبة الفردية (1، 2، 3...) أو بالعلبة مع حساب السعر فوراً"
            >
              <Cigarette className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span className="truncate">بيع السجائر</span>
            </button>

            {/* Box 8: Delete Product & Trash History */}
            <button
              type="button"
              onClick={() => {
                setDeleteSearchInput('');
                setProductToDelete(null);
                setDeleteNotice(null);
                setDeleteModalTab('products');
                setDeletedProductsList(StorageService.getDeletedProducts());
                setIsQuickDeleteProductOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 active:from-rose-800 active:to-red-900 text-white rounded-xl text-xs font-bold shadow-xs transition-all border border-rose-500/40 cursor-pointer"
              title="حذف منتج من السيستم أو استرجاع المحذوفات"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-100 shrink-0" />
              <span className="truncate">حذف منتج</span>
            </button>
          </div>
        </div>

        {/* Categories Bar & View Mode Selector */}
        <div className="px-3 py-2 bg-white border-b border-slate-200 flex items-center justify-between gap-2 shadow-2xs">
          {/* Scroll Right Button */}
          <button
            type="button"
            onClick={() => scrollCategoriesBar('right')}
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors shrink-0"
            title="تحريك التصنيفات لليمين"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Categories Horizontal Scroll List */}
          <div
            ref={categoriesBarRef}
            className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-1.5 scroll-smooth"
          >
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              const catProdCount =
                cat.id === 'cat_all'
                  ? products.length
                  : products.filter((p) => p.categoryId === cat.id).length;

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`py-1.5 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200/90 text-slate-700'
                  }`}
                >
                  <span>{cat.name}</span>
                  <span className={`text-[10px] ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                    ({catProdCount})
                  </span>
                </button>
              );
            })}
          </div>

          {/* Scroll Left Button */}
          <button
            type="button"
            onClick={() => scrollCategoriesBar('left')}
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors shrink-0"
            title="تحريك التصنيفات لليسار"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Layout Mode Toggle (Shelves vs Grid) */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setPosLayoutMode('shelves')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                posLayoutMode === 'shelves'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="عرض قوائم ورفوف متحركة بالأقسام"
            >
              <Rows3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">رفوف متحركة</span>
            </button>

            <button
              type="button"
              onClick={() => setPosLayoutMode('grid')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                posLayoutMode === 'grid'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="عرض شبكة البطاقات"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">شبكة</span>
            </button>
          </div>
        </div>

        {/* Products Display Area */}
        <div className="flex-1 p-3 sm:p-4 overflow-y-auto">
          {products.length === 0 ? (
            <div className="py-10 px-4 max-w-lg mx-auto flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 ring-8 ring-emerald-500/5">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-base font-black text-slate-800 dark:text-slate-100 mb-1">
                المتجر نظيف وجاهز للعمل (0 منتجات مسجلة)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
                أهلاً وسهلاً بك في نظام الكشك! الحساب نظيف وفارغ بالكامل لتتمكن من إضافة أصناف كشكك وأسعارك الخاصة. كما يمكنك استخدام خدمات الفليكسي السريعة والميزان مباشرة.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 w-full">
                {onNavigateTab && (
                  <button
                    type="button"
                    onClick={() => onNavigateTab('inventory')}
                    className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Package className="w-4 h-4" />
                    <span>إضافة منتجات وأصناف للمخزون</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsFlexyModalOpen(true)}
                  className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>شحن فليكسي سريع</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedNutProduct(null);
                    setNutCalculationMode('by_amount');
                    setNutAmountInput('100');
                    setNutWeightGramsInput('200');
                    setNutCustomPricePerKg('600');
                    setNutNotes('');
                    setNutProductSearch('');
                    setIsNutsWeightModalOpen(true);
                  }}
                  className="py-2.5 px-4 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Scale className="w-4 h-4 text-amber-500" />
                  <span>ميزان ومكسرات حر</span>
                </button>
              </div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
              <ShoppingBag className="w-12 h-12 stroke-[1.5] mb-2 text-slate-300" />
              <p className="text-sm font-medium">لم يتم العثور على منتجات مطابقة</p>
              <p className="text-xs text-slate-400 mt-0.5">
                تأكد من البحث أو أضف منتجات جديدة من قسم المخزون
              </p>
            </div>
          ) : posLayoutMode === 'shelves' && !searchQuery.trim() ? (
            /* ======================================================== */
            /* MOVABLE PRODUCT SHELVES / ROWS (قوائم ورفوف المنتجات المتحركة) */
            /* ======================================================== */
            <div>
              {(selectedCategory === 'cat_all'
                ? categories.filter((c) => c.id !== 'cat_all')
                : categories.filter((c) => c.id === selectedCategory)
              ).map((cat) => {
                const catProducts = products.filter(
                  (p) => p.categoryId === cat.id && p.isAvailable
                );
                if (catProducts.length === 0) return null;

                return (
                  <ProductShelfRow
                    key={`shelf_${cat.id}`}
                    category={cat}
                    products={catProducts}
                    cartItems={cartItems}
                    settings={settings}
                    onAddToCart={(p, q) => {
                      addToCart(p, q);
                      setRecentlyAddedId(p.id);
                      setTimeout(() => setRecentlyAddedId(null), 600);
                    }}
                    onOpenFlexy={(p) => {
                      if (p) {
                        if (p.name.includes('موبيليس') || p.name.toLowerCase().includes('mobilis')) {
                          setFlexyOperator('Mobilis');
                        } else if (p.name.includes('جيزي') || p.name.toLowerCase().includes('djezzy')) {
                          setFlexyOperator('Djezzy');
                        } else if (p.name.includes('أوريدو') || p.name.toLowerCase().includes('ooredoo')) {
                          setFlexyOperator('Ooredoo');
                        } else if (p.name.includes('إيدوم') || p.name.toLowerCase().includes('idoom')) {
                          setFlexyOperator('Idoom');
                        }
                      }
                      setIsFlexyModalOpen(true);
                    }}
                    onOpenCigarette={(p) => {
                      setSelectedCigaretteProd(p);
                      setCigarettePieceCount(1);
                      setCigaretteSaleType('piece');
                      setIsCigaretteModalOpen(true);
                    }}
                    onOpenNutsWeight={(p) => {
                      setSelectedNutProduct(p);
                      setNutCalculationMode('by_amount');
                      setNutAmountInput('100');
                      setNutWeightGramsInput('200');
                      setNutCustomPricePerKg(p.sellingPrice.toString());
                      setNutNotes('');
                      setNutProductSearch('');
                      setIsNutsWeightModalOpen(true);
                    }}
                    onOpenPriceEdit={(p) => handleOpenQuickPriceEdit(p)}
                    recentlyAddedId={recentlyAddedId}
                  />
                );
              })}
            </div>
          ) : (
            /* ======================================================== */
            /* CLASSIC / FILTERED GRID VIEW (عرض الشبكة) */
            /* ======================================================== */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-3.5">
              {filteredProducts.map((prod) => (
                <POSProductCard
                  key={prod.id}
                  prod={prod}
                  settings={settings}
                  cartItems={cartItems}
                  recentlyAddedId={recentlyAddedId}
                  onAddToCart={(p, qty) => {
                    addToCart(p, qty);
                    setRecentlyAddedId(p.id);
                    setTimeout(() => setRecentlyAddedId(null), 600);
                  }}
                  onOpenFlexy={(p) => {
                    const targetProd = p || prod;
                    if (targetProd.name.includes('موبيليس') || targetProd.name.toLowerCase().includes('mobilis')) {
                      setFlexyOperator('Mobilis');
                    } else if (targetProd.name.includes('جيزي') || targetProd.name.toLowerCase().includes('djezzy')) {
                      setFlexyOperator('Djezzy');
                    } else if (targetProd.name.includes('أوريدو') || targetProd.name.toLowerCase().includes('ooredoo')) {
                      setFlexyOperator('Ooredoo');
                    }
                    setIsFlexyModalOpen(true);
                  }}
                  onOpenCigarette={(p) => {
                    setSelectedCigaretteProd(p);
                    setCigarettePieceCount(1);
                    setCigaretteSaleType('piece');
                    setIsCigaretteModalOpen(true);
                  }}
                  onOpenNutsWeight={(p) => {
                    setSelectedNutProduct(p);
                    setNutCalculationMode('by_amount');
                    setNutAmountInput('100');
                    setNutWeightGramsInput('200');
                    setNutCustomPricePerKg(p.sellingPrice.toString());
                    setNutNotes('');
                    setNutProductSearch('');
                    setIsNutsWeightModalOpen(true);
                  }}
                  onOpenPriceEdit={(p) => handleOpenQuickPriceEdit(p)}
                  compactWidth={false}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* LEFT PANEL: CART & CHECKOUT WORKSPACE (DESKTOP & MOBILE) */}
      {/* ======================================================== */}
      <div
        className={`w-full lg:w-96 xl:w-[420px] bg-white border-t lg:border-t-0 lg:border-r border-slate-200 flex flex-col h-auto lg:h-full shadow-lg ${
          isMobileCartOpen
            ? 'fixed inset-0 z-40 lg:relative lg:z-0 flex'
            : 'hidden lg:flex'
        }`}
      >
        {/* Cart Header */}
        <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold">سلة المبيعات</h3>
              <p className="text-[11px] text-slate-400">
                {totalItemsCount} عناصر ({cartItems.length} أصناف)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {cartItems.length > 0 && (
              <>
                <button
                  onClick={holdCurrentOrder}
                  title="تعليق الطلب لخدمة زبون آخر"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs flex items-center gap-1 transition-colors"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-[10px]">تعليق</span>
                </button>

                <button
                  onClick={clearCart}
                  title="تفريغ السلة"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-rose-300 text-xs transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {/* Mobile close button */}
            <button
              onClick={() => setIsMobileCartOpen(false)}
              className="lg:hidden p-1.5 rounded-lg bg-slate-800 text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Customer Selector Ribbon */}
        <div className="p-2.5 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <UserIcon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            {selectedCustomer ? (
              <div className="flex items-center gap-1 truncate">
                <span className="font-bold text-slate-900 truncate">
                  {selectedCustomer.name}
                </span>
                {selectedCustomer.balanceDebt > 0 && (
                  <span className="text-[10px] bg-rose-100 text-rose-700 px-1 rounded font-bold shrink-0">
                    عليه دين: {selectedCustomer.balanceDebt} {settings.currencySymbol}
                  </span>
                )}
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="text-slate-400 hover:text-rose-600 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <span className="text-slate-500 text-xs">عميل نقدي عام</span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <select
              value={selectedCustomer?.id || ''}
              onChange={(e) => {
                const found = customers.find((c) => c.id === e.target.value);
                setSelectedCustomer(found || null);
              }}
              className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 max-w-[120px]"
            >
              <option value="">تحديد عميل...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.balanceDebt > 0 ? `(دين ${c.balanceDebt})` : ''}
                </option>
              ))}
            </select>

            <button
              onClick={() => setIsNewCustomerModalOpen(true)}
              title="إضافة عميل جديد"
              className="p-1 rounded-lg bg-white hover:bg-slate-200 border border-slate-200 text-slate-700"
            >
              <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
            </button>
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 p-3 overflow-y-auto space-y-2 divide-y divide-slate-100">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-6">
              <ShoppingBag className="w-12 h-12 text-slate-300 mb-2 stroke-[1.5]" />
              <p className="text-sm font-bold text-slate-600">السلة فارغة</p>
              <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
                انقر على أي منتج من القائمة أو امسح الباركود لإضافته
              </p>
            </div>
          ) : (
            cartItems.map((item, idx) => {
              const itemTotal = item.unitPrice * item.quantity;
              const discountVal =
                item.discountType === 'percentage'
                  ? itemTotal * (item.discount / 100)
                  : item.discount;
              const netTotal = itemTotal - discountVal;

              return (
                <div key={`${item.product.id}_${idx}`} className="pt-2.5 pb-2 first:pt-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h5 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {item.product.name}
                      </h5>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                        <button
                          type="button"
                          onClick={() => handleOpenCartItemEdit(idx, item)}
                          className="hover:text-emerald-700 hover:bg-emerald-50 flex items-center gap-1 font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 transition-colors"
                          title="انقر لتعديل سعر وخصم وكمية هذا الصنف"
                        >
                          <Edit3 className="w-2.5 h-2.5 text-blue-600" />
                          <span>{item.unitPrice.toFixed(2)} {settings.currencySymbol} / {item.product.unit}</span>
                        </button>
                      </div>
                    </div>

                    {/* Total for item */}
                    <div className="text-right">
                      <div className="text-xs sm:text-sm font-black text-slate-900 font-mono">
                        {netTotal.toFixed(2)} {settings.currencySymbol}
                      </div>
                      {item.discount > 0 && (
                        <span className="text-[10px] text-rose-600 block">
                          خصم {item.discount}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quantity and Controls */}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                      <button
                        onClick={() => updateCartItemQuantity(idx, item.quantity - 1)}
                        className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shadow-xs transition-colors"
                        title="إنقاص الكمية (-1)"
                      >
                        <Minus className="w-3 h-3" />
                      </button>

                      {/* Direct Clickable Quantity to open full item customizer */}
                      <button
                        type="button"
                        onClick={() => handleOpenCartItemEdit(idx, item)}
                        className="px-2 h-7 min-w-[34px] text-center font-mono font-black text-xs text-slate-900 bg-white hover:bg-emerald-50 hover:text-emerald-700 rounded-md border border-slate-200 shadow-2xs transition-colors"
                        title="انقر لتعديل الكمية والسعر"
                      >
                        {item.quantity}
                      </button>

                      <button
                        onClick={() => updateCartItemQuantity(idx, item.quantity + 1)}
                        className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shadow-xs transition-colors"
                        title="زيادة الكمية (+1)"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Item Quick Quantity Presets & Discount & Remove */}
                    <div className="flex items-center gap-1">
                      {/* Fast Quantity presets for quick click */}
                      <div className="hidden sm:flex items-center gap-0.5 mr-1">
                        {[2, 5, 10].map((quickQ) => (
                          <button
                            key={quickQ}
                            type="button"
                            onClick={() => updateCartItemQuantity(idx, quickQ)}
                            className="px-1.5 py-0.5 text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 rounded transition-colors"
                            title={`تعيين الكمية ${quickQ}`}
                          >
                            {quickQ}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={() => handleOpenCartItemEdit(idx, item)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 text-xs"
                        title="تعديل السعر والخصم للصنف"
                      >
                        <Percent className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => removeCartItem(idx)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 text-xs"
                        title="حذف من السلة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Cart Summary & Checkout Trigger Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 space-y-2">
          {/* Subtotal & Discount */}
          <div className="space-y-1 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>المجموع الفرعي:</span>
              <span className="font-mono font-bold text-slate-800">
                {rawSubtotal.toFixed(2)} {settings.currencySymbol}
              </span>
            </div>

            {overallDiscountPercent > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>خصم إجمالي ({overallDiscountPercent}%):</span>
                <span className="font-mono font-bold">
                  -{overallDiscountAmt.toFixed(2)} {settings.currencySymbol}
                </span>
              </div>
            )}

            {settings.enableTax && (
              <div className="flex justify-between">
                <span>الضريبة ({settings.taxRatePercent}%):</span>
                <span className="font-mono font-bold text-slate-800">
                  {taxAmount.toFixed(2)} {settings.currencySymbol}
                </span>
              </div>
            )}

            <div className="flex justify-between text-sm sm:text-base font-black text-slate-950 pt-1.5 border-t border-slate-200">
              <span>المبلغ المستحق:</span>
              <span className="font-mono text-emerald-700">
                {grandTotal.toFixed(2)} {settings.currencySymbol}
              </span>
            </div>
          </div>

          {/* Overall Discount Button */}
          <div className="flex items-center gap-1.5 pt-1">
            <button
              onClick={() => {
                setInvoiceDiscountInput(overallDiscountPercent.toString());
                setIsOverallDiscountModalOpen(true);
              }}
              className="py-1.5 px-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-700 flex items-center gap-1 font-medium transition-colors"
            >
              <Percent className="w-3 h-3 text-slate-500" />
              <span>خصم إجمالي {overallDiscountPercent > 0 ? `(${overallDiscountPercent}%)` : ''}</span>
            </button>
          </div>

          {/* Main Checkout Button */}
          <button
            onClick={() => {
              if (cartItems.length === 0) return;
              setPaidAmountStr(grandTotal.toString());
              setIsCheckoutOpen(true);
            }}
            disabled={cartItems.length === 0}
            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-2xl font-bold text-sm sm:text-base shadow-sm flex items-center justify-between transition-all"
          >
            <span className="flex items-center gap-2">
              <Banknote className="w-5 h-5" />
              دفع وإصدار الفاتورة (F4)
            </span>
            <span className="font-mono font-black">
              {grandTotal.toFixed(2)} {settings.currencySymbol}
            </span>
          </button>
        </div>
      </div>

      {/* Floating Bottom Bar for Mobile View */}
      <div className="lg:hidden p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-white sticky bottom-0 z-30 shadow-2xl">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-xs">
            {totalItemsCount}
          </div>
          <div>
            <div className="text-xs text-slate-400">الإجمالي:</div>
            <div className="text-sm font-mono font-bold text-emerald-400">
              {grandTotal.toFixed(2)} {settings.currencySymbol}
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsMobileCartOpen(true)}
          className="py-2 px-4 bg-emerald-600 active:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>عرض السلة ({cartItems.length})</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* CHECKOUT MODAL / DRAWER */}
      {/* ======================================================== */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
            {/* Checkout Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Banknote className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">إتمام عملية الدفع</h3>
                  <p className="text-[11px] text-slate-400">
                    المبلغ المطلوب: {grandTotal.toFixed(2)} {settings.currencySymbol}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Payment Method Selector */}
              {(() => {
                const isGameOrElectronic = cartItems.some(
                  (i) =>
                    i.product.categoryId === 'cat_games' ||
                    i.product.categoryId === 'cat_electronic' ||
                    i.product.name.includes('شحن') ||
                    i.product.name.includes('فري فاير') ||
                    i.product.name.includes('ببجي') ||
                    i.product.name.includes('فليكسي') ||
                    i.product.name.includes('رصيد')
                );

                const methods = isGameOrElectronic
                  ? [
                      { id: 'cash', label: 'نقداً (كاش)', icon: Banknote, desc: 'الدفع المباشر' },
                      { id: 'ccp', label: 'حساب CCP / بريدي موب', icon: Landmark, desc: 'شحن ألعاب وإلكتروني' },
                    ]
                  : [
                      { id: 'cash', label: 'نقداً', icon: Banknote, desc: 'كاش' },
                      { id: 'ccp', label: 'CCP / بريدي موب', icon: Landmark, desc: 'تحويل' },
                      { id: 'card', label: 'بطاقة بنكية', icon: CreditCard, desc: 'CIB / Edahabia' },
                      { id: 'debt', label: 'آجل (دين)', icon: Clock, desc: 'حساب عميل' },
                    ];

                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 block">طريقة الدفع المعتمدة:</label>
                      {isGameOrElectronic && (
                        <span className="text-[11px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Gamepad2 className="w-3.5 h-3.5" />
                          شحن ألعاب ومعاملات إلكترونية (نقد أو CCP فقط)
                        </span>
                      )}
                    </div>

                    <div className={`grid gap-2 ${isGameOrElectronic ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
                      {methods.map((method) => {
                        const Icon = method.icon;
                        const isSelected = paymentMethod === method.id;
                        return (
                          <button
                            key={method.id}
                            type="button"
                            onClick={() => {
                              setPaymentMethod(method.id as PaymentMethod);
                              if (method.id === 'debt') {
                                setPaidAmountStr('0');
                              } else {
                                setPaidAmountStr(grandTotal.toString());
                              }
                            }}
                            className={`p-3 rounded-2xl border text-center flex flex-col items-center justify-center gap-1 transition-all ${
                              isSelected
                                ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20 font-bold shadow-xs'
                                : 'border-slate-200 hover:border-slate-300 bg-slate-50 text-slate-700'
                            }`}
                          >
                            <Icon className={`w-5 h-5 ${isSelected ? 'text-emerald-600' : 'text-slate-500'}`} />
                            <span className="text-xs font-bold">{method.label}</span>
                            <span className="text-[10px] text-slate-400">{method.desc}</span>
                          </button>
                        );
                      })}
                    </div>

                    {isGameOrElectronic && (
                      <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 text-xs text-purple-900 space-y-1">
                        <div className="font-bold flex items-center gap-1.5 text-purple-950">
                          <Gamepad2 className="w-4 h-4 text-purple-700" />
                          معلومات عملية الشحن / المعاملة الإلكترونية:
                        </div>
                        <p className="text-[11px] text-purple-800 leading-relaxed">
                          نظام الدفع لهذه العملية مقتصر على <strong>الدفع النقدي</strong> أو التحويل عبر <strong>حساب CCP / بريدي موب</strong> فقط.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Debt Notice */}
              {paymentMethod === 'debt' && (
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1.5">
                  <div className="font-bold flex items-center gap-1 text-amber-800">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    تنبيه البيع بالآجل:
                  </div>
                  <p>
                    سيتم تسجيل المبلغ المتبقي كدين على حساب العميل:{' '}
                    <strong>{selectedCustomer?.name || 'لم يتم اختيار عميل!'}</strong>
                  </p>
                  {!selectedCustomer && (
                    <button
                      onClick={() => setIsNewCustomerModalOpen(true)}
                      className="text-xs font-bold text-amber-900 underline block"
                    >
                      اضغط هنا لاختيار أو إضافة عميل
                    </button>
                  )}
                </div>
              )}

              {/* Paid Amount Input & Quick Cash Buttons */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700">
                    {paymentMethod === 'debt' ? 'المبلغ المدفوع مقدماً (إن وجد):' : 'المبلغ المدفوع من الزبون:'}
                  </label>
                  <span className="text-xs text-slate-500 font-mono">
                    المطلوب: {grandTotal.toFixed(2)} {settings.currencySymbol}
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={paidAmountStr}
                    onChange={(e) => setPaidAmountStr(e.target.value)}
                    placeholder="أدخل المبلغ المدفوع..."
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-mono font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    autoFocus
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    {settings.currencySymbol}
                  </span>
                </div>

                {/* Quick Cash Amount Helpers */}
                {paymentMethod === 'cash' && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setPaidAmountStr(grandTotal.toString())}
                      className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700"
                    >
                      المبلغ بالضبط ({grandTotal.toFixed(0)})
                    </button>
                    {[50, 100, 200, 500, 1000, 2000].map((preset) => {
                      if (preset < grandTotal && preset !== 50) return null;
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setPaidAmountStr(preset.toString())}
                          className="py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-700"
                        >
                          {preset} {settings.currencySymbol}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Change / Balance Calculation */}
              <div className="p-3.5 bg-slate-100 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                {changeAmount > 0 && (
                  <div className="flex justify-between items-center text-emerald-800 font-bold bg-emerald-100/70 p-2 rounded-xl">
                    <span>المتبقي للزبون (الصرف):</span>
                    <span className="text-base font-mono">
                      {changeAmount.toFixed(2)} {settings.currencySymbol}
                    </span>
                  </div>
                )}

                {paymentMethod === 'debt' && debtRemaining > 0 && (
                  <div className="flex justify-between items-center text-rose-800 font-bold bg-rose-100/70 p-2 rounded-xl">
                    <span>المبلغ المسجل كدين:</span>
                    <span className="text-base font-mono">
                      {debtRemaining.toFixed(2)} {settings.currencySymbol}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-slate-600">
                  <span>الكاشير المسؤول:</span>
                  <span className="font-semibold text-slate-900">{currentUser.name}</span>
                </div>
              </div>

              {/* Invoice Note */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">ملاحظة على الفاتورة (اختياري):</label>
                <input
                  type="text"
                  placeholder="مثال: تم التوصيل، دفعة أولى..."
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-2.5">
              <button
                type="button"
                onClick={handleCompleteSale}
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-2xl font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition-all"
              >
                <Check className="w-4 h-4" />
                تأكيد وطباعة الفاتورة
              </button>

              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="py-3 px-4 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-2xl font-bold text-xs transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* HELD ORDERS MODAL (الطلبات المعلقة) */}
      {/* ======================================================== */}
      {isHeldOrdersOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold">الطلبات المعلقة ({heldOrders.length})</h3>
              </div>
              <button
                onClick={() => setIsHeldOrdersOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-2.5 max-h-80 overflow-y-auto">
              {heldOrders.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">لا توجد طلبات معلقة حالياً</p>
              ) : (
                heldOrders.map((order) => {
                  const orderTotal = order.cartItems.reduce(
                    (s, i) => s + i.unitPrice * i.quantity,
                    0
                  );
                  return (
                    <div
                      key={order.id}
                      className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900">{order.orderName}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {order.cartItems.length} أصناف • {orderTotal.toFixed(2)} {settings.currencySymbol}
                        </div>
                        <div className="text-[9px] text-slate-400 font-mono">
                          {new Date(order.createdAt).toLocaleTimeString('ar-SA')}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => resumeHeldOrder(order)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors"
                        >
                          استعادة
                        </button>
                        <button
                          onClick={() => deleteHeldOrder(order.id)}
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* QUICK ADD PRODUCT MODAL (WITH COMPANY BARCODE SUPPORT) */}
      {/* ======================================================== */}
      {isQuickAddProductOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150 text-right">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-500/20 rounded-xl text-blue-400">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">إضافة منتج جديد سريع</h3>
                  <p className="text-[11px] text-slate-400">
                    اعتماد باركود الشركة المصنعة أو توليد باركود جديد
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsQuickAddProductOpen(false);
                  setQuickAddNotice(null);
                }}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Notice when auto-opened from scanned barcode */}
            {quickAddNotice && (
              <div className="p-3 bg-amber-50 border-b border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{quickAddNotice}</span>
              </div>
            )}

            <form onSubmit={handleQuickAddProductSubmit} className="p-5 space-y-4">
              {/* Barcode Section with Camera Scan & Auto-generate */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>باركود المنتج (باركود الشركة أو تلقائي) *</span>
                  <button
                    type="button"
                    onClick={generateRandomBarcode}
                    className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>توليد باركود تلقائي</span>
                  </button>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Barcode className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="امسح باركود الشركة المصنعة أو اكتبه..."
                      value={newProdBarcode}
                      onChange={(e) => setNewProdBarcode(e.target.value)}
                      className="w-full pr-9 pl-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsScannerForNewProdOpen(true)}
                    className="px-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
                    title="مسح باركود العلبة بكاميرا الهاتف"
                  >
                    <Camera className="w-4 h-4 text-slate-600" />
                    <span className="hidden sm:inline">مسح بكاميرا</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  💡 <strong>نصيحة:</strong> يمكنك الاعتماد مباشرة على الباركود المطبوع على علبة المنتج من المصنع دون الحاجة لطباعة باركود جديد.
                </p>
              </div>

              {/* Product Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">اسم المنتج / الصنف *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: زيت عافية 1 لتر / كوكاكولا 33cl / شامبو..."
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-bold"
                  autoFocus={!newProdBarcode}
                />
              </div>

              {/* Category & Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">التصنيف</label>
                  <select
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500"
                  >
                    {categories
                      .filter((c) => c.id !== 'cat_all')
                      .map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">الوحدة</label>
                  <select
                    value={newProdUnit}
                    onChange={(e) => setNewProdUnit(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500"
                  >
                    <option value="قطعة">قطعة (Piece)</option>
                    <option value="علبة">علبة (Boîte)</option>
                    <option value="قارورة">قارورة (Bouteille)</option>
                    <option value="كغ">كيلوغرام (Kg)</option>
                    <option value="غرام">غرام (g)</option>
                    <option value="لتر">لتر (Litre)</option>
                    <option value="حبة">حبة</option>
                  </select>
                </div>
              </div>

              {/* Prices and Initial Stock */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">سعر البيع *</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="0.00"
                      value={newProdSellingPrice}
                      onChange={(e) => setNewProdSellingPrice(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-500"
                    />
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">
                      {settings.currencySymbol}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">سعر الشراء / التكلفة</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={newProdCostPrice}
                      onChange={(e) => setNewProdCostPrice(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-slate-400"
                    />
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">
                      {settings.currencySymbol}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">الكمية بالمخزن</label>
                  <input
                    type="number"
                    min="1"
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Add directly to Cart Checkbox */}
              <label className="flex items-center gap-2.5 p-3 bg-blue-50/70 rounded-2xl border border-blue-200/80 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newProdAutoAddToCart}
                  onChange={(e) => setNewProdAutoAddToCart(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded-md focus:ring-blue-500 border-slate-300"
                />
                <span className="text-xs text-blue-950 font-bold">
                  إضافة هذا المنتج مباشرة إلى سلة المبيعات الحالية بعد الحفظ
                </span>
              </label>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold rounded-2xl text-xs shadow-md shadow-blue-600/20 flex items-center justify-center gap-1.5 transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>حفظ المنتج في المخزون</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsQuickAddProductOpen(false);
                    setQuickAddNotice(null);
                  }}
                  className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Camera Barcode Scanner for New Product Modal */}
      <BarcodeScannerModal
        isOpen={isScannerForNewProdOpen}
        onClose={() => setIsScannerForNewProdOpen(false)}
        onScanSuccess={(code) => {
          setNewProdBarcode(code);
          setIsScannerForNewProdOpen(false);
        }}
      />

      {/* ======================================================== */}
      {/* QUICK DELETE PRODUCT & RECYCLE BIN ARCHIVE MODAL */}
      {/* ======================================================== */}
      {isQuickDeleteProductOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-3 md:p-6 overflow-y-auto">
          <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[90vh] animate-in fade-in zoom-in-95 duration-150 text-right">
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-2xl ${deleteModalTab === 'products' ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                  {deleteModalTab === 'products' ? <Trash2 className="w-6 h-6" /> : <RotateCcw className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {deleteModalTab === 'products' ? 'إدارة وحذف منتجات النظام' : 'سجل المحذوفات وسلة الاسترجاع'}
                  </h3>
                  <p className="text-xs text-slate-300">
                    {deleteModalTab === 'products'
                      ? 'تصفح جميع المنتجات، ابحث بالاسم أو امسح الباركود لحذف أي صنف من النظام'
                      : 'قائمة بجميع المنتجات التي تم حذفها - يمكنك استرجاع أي منتج إلى النظام بضغطة زر'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsQuickDeleteProductOpen(false);
                  setProductToDelete(null);
                  setDeleteSearchInput('');
                  setArchiveSearchInput('');
                  setDeleteCategoryFilter('all');
                  setDeleteNotice(null);
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Navigation Tabs (Products vs Deleted History) */}
            <div className="flex items-center bg-slate-100 p-1.5 border-b border-slate-200 shrink-0 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setDeleteModalTab('products');
                  setDeleteNotice(null);
                }}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
                  deleteModalTab === 'products'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-white/70'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                <span>حذف من منتجات المتجر</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${deleteModalTab === 'products' ? 'bg-rose-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  {products.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDeleteModalTab('archive');
                  setDeletedProductsList(StorageService.getDeletedProducts());
                  setDeleteNotice(null);
                }}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
                  deleteModalTab === 'archive'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-white/70'
                }`}
              >
                <RotateCcw className="w-4 h-4" />
                <span>سجل المحذوفات وسلة الاسترجاع</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${deleteModalTab === 'archive' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'}`}>
                  {deletedProductsList.length}
                </span>
              </button>
            </div>

            {/* Success Notice Banner */}
            {deleteNotice && (
              <div className="p-3 bg-emerald-50 border-b border-emerald-200 text-xs font-bold text-emerald-900 flex items-center justify-between gap-2 animate-in fade-in shrink-0">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{deleteNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteNotice(null)}
                  className="text-emerald-700 hover:text-emerald-900 text-[11px] underline"
                >
                  إخفاء التنبيه
                </button>
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 1: DELETE PRODUCTS VIEW */}
            {/* ======================================================== */}
            {deleteModalTab === 'products' && (
              <>
                {/* Top Controls: Search, Camera Scanner, and Category Pills */}
                <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0">
                  <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
                    {/* Search / Barcode Input */}
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        autoFocus
                        placeholder="ابحث بالاسم، أو امسح باركود الشركة بالقارئ..."
                        value={deleteSearchInput}
                        onChange={(e) => handleSearchOrScanDelete(e.target.value)}
                        className="w-full pr-10 pl-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                      />
                      {deleteSearchInput && (
                        <button
                          type="button"
                          onClick={() => handleSearchOrScanDelete('')}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                        >
                          مسح
                        </button>
                      )}
                    </div>

                    {/* Camera Scanner Button */}
                    <button
                      type="button"
                      onClick={() => setIsScannerForDeleteProdOpen(true)}
                      className="px-4 py-2.5 bg-white hover:bg-rose-50 hover:border-rose-300 border border-slate-200 rounded-xl text-slate-700 hover:text-rose-700 text-xs font-bold flex items-center justify-center gap-2 transition-all shrink-0 shadow-xs"
                      title="مسح باركود العلبة بكاميرا الهاتف"
                    >
                      <Camera className="w-4 h-4 text-rose-600" />
                      <span>مسح بكاميرا الهاتف</span>
                    </button>
                  </div>

                  {/* Category Filter Bar with Scroll Arrows & Layout Mode Switcher */}
                  <div className="flex items-center justify-between gap-2 border-t border-slate-200/80 pt-2.5">
                    {/* Scroll Right Button */}
                    <button
                      type="button"
                      onClick={() => scrollDeleteCategoriesBar('right')}
                      className="p-1.5 rounded-xl bg-white hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200 shrink-0"
                      title="تحريك التصنيفات لليمين"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    {/* Category Filter Pills (Scrollable) */}
                    <div
                      ref={deleteCategoriesBarRef}
                      className="flex-1 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs scroll-smooth"
                    >
                      <button
                        type="button"
                        onClick={() => setDeleteCategoryFilter('all')}
                        className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors shrink-0 ${
                          deleteCategoryFilter === 'all'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                        }`}
                      >
                        الكل ({products.length})
                      </button>
                      {categories
                        .filter((c) => c.id !== 'cat_all')
                        .map((cat) => {
                          const count = products.filter((p) => p.categoryId === cat.id).length;
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => setDeleteCategoryFilter(cat.id)}
                              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors flex items-center gap-1 shrink-0 ${
                                deleteCategoryFilter === cat.id
                                  ? 'bg-rose-600 text-white shadow-xs'
                                  : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                              }`}
                            >
                              <span>{cat.name}</span>
                              <span className="text-[10px] opacity-75">({count})</span>
                            </button>
                          );
                        })}
                    </div>

                    {/* Scroll Left Button */}
                    <button
                      type="button"
                      onClick={() => scrollDeleteCategoriesBar('left')}
                      className="p-1.5 rounded-xl bg-white hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200 shrink-0"
                      title="تحريك التصنيفات لليسار"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {/* Layout Mode Switcher (Shelves vs Grid) */}
                    <div className="flex items-center bg-white p-0.5 rounded-xl border border-slate-200 shrink-0 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setDeleteLayoutMode('shelves')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          deleteLayoutMode === 'shelves'
                            ? 'bg-rose-600 text-white shadow-2xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                        title="عرض رفوف وقوائم متحركة بالأقسام"
                      >
                        <Rows3 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">رفوف متحركة</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteLayoutMode('grid')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          deleteLayoutMode === 'grid'
                            ? 'bg-rose-600 text-white shadow-2xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                        title="عرض شبكة البطاقات"
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">شبكة</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Main Content Area: Products Movable Shelves/Grid + Selected Product Details */}
                <div className="p-4 overflow-y-auto flex-1 space-y-4">
                  {/* Selected Product Confirmation Banner (if a product is chosen) */}
                  {productToDelete && (
                    <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl space-y-3 animate-in fade-in zoom-in-95">
                      <div className="flex items-center justify-between border-b border-rose-200 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-black uppercase tracking-wider text-rose-700 bg-rose-200/80 px-2.5 py-1 rounded-lg">
                            المنتج المحدد للحذف
                          </span>
                          <h4 className="text-sm font-black text-slate-900">
                            {productToDelete.name}
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => setProductToDelete(null)}
                          className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          إلغاء التحديد
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                        <div className="bg-white p-2.5 rounded-xl border border-rose-100">
                          <span className="text-slate-500 block text-[10px] font-medium">الباركود</span>
                          <span className="font-mono font-bold text-slate-900">
                            {productToDelete.barcode}
                          </span>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-rose-100">
                          <span className="text-slate-500 block text-[10px] font-medium">سعر البيع</span>
                          <span className="font-bold text-emerald-600">
                            {productToDelete.sellingPrice.toFixed(0)} {settings.currencySymbol}
                          </span>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-rose-100">
                          <span className="text-slate-500 block text-[10px] font-medium">المخزون المتوفر</span>
                          <span className="font-bold text-slate-900">
                            {productToDelete.stock} {productToDelete.unit}
                          </span>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-rose-100">
                          <span className="text-slate-500 block text-[10px] font-medium">التصنيف</span>
                          <span className="font-bold text-slate-900">
                            {categories.find((c) => c.id === productToDelete.categoryId)?.name || 'عام'}
                          </span>
                        </div>
                      </div>

                      <div className="p-3 bg-rose-100/80 rounded-xl text-xs text-rose-950 font-bold flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                          <span>
                            سيتم نقل هذا المنتج إلى <strong>سجل المحذوفات</strong>، ويمكنك استرجاعه في أي وقت من تبويب سلة الاسترجاع.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleConfirmDeleteProductFromSystem}
                          className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-600/30 flex items-center gap-1.5 transition-all shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>نعم، حذف الآن</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Full Products Display: Movable Shelves vs Grid */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                      <span className="font-bold">
                        قائمة منتجات النظام (اسحب القوائم يمنة ويسرة أو انقر على أي منتج لمعاينته وحذفه):
                      </span>
                      <span>
                        عدد المنتجات المعروضة:{' '}
                        {
                          products.filter((p) => {
                            const matchCat =
                              deleteCategoryFilter === 'all' || p.categoryId === deleteCategoryFilter;
                            const matchSearch =
                              !deleteSearchInput.trim() ||
                              p.name.toLowerCase().includes(deleteSearchInput.toLowerCase()) ||
                              p.barcode.toLowerCase().includes(deleteSearchInput.toLowerCase());
                            return matchCat && matchSearch;
                          }).length
                        }
                      </span>
                    </div>

                    {deleteLayoutMode === 'shelves' && !deleteSearchInput.trim() ? (
                      /* ======================================================== */
                      /* MOVABLE SHELVES IN DELETE MODAL (رفوف وقوائم متحركة للحذف) */
                      /* ======================================================== */
                      <div className="space-y-3">
                        {(deleteCategoryFilter === 'all'
                          ? categories.filter((c) => c.id !== 'cat_all')
                          : categories.filter((c) => c.id === deleteCategoryFilter)
                        ).map((cat) => {
                          const catProducts = products.filter((p) => p.categoryId === cat.id);
                          if (catProducts.length === 0) return null;

                          return (
                            <DeleteProductShelfRow
                              key={`del_shelf_row_${cat.id}`}
                              category={cat}
                              products={catProducts}
                              settings={settings}
                              onSelectProduct={(p) => setProductToDelete(p)}
                              onDeleteProduct={(p) => handleDeleteProductById(p)}
                              selectedProductId={productToDelete?.id || null}
                            />
                          );
                        })}
                      </div>
                    ) : (
                      /* ======================================================== */
                      /* GRID VIEW IN DELETE MODAL (عرض الشبكة) */
                      /* ======================================================== */
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {products
                          .filter((p) => {
                            const matchCat =
                              deleteCategoryFilter === 'all' || p.categoryId === deleteCategoryFilter;
                            const matchSearch =
                              !deleteSearchInput.trim() ||
                              p.name.toLowerCase().includes(deleteSearchInput.toLowerCase()) ||
                              p.barcode.toLowerCase().includes(deleteSearchInput.toLowerCase());
                            return matchCat && matchSearch;
                          })
                          .map((prod) => {
                            const isSelected = productToDelete?.id === prod.id;
                            return (
                              <div
                                key={prod.id}
                                onClick={() => setProductToDelete(prod)}
                                className={`p-3 rounded-2xl border text-right cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                                  isSelected
                                    ? 'bg-rose-50 border-rose-500 shadow-md ring-2 ring-rose-500/20'
                                    : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-rose-300 shadow-2xs'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <h5 className="font-bold text-xs text-slate-900 line-clamp-1">
                                      {prod.name}
                                    </h5>
                                    <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                                      <Barcode className="w-3 h-3 text-slate-400" />
                                      <span>{prod.barcode}</span>
                                    </div>
                                  </div>
                                  <span className="text-xs font-black text-rose-600 whitespace-nowrap font-mono">
                                    {prod.sellingPrice.toFixed(0)} {settings.currencySymbol}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-100">
                                  <span className="text-slate-500">
                                    المخزون: <strong className="text-slate-800">{prod.stock}</strong> {prod.unit}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteProductById(prod);
                                      }}
                                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-xs transition-colors"
                                      title="حذف ونقل إلى سجل المحذوفات"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      <span>حذف</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}

                    {products.filter((p) => {
                      const matchCat =
                        deleteCategoryFilter === 'all' || p.categoryId === deleteCategoryFilter;
                      const matchSearch =
                        !deleteSearchInput.trim() ||
                        p.name.toLowerCase().includes(deleteSearchInput.toLowerCase()) ||
                        p.barcode.toLowerCase().includes(deleteSearchInput.toLowerCase());
                      return matchCat && matchSearch;
                    }).length === 0 && (
                      <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                        لا توجد منتجات مطابقة لخيارات البحث أو التصنيف الحالية
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Buttons for Tab 1 */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
                  <div className="text-xs text-slate-500">
                    {productToDelete ? (
                      <span className="text-rose-600 font-bold">
                        تم تحديد منتج ({productToDelete.name}) للحذف.
                      </span>
                    ) : (
                      <span>اختر أي منتج من القائمة لحذفه ونقله إلى سجل المحذوفات.</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsQuickDeleteProductOpen(false);
                        setProductToDelete(null);
                        setDeleteSearchInput('');
                        setDeleteCategoryFilter('all');
                        setDeleteNotice(null);
                      }}
                      className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                    >
                      إغلاق
                    </button>
                    {productToDelete && (
                      <button
                        type="button"
                        onClick={handleConfirmDeleteProductFromSystem}
                        className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md shadow-rose-600/20 flex items-center gap-1.5 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>تأكيد الحذف</span>
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* ======================================================== */}
            {/* TAB 2: DELETED PRODUCTS ARCHIVE & RECOVERY */}
            {/* ======================================================== */}
            {deleteModalTab === 'archive' && (
              <>
                {/* Archive Top Actions */}
                <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0">
                  <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
                    {/* Search inside archive */}
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="ابحث في المنتجات المحذوفة بالاسم أو الباركود..."
                        value={archiveSearchInput}
                        onChange={(e) => setArchiveSearchInput(e.target.value)}
                        className="w-full pr-10 pl-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                      />
                      {archiveSearchInput && (
                        <button
                          type="button"
                          onClick={() => setArchiveSearchInput('')}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                        >
                          مسح
                        </button>
                      )}
                    </div>

                    {/* Bulk Archive Actions */}
                    {deletedProductsList.length > 0 && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={handleRestoreAll}
                          className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                          title="استرجاع جميع المنتجات المحذوفة دفعة واحدة"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>استرجاع جميع المحذوفات ({deletedProductsList.length})</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleClearArchive}
                          className="px-3.5 py-2.5 bg-slate-200 hover:bg-rose-100 hover:text-rose-700 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                          title="مسح سجل المحذوفات نهائياً"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>تفريغ السجل</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Archive List Area */}
                <div className="p-4 overflow-y-auto flex-1 space-y-4">
                  {deletedProductsList.length === 0 ? (
                    <div className="text-center py-16 px-4 bg-slate-50 rounded-3xl border border-dashed border-slate-200 space-y-3">
                      <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
                        <RotateCcw className="w-7 h-7" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">سجل المحذوفات فارغ حالياً</h4>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        أي منتج تقوم بحذفه من المتجر يتم حفظه تلقائياً في هذا السجل الآمن، حتى تتمكن من استرجاعه وإعادته للمخزون بضغطة زر واحدة في أي وقت.
                      </p>
                      <button
                        type="button"
                        onClick={() => setDeleteModalTab('products')}
                        className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5 mt-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>الانتقال لقائمة منتجات النظام</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                        <span className="font-bold">
                          قائمة المنتجات المحذوفة ({deletedProductsList.length} منتج):
                        </span>
                        <span className="text-emerald-700 font-bold text-[11px]">
                          انقر على زر "استرجاع" لإعادة الصنف فوراً إلى النظام
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {deletedProductsList
                          .filter((p) => {
                            if (!archiveSearchInput.trim()) return true;
                            return (
                              p.name.toLowerCase().includes(archiveSearchInput.toLowerCase()) ||
                              p.barcode.toLowerCase().includes(archiveSearchInput.toLowerCase())
                            );
                          })
                          .map((deletedProd) => {
                            const formattedDate = deletedProd.deletedAt
                              ? new Date(deletedProd.deletedAt).toLocaleDateString('ar-DZ', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'مؤخراً';

                            return (
                              <div
                                key={deletedProd.id}
                                className="p-3.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-2xl flex flex-col justify-between gap-3 transition-all text-right shadow-2xs"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <h5 className="font-bold text-sm text-slate-900">
                                      {deletedProd.name}
                                    </h5>
                                    <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                                      <Barcode className="w-3.5 h-3.5 text-slate-400" />
                                      <span>{deletedProd.barcode}</span>
                                    </div>
                                  </div>
                                  <div className="text-left">
                                    <span className="text-xs font-black text-slate-900 block">
                                      {deletedProd.sellingPrice.toFixed(2)} {settings.currencySymbol}
                                    </span>
                                    <span className="text-[10px] text-slate-500">
                                      المخزون: {deletedProd.stock} {deletedProd.unit}
                                    </span>
                                  </div>
                                </div>

                                <div className="text-[10px] text-slate-400 bg-white p-2 rounded-xl border border-slate-100 flex items-center justify-between">
                                  <span>تاريخ الحذف: <strong>{formattedDate}</strong></span>
                                  <span>
                                    التصنيف: {categories.find((c) => c.id === deletedProd.categoryId)?.name || 'عام'}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200">
                                  <button
                                    type="button"
                                    onClick={() => handlePermanentlyDeleteFromArchive(deletedProd)}
                                    className="px-2.5 py-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-colors"
                                    title="حذف نهائي للأبد من السجل"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>مسح نهائي</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleRestoreProduct(deletedProd)}
                                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
                                    title="استرجاع هذا المنتج وإعادته للنظام والمخزون"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>استرجاع إلى النظام</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>

                      {deletedProductsList.filter((p) => {
                        if (!archiveSearchInput.trim()) return true;
                        return (
                          p.name.toLowerCase().includes(archiveSearchInput.toLowerCase()) ||
                          p.barcode.toLowerCase().includes(archiveSearchInput.toLowerCase())
                        );
                      }).length === 0 && (
                        <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 text-xs">
                          لا توجد منتجات محذوفة تطابق البحث
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer for Tab 2 */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
                  <div className="text-xs text-slate-500">
                    <span>عدد العناصر الموجودة في سلة الاسترجاع: {deletedProductsList.length}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickDeleteProductOpen(false);
                      setArchiveSearchInput('');
                      setDeleteNotice(null);
                    }}
                    className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                  >
                    إغلاق
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Camera Barcode Scanner for Delete Product Modal */}
      <BarcodeScannerModal
        isOpen={isScannerForDeleteProdOpen}
        onClose={() => setIsScannerForDeleteProdOpen(false)}
        onScanSuccess={(code) => {
          handleSearchOrScanDelete(code);
          setIsScannerForDeleteProdOpen(false);
        }}
      />

      {/* ======================================================== */}
      {/* QUICK ADD CUSTOMER MODAL */}
      {/* ======================================================== */}
      {isNewCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold">إضافة عميل جديد</h3>
              </div>
              <button
                onClick={() => setIsNewCustomerModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="p-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">اسم العميل *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: محمد العمري"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-emerald-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">رقم الهاتف</label>
                <input
                  type="tel"
                  placeholder="05..."
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">العنوان / ملاحظة</label>
                <input
                  type="text"
                  placeholder="حي النخيل..."
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs"
                >
                  حفظ واختيار
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewCustomerModalOpen(false)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Camera Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleBarcodeScanned}
      />

      {/* Printable Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        sale={completedSale}
        settings={settings}
        isNewSale={true}
      />

      {/* ======================================================== */}
      {/* QUICK FLEXY TOP-UP MODAL (نافذة شحن الفليكسي والرصيد الحر) */}
      {/* ======================================================== */}
      {isFlexyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 bg-emerald-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-yellow-300 fill-yellow-300" />
                </div>
                <div>
                  <h3 className="text-base font-black">شحن رصيد وفليكسي حر (Flexy)</h3>
                  <p className="text-xs text-emerald-100">
                    شحن أي مبلغ يريده الزبون (5، 10، 50، 100 أو أي مبلغ حر)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFlexyModalOpen(false)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Operator Selector */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  اختر شبكة المتعامل (المشغل):
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'Mobilis', name: 'موبيليس', color: 'bg-emerald-600 border-emerald-700 text-white' },
                    { id: 'Djezzy', name: 'جيزي', color: 'bg-red-600 border-red-700 text-white' },
                    { id: 'Ooredoo', name: 'أوريدو', color: 'bg-rose-700 border-rose-800 text-white' },
                    { id: 'Idoom', name: 'إيدوم / 4G', color: 'bg-sky-600 border-sky-700 text-white' },
                  ].map((op) => {
                    const isSelected = flexyOperator === op.id;
                    return (
                      <button
                        key={op.id}
                        type="button"
                        onClick={() => setFlexyOperator(op.id as any)}
                        className={`py-2 px-2 rounded-xl text-xs font-black border transition-all text-center ${
                          isSelected
                            ? `${op.color} shadow-md scale-[1.02] ring-2 ring-emerald-400`
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {op.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Phone Number (Optional) */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  رقم هاتف الزبون (اختياري):
                </label>
                <div className="relative">
                  <PhoneCall className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    placeholder="مثال: 0661234567 أو 0550123456..."
                    value={flexyPhone}
                    onChange={(e) => setFlexyPhone(e.target.value)}
                    className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono text-slate-800 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              {/* Quick Preset Amounts */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    اختر مبلغاً سريعاً:
                  </label>
                  <span className="text-[11px] text-slate-500">أو اكتب المبلغ المخصص بالأسفل</span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                  {['5', '10', '20', '50', '100', '150', '200', '300', '500', '1000', '1500', '2000'].map((amt) => {
                    const isSelected = flexyAmount === amt;
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setFlexyAmount(amt)}
                        className={`py-2 px-1 rounded-xl text-xs font-mono font-black border transition-all text-center ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-400/50 scale-105'
                            : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800'
                        }`}
                      >
                        {amt} {settings.currencySymbol}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Amount Input ("كل شخص حر") */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  المبلغ المطلوب (دج) - كل زبون ومقدوره:
                </label>
                <div className="relative">
                  <Coins className="w-4 h-4 text-emerald-600 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="اكتب أي مبلغ حر يريده الزبون (مثال: 5، 10، 75، 450...)"
                    value={flexyAmount}
                    onChange={(e) => setFlexyAmount(e.target.value)}
                    className="w-full pr-10 pl-16 py-3 bg-slate-50 border-2 border-emerald-500/40 rounded-2xl text-base sm:text-lg font-mono font-black text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/20"
                    autoFocus
                  />
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 font-mono">
                    {settings.currencySymbol}
                  </span>
                </div>
              </div>

              {/* Optional Fee / Commission */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  عمولة أو رسوم خدمة إضافية (اختياري):
                </label>
                <input
                  type="number"
                  min="0"
                  step="5"
                  placeholder="0"
                  value={flexyFee}
                  onChange={(e) => setFlexyFee(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:bg-white focus:border-emerald-500"
                />
              </div>

              {/* Total Calculation Preview */}
              <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-emerald-800 font-bold block">المبلغ الإجمالي للإضافة إلى السلة:</span>
                  <span className="text-[11px] text-emerald-600">
                    رصيد {flexyAmount || '0'} {settings.currencySymbol} + عمولة {flexyFee || '0'} {settings.currencySymbol}
                  </span>
                </div>
                <div className="text-lg font-black font-mono text-emerald-800">
                  {((parseFloat(flexyAmount) || 0) + (parseFloat(flexyFee) || 0)).toFixed(0)} {settings.currencySymbol}
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsFlexyModalOpen(false)}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  const amt = parseFloat(flexyAmount);
                  const fee = parseFloat(flexyFee) || 0;
                  if (isNaN(amt) || amt <= 0) {
                    alert('يرجى كتابة مبلغ صحيح');
                    return;
                  }
                  handleAddCustomFlexyToCart(flexyOperator, flexyPhone, amt, fee);
                }}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-2xl text-xs sm:text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>إضافة الفليكسي إلى السلة فوراً</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* CIGARETTES LOOSE PIECES & PACK MODAL (نافذة بيع السجائر بالحبة والعلبة) */}
      {/* ======================================================== */}
      {isCigaretteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 bg-amber-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Cigarette className="w-5 h-5 text-amber-200" />
                </div>
                <div>
                  <h3 className="text-base font-black">بيع السجائر (بالحبة الفردية أو بالعلبة)</h3>
                  <p className="text-xs text-amber-100">
                    تلبية طلب الزبون حسب مقدوره (1 حبة، 2 حبتين، 3 سجائر، أو علبة كاملة)
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsCigaretteModalOpen(false);
                  setSelectedCigaretteProd(null);
                }}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Product Selection */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  نوع السجائر / الماركة:
                </label>
                <select
                  value={selectedCigaretteProd?.id || ''}
                  onChange={(e) => {
                    const found = products.find((p) => p.id === e.target.value);
                    if (found) setSelectedCigaretteProd(found);
                  }}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                >
                  {products.filter(isCigaretteProduct).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} - سعر العلبة: {c.sellingPrice} {settings.currencySymbol} (المخزون: {c.stock} علبة)
                    </option>
                  ))}
                  {products.filter(isCigaretteProduct).length === 0 && (
                    <option value="">لا توجد سجائر مسجلة في المخزون</option>
                  )}
                </select>
              </div>

              {selectedCigaretteProd && (
                <>
                  {/* Mode Selector Tabs: Piece vs Pack */}
                  <div className="flex rounded-2xl bg-slate-100 p-1 border border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        setCigaretteSaleType('piece');
                        setCigarettePieceCount(1);
                      }}
                      className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 ${
                        cigaretteSaleType === 'piece'
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Cigarette className="w-4 h-4" />
                      <span>بالحبة (سيجارة فردية)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCigaretteSaleType('pack');
                        setCigarettePackCount(1);
                      }}
                      className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 ${
                        cigaretteSaleType === 'pack'
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>بالعلبة الكاملة (Paquet)</span>
                    </button>
                  </div>

                  {/* TAB 1: LOOSE PIECES (بالحبة) */}
                  {cigaretteSaleType === 'piece' && (
                    <div className="space-y-4 bg-amber-50/50 p-4 rounded-2xl border border-amber-200/80">
                      {/* Quick Pieces Presets */}
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1.5">
                          كم حبة يريد الزبون؟
                        </label>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                          {[
                            { count: 1, label: '1 حبة' },
                            { count: 2, label: 'حبتين (2)' },
                            { count: 3, label: '3 حبات' },
                            { count: 4, label: '4 حبات' },
                            { count: 5, label: '5 حبات' },
                            { count: 10, label: 'نصف علبة (10)' },
                          ].map((item) => {
                            const isSelected = cigarettePieceCount === item.count;
                            return (
                              <button
                                key={item.count}
                                type="button"
                                onClick={() => setCigarettePieceCount(item.count)}
                                className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all text-center ${
                                  isSelected
                                    ? 'bg-amber-600 text-white border-amber-700 shadow-sm scale-105 ring-2 ring-amber-400'
                                    : 'bg-white hover:bg-amber-100 border-amber-200 text-slate-800'
                                }`}
                              >
                                {item.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Custom Count Input */}
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          أو أدخل عدد الحبات يدوياً:
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="200"
                          value={cigarettePieceCount}
                          onChange={(e) => setCigarettePieceCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                          className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-sm font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                        />
                      </div>

                      {/* Custom Piece Price */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-slate-700">
                            سعر الحبة الواحدة:
                          </label>
                          <span className="text-[10px] text-slate-500 font-mono">
                            السعر المقترح: {Math.max(10, Math.ceil(selectedCigaretteProd.sellingPrice / 20))} {settings.currencySymbol}
                          </span>
                        </div>
                        <input
                          type="number"
                          placeholder={Math.max(10, Math.ceil(selectedCigaretteProd.sellingPrice / 20)).toString()}
                          value={cigaretteCustomPiecePrice}
                          onChange={(e) => setCigaretteCustomPiecePrice(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                        />
                      </div>

                      {/* Calculation Summary */}
                      {(() => {
                        const unitPrice =
                          parseFloat(cigaretteCustomPiecePrice) > 0
                            ? parseFloat(cigaretteCustomPiecePrice)
                            : Math.max(10, Math.ceil(selectedCigaretteProd.sellingPrice / 20));
                        const total = unitPrice * cigarettePieceCount;

                        return (
                          <div className="p-3 bg-white rounded-xl border border-amber-200 flex items-center justify-between">
                            <div>
                              <span className="text-xs font-bold text-amber-900 block">
                                الحساب الإجمالي لـ ({cigarettePieceCount} حبة):
                              </span>
                              <span className="text-[11px] text-slate-500 font-mono">
                                {cigarettePieceCount} × {unitPrice} {settings.currencySymbol}
                              </span>
                            </div>
                            <div className="text-base font-black font-mono text-amber-700">
                              {total.toFixed(0)} {settings.currencySymbol}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* TAB 2: FULL PACK (بالعلبة) */}
                  {cigaretteSaleType === 'pack' && (
                    <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1.5">
                          عدد العلب:
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { count: 1, label: '1 علبة' },
                            { count: 2, label: 'علبتين (2)' },
                            { count: 3, label: '3 علب' },
                            { count: 10, label: '10 علب (خرطوشة)' },
                          ].map((item) => {
                            const isSelected = cigarettePackCount === item.count;
                            return (
                              <button
                                key={item.count}
                                type="button"
                                onClick={() => setCigarettePackCount(item.count)}
                                className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all text-center ${
                                  isSelected
                                    ? 'bg-amber-600 text-white border-amber-700 shadow-sm scale-105 ring-2 ring-amber-400'
                                    : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800'
                                }`}
                              >
                                {item.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          أو أدخل عدد العلب:
                        </label>
                        <input
                          type="number"
                          min="1"
                          max={selectedCigaretteProd.stock}
                          value={cigarettePackCount}
                          onChange={(e) => setCigarettePackCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                        />
                      </div>

                      {/* Pack Total Calculation */}
                      <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">
                            الحساب الإجمالي لـ ({cigarettePackCount} علبة):
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {cigarettePackCount} × {selectedCigaretteProd.sellingPrice} {settings.currencySymbol}
                          </span>
                        </div>
                        <div className="text-base font-black font-mono text-emerald-700">
                          {(selectedCigaretteProd.sellingPrice * cigarettePackCount).toFixed(0)} {settings.currencySymbol}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsCigaretteModalOpen(false);
                  setSelectedCigaretteProd(null);
                }}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-colors"
              >
                إلغاء
              </button>
              {selectedCigaretteProd && (
                <button
                  type="button"
                  onClick={() => {
                    const customPrice =
                      parseFloat(cigaretteCustomPiecePrice) > 0
                        ? parseFloat(cigaretteCustomPiecePrice)
                        : undefined;
                    handleAddCigarettesToCart(
                      selectedCigaretteProd,
                      cigaretteSaleType === 'piece' ? cigarettePieceCount : cigarettePackCount,
                      cigaretteSaleType === 'piece',
                      customPrice
                    );
                  }}
                  className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-bold rounded-2xl text-xs sm:text-sm shadow-md shadow-amber-600/20 flex items-center justify-center gap-2 transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    إضافة {cigaretteSaleType === 'piece' ? `${cigarettePieceCount} حبة` : `${cigarettePackCount} علبة`} إلى السلة
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* NUTS & SCALE WEIGHT MODAL (حاسبة بيع المكسرات والميزان) */}
      {/* ======================================================== */}
      {isNutsWeightModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-amber-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                  <Scale className="w-5 h-5 text-amber-200" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg">🥜 بيع المكسرات والمواد بالميزان</h3>
                  <p className="text-xs text-amber-200">
                    حساب فوري بالمبلغ (قيس 50 دج، 100 دج...) أو بالوزن (غرام / كغ)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsNutsWeightModalOpen(false);
                  setSelectedNutProduct(null);
                }}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Product Selection & Quick Filter */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    اختر نوع المكسرات / السلعة:
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {products.filter(isNutOrWeightProduct).length} صنف متاح
                  </span>
                </div>

                {/* Quick search inside modal if many products */}
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="ابحث عن مكسرات (كاوكاو، لوز، جوز، زبيب، بيسطاش...)"
                    value={nutProductSearch}
                    onChange={(e) => setNutProductSearch(e.target.value)}
                    className="w-full pr-8 pl-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-amber-500"
                  />
                </div>

                {/* Fast Product Pills / Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1 bg-slate-50 rounded-2xl border border-slate-200">
                  {products
                    .filter(
                      (p) =>
                        (isNutOrWeightProduct(p) || p.unit === 'كغ' || p.categoryId === 'cat_nuts_weight') &&
                        (!nutProductSearch.trim() ||
                          p.name.toLowerCase().includes(nutProductSearch.toLowerCase()))
                    )
                    .map((nutProd) => {
                      const isSelected = selectedNutProduct?.id === nutProd.id;
                      return (
                        <button
                          key={nutProd.id}
                          type="button"
                          onClick={() => {
                            setSelectedNutProduct(nutProd);
                            setNutCustomPricePerKg(nutProd.sellingPrice.toString());
                          }}
                          className={`p-2 rounded-xl text-right border transition-all flex flex-col justify-between ${
                            isSelected
                              ? 'bg-amber-600 text-white border-amber-700 shadow-sm ring-2 ring-amber-400/50'
                              : 'bg-white hover:bg-amber-50/70 border-slate-200 text-slate-800'
                          }`}
                        >
                          <span className="text-xs font-bold line-clamp-1">
                            {nutProd.name}
                          </span>
                          <span
                            className={`text-[10px] font-mono font-bold mt-1 ${
                              isSelected ? 'text-amber-100' : 'text-emerald-700'
                            }`}
                          >
                            {nutProd.sellingPrice} {settings.currencySymbol} / كغ
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>

              {selectedNutProduct && (
                <>
                  {/* Mode Selector Tabs (بالمبلغ vs بالوزن) */}
                  <div className="flex rounded-2xl bg-slate-100 p-1 border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setNutCalculationMode('by_amount')}
                      className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 ${
                        nutCalculationMode === 'by_amount'
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Coins className="w-4 h-4" />
                      <span>البيع بالمبلغ (قيس 50 دج، 100 دج...)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNutCalculationMode('by_weight')}
                      className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 ${
                        nutCalculationMode === 'by_weight'
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Scale className="w-4 h-4" />
                      <span>البيع بالوزن (غرام / كغ)</span>
                    </button>
                  </div>

                  {/* TAB 1: BY AMOUNT (بيع حسب المبلغ المحدد) */}
                  {nutCalculationMode === 'by_amount' && (
                    <div className="space-y-3 bg-amber-50/50 p-4 rounded-2xl border border-amber-200/80">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1.5">
                          مبالغ سريعة وشائعة:
                        </label>
                        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                          {['20', '30', '50', '100', '150', '200', '300', '500'].map((amt) => {
                            const isSelected = nutAmountInput === amt;
                            return (
                              <button
                                key={amt}
                                type="button"
                                onClick={() => setNutAmountInput(amt)}
                                className={`py-2 px-1 rounded-xl text-xs font-mono font-bold border transition-all text-center ${
                                  isSelected
                                    ? 'bg-amber-600 text-white border-amber-700 shadow-xs scale-105 ring-2 ring-amber-400'
                                    : 'bg-white hover:bg-amber-100 border-amber-200 text-slate-800'
                                }`}
                              >
                                {amt} {settings.currencySymbol}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Custom Amount Input */}
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          أو أدخل المبلغ المخصص الذي طلبه الزبون (دج):
                        </label>
                        <div className="relative">
                          <Coins className="w-4 h-4 text-amber-600 absolute right-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="number"
                            min="1"
                            step="5"
                            placeholder="مثال: 50، 100، 250..."
                            value={nutAmountInput}
                            onChange={(e) => setNutAmountInput(e.target.value)}
                            className="w-full pr-9 pl-14 py-2.5 bg-white border-2 border-amber-300 rounded-xl text-base font-mono font-black text-slate-800 focus:outline-none focus:ring-4 focus:ring-amber-500/20"
                            autoFocus
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 font-mono">
                            {settings.currencySymbol}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: BY WEIGHT (بيع حسب الوزن المطلوب) */}
                  {nutCalculationMode === 'by_weight' && (
                    <div className="space-y-3 bg-amber-50/50 p-4 rounded-2xl border border-amber-200/80">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1.5">
                          أوزان سريعة ومقاييس شائعة:
                        </label>
                        <div className="grid grid-cols-4 sm:grid-cols-4 gap-1.5">
                          {[
                            { grams: '50', label: '50 غرام' },
                            { grams: '100', label: '100 غرام' },
                            { grams: '150', label: '150 غرام' },
                            { grams: '200', label: '200 غرام' },
                            { grams: '250', label: '250 غ (رطل)' },
                            { grams: '500', label: '500 غ (نصف كغ)' },
                            { grams: '750', label: '750 غرام' },
                            { grams: '1000', label: '1 كغ كامل' },
                          ].map((wt) => {
                            const isSelected = nutWeightGramsInput === wt.grams;
                            return (
                              <button
                                key={wt.grams}
                                type="button"
                                onClick={() => setNutWeightGramsInput(wt.grams)}
                                className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all text-center ${
                                  isSelected
                                    ? 'bg-amber-600 text-white border-amber-700 shadow-xs scale-105 ring-2 ring-amber-400'
                                    : 'bg-white hover:bg-amber-100 border-amber-200 text-slate-800'
                                }`}
                              >
                                {wt.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Custom Grams Input */}
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          أو أدخل وزن الميزان بالغرام (g):
                        </label>
                        <div className="relative">
                          <Scale className="w-4 h-4 text-amber-600 absolute right-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="number"
                            min="1"
                            step="1"
                            placeholder="مثال: 120، 250، 480..."
                            value={nutWeightGramsInput}
                            onChange={(e) => setNutWeightGramsInput(e.target.value)}
                            className="w-full pr-9 pl-14 py-2.5 bg-white border-2 border-amber-300 rounded-xl text-base font-mono font-black text-slate-800 focus:outline-none focus:ring-4 focus:ring-amber-500/20"
                            autoFocus
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                            غرام (g)
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Price per KG Override / Display */}
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-slate-700 block">سعر الكيلوغرام المعتمد:</span>
                      <span className="text-[11px] text-slate-500">يمكنك تعديل السعر مؤقتاً لهذه العملية إذا أردت</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="1"
                        placeholder={selectedNutProduct.sellingPrice.toString()}
                        value={nutCustomPricePerKg}
                        onChange={(e) => setNutCustomPricePerKg(e.target.value)}
                        className="w-28 px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-amber-500 text-center"
                      />
                      <span className="text-xs font-mono font-bold text-slate-600">
                        {settings.currencySymbol} / كغ
                      </span>
                    </div>
                  </div>

                  {/* Live Calculation Preview Card */}
                  {(() => {
                    const pricePerKg =
                      parseFloat(nutCustomPricePerKg) > 0
                        ? parseFloat(nutCustomPricePerKg)
                        : selectedNutProduct.sellingPrice;

                    let finalWeightKg = 0;
                    let finalAmount = 0;

                    if (nutCalculationMode === 'by_amount') {
                      const amt = parseFloat(nutAmountInput) || 0;
                      finalAmount = amt;
                      finalWeightKg = pricePerKg > 0 ? amt / pricePerKg : 0;
                    } else {
                      const grams = parseFloat(nutWeightGramsInput) || 0;
                      finalWeightKg = grams / 1000;
                      finalAmount = Math.round(finalWeightKg * pricePerKg);
                    }

                    const calculatedGrams = Math.round(finalWeightKg * 1000);
                    const weightLabel =
                      calculatedGrams >= 1000
                        ? `${(calculatedGrams / 1000).toFixed(3).replace(/\.?0+$/, '')} كغ`
                        : `${calculatedGrams} غرام`;

                    return (
                      <div className="p-4 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl text-white shadow-md flex items-center justify-between">
                        <div>
                          <span className="text-xs text-amber-100 font-bold block">
                            النتيجة المباشرة للميزان:
                          </span>
                          <h4 className="text-base sm:text-lg font-black mt-0.5">
                            {selectedNutProduct.name}
                          </h4>
                          <p className="text-xs text-amber-100 mt-0.5">
                            الوزن المستحق:{' '}
                            <span className="font-mono font-black text-white underline decoration-white/40">
                              {weightLabel}
                            </span>
                          </p>
                        </div>

                        <div className="text-left">
                          <span className="text-[11px] text-amber-200 block">المبلغ الإجمالي</span>
                          <div className="text-xl sm:text-2xl font-black font-mono tracking-tight">
                            {finalAmount.toFixed(0)} {settings.currencySymbol}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsNutsWeightModalOpen(false);
                  setSelectedNutProduct(null);
                }}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-colors"
              >
                إلغاء
              </button>

              {selectedNutProduct && (
                <button
                  type="button"
                  onClick={() => {
                    const pricePerKg =
                      parseFloat(nutCustomPricePerKg) > 0
                        ? parseFloat(nutCustomPricePerKg)
                        : undefined;

                    handleAddNutsWeightToCart(
                      selectedNutProduct,
                      nutCalculationMode,
                      parseFloat(nutAmountInput) || 0,
                      parseFloat(nutWeightGramsInput) || 0,
                      pricePerKg,
                      nutNotes
                    );
                  }}
                  className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-bold rounded-2xl text-xs sm:text-sm shadow-md shadow-amber-600/20 flex items-center justify-center gap-2 transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>إضافة السلعة بالميزان إلى السلة</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. PRICE MANAGER MODAL (مدير الأسعار الشامل لجميع المنتجات) */}
      {/* ======================================================== */}
      {isPriceManagerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-700 to-indigo-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                  <Coins className="w-5 h-5 text-yellow-300" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg">التحكم في الأسعار وتعديلها فوراً</h3>
                  <p className="text-xs text-indigo-200">
                    تعديل أسعار البيع والشراء لجميع السلع بضغطة زر وتحديثها فوراً في المتجر
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPriceManagerOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter and Search Bar */}
            <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-2.5 items-center justify-between">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={priceManagerSearch}
                  onChange={(e) => setPriceManagerSearch(e.target.value)}
                  placeholder="ابحث عن منتج أو باركود لتعديل سعره..."
                  className="w-full pl-3 pr-9 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                {priceManagerSearch && (
                  <button
                    onClick={() => setPriceManagerSearch('')}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full">
                <button
                  type="button"
                  onClick={() => setPriceManagerCategory('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                    priceManagerCategory === 'all'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  جميع الأصناف ({products.length})
                </button>
                {categories
                  .filter((c) => c.id !== 'cat_all')
                  .map((cat) => {
                    const count = products.filter((p) => p.categoryId === cat.id).length;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setPriceManagerCategory(cat.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                          priceManagerCategory === cat.id
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {cat.name} ({count})
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Products Price List Table */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 divide-y divide-slate-100">
              {(() => {
                const searchQ = priceManagerSearch.toLowerCase().trim();
                const list = products.filter((p) => {
                  const matchesCat =
                    priceManagerCategory === 'all' || p.categoryId === priceManagerCategory;
                  const matchesSearch =
                    !searchQ ||
                    p.name.toLowerCase().includes(searchQ) ||
                    p.barcode.toLowerCase().includes(searchQ);
                  return matchesCat && matchesSearch;
                });

                if (list.length === 0) {
                  return (
                    <div className="py-12 text-center text-slate-400">
                      <Coins className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                      <p className="text-sm font-bold">لا توجد منتجات مطابقة للبحث</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2">
                    {list.map((prod) => {
                      const margin =
                        prod.sellingPrice > 0
                          ? ((prod.sellingPrice - prod.costPrice) / prod.sellingPrice) * 100
                          : 0;
                      const profit = prod.sellingPrice - prod.costPrice;

                      return (
                        <div
                          key={prod.id}
                          className="p-3 bg-slate-50/70 hover:bg-indigo-50/40 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-slate-900 truncate">
                                {prod.name}
                              </h4>
                              <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md">
                                {prod.barcode}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                              <span>سعر الشراء: <b className="font-mono text-slate-700">{prod.costPrice} {settings.currencySymbol}</b></span>
                              <span>•</span>
                              <span>المخزون: <b className="font-mono text-slate-700">{prod.stock} {prod.unit}</b></span>
                              <span>•</span>
                              <span className={profit >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                                هامش الربح: {profit.toFixed(0)} {settings.currencySymbol} ({margin.toFixed(0)}%)
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
                            <div className="text-left">
                              <span className="text-[10px] text-slate-400 block">سعر البيع الحالي</span>
                              <span className="text-base font-black text-indigo-700 font-mono">
                                {prod.sellingPrice} {settings.currencySymbol}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleOpenQuickPriceEdit(prod)}
                              className="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>تعديل السعر</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <span>إجمالي المنتجات في النظام: <b>{products.length}</b></span>
              <button
                type="button"
                onClick={() => setIsPriceManagerOpen(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. INDIVIDUAL PRODUCT PRICE EDIT MODAL (تعديل سعر منتج محدد) */}
      {/* ======================================================== */}
      {quickPriceEditProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-5 sm:p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900">تعديل سعر المنتج</h3>
                  <p className="text-xs text-slate-500 font-mono">{quickPriceEditProduct.barcode}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setQuickPriceEditProduct(null);
                  setPriceEditNotice(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Product Title */}
            <div className="p-3 bg-indigo-50/60 rounded-2xl border border-indigo-100 mb-4">
              <div className="text-xs text-indigo-600 font-bold mb-0.5">اسم السلعة:</div>
              <div className="text-sm font-bold text-slate-900">{quickPriceEditProduct.name}</div>
            </div>

            {/* Price Inputs Form */}
            <div className="space-y-4">
              {/* Selling Price Input */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  سعر البيع الجديد ({settings.currencySymbol}) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Coins className="w-4 h-4 text-indigo-600 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={editSellingPriceInput}
                    onChange={(e) => setEditSellingPriceInput(e.target.value)}
                    placeholder="أدخل سعر البيع الجديد"
                    className="w-full pl-3 pr-10 py-3 bg-white border-2 border-indigo-500 rounded-2xl text-base font-black font-mono text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/20"
                    autoFocus
                  />
                </div>
              </div>

              {/* Quick Amount Adjuster Buttons (+5, +10, +20, +50, +100) */}
              <div>
                <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                  تعديل سريع بإضافة مبلغ على السعر:
                </span>
                <div className="grid grid-cols-5 gap-1.5">
                  {[5, 10, 20, 50, 100].map((step) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => {
                        const current = parseFloat(editSellingPriceInput) || 0;
                        setEditSellingPriceInput((current + step).toString());
                      }}
                      className="py-1.5 bg-slate-100 hover:bg-indigo-100 hover:text-indigo-800 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-colors"
                    >
                      +{step}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cost Price Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  سعر الشراء / التكلفة ({settings.currencySymbol})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={editCostPriceInput}
                  onChange={(e) => setEditCostPriceInput(e.target.value)}
                  placeholder="سعر الشراء"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Live Profit Calculation Preview */}
              {(() => {
                const s = parseFloat(editSellingPriceInput) || 0;
                const c = parseFloat(editCostPriceInput) || 0;
                const profit = s - c;
                const margin = s > 0 ? (profit / s) * 100 : 0;

                return (
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-500 block">صافي الربح المتوقع:</span>
                      <span className={`font-mono font-bold text-sm ${profit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {profit.toFixed(2)} {settings.currencySymbol}
                      </span>
                    </div>
                    <div className="text-left">
                      <span className="text-slate-500 block">نسبة هامش الربح:</span>
                      <span className={`font-mono font-bold text-sm ${profit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {margin.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Notice Message */}
              {priceEditNotice && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-bold text-center">
                  {priceEditNotice}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2.5 mt-5 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setQuickPriceEditProduct(null);
                  setPriceEditNotice(null);
                }}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={() => {
                  const s = parseFloat(editSellingPriceInput);
                  const c = parseFloat(editCostPriceInput);
                  handleSaveProductPrices(quickPriceEditProduct.id, s, c);
                }}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>حفظ السعر الجديد وتطبيقه فوراً</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. CART ITEM CUSTOMIZER MODAL (تعديل سعر الصنف المضاف في السلة) */}
      {/* ======================================================== */}
      {cartItemToEdit && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-5 sm:p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900">تخصيص الصنف في الفاتورة</h3>
                  <p className="text-xs text-slate-500 truncate max-w-[220px]">
                    {cartItemToEdit.item.product.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCartItemToEdit(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Custom Inputs */}
            <div className="space-y-4">
              {/* Unit Price Input */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  سعر الوحدة المخصص ({settings.currencySymbol})
                </label>
                <div className="relative">
                  <Coins className="w-4 h-4 text-emerald-600 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={cartEditUnitPrice}
                    onChange={(e) => setCartEditUnitPrice(e.target.value)}
                    placeholder="سعر الوحدة"
                    className="w-full pl-3 pr-10 py-2.5 bg-white border-2 border-emerald-500 rounded-2xl text-base font-black font-mono text-slate-900 focus:outline-none focus:ring-4 focus:ring-emerald-500/20"
                    autoFocus
                  />
                </div>
              </div>

              {/* Quantity (+/- & Input) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  الكمية المطلوبة ({cartItemToEdit.item.product.unit})
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCartEditQuantity((q) => Math.max(1, q - 1))}
                    className="w-11 h-11 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold flex items-center justify-center border border-slate-200"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={cartEditQuantity}
                    onChange={(e) => setCartEditQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="flex-1 py-2.5 text-center bg-white border border-slate-300 rounded-2xl text-base font-bold font-mono text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setCartEditQuantity((q) => q + 1)}
                    className="w-11 h-11 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold flex items-center justify-center border border-slate-200"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Discount (%) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  نسبة الخصم المئوية (%)
                </label>
                <div className="relative">
                  <Percent className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={cartEditDiscount}
                    onChange={(e) => setCartEditDiscount(e.target.value)}
                    placeholder="0"
                    className="w-full pl-3 pr-10 py-2.5 bg-white border border-slate-300 rounded-2xl text-sm font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Checkbox to save permanently */}
              <label className="flex items-center gap-2.5 p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={cartEditSavePermanently}
                  onChange={(e) => setCartEditSavePermanently(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500 border-slate-300"
                />
                <span className="text-xs font-bold text-slate-700">
                  تحديث وتثبيت هذا السعر الجديد بشكل دائم في المخزن للمرات القادمة
                </span>
              </label>

              {/* Total Calculation Preview */}
              {(() => {
                const uPrice = parseFloat(cartEditUnitPrice) || 0;
                const qty = cartEditQuantity;
                const disc = parseFloat(cartEditDiscount) || 0;
                const raw = uPrice * qty;
                const net = raw - raw * (disc / 100);

                return (
                  <div className="p-3.5 bg-emerald-50/80 rounded-2xl border border-emerald-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900">المجموع الإجمالي للصنف:</span>
                    <span className="text-base font-black text-emerald-800 font-mono">
                      {net.toFixed(2)} {settings.currencySymbol}
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2.5 mt-5 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setCartItemToEdit(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={handleSaveCartItemEdit}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>تطبيق التعديلات على السلة</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. OVERALL INVOICE DISCOUNT MODAL (تطبيق خصم عام على الفاتورة) */}
      {/* ======================================================== */}
      {isOverallDiscountModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-5 sm:p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                  <Percent className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900">خصم إجمالي على الفاتورة</h3>
                  <p className="text-xs text-slate-500">حدد نسبة الخصم المئوية</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOverallDiscountModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Discount Percentage Input */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  نسبة الخصم المئوية (%)
                </label>
                <div className="relative">
                  <Percent className="w-4 h-4 text-rose-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    value={invoiceDiscountInput}
                    onChange={(e) => setInvoiceDiscountInput(e.target.value)}
                    placeholder="0"
                    className="w-full pl-3 pr-10 py-3 bg-white border-2 border-rose-500 rounded-2xl text-base font-black font-mono text-slate-900 focus:outline-none focus:ring-4 focus:ring-rose-500/20"
                    autoFocus
                  />
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="grid grid-cols-3 gap-2">
                {[0, 5, 10, 15, 20, 50].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setInvoiceDiscountInput(preset.toString())}
                    className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                      parseFloat(invoiceDiscountInput) === preset
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 border-slate-200'
                    }`}
                  >
                    {preset === 0 ? 'بدون خصم' : `${preset}%`}
                  </button>
                ))}
              </div>

              {/* Calculated total preview */}
              {(() => {
                const disc = Math.min(100, Math.max(0, parseFloat(invoiceDiscountInput) || 0));
                const discAmt = rawSubtotal * (disc / 100);
                const afterDisc = rawSubtotal - discAmt;

                return (
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>قيمة الخصم المخصومة:</span>
                      <span className="font-mono font-bold text-rose-600">
                        -{discAmt.toFixed(2)} {settings.currencySymbol}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-1.5">
                      <span>المجموع بعد الخصم:</span>
                      <span className="font-mono text-emerald-700 text-sm">
                        {afterDisc.toFixed(2)} {settings.currencySymbol}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2.5 mt-5 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsOverallDiscountModalOpen(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={() => handleApplyOverallDiscount(parseFloat(invoiceDiscountInput) || 0)}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>تطبيق الخصم</span>
              </button>
            </div>
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
          setBarcodePrintSelectedProduct(null);
        }}
        products={products}
        settings={settings}
        preselectedProduct={barcodePrintSelectedProduct}
      />
    </div>
  );
};

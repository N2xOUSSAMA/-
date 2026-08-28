export type UserRole = 'admin' | 'cashier';

export interface User {
  id: string;
  name: string;
  phone?: string; // e.g. '0550000000'
  role: UserRole;
  pin: string; // 6-digit or 4-digit PIN (Hashed)
  plainPin?: string; // Stored for administrator eye-toggle reveal in Admin Panel
  avatar?: string;
  kioskName?: string;
  city?: string;
  isActive?: boolean;
  isTrial?: boolean;
  trialExpiresAt?: number;
  createdAt?: string;
  hasSeenWelcome?: boolean; // Controls whether the initial 1-time welcome modal has been displayed
  // Personal Cashier Lock Preferences (optional, open by default)
  lockReportsWithPin?: boolean;
  customReportsPin?: string;
  lockSettingsWithPin?: boolean;
  customSettingsPin?: string;
}

export interface TrialSessionInfo {
  isTrialActive: boolean;
  trialSessionId: string;
  trialStartedAt: number;
  trialExpiresAt: number;
  isExpired: boolean;
  trialKioskName?: string;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

export interface Product {
  id: string;
  barcode: string;
  name: string;
  categoryId: string;
  costPrice: number; // سعر الشراء
  sellingPrice: number; // سعر البيع
  stock: number; // الكمية المتوفرة
  minStockAlert: number; // حد التنبيه
  unit: string; // قطعة, كغ, علبة, لتر, متر...
  image?: string;
  notes?: string;
  isAvailable?: boolean;
}

export interface DeletedProduct extends Product {
  deletedAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  discount: number; // نسبة أو مبلغ
  discountType: 'percentage' | 'fixed';
  notes?: string;
}

export type PaymentMethod = 'cash' | 'ccp' | 'card' | 'debt' | 'transfer';

export interface SaleItem {
  productId: string;
  barcode: string;
  name: string;
  costPrice: number;
  unitPrice: number;
  quantity: number;
  discount: number;
  discountType: 'percentage' | 'fixed';
  total: number;
  unit: string;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  date: string; // ISO date string
  items: SaleItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  profitTotal: number;
  paidAmount: number;
  changeAmount: number;
  paymentMethod: PaymentMethod;
  customerId?: string;
  customerName?: string;
  cashierId: string;
  cashierName: string;
  status: 'completed' | 'refunded' | 'partial_refund';
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  balanceDebt: number; // المتبقي ديون عليه
  totalSpent: number; // إجمالي ما أنفقه
  createdAt: string;
  notes?: string;
}

export interface DebtPayment {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  date: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  receivedBy: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string; // إيجار, فواتير, عمالة, صيانة, بضاعة...
  date: string;
  notes?: string;
  recordedBy: string;
}

export interface StoreSettings {
  storeName: string;
  storePhone: string;
  storeAddress: string;
  adminWhatsApp?: string; // WhatsApp number for registration & support (e.g. '213555123456')
  taxRegistrationNumber: string;
  currencySymbol: string;
  taxRatePercent: number; // e.g. 0 or 15
  enableTax: boolean;
  receiptHeader: string;
  receiptFooter: string;
  receiptPaperSize: '80mm' | '58mm';
  barcodePrefix: string;
  soundEnabled: boolean;
  darkMode?: boolean;
  lightModeFont?: 'cairo' | 'alexandria' | 'almarai' | 'tajawal' | 'ibm-plex';
  darkModeFont?: 'tajawal' | 'ibm-plex' | 'almarai' | 'cairo' | 'alexandria';
}

export interface HeldOrder {
  id: string;
  orderName: string;
  createdAt: string;
  cartItems: CartItem[];
  customer?: Customer;
  notes?: string;
}

export interface ShiftLog {
  id: string;
  date: string;
  openedAt: string;
  closedAt?: string;
  cashierName: string;
  openingCash: number;
  cashSales: number;
  cardSales: number;
  debtSales: number;
  transferSales: number;
  expensesPaid: number;
  debtCollected: number;
  expectedClosingCash: number;
  actualClosingCash?: number;
  difference?: number;
  status: 'open' | 'closed';
  notes?: string;
}

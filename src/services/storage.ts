import {
  Category,
  Customer,
  DebtPayment,
  Expense,
  Product,
  DeletedProduct,
  Sale,
  ShiftLog,
  StoreSettings,
  User,
  HeldOrder,
  TrialSessionInfo,
  CartItem,
} from '../types';
import {
  INITIAL_CATEGORIES,
  INITIAL_CUSTOMERS,
  INITIAL_EXPENSES,
  INITIAL_PRODUCTS,
  INITIAL_SETTINGS,
  INITIAL_USERS,
  SAMPLE_DEMO_PRODUCTS,
  SAMPLE_DEMO_CUSTOMERS,
  SAMPLE_DEMO_EXPENSES,
} from '../data/seedData';
import {
  hashPassword,
  isHashedPassword,
  verifyPassword
} from '../utils/security';

const KEYS = {
  USERS: 'pos_users_v2_kiosk',
  WELCOMED_USERS: 'pos_welcomed_users_v2_kiosk',
  CATEGORIES: 'pos_categories_v2_kiosk',
  PRODUCTS: 'pos_products_v2_kiosk',
  DELETED_PRODUCTS: 'pos_deleted_products_v2_kiosk',
  SALES: 'pos_sales_v2_kiosk',
  CUSTOMERS: 'pos_customers_v2_kiosk',
  DEBT_PAYMENTS: 'pos_debt_payments_v2_kiosk',
  EXPENSES: 'pos_expenses_v2_kiosk',
  SETTINGS: 'pos_settings_v2_kiosk',
  HELD_ORDERS: 'pos_held_orders_v2_kiosk',
  SHIFTS: 'pos_shifts_v2_kiosk',
  CART: 'pos_cart_items_v2_kiosk',
  ACTIVE_USER_ID: 'pos_active_user_id_v2_kiosk',
  TRIAL_SESSION: 'pos_trial_session_v2_kiosk',
  TRIAL_USED_FLAG: 'pos_trial_used_flag_v2_kiosk',
};

// Safe LocalStorage helpers
function getItem<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.error(`Error reading ${key} from storage:`, e);
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error writing ${key} to storage:`, e);
  }
}

// User-scoped Key Generator for complete data isolation between accounts / cashiers
function getScopedKey(baseKey: string, customUserId?: string): string {
  const uid = customUserId || localStorage.getItem(KEYS.ACTIVE_USER_ID) || 'user_admin';
  return `${baseKey}_${uid}`;
}

export const StorageService = {
  // Passwords / PIN Hashing & Verification
  hashPin(pin: string): string {
    return hashPassword(pin);
  },
  isHashedPin(pin: string | null | undefined): boolean {
    return isHashedPassword(pin);
  },
  verifyPin(plainPin: string, storedPin: string): boolean {
    return verifyPassword(plainPin, storedPin);
  },

  // Users
  getUsers(): User[] {
    const raw = getItem<User[]>(KEYS.USERS, INITIAL_USERS);
    let needsPersistenceSync = false;

    // Filter out obsolete legacy mock cashiers (user_cashier1, user_cashier2) so they never reappear
    const cleanedRaw = raw.filter((u) => u.id !== 'user_cashier1' && u.id !== 'user_cashier2');
    if (cleanedRaw.length !== raw.length) {
      needsPersistenceSync = true;
    }

    // Ensure master admin user always exists
    const hasAdmin = cleanedRaw.some((u) => u.id === 'user_admin');
    const workingList = hasAdmin ? cleanedRaw : [...INITIAL_USERS, ...cleanedRaw];
    if (!hasAdmin) {
      needsPersistenceSync = true;
    }

    // Ensure all accounts have valid attributes, plainPin if available, and securely hashed PINs
    const merged: User[] = workingList.map((u) => {
      const initial = INITIAL_USERS.find((init) => init.id === u.id);
      
      let rawPhone = u.phone || initial?.phone || (u.id === 'user_admin' ? '0553514215' : '0550000000');
      let rawPin = u.pin || initial?.pin || (u.id === 'user_admin' ? 'oussama12$' : '123456');
      let plainPin = u.plainPin || initial?.plainPin;
      let role = u.role || initial?.role || (u.id === 'user_admin' ? 'admin' : 'cashier');

      if (u.id === 'user_admin') {
        rawPhone = u.phone && u.phone !== '0550000000' ? u.phone : '0553514215';
        role = 'admin';
        // If plain legacy default was present, ensure default is current master credentials
        if (u.pin === '123456' || !plainPin) {
          plainPin = 'oussama12$';
          rawPin = 'oussama12$';
        }
      }

      // If user had plain text PIN stored previously
      if (!plainPin && !isHashedPassword(rawPin)) {
        plainPin = rawPin;
      }

      // Hash PIN if it is not yet hashed
      let finalPin = rawPin;
      if (!isHashedPassword(rawPin)) {
        finalPin = hashPassword(rawPin);
        needsPersistenceSync = true;
      }

      return {
        ...u,
        phone: rawPhone,
        pin: finalPin,
        plainPin: plainPin || undefined,
        role,
        isActive: u.isActive !== undefined ? u.isActive : true,
        isTrial: u.isTrial || false,
        createdAt: u.createdAt || initial?.createdAt || '2026-01-01',
      };
    });

    // Auto-migrate and persist hashed credentials immediately if any plaintext was found
    if (needsPersistenceSync || raw.length === 0) {
      setItem(KEYS.USERS, merged);
    }

    return merged;
  },

  saveUsers(users: User[]): void {
    // Ensure every user's password/PIN is securely hashed before writing to localStorage
    const securedUsers: User[] = users.map((u) => {
      const isHashed = isHashedPassword(u.pin);
      return {
        ...u,
        pin: isHashed ? u.pin : hashPassword(u.pin),
        plainPin: u.plainPin,
        isTrial: u.isTrial || false,
      };
    });
    setItem(KEYS.USERS, securedUsers);
  },

  deleteUser(userId: string): boolean {
    if (userId === 'user_admin') return false;
    const users = this.getUsers();
    const filtered = users.filter((u) => u.id !== userId);
    if (filtered.length !== users.length) {
      this.saveUsers(filtered);
      return true;
    }
    return false;
  },

  authenticateUser(phoneOrId: string, plainPin: string): User | null {
    if (!phoneOrId || !plainPin) return null;
    const cleanPhone = phoneOrId.trim().replace(/[\s-]/g, '');
    const cleanPin = plainPin.trim();
    const users = this.getUsers();

    const matched = users.find(
      (u) =>
        (u.phone?.replace(/[\s-]/g, '') === cleanPhone ||
          u.id === cleanPhone ||
          (u.phone && cleanPhone.endsWith(u.phone.slice(-9)))) &&
        verifyPassword(cleanPin, u.pin)
    );

    return matched || null;
  },

  getActiveUserId(): string | null {
    return localStorage.getItem(KEYS.ACTIVE_USER_ID);
  },
  setActiveUserId(id: string | null): void {
    if (id) localStorage.setItem(KEYS.ACTIVE_USER_ID, id);
    else localStorage.removeItem(KEYS.ACTIVE_USER_ID);
  },

  // 1-Time Welcome Modal Status (Ensures welcome message only shows ONCE for newly registered users)
  hasUserSeenWelcome(userId: string): boolean {
    if (userId === 'user_admin') return true;
    const users = this.getUsers();
    const target = users.find((u) => u.id === userId);
    if (target && target.hasSeenWelcome) return true;

    const welcomedList = getItem<string[]>(KEYS.WELCOMED_USERS, ['user_admin']);
    return welcomedList.includes(userId);
  },

  markUserWelcomed(userId: string): void {
    const welcomedList = getItem<string[]>(KEYS.WELCOMED_USERS, ['user_admin']);
    if (!welcomedList.includes(userId)) {
      welcomedList.push(userId);
      setItem(KEYS.WELCOMED_USERS, welcomedList);
    }

    const users = this.getUsers();
    const target = users.find((u) => u.id === userId);
    if (target && !target.hasSeenWelcome) {
      target.hasSeenWelcome = true;
      this.saveUsers(users);
    }
  },

  // Isolated Cart Items per User
  getCart(userId?: string): CartItem[] {
    const key = getScopedKey(KEYS.CART, userId);
    return getItem<CartItem[]>(key, []);
  },
  saveCart(cart: CartItem[], userId?: string): void {
    const key = getScopedKey(KEYS.CART, userId);
    setItem(key, cart);
  },
  clearCart(userId?: string): void {
    const key = getScopedKey(KEYS.CART, userId);
    setItem(key, []);
  },

  // Categories (Isolated or standard structure per user)
  getCategories(userId?: string): Category[] {
    const key = getScopedKey(KEYS.CATEGORIES, userId);
    const raw = localStorage.getItem(key);
    if (raw === null) {
      setItem(key, INITIAL_CATEGORIES);
      return INITIAL_CATEGORIES;
    }
    try {
      const parsed = JSON.parse(raw) as Category[];
      // Check if cat_nuts_weight is in categories; if not, add it seamlessly
      if (!parsed.some((c) => c.id === 'cat_nuts_weight')) {
        const nutsCat = INITIAL_CATEGORIES.find((c) => c.id === 'cat_nuts_weight');
        if (nutsCat) {
          parsed.splice(1, 0, nutsCat);
          setItem(key, parsed);
        }
      }
      return parsed;
    } catch (e) {
      console.error('Error parsing categories:', e);
      return INITIAL_CATEGORIES;
    }
  },
  saveCategories(categories: Category[], userId?: string): void {
    const key = getScopedKey(KEYS.CATEGORIES, userId);
    setItem(key, categories);
  },
  deleteCategory(categoryId: string, userId?: string): boolean {
    const categories = this.getCategories(userId);
    const filtered = categories.filter((c) => c.id !== categoryId);
    if (filtered.length !== categories.length) {
      this.saveCategories(filtered, userId);
      return true;
    }
    return false;
  },

  // Products (Completely isolated per user/cashier account)
  getProducts(userId?: string): Product[] {
    const key = getScopedKey(KEYS.PRODUCTS, userId);
    const raw = localStorage.getItem(key);
    if (raw === null) {
      // If user_admin and legacy global key had products, seamlessly migrate them to user_admin scope
      const uid = userId || this.getActiveUserId() || 'user_admin';
      if (uid === 'user_admin') {
        const legacyRaw = localStorage.getItem(KEYS.PRODUCTS);
        if (legacyRaw) {
          try {
            const legacyParsed = JSON.parse(legacyRaw);
            if (Array.isArray(legacyParsed)) {
              setItem(key, legacyParsed);
              return legacyParsed;
            }
          } catch (e) {
            // Ignore
          }
        }
      }
      // Any new user or cashier starts 100% clean with 0 products
      setItem(key, []);
      return [];
    }
    try {
      const parsed = JSON.parse(raw) as Product[];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Error parsing products:', e);
      return [];
    }
  },
  saveProducts(products: Product[], userId?: string): void {
    const key = getScopedKey(KEYS.PRODUCTS, userId);
    setItem(key, products);
  },
  deleteProduct(productId: string, userId?: string): boolean {
    const products = this.getProducts(userId);
    const target = products.find((p) => p.id === productId);
    if (!target) return false;

    const filtered = products.filter((p) => p.id !== productId);
    this.saveProducts(filtered, userId);

    // Save to deleted products history / archive
    const deletedHistory = this.getDeletedProducts(userId);
    const existingIdx = deletedHistory.findIndex((p) => p.id === productId);
    const deletedItem: DeletedProduct = {
      ...target,
      deletedAt: new Date().toISOString(),
    };
    if (existingIdx !== -1) {
      deletedHistory[existingIdx] = deletedItem;
    } else {
      deletedHistory.unshift(deletedItem);
    }
    this.saveDeletedProducts(deletedHistory, userId);

    return true;
  },

  // Deleted Products Archive (Recycle Bin / سلة المحذوفات)
  getDeletedProducts(userId?: string): DeletedProduct[] {
    const key = getScopedKey(KEYS.DELETED_PRODUCTS, userId);
    return getItem<DeletedProduct[]>(key, []);
  },
  saveDeletedProducts(deletedProducts: DeletedProduct[], userId?: string): void {
    const key = getScopedKey(KEYS.DELETED_PRODUCTS, userId);
    setItem(key, deletedProducts);
  },
  restoreProduct(productId: string, userId?: string): Product | null {
    const deletedList = this.getDeletedProducts(userId);
    const target = deletedList.find((p) => p.id === productId);
    if (!target) return null;

    // Remove from deleted list
    const updatedDeleted = deletedList.filter((p) => p.id !== productId);
    this.saveDeletedProducts(updatedDeleted, userId);

    // Restore back to active products
    const products = this.getProducts(userId);
    const { deletedAt, ...restoredProduct } = target;
    const existingIdx = products.findIndex((p) => p.id === productId);
    if (existingIdx !== -1) {
      products[existingIdx] = restoredProduct;
    } else {
      products.unshift(restoredProduct);
    }
    this.saveProducts(products, userId);

    return restoredProduct;
  },
  restoreAllDeletedProducts(userId?: string): Product[] {
    const deletedList = this.getDeletedProducts(userId);
    if (deletedList.length === 0) return [];

    const products = this.getProducts(userId);
    const restoredItems: Product[] = [];

    for (const item of deletedList) {
      const { deletedAt, ...restoredProduct } = item;
      restoredItems.push(restoredProduct);
      const existingIdx = products.findIndex((p) => p.id === restoredProduct.id);
      if (existingIdx !== -1) {
        products[existingIdx] = restoredProduct;
      } else {
        products.push(restoredProduct);
      }
    }

    this.saveProducts(products, userId);
    this.saveDeletedProducts([], userId);
    return restoredItems;
  },
  permanentlyDeleteProduct(productId: string, userId?: string): boolean {
    const deletedList = this.getDeletedProducts(userId);
    const filtered = deletedList.filter((p) => p.id !== productId);
    if (filtered.length !== deletedList.length) {
      this.saveDeletedProducts(filtered, userId);
      return true;
    }
    return false;
  },
  clearDeletedProducts(userId?: string): void {
    const key = getScopedKey(KEYS.DELETED_PRODUCTS, userId);
    setItem(key, []);
  },
  updateProductStock(productId: string, deltaQty: number, userId?: string): void {
    const products = this.getProducts(userId);
    const idx = products.findIndex((p) => p.id === productId);
    if (idx !== -1) {
      products[idx].stock = Math.max(0, products[idx].stock + deltaQty);
      this.saveProducts(products, userId);
    }
  },

  // Sales (Isolated per user account)
  getSales(userId?: string): Sale[] {
    const key = getScopedKey(KEYS.SALES, userId);
    return getItem<Sale[]>(key, []);
  },
  saveSales(sales: Sale[], userId?: string): void {
    const key = getScopedKey(KEYS.SALES, userId);
    setItem(key, sales);
  },
  addSale(sale: Sale, userId?: string): void {
    const sales = this.getSales(userId);
    sales.unshift(sale);
    this.saveSales(sales, userId);

    // Deduct stock for all items
    const products = this.getProducts(userId);
    sale.items.forEach((item) => {
      const p = products.find((prod) => prod.id === item.productId);
      if (p) {
        p.stock = Math.max(0, p.stock - item.quantity);
      }
    });
    this.saveProducts(products, userId);

    // Update customer debt and spent if attached
    if (sale.customerId) {
      const customers = this.getCustomers(userId);
      const cust = customers.find((c) => c.id === sale.customerId);
      if (cust) {
        cust.totalSpent += sale.grandTotal;
        if (sale.paymentMethod === 'debt') {
          // Add remaining debt
          const debtAmount = sale.grandTotal - sale.paidAmount;
          cust.balanceDebt += Math.max(0, debtAmount);
        }
        this.saveCustomers(customers, userId);
      }
    }
  },
  deleteSale(saleId: string, restoreStock: boolean = true, userId?: string): { success: boolean; message: string } {
    const sales = this.getSales(userId);
    const saleIndex = sales.findIndex((s) => s.id === saleId);
    if (saleIndex === -1) return { success: false, message: 'الفاتورة غير موجودة' };

    const sale = sales[saleIndex];

    // If active and restoreStock is true, return quantities to stock
    if (restoreStock && sale.status !== 'refunded') {
      const products = this.getProducts(userId);
      sale.items.forEach((item) => {
        const prod = products.find((p) => p.id === item.productId);
        if (prod) {
          prod.stock += item.quantity;
        }
      });
      this.saveProducts(products, userId);

      // If debt was attached, reverse customer debt
      if (sale.customerId && sale.paymentMethod === 'debt') {
        const customers = this.getCustomers(userId);
        const cust = customers.find((c) => c.id === sale.customerId);
        if (cust) {
          const debtAmount = Math.max(0, sale.grandTotal - sale.paidAmount);
          cust.balanceDebt = Math.max(0, cust.balanceDebt - debtAmount);
          cust.totalSpent = Math.max(0, cust.totalSpent - sale.grandTotal);
          this.saveCustomers(customers, userId);
        }
      }
    }

    sales.splice(saleIndex, 1);
    this.saveSales(sales, userId);
    this.playBeep();
    return { success: true, message: `تم حذف الفاتورة #${sale.invoiceNumber} نهائياً بنجاح` };
  },

  refundSale(saleId: string, reason?: string, userId?: string): { success: boolean; message: string } {
    const sales = this.getSales(userId);
    const sale = sales.find((s) => s.id === saleId);
    if (!sale) return { success: false, message: 'الفاتورة غير موجودة' };
    if (sale.status === 'refunded') return { success: false, message: 'الفاتورة مسترجعة مسبقاً' };

    sale.status = 'refunded';
    sale.notes = (sale.notes ? sale.notes + ' | ' : '') + `تم الاسترجاع: ${reason || 'بناء على طلب العميل'}`;
    this.saveSales(sales, userId);

    // Return stock to products
    const products = this.getProducts(userId);
    sale.items.forEach((item) => {
      const p = products.find((prod) => prod.id === item.productId);
      if (p) {
        p.stock += item.quantity;
      }
    });
    this.saveProducts(products, userId);

    // If it was debt or customer, adjust balance
    if (sale.customerId) {
      const customers = this.getCustomers(userId);
      const cust = customers.find((c) => c.id === sale.customerId);
      if (cust) {
        cust.totalSpent = Math.max(0, cust.totalSpent - sale.grandTotal);
        if (sale.paymentMethod === 'debt') {
          const debtAmount = sale.grandTotal - sale.paidAmount;
          cust.balanceDebt = Math.max(0, cust.balanceDebt - debtAmount);
        }
        this.saveCustomers(customers, userId);
      }
    }

    return { success: true, message: 'تم إرجاع الفاتورة وإعادة المنتجات للمخزون بنجاح' };
  },

  // Customers (Isolated per user account)
  getCustomers(userId?: string): Customer[] {
    const key = getScopedKey(KEYS.CUSTOMERS, userId);
    const raw = localStorage.getItem(key);
    if (raw === null) {
      // If user_admin and legacy global key had customers, seamlessly migrate them
      const uid = userId || this.getActiveUserId() || 'user_admin';
      if (uid === 'user_admin') {
        const legacyRaw = localStorage.getItem(KEYS.CUSTOMERS);
        if (legacyRaw) {
          try {
            const legacyParsed = JSON.parse(legacyRaw);
            if (Array.isArray(legacyParsed)) {
              setItem(key, legacyParsed);
              return legacyParsed;
            }
          } catch (e) {}
        }
      }
      // Any new user or cashier starts clean with 0 customers
      setItem(key, []);
      return [];
    }
    try {
      const parsed = JSON.parse(raw) as Customer[];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  },
  saveCustomers(customers: Customer[], userId?: string): void {
    const key = getScopedKey(KEYS.CUSTOMERS, userId);
    setItem(key, customers);
  },
  recordDebtPayment(payment: DebtPayment, userId?: string): void {
    const payments = this.getDebtPayments(userId);
    payments.unshift(payment);
    this.saveDebtPayments(payments, userId);

    const customers = this.getCustomers(userId);
    const cust = customers.find((c) => c.id === payment.customerId);
    if (cust) {
      cust.balanceDebt = Math.max(0, cust.balanceDebt - payment.amount);
      this.saveCustomers(customers, userId);
    }
  },

  // Debt Payments
  getDebtPayments(userId?: string): DebtPayment[] {
    const key = getScopedKey(KEYS.DEBT_PAYMENTS, userId);
    return getItem<DebtPayment[]>(key, []);
  },
  saveDebtPayments(payments: DebtPayment[], userId?: string): void {
    const key = getScopedKey(KEYS.DEBT_PAYMENTS, userId);
    setItem(key, payments);
  },

  // Expenses
  getExpenses(userId?: string): Expense[] {
    const key = getScopedKey(KEYS.EXPENSES, userId);
    return getItem<Expense[]>(key, []);
  },
  saveExpenses(expenses: Expense[], userId?: string): void {
    const key = getScopedKey(KEYS.EXPENSES, userId);
    setItem(key, expenses);
  },

  // Settings
  getSettings(userId?: string): StoreSettings {
    const key = getScopedKey(KEYS.SETTINGS, userId);
    const s = getItem<StoreSettings>(key, INITIAL_SETTINGS);
    return {
      ...INITIAL_SETTINGS,
      ...s,
      adminWhatsApp: s.adminWhatsApp || INITIAL_SETTINGS.adminWhatsApp || '213555123456',
    };
  },
  saveSettings(settings: StoreSettings, userId?: string): void {
    const key = getScopedKey(KEYS.SETTINGS, userId);
    setItem(key, settings);
  },

  // Held Orders (تعليق الطلبات)
  getHeldOrders(userId?: string): HeldOrder[] {
    const key = getScopedKey(KEYS.HELD_ORDERS, userId);
    return getItem<HeldOrder[]>(key, []);
  },
  saveHeldOrders(orders: HeldOrder[], userId?: string): void {
    const key = getScopedKey(KEYS.HELD_ORDERS, userId);
    setItem(key, orders);
  },

  // Shift Logs
  getShifts(userId?: string): ShiftLog[] {
    const key = getScopedKey(KEYS.SHIFTS, userId);
    return getItem<ShiftLog[]>(key, []);
  },
  saveShifts(shifts: ShiftLog[], userId?: string): void {
    const key = getScopedKey(KEYS.SHIFTS, userId);
    setItem(key, shifts);
  },

  // Export / Import Full Database Backup
  exportBackup(userId?: string): string {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      users: this.getUsers(),
      categories: this.getCategories(userId),
      products: this.getProducts(userId),
      sales: this.getSales(userId),
      customers: this.getCustomers(userId),
      debtPayments: this.getDebtPayments(userId),
      expenses: this.getExpenses(userId),
      settings: this.getSettings(userId),
    };
    return JSON.stringify(data, null, 2);
  },

  importBackup(jsonString: string, userId?: string): { success: boolean; message: string } {
    try {
      const data = JSON.parse(jsonString);
      if (!data.products || !data.settings) {
        return { success: false, message: 'ملف النسخة الاحتياطية غير صالح أو تالف' };
      }
      if (data.users) this.saveUsers(data.users);
      if (data.categories) this.saveCategories(data.categories, userId);
      if (data.products) this.saveProducts(data.products, userId);
      if (data.sales) this.saveSales(data.sales, userId);
      if (data.customers) this.saveCustomers(data.customers, userId);
      if (data.debtPayments) this.saveDebtPayments(data.debtPayments, userId);
      if (data.expenses) this.saveExpenses(data.expenses, userId);
      if (data.settings) this.saveSettings(data.settings, userId);
      return { success: true, message: 'تم استرجاع جميع البيانات بنجاح!' };
    } catch (e) {
      return { success: false, message: 'حدث خطأ أثناء قراءة ملف النسخة الاحتياطية' };
    }
  },

  // Wipe all store data to a 100% clean slate (0 products, 0 customers, 0 debts, 0 sales)
  clearAllStoreDataCleanSlate(userId?: string): void {
    this.saveProducts([], userId);
    this.saveCustomers([], userId);
    this.saveSales([], userId);
    this.saveDebtPayments([], userId);
    this.saveHeldOrders([], userId);
    this.saveExpenses([], userId);
    this.saveDeletedProducts([], userId);
    this.clearCart(userId);
  },

  // Load rich pre-configured sample products for demo or testing
  loadSampleDemoProducts(userId?: string): void {
    this.saveProducts(SAMPLE_DEMO_PRODUCTS, userId);
    this.saveCustomers(SAMPLE_DEMO_CUSTOMERS, userId);
    this.saveExpenses(SAMPLE_DEMO_EXPENSES, userId);
  },

  // Reset or Load Multi-Services Kiosk Data (Tebessa)
  loadMultiServicesKioskData(userId?: string): void {
    const existingPermanent = this.getUsers().filter((u) => !u.isTrial && !u.id.startsWith('usr_trial_'));
    const adminExists = existingPermanent.some((u) => u.id === 'user_admin');
    const finalUsers = adminExists ? existingPermanent : [...INITIAL_USERS, ...existingPermanent];
    this.saveUsers(finalUsers);
    this.saveCategories(INITIAL_CATEGORIES, userId);
    this.saveProducts(INITIAL_PRODUCTS, userId);
    this.saveCustomers(INITIAL_CUSTOMERS, userId);
    this.saveExpenses(INITIAL_EXPENSES, userId);
    this.saveSettings(INITIAL_SETTINGS, userId);
    this.saveDeletedProducts([], userId);
    this.clearCart(userId);
  },

  // Reset to factory demo
  resetToDemo(userId?: string): void {
    const existingPermanent = this.getUsers().filter((u) => !u.isTrial && !u.id.startsWith('usr_trial_'));
    const adminExists = existingPermanent.some((u) => u.id === 'user_admin');
    const finalUsers = adminExists ? existingPermanent : [...INITIAL_USERS, ...existingPermanent];
    this.saveUsers(finalUsers);
    this.saveCategories(INITIAL_CATEGORIES, userId);
    this.saveProducts(INITIAL_PRODUCTS, userId);
    this.saveCustomers(INITIAL_CUSTOMERS, userId);
    this.saveExpenses(INITIAL_EXPENSES, userId);
    this.saveSettings(INITIAL_SETTINGS, userId);
    this.saveSales([], userId);
    this.saveDebtPayments([], userId);
    this.saveHeldOrders([], userId);
    this.saveDeletedProducts([], userId);
    this.clearCart(userId);
  },

  // ========================================================
  // 24-HOUR ISOLATED TRIAL SESSION MANAGEMENT
  // ========================================================
  getTrialSessionInfo(): TrialSessionInfo | null {
    const raw = getItem<TrialSessionInfo | null>(KEYS.TRIAL_SESSION, null);
    if (!raw) return null;

    // Check if 24 hours have elapsed
    if (raw.isTrialActive && Date.now() >= raw.trialExpiresAt) {
      this.terminateAndClearTrialSession(true);
      return {
        ...raw,
        isTrialActive: false,
        isExpired: true,
      };
    }
    return raw;
  },

  isTrialExpiredOnDevice(): boolean {
    const usedFlag = localStorage.getItem(KEYS.TRIAL_USED_FLAG);
    if (usedFlag === 'expired_true') return true;

    const trialInfo = getItem<TrialSessionInfo | null>(KEYS.TRIAL_SESSION, null);
    if (trialInfo?.isExpired || (trialInfo?.trialExpiresAt && Date.now() >= trialInfo.trialExpiresAt)) {
      localStorage.setItem(KEYS.TRIAL_USED_FLAG, 'expired_true');
      return true;
    }
    return false;
  },

  startOrResumeTrialSession(): {
    success: boolean;
    user?: User;
    error?: string;
    isNew?: boolean;
  } {
    // 1. Check if device is permanently marked as expired
    if (this.isTrialExpiredOnDevice()) {
      return {
        success: false,
        error: 'عذراً، لقد انتهت صلاحية التجربة المجانية المخصصة لك (24 ساعة) سابقاً على هذا الجهاز. للحصول على حساب دائم خاص بكشكك يرجى التواصل مع الإدارة عبر واتساب.',
      };
    }

    const existingTrial = getItem<TrialSessionInfo | null>(KEYS.TRIAL_SESSION, null);

    // 2. If valid active trial exists within 24 hours -> Resume it seamlessly
    if (existingTrial && existingTrial.isTrialActive && Date.now() < existingTrial.trialExpiresAt) {
      const users = this.getUsers();
      const trialUser = users.find((u) => u.id === 'usr_trial_' + existingTrial.trialSessionId) || {
        id: 'usr_trial_' + existingTrial.trialSessionId,
        name: 'مستخدم تجريبي (24 ساعة)',
        role: 'admin',
        pin: '123456',
        phone: '0550000000',
        avatar: '⏱️',
        isActive: true,
        isTrial: true,
        trialExpiresAt: existingTrial.trialExpiresAt,
      };

      this.setActiveUserId(trialUser.id);
      this.playSuccessBeep();
      return { success: true, user: trialUser, isNew: false };
    }

    // 3. Create fresh brand-new isolated 24-hour sandbox trial
    const trialSessionId = 'sandbox_' + Math.random().toString(36).substring(2, 9);
    const now = Date.now();
    const trialDurationMs = 24 * 60 * 60 * 1000; // 24 Hours in ms
    const trialExpiresAt = now + trialDurationMs;

    const trialInfo: TrialSessionInfo = {
      isTrialActive: true,
      trialSessionId,
      trialStartedAt: now,
      trialExpiresAt,
      isExpired: false,
      trialKioskName: 'كشك التجربة المجانية (24 ساعة)',
    };

    setItem(KEYS.TRIAL_SESSION, trialInfo);

    const trialUser: User = {
      id: 'usr_trial_' + trialSessionId,
      name: 'مستخدم تجريبي (24 ساعة)',
      role: 'admin',
      pin: '123456',
      phone: '0550000000',
      avatar: '⏱️',
      isActive: true,
      isTrial: true,
      trialExpiresAt,
    };

    const currentUsers = this.getUsers().filter((u) => !u.id.startsWith('usr_trial_'));
    const updatedUsers = [trialUser, ...currentUsers];
    this.saveUsers(updatedUsers);

    this.setActiveUserId(trialUser.id);
    this.playSuccessBeep();

    return {
      success: true,
      user: trialUser,
      isNew: true,
    };
  },

  terminateAndClearTrialSession(markExpired: boolean = true): void {
    const trialInfo = getItem<TrialSessionInfo | null>(KEYS.TRIAL_SESSION, null);

    if (markExpired) {
      localStorage.setItem(KEYS.TRIAL_USED_FLAG, 'expired_true');
      if (trialInfo) {
        setItem(KEYS.TRIAL_SESSION, {
          ...trialInfo,
          isTrialActive: false,
          isExpired: true,
        });
      }
    } else {
      localStorage.removeItem(KEYS.TRIAL_SESSION);
    }

    // Only clear active user if it was a trial user
    const activeId = this.getActiveUserId();
    if (activeId && (activeId.startsWith('usr_trial_') || activeId === 'sandbox')) {
      this.setActiveUserId(null);
    }

    // Remove trial users from users list while STRICTLY preserving all real permanent accounts
    const currentUsers = this.getUsers();
    const remainingUsers = currentUsers.filter((u) => !u.isTrial && !u.id.startsWith('usr_trial_'));
    const adminExists = remainingUsers.some((u) => u.id === 'user_admin');
    const finalUsers = adminExists ? remainingUsers : [...INITIAL_USERS, ...remainingUsers];
    this.saveUsers(finalUsers);
  },

  getTrialCountdown(): {
    isTrial: boolean;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
    formatted: string;
    totalSeconds: number;
  } {
    const trialInfo = getItem<TrialSessionInfo | null>(KEYS.TRIAL_SESSION, null);
    if (!trialInfo || !trialInfo.isTrialActive) {
      return {
        isTrial: false,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isExpired: this.isTrialExpiredOnDevice(),
        formatted: '00:00:00',
        totalSeconds: 0,
      };
    }

    const remainingMs = trialInfo.trialExpiresAt - Date.now();
    if (remainingMs <= 0) {
      this.terminateAndClearTrialSession(true);
      return {
        isTrial: true,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isExpired: true,
        formatted: '00:00:00 (انتهت الصلاحية)',
        totalSeconds: 0,
      };
    }

    const totalSeconds = Math.floor(remainingMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');
    const formatted = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

    return {
      isTrial: true,
      hours,
      minutes,
      seconds,
      isExpired: false,
      formatted,
      totalSeconds,
    };
  },

  // Audio effects for POS
  playBeep(): void {
    const settings = this.getSettings();
    if (!settings.soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {
      // Audio context might be restricted before interaction
    }
  },

  playSuccessBeep(): void {
    const settings = this.getSettings();
    if (!settings.soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(659.25, now + 0.08); // E5

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.08);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.25);
    } catch (e) {
      // Audio context might be restricted
    }
  }
};

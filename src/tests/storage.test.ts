import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { StorageService } from '../services/storage';

// LocalStorage mock for headless Node test runner
const memoryStorage: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => memoryStorage[key] || null,
  setItem: (key: string, value: string) => {
    memoryStorage[key] = value;
  },
  removeItem: (key: string) => {
    delete memoryStorage[key];
  },
  clear: () => {
    for (const k of Object.keys(memoryStorage)) {
      delete memoryStorage[k];
    }
  },
  key: (index: number) => Object.keys(memoryStorage)[index] || null,
  get length() {
    return Object.keys(memoryStorage).length;
  },
};

beforeAll(() => {
  if (typeof globalThis.localStorage === 'undefined') {
    (globalThis as unknown as { localStorage: typeof mockLocalStorage }).localStorage = mockLocalStorage;
  }
});

describe('StorageService Integration & Data Isolation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('initializes and returns default users list', () => {
    const users = StorageService.getUsers();
    expect(users.length).toBeGreaterThan(0);
    const admin = users.find((u) => u.id === 'user_admin');
    expect(admin).toBeDefined();
    expect(admin?.role).toBe('admin');
  });

  it('enforces clean data isolation between different users / cashiers', () => {
    const adminId = 'user_admin';
    const cashierId = 'user_cashier_test_99';

    // Cashier starts with empty products initially
    const cashierProducts = StorageService.getProducts(cashierId);
    expect(cashierProducts.length).toBe(0);

    // Save a product under cashier
    StorageService.saveProducts([
      {
        id: 'p_cashier_1',
        name: 'منتج خاص بالكاشير',
        barcode: '998877',
        categoryId: 'cat_food',
        costPrice: 10,
        sellingPrice: 15,
        stock: 50,
        minStockAlert: 5,
        unit: 'piece',
      },
    ], cashierId);

    // Admin should not see the cashier's private products
    const adminProducts = StorageService.getProducts(adminId);
    const hasCashierProd = adminProducts.some((p) => p.id === 'p_cashier_1');
    expect(hasCashierProd).toBe(false);

    // Cashier retains their product
    const updatedCashierProducts = StorageService.getProducts(cashierId);
    expect(updatedCashierProducts.length).toBe(1);
    expect(updatedCashierProducts[0].name).toBe('منتج خاص بالكاشير');
  });

  it('creates and records audit logs', () => {
    StorageService.clearAuditLogs();
    expect(StorageService.getAuditLogs().length).toBe(0);

    StorageService.logAudit(
      'create_sale',
      'تم إنشاء فاتورة مبيعات جديدة بقيمة 1200 دج',
      'inv_123',
      { total: 1200 },
      { id: 'user_admin', name: 'المدير العام', role: 'admin' }
    );

    const logs = StorageService.getAuditLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].action).toBe('create_sale');
    expect(logs[0].entityId).toBe('inv_123');
    expect(logs[0].userName).toBe('المدير العام');
  });

  it('creates, lists, and restores automated snapshot backups', () => {
    const userId = 'user_admin';
    const result = StorageService.saveAutoBackup('اختبار النسخ الآلي', userId);
    expect(result.success).toBe(true);

    const backups = StorageService.getAutoBackups(userId);
    expect(backups.length).toBe(1);
    expect(backups[0].note).toBe('اختبار النسخ الآلي');

    const restoreResult = StorageService.restoreAutoBackup(result.id, userId);
    expect(restoreResult.success).toBe(true);
  });

  it('calculates storage quota statistics accurately', () => {
    const quotaInfo = StorageService.getStorageQuotaInfo();
    expect(quotaInfo.usedBytes).toBeGreaterThanOrEqual(0);
    expect(typeof quotaInfo.usedFormatted).toBe('string');
    expect(quotaInfo.estimatedTotalBytes).toBe(5 * 1024 * 1024);
    expect(quotaInfo.percentUsed).toBeLessThanOrEqual(100);
  });
});

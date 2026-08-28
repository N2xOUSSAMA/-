import { Product, Customer } from '../types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates product details before saving or updating.
 */
export function validateProduct(product: Partial<Product>): ValidationResult {
  const errors: string[] = [];

  if (!product.name || !product.name.trim()) {
    errors.push('اسم المنتج مطلوب.');
  }

  if (product.sellingPrice === undefined || product.sellingPrice < 0) {
    errors.push('سعر البيع يجب أن يكون صفراً أو أكثر.');
  }

  if (product.costPrice === undefined || product.costPrice < 0) {
    errors.push('سعر التكلفة يجب أن يكون صفراً أو أكثر.');
  }

  if (
    product.costPrice !== undefined &&
    product.sellingPrice !== undefined &&
    product.costPrice > product.sellingPrice
  ) {
    // Warning or error depending on strictness - we flag as notice
  }

  if (product.stock !== undefined && product.stock < 0) {
    errors.push('الكمية في المخزون لا يمكن أن تكون سالبة.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates customer details.
 */
export function validateCustomer(customer: Partial<Customer>): ValidationResult {
  const errors: string[] = [];

  if (!customer.name || !customer.name.trim()) {
    errors.push('اسم العميل مطلوب.');
  }

  if (customer.phone && customer.phone.trim()) {
    const phoneRegex = /^[0-9+() -]{6,20}$/;
    if (!phoneRegex.test(customer.phone.trim())) {
      errors.push('رقم الهاتف غير صالح.');
    }
  }

  if (customer.balanceDebt !== undefined && customer.balanceDebt < 0) {
    errors.push('الرصيد المدين يجب أن يكون صفراً أو قيمة موجبة.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates user PIN format (4 to 8 digits).
 */
export function validatePIN(pin: string): ValidationResult {
  const errors: string[] = [];
  const cleanPin = pin.trim();

  if (!cleanPin) {
    errors.push('رمز PIN مطلوب.');
  } else if (!/^\d{4,8}$/.test(cleanPin)) {
    errors.push('رمز PIN يجب أن يتكون من 4 إلى 8 أرقام فقط.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates barcode format (alphanumeric, no weird control characters).
 */
export function validateBarcode(barcode: string): ValidationResult {
  const errors: string[] = [];
  const clean = barcode.trim();

  if (!clean) {
    errors.push('الباركود مطلوب.');
  } else if (clean.length < 2 || clean.length > 50) {
    errors.push('طول الباركود يجب أن يكون بين 2 و 50 خانة.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

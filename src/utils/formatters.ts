/**
 * Formatter Utilities for Currency, Numbers, Dates, and Weights.
 */

export function formatCurrency(amount: number, symbol: string = 'د.ج', decimals: number = 2): string {
  const safeAmount = isNaN(amount) ? 0 : amount;
  return `${safeAmount.toLocaleString('fr-DZ', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} ${symbol}`;
}

export function formatNumber(value: number, decimals: number = 0): string {
  const safeValue = isNaN(value) ? 0 : value;
  return safeValue.toLocaleString('fr-DZ', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatDate(dateInput: string | Date | number, options?: Intl.DateTimeFormatOptions): string {
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('ar-DZ', options || {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '-';
  }
}

export function formatDateTime(dateInput: string | Date | number): string {
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '-';
    return `${d.toLocaleDateString('ar-DZ')} ${d.toLocaleTimeString('ar-DZ', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  } catch {
    return '-';
  }
}

export function formatWeight(grams: number): string {
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(2)} كغ`;
  }
  return `${grams.toFixed(0)} غرام`;
}

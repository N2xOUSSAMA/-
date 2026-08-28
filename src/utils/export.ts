import { exportToCSV, exportToJSON } from './exportHelpers';

export { exportToCSV, exportToJSON };

/**
 * Triggers a browser print dialog with formatted styling.
 */
export function printDocument(elementId?: string, documentTitle: string = 'طباعة'): void {
  const originalTitle = document.title;
  document.title = documentTitle;

  if (elementId) {
    const el = document.getElementById(elementId);
    if (el) {
      window.print();
      document.title = originalTitle;
      return;
    }
  }

  window.print();
  document.title = originalTitle;
}

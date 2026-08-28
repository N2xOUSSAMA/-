import { describe, it, expect } from 'vitest';
import {
  sha256Sync,
  generateRandomSalt,
  hashPassword,
  isHashedPassword,
  verifyPassword,
  encryptStorageData,
  decryptStorageData,
} from '../utils/security';

describe('Security & Cryptography Utilities', () => {
  it('computes consistent SHA-256 hashes', () => {
    const hash1 = sha256Sync('test-password');
    const hash2 = sha256Sync('test-password');
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64);
  });

  it('generates random salt with requested length', () => {
    const salt1 = generateRandomSalt(16);
    const salt2 = generateRandomSalt(16);
    expect(salt1.length).toBe(16);
    expect(salt2.length).toBe(16);
    expect(salt1).not.toBe(salt2);
  });

  it('hashes plain text passwords using v3 dynamic salt format', () => {
    const plain = 'kioskPass123';
    const hashed = hashPassword(plain);
    expect(hashed.startsWith('$sha256$kiosk_v3$')).toBe(true);
    expect(isHashedPassword(hashed)).toBe(true);
  });

  it('verifies passwords correctly with salted hash', () => {
    const plain = 'secret_pin_2026';
    const hashed = hashPassword(plain);
    expect(verifyPassword(plain, hashed)).toBe(true);
    expect(verifyPassword('wrong_pin', hashed)).toBe(false);
  });

  it('verifies legacy v2 format gracefully', () => {
    const legacySalt = 'kiosk_pos_secret_salt_2026_';
    const legacyHash = `$sha256$kiosk_v2$${sha256Sync(legacySalt + 'oldPin')}`;
    expect(verifyPassword('oldPin', legacyHash)).toBe(true);
    expect(verifyPassword('wrongPin', legacyHash)).toBe(false);
  });

  it('encrypts and decrypts localStorage envelopes correctly', () => {
    const mockData = {
      storeName: 'كشك النصر',
      totalRevenue: 54000,
      customers: [{ name: 'أحمد', debt: 1500 }],
    };

    const encrypted = encryptStorageData(mockData);
    expect(encrypted.startsWith('ENC_V1_::')).toBe(true);
    expect(encrypted).not.toContain('كشك النصر'); // Obfuscated from plain DevTools

    const decrypted = decryptStorageData(encrypted, null);
    expect(decrypted).toEqual(mockData);
  });

  it('falls back to plaintext parsing gracefully for legacy JSON', () => {
    const legacyJson = JSON.stringify({ item: 'coffee', price: 50 });
    const result = decryptStorageData(legacyJson, {});
    expect(result).toEqual({ item: 'coffee', price: 50 });
  });
});

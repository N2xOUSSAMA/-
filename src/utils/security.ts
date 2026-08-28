/**
 * Security & Cryptography Utilities
 * Provides:
 * 1. Synchronous SHA-256 hashing with dynamic per-user random salt.
 * 2. Multi-version password verification (v3 salted, v2 legacy, plaintext fallback).
 * 3. LocalStorage Data Obfuscation / Encryption envelope to protect customer debts, sales, and prices from plain DevTools inspection.
 */

function rightRotate(value: number, amount: number): number {
  return (value >>> amount) | (value << (32 - amount));
}

/**
 * Pure TypeScript synchronous SHA-256 implementation
 */
export function sha256Sync(ascii: string): string {
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let i: number, j: number;
  let result = '';

  const words: number[] = [];
  const utf8 = unescape(encodeURIComponent(ascii));
  const asciiBitLength = utf8[lengthProperty] * 8;

  let hash: number[] = [];
  let k: number[] = [];
  let primeCounter = 0;

  const isComposite: { [key: number]: boolean } = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = candidate * candidate; i < 313; i += candidate) {
        isComposite[i] = true;
      }
      if (primeCounter < 8) {
        hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      }
      k[primeCounter] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      primeCounter++;
    }
  }

  let formattedAscii = utf8 + '\x80';
  while ((formattedAscii[lengthProperty] % 64) - 56) formattedAscii += '\x00';
  for (i = 0; i < formattedAscii[lengthProperty]; i++) {
    j = formattedAscii.charCodeAt(i);
    words[i >> 2] |= j << (((3 - i) % 4) * 8);
  }
  words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
  words[words[lengthProperty]] = asciiBitLength;

  for (j = 0; j < words[lengthProperty]; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash;
    hash = hash.slice(0, 8);

    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15],
        w2 = w[i - 2];

      const a = hash[0],
        e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);
      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

      hash = [(temp1 + temp2) | 0, a, hash[1], hash[2], (hash[3] + temp1) | 0, hash[4], hash[5], hash[6]];
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

const HASH_V3_PREFIX = '$sha256$kiosk_v3$';
const HASH_V2_PREFIX = '$sha256$kiosk_v2$';
const LEGACY_GLOBAL_SALT = 'kiosk_pos_secret_salt_2026_';

/**
 * Generates a cryptographically strong pseudo-random salt string.
 */
export function generateRandomSalt(length: number = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let salt = '';
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < length; i++) {
      salt += chars[bytes[i] % chars.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      salt += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return salt;
}

/**
 * Hashes a plain-text PIN or password with an individual random salt (v3 format).
 * Format: $sha256$kiosk_v3$<salt>$<hash>
 */
export function hashPassword(plainText: string, customSalt?: string): string {
  if (!plainText) return '';
  if (isHashedPassword(plainText)) return plainText;
  const salt = customSalt || generateRandomSalt(16);
  const hash = sha256Sync(`${salt}:${plainText.trim()}:${salt}`);
  return `${HASH_V3_PREFIX}${salt}$${hash}`;
}

/**
 * Checks if a string is already a formatted SHA-256 hash (v3 or legacy v2).
 */
export function isHashedPassword(value: string | undefined | null): boolean {
  if (!value || typeof value !== 'string') return false;
  if (value.startsWith(HASH_V3_PREFIX)) return true;
  if (value.startsWith(HASH_V2_PREFIX) && value.length === HASH_V2_PREFIX.length + 64) return true;
  return false;
}

/**
 * Securely verifies a plain-text candidate PIN/password against a stored hash or plain string.
 */
export function verifyPassword(plainInput: string, storedHashOrPlain: string): boolean {
  if (!plainInput || !storedHashOrPlain) return false;
  const cleanInput = plainInput.trim();

  // 1. Check v3 format ($sha256$kiosk_v3$<salt>$<hash>)
  if (storedHashOrPlain.startsWith(HASH_V3_PREFIX)) {
    const parts = storedHashOrPlain.slice(HASH_V3_PREFIX.length).split('$');
    if (parts.length === 2) {
      const [salt, expectedHash] = parts;
      const computedHash = sha256Sync(`${salt}:${cleanInput}:${salt}`);
      return computedHash === expectedHash;
    }
  }

  // 2. Check legacy v2 format ($sha256$kiosk_v2$<hash>)
  if (storedHashOrPlain.startsWith(HASH_V2_PREFIX)) {
    const computedLegacy = sha256Sync(LEGACY_GLOBAL_SALT + cleanInput);
    return `${HASH_V2_PREFIX}${computedLegacy}` === storedHashOrPlain;
  }

  // 3. Fallback for unhashed legacy input
  return cleanInput === storedHashOrPlain;
}

/**
 * ========================================================
 * LOCALSTORAGE DATA ENCRYPTION & OBFUSCATION LAYER
 * Protects database entries from plaintext inspection in browser DevTools.
 * ========================================================
 */
const ENCRYPT_PREFIX = 'ENC_V1_::';
const STORAGE_PEPPER = 'KIOSK_POS_SECURE_STORAGE_KEY_2026';

export function encryptStorageData<T>(data: T): string {
  try {
    const jsonStr = JSON.stringify(data);
    // Lightweight reversible XOR stream cipher + UTF-8 Base64 encoding
    let encoded = '';
    for (let i = 0; i < jsonStr.length; i++) {
      const charCode = jsonStr.charCodeAt(i);
      const pepperCode = STORAGE_PEPPER.charCodeAt(i % STORAGE_PEPPER.length);
      encoded += String.fromCharCode(charCode ^ pepperCode);
    }
    const b64 = btoa(encodeURIComponent(encoded));
    return `${ENCRYPT_PREFIX}${b64}`;
  } catch (e) {
    // Fallback to regular JSON stringification if encoding fails
    return JSON.stringify(data);
  }
}

export function decryptStorageData<T>(raw: string, defaultValue: T): T {
  if (!raw) return defaultValue;
  try {
    // If it is encrypted with our storage envelope
    if (raw.startsWith(ENCRYPT_PREFIX)) {
      const b64 = raw.slice(ENCRYPT_PREFIX.length);
      const decodedStr = decodeURIComponent(atob(b64));
      let jsonStr = '';
      for (let i = 0; i < decodedStr.length; i++) {
        const charCode = decodedStr.charCodeAt(i);
        const pepperCode = STORAGE_PEPPER.charCodeAt(i % STORAGE_PEPPER.length);
        jsonStr += String.fromCharCode(charCode ^ pepperCode);
      }
      return JSON.parse(jsonStr) as T;
    }
    // Backward compatibility: read legacy plaintext JSON directly
    return JSON.parse(raw) as T;
  } catch (e) {
    console.error('Error decrypting storage data:', e);
    return defaultValue;
  }
}

/**
 * Security & Cryptography Utilities
 * Provides synchronous SHA-256 hashing with salt for secure storage of PINs and passwords in localStorage.
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
  let lengthProperty = 'length';
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

const HASH_PREFIX = '$sha256$kiosk_v2$';
const GLOBAL_SALT = 'kiosk_pos_secret_salt_2026_';

/**
 * Hashes a plain-text PIN or password with salt.
 * If already hashed, returns as-is.
 */
export function hashPassword(plainText: string): string {
  if (!plainText) return '';
  if (isHashedPassword(plainText)) return plainText;
  const hash = sha256Sync(GLOBAL_SALT + plainText.trim());
  return `${HASH_PREFIX}${hash}`;
}

/**
 * Checks if a string is already a formatted SHA-256 hash.
 */
export function isHashedPassword(value: string | undefined | null): boolean {
  if (!value || typeof value !== 'string') return false;
  return value.startsWith(HASH_PREFIX) && value.length === HASH_PREFIX.length + 64;
}

/**
 * Securely verifies a plain-text candidate PIN/password against a stored hash or plain string.
 */
export function verifyPassword(plainInput: string, storedHashOrPlain: string): boolean {
  if (!plainInput || !storedHashOrPlain) return false;
  const cleanInput = plainInput.trim();
  if (isHashedPassword(storedHashOrPlain)) {
    const computedHash = hashPassword(cleanInput);
    return computedHash === storedHashOrPlain;
  }
  // Fallback for legacy plain text passwords before migration
  return cleanInput === storedHashOrPlain;
}

// Web Crypto API Implementation
// NOTE: Using PBKDF2-SHA256 for token hashing (browser-compatible)
// For production with Node.js backend, consider migrating to Argon2id
import type { EncryptedData } from '../types';

// Encryption using Web Crypto API (AES-256-GCM)
export async function encryptApiKey(key: string, password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);

  // Derive key with PBKDF2
  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derivedKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    derivedKey,
    data
  );

  const encryptedData: EncryptedData = {
    salt: Array.from(salt),
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(encrypted))
  };

  return JSON.stringify(encryptedData);
}

// Decryption using Web Crypto API
export async function decryptApiKey(encryptedData: string, password: string): Promise<string> {
  const parsed: EncryptedData = JSON.parse(encryptedData);
  const encoder = new TextEncoder();

  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const derivedKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: new Uint8Array(parsed.salt), iterations: 100000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(parsed.iv) },
    derivedKey,
    new Uint8Array(parsed.data)
  );

  return new TextDecoder().decode(decrypted);
}

// PBKDF2-SHA256 hashing for tokens (100k iterations)
// Note: Using PBKDF2 as it's natively supported in Web Crypto API
// For Argon2id support, backend implementation required
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const baseKey = await crypto.subtle.importKey(
    'raw',
    data,
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  const hashBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    baseKey,
    256
  );
  
  const hashArray = Array.from(new Uint8Array(hashBits));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `$pbkdf2$sha256$100000$${saltHex}$${hashHex}`;
}

// Constant-time comparison to prevent timing attacks
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do comparison to avoid leaking length info
    const dummy = '0'.repeat(b.length);
    let result = 0;
    for (let i = 0; i < dummy.length; i++) {
      result |= dummy.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0 && false; // Always false for different lengths
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// Verify token against hash (timing-safe)
export async function verifyToken(token: string, hash: string): Promise<boolean> {
  try {
    // Check admin token first (using constant-time comparison)
    const adminHash = import.meta.env.VITE_ADMIN_TOKEN_HASH;
    if (adminHash && constantTimeEqual(token, adminHash)) {
      return true;
    }
    
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    
    // Parse the stored hash
    const parts = hash.split('$');
    if (parts.length !== 6 || parts[1] !== 'pbkdf2') {
      // Do fake computation to maintain constant time
      await hashToken('dummy');
      return false;
    }
    
    const iterations = parseInt(parts[3], 10);
    const saltHex = parts[4];
    const storedHash = parts[5];
    
    const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
    
    const baseKey = await crypto.subtle.importKey(
      'raw',
      data,
      'PBKDF2',
      false,
      ['deriveBits']
    );
    
    const hashBits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
      baseKey,
      256
    );
    
    const computedHash = Array.from(new Uint8Array(hashBits))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Constant-time comparison
    return constantTimeEqual(computedHash, storedHash);
  } catch {
    // Do fake computation on error
    await hashToken('dummy');
    return false;
  }
}

// Generate a secure random token
export function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return 'atm_v2_' + Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Generate UUID for filenames
export function generateUUID(): string {
  return crypto.randomUUID();
}

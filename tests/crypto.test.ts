import { describe, it, expect } from 'vitest';
import { 
  encryptApiKey, 
  decryptApiKey, 
  hashToken, 
  generateSecureToken, 
  generateUUID 
} from '../src/utils/crypto';

describe('Crypto Utilities', () => {
  describe('encryptApiKey / decryptApiKey', () => {
    it('should encrypt and decrypt API key correctly', async () => {
      const apiKey = 'sk-test-1234567890abcdef';
      const password = 'test-password-123';
      
      const encrypted = await encryptApiKey(apiKey, password);
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      
      // Verify it's valid JSON with expected fields
      const parsed = JSON.parse(encrypted);
      expect(parsed.salt).toBeDefined();
      expect(parsed.iv).toBeDefined();
      expect(parsed.data).toBeDefined();
      
      // Decrypt and verify
      const decrypted = await decryptApiKey(encrypted, password);
      expect(decrypted).toBe(apiKey);
    });
    
    it('should produce different encrypted values for same input', async () => {
      const apiKey = 'sk-test-1234567890abcdef';
      const password = 'test-password-123';
      
      const encrypted1 = await encryptApiKey(apiKey, password);
      const encrypted2 = await encryptApiKey(apiKey, password);
      
      // Due to random salt and IV, encrypted values should differ
      expect(encrypted1).not.toBe(encrypted2);
      
      // But both should decrypt to the same value
      expect(await decryptApiKey(encrypted1, password)).toBe(apiKey);
      expect(await decryptApiKey(encrypted2, password)).toBe(apiKey);
    });
  });
  
  describe('generateSecureToken', () => {
    it('should generate a token with correct prefix', () => {
      const token = generateSecureToken();
      expect(token).toMatch(/^atm_v2_/);
    });
    
    it('should generate unique tokens', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      expect(token1).not.toBe(token2);
    });
  });
  
  describe('generateUUID', () => {
    it('should generate a valid UUID format', () => {
      const uuid = generateUUID();
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });
    
    it('should generate unique UUIDs', () => {
      const uuid1 = generateUUID();
      const uuid2 = generateUUID();
      expect(uuid1).not.toBe(uuid2);
    });
  });
});

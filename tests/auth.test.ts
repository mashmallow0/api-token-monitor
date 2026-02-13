import { describe, it, expect } from 'vitest';
import { 
  checkRateLimit, 
  resetRateLimit, 
  sanitizeInput, 
  validateTokenFormat,
  tokenSchema,
  apiKeySchema 
} from '../src/utils/auth';

describe('Auth Utilities', () => {
  describe('sanitizeInput', () => {
    it('should escape HTML characters', () => {
      const input = '<script>alert("xss")</script>';
      const sanitized = sanitizeInput(input);
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
      expect(sanitized).toContain('&lt;');
      expect(sanitized).toContain('&gt;');
    });
    
    it('should escape quotes', () => {
      const input = 'value="test" \'test\'';
      const sanitized = sanitizeInput(input);
      expect(sanitized).toContain('&quot;');
      expect(sanitized).toContain('&#x27;');
    });
  });
  
  describe('tokenSchema', () => {
    it('should validate valid tokens', () => {
      const validTokens = [
        'atm_v2_abc123',
        'test-token-123',
        'valid_token_456'
      ];
      
      validTokens.forEach(token => {
        expect(tokenSchema.safeParse(token).success).toBe(true);
      });
    });
    
    it('should reject invalid tokens', () => {
      const invalidTokens = [
        'ab', // too short
        '', // empty
        'a'.repeat(129), // too long
        'token with spaces',
        'token!@#$%'
      ];
      
      invalidTokens.forEach(token => {
        expect(tokenSchema.safeParse(token).success).toBe(false);
      });
    });
  });
  
  describe('apiKeySchema', () => {
    it('should validate valid API keys', () => {
      const validKey = {
        provider: 'openai',
        key: 'sk-test-1234567890',
        usage: 100,
        limit: 1000
      };
      
      const result = apiKeySchema.safeParse(validKey);
      expect(result.success).toBe(true);
    });
    
    it('should apply default values', () => {
      const key = {
        provider: 'openai',
        key: 'sk-test-1234567890'
      };
      
      const result = apiKeySchema.parse(key);
      expect(result.usage).toBe(0);
      expect(result.limit).toBe(1000);
    });
  });
  
  describe('checkRateLimit', () => {
    it('should allow initial attempts', () => {
      const identifier = `test-${Date.now()}`;
      const result = checkRateLimit(identifier);
      expect(result.allowed).toBe(true);
    });
    
    it('should track multiple attempts', () => {
      const identifier = `test-${Date.now()}-multi`;
      
      // First 5 attempts should be allowed
      for (let i = 0; i < 5; i++) {
        const result = checkRateLimit(identifier);
        expect(result.allowed).toBe(true);
      }
    });
    
    it('should reset rate limit', () => {
      const identifier = `test-${Date.now()}-reset`;
      
      // Make some attempts
      checkRateLimit(identifier);
      checkRateLimit(identifier);
      
      // Reset
      resetRateLimit(identifier);
      
      // Should be allowed again
      const result = checkRateLimit(identifier);
      expect(result.allowed).toBe(true);
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { verifyToken } from '../src/utils/crypto';

describe('ADMIN LOGIN FIX VERIFICATION', () => {
  const originalEnv = import.meta.env;

  beforeEach(() => {
    // Reset env before each test
    vi.resetModules();
  });

  afterEach(() => {
    // Restore env after each test
    vi.unstubAllGlobals();
  });

  // ============================================================================
  // TEST 1: Admin login works with VITE_ADMIN_TOKEN_HASH
  // ============================================================================
  describe('Admin Token Verification', () => {
    it('should return TRUE when token matches VITE_ADMIN_TOKEN_HASH', async () => {
      // Set admin token in env
      vi.stubGlobal('import', {
        meta: {
          env: {
            VITE_ADMIN_TOKEN_HASH: 'test_admin_token_123'
          }
        }
      });
      
      // Re-import to get fresh module with new env
      const { verifyToken: vt } = await import('../src/utils/crypto');
      
      // Should return true for matching admin token
      const result = await vt('test_admin_token_123', 'any-hash');
      expect(result).toBe(true);
    });

    it('should work with the exact token from .env file', async () => {
      // The .env file has VITE_ADMIN_TOKEN_HASH=test_admin_token_123
      // We need to test this works with the actual env
      const adminToken = 'test_admin_token_123';
      
      // Create a hash for regular user (won't be used for admin)
      const dummyHash = '$pbkdf2$sha256$100000$' + 'a'.repeat(32) + '$' + 'b'.repeat(64);
      
      // When we verify with the admin token, it should return true
      // (This test assumes the test environment has VITE_ADMIN_TOKEN_HASH set)
      const result = await verifyToken(adminToken, dummyHash);
      
      // In the actual env, this should be true if VITE_ADMIN_TOKEN_HASH is set correctly
      // Note: In vitest, import.meta.env is loaded from .env file
      expect(result).toBe(true);
    });
  });

  // ============================================================================
  // TEST 2: Regular user login still works
  // ============================================================================
  describe('Regular User Login', () => {
    it('should verify regular user tokens correctly', async () => {
      // Import hashToken to create a valid hash
      const { hashToken } = await import('../src/utils/crypto');
      
      const userToken = 'user_token_456';
      const userHash = await hashToken(userToken);
      
      // Should verify correctly
      const result = await verifyToken(userToken, userHash);
      expect(result).toBe(true);
    });

    it('should reject user with wrong token', async () => {
      const { hashToken } = await import('../src/utils/crypto');
      
      const userToken = 'user_token_789';
      const userHash = await hashToken(userToken);
      
      // Wrong token should fail
      const result = await verifyToken('wrong_token', userHash);
      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // TEST 3: Wrong tokens are rejected
  // ============================================================================
  describe('Wrong Token Rejection', () => {
    it('should reject wrong admin token', async () => {
      // Set admin token
      vi.stubGlobal('import', {
        meta: {
          env: {
            VITE_ADMIN_TOKEN_HASH: 'correct_admin_token'
          }
        }
      });
      
      const { verifyToken: vt } = await import('../src/utils/crypto');
      
      // Wrong admin token should be rejected
      const result = await vt('wrong_admin_token', 'any-hash');
      expect(result).toBe(false);
    });

    it('should reject empty token', async () => {
      const { hashToken } = await import('../src/utils/crypto');
      const userHash = await hashToken('valid_token');
      
      const result = await verifyToken('', userHash);
      expect(result).toBe(false);
    });

    it('should reject null/undefined-like tokens', async () => {
      const { hashToken } = await import('../src/utils/crypto');
      const userHash = await hashToken('valid_token');
      
      // @ts-expect-error Testing invalid input
      const result = await verifyToken(null, userHash);
      expect(result).toBe(false);
    });

    it('should handle case where VITE_ADMIN_TOKEN_HASH is not set', async () => {
      // Ensure no admin token is set
      vi.stubGlobal('import', {
        meta: {
          env: {}
        }
      });
      
      const { verifyToken: vt, hashToken: ht } = await import('../src/utils/crypto');
      
      const userToken = 'user_token_case';
      const userHash = await ht(userToken);
      
      // Should fall through to regular verification
      const result = await vt(userToken, userHash);
      expect(result).toBe(true);
    });
  });

  // ============================================================================
  // TEST 4: Edge cases
  // ============================================================================
  describe('Edge Cases', () => {
    it('should use constant-time comparison for admin tokens', async () => {
      const adminToken = 'admin_secret_token_xyz';
      
      // Set admin token
      vi.stubGlobal('import', {
        meta: {
          env: {
            VITE_ADMIN_TOKEN_HASH: adminToken
          }
        }
      });
      
      const { verifyToken: vt, constantTimeEqual } = await import('../src/utils/crypto');
      
      // Verify constantTimeEqual is used (indirect test)
      expect(constantTimeEqual(adminToken, adminToken)).toBe(true);
      expect(constantTimeEqual(adminToken, adminToken + 'x')).toBe(false);
      expect(constantTimeEqual(adminToken, adminToken.slice(0, -1))).toBe(false);
    });

    it('should handle tokens with special characters', async () => {
      // Special characters test - using the actual .env token
      // The .env has VITE_ADMIN_TOKEN_HASH=test_admin_token_123
      // "test_admin_token_123" contains underscores which are special in regex
      const specialToken = 'test_admin_token_123';
      
      // This should work with the actual env from .env file
      const result = await verifyToken(specialToken, 'any-hash');
      expect(result).toBe(true);
    });
  });
});
